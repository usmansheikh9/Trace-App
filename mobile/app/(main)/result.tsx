import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, boxRows, hasFlow, isScanCode, SCAN_CODES, scanApi } from '@/api';
import type { BoxDto, ScanCode, ScanMode, StageProgress } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { RoleBadge } from '@/components/RoleBadge';
import { sameStage, WorkflowProgress } from '@/components/WorkflowProgress';
import { exportSlip } from '@/print/slip';
import { boxShadow, colors, font, motion, radius, size, space } from '@/theme';

function parse(data: string | undefined): BoxDto | null {
  if (!data) return null;
  try {
    const box = JSON.parse(data) as BoxDto;
    return { ...box, workflow: box.workflow ?? [] };
  } catch {
    return null;
  }
}

/** Short label for the tag that replaces Save when the server refuses it. */
const BLOCKED_LABEL: Record<ScanCode, string> = {
  [SCAN_CODES.alreadyScanned]: 'Already scanned',
  [SCAN_CODES.outOfOrder]: 'Previous stage not done',
  [SCAN_CODES.wrongSession]: 'Other session',
  [SCAN_CODES.noSession]: 'No session',
  [SCAN_CODES.stageNotInWorkflow]: 'Stage not in workflow',
};

export default function Result() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const session = state.status === 'signedIn' ? state.session : null;
  const role = session?.role ?? null;
  const { data, mode } = useLocalSearchParams<{ data?: string; mode?: ScanMode }>();
  const box = useMemo(() => parse(data), [data]);
  // Local copy of the progress, so a successful save marks the user's step done in place.
  const [workflow, setWorkflow] = useState<StageProgress[]>(() => parse(data)?.workflow ?? []);

  // Save: a batch scan (not Find Copy, which is view-only) by a role that can save.
  const canSave = mode === 'scan' && !!role?.canSave;
  const canPrint = !!role?.canPrint;

  // 'blocked' = the server refused the save (coded): nothing was recorded, and Save is retired
  // for this view so Scan Next can leave.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'blocked'>('idle');
  const [blocked, setBlocked] = useState<ScanCode>();
  // Which button started the save, so the spinner shows where the user tapped.
  const [pending, setPending] = useState<'save' | 'next' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' }>();
  // Synchronous guard: state updates are async, a fast double-tap could slip through.
  const saving = useRef(false);

  // Role or work session removed server-side: nothing to act on.
  if (!role || !hasFlow(session)) return <Redirect href="/no-flow" />;
  if (!box) return <Redirect href="/scanner" />;
  const record = box;
  const currentRole = role;
  const rows = boxRows(record, currentRole.visibleFields);

  /**
   * Records the scan once per view. Shared by Save and Scan Next.
   * Resolves true when it's fine to leave: saved now, saved or refused earlier, or nothing to save.
   */
  async function commitScan(trigger: 'save' | 'next'): Promise<boolean> {
    if (!canSave || saveState === 'saved' || saveState === 'blocked') return true;
    if (saving.current) return false;
    saving.current = true;
    setNotice(undefined);
    setPending(trigger);
    setSaveState('saving');
    try {
      // Only the number: the server stamps the stage from the role.
      const saved = await scanApi.save(record.copyNumber);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveState('saved');
      setWorkflow((steps) =>
        steps.map((s) =>
          sameStage(s.stageName, saved.stage)
            ? { ...s, done: true, completedByName: session?.name ?? s.completedByName, completedAt: saved.savedAt }
            : s,
        ),
      );
      return true;
    } catch (e) {
      if (e instanceof ApiError && isScanCode(e.code)) {
        // out_of_order, already_scanned, wrong_session, no_session, stage_not_in_workflow:
        // nothing was recorded. Stay so the server's message is seen; the next Scan Next leaves.
        const duplicate = e.code === SCAN_CODES.alreadyScanned;
        void Haptics.notificationAsync(
          duplicate ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error,
        );
        setBlocked(e.code);
        setSaveState('blocked');
        setNotice({ text: e.message, tone: duplicate ? 'info' : 'error' });
        return false;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const known = e instanceof ApiError && (e.status === 403 || e.status === 404);
      setNotice({ text: known ? (e as ApiError).message : "Couldn't save. Try again.", tone: 'error' });
      setSaveState('idle');
      return false;
    } finally {
      saving.current = false;
      setPending(null);
    }
  }

  async function scanNext() {
    // On a Scan result, Scan Next also records the item (unless Save already did).
    if (await commitScan('next')) back();
  }

  async function print() {
    if (printing) return;
    setNotice(undefined);
    setPrinting(true);
    try {
      const shared = await exportSlip(record, currentRole);
      if (!shared) setNotice({ text: "Sharing isn't available on this device.", tone: 'error' });
    } catch {
      setNotice({ text: "Couldn't create the slip.", tone: 'error' });
    } finally {
      setPrinting(false);
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/scanner'));
  const headerTop = insets.top;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: headerTop + size.headerHeight, paddingBottom: insets.bottom + space.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Enter index={0} style={styles.badgeRow}>
          <RoleBadge role={currentRole.name} pulse />
        </Enter>

        <Enter index={1} style={styles.card}>
          <View style={styles.section}>
            {rows.length > 0 ? (
              rows.map((r) => <Row key={r.key} label={r.label} value={r.value} />)
            ) : (
              <Text style={styles.empty}>No fields are shown for this role.</Text>
            )}
          </View>
        </Enter>

        {workflow.length > 0 ? (
          <Enter index={2} style={styles.progress}>
            <WorkflowProgress steps={workflow} myStage={currentRole.saveStage} />
          </Enter>
        ) : null}

        <Enter index={3} style={styles.actions}>
          {!canSave ? null : saveState === 'blocked' && blocked ? (
            // Nothing was recorded; replaces Save so it can't be retried from this view.
            <Animated.View
              entering={FadeIn.duration(motion.reducedFadeMs)}
              style={[styles.saved, styles.duplicate]}
              accessibilityRole="text"
              accessibilityLabel={`Not saved: ${BLOCKED_LABEL[blocked]}`}
            >
              <Ionicons name="alert-circle-outline" size={size.actionIcon} color={colors.textMuted} />
              <Text style={[styles.savedText, styles.duplicateText]}>{BLOCKED_LABEL[blocked]}</Text>
            </Animated.View>
          ) : saveState === 'saved' ? (
            // Replaces the button so the record can't be submitted twice.
            <Animated.View
              entering={FadeIn.duration(motion.reducedFadeMs)}
              style={styles.saved}
              accessibilityRole="text"
              accessibilityLabel="Saved"
            >
              <Ionicons name="checkmark-circle" size={size.actionIcon} color={colors.success} />
              <Text style={styles.savedText}>Saved</Text>
            </Animated.View>
          ) : (
            <Button
              variant="action"
              icon="cloud-upload-outline"
              title="Save"
              loading={pending === 'save'}
              pressedScale={motion.scanNextPressedScale}
              onPress={() => void commitScan('save')}
            />
          )}

          <View style={styles.secondary}>
            {canPrint ? (
              <Button
                variant="tonal"
                icon="print-outline"
                title="Print Slip"
                loading={printing}
                pressedScale={motion.scanNextPressedScale}
                onPress={print}
                style={styles.half}
              />
            ) : null}
            <Button
              variant="tonal"
              icon="qr-code-outline"
              title="Scan Next"
              loading={pending === 'next'}
              pressedScale={motion.scanNextPressedScale}
              onPress={() => void scanNext()}
              style={canPrint ? styles.half : styles.full}
            />
          </View>

          {notice ? (
            <Text style={[styles.notice, notice.tone === 'info' && styles.noticeInfo]}>{notice.text}</Text>
          ) : null}
        </Enter>
      </ScrollView>

      {/* Fixed header, drawn over the scroll content. */}
      <View style={[styles.header, { paddingTop: headerTop, height: headerTop + size.headerHeight }]}>
        <View style={styles.headerLeft}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={space.sm} onPress={back}>
            <Ionicons name="arrow-back" size={size.headerIcon} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Scan Results</Text>
        </View>
        {/* Placeholder: profile, not wired yet. */}
        <View style={styles.avatar}>
          <Ionicons name="person" size={size.avatarIcon} color={colors.onPrimary} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: space.screenMargin },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenMargin,
    backgroundColor: colors.headerScrim,
    boxShadow: boxShadow.headerHairline,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...font.headerTitle, color: colors.text },
  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: size.avatar / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeRow: { alignItems: 'center', paddingVertical: space.md },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    boxShadow: boxShadow.card,
    overflow: 'hidden',
  },
  section: { padding: space.md, gap: space.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  label: { ...font.rowLabel, color: colors.outline },
  value: { ...font.rowValue, color: colors.text, flexShrink: 1, textAlign: 'right' },
  empty: { ...font.caption, color: colors.textMuted, textAlign: 'center' },

  progress: { marginTop: space.md },
  actions: { marginTop: space.xl, gap: size.actionGap },
  saved: {
    height: size.buttonHeight,
    borderRadius: radius.action,
    backgroundColor: colors.successTint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  savedText: { ...font.action, color: colors.success },
  duplicate: { backgroundColor: colors.surfaceContainer },
  duplicateText: { color: colors.textMuted },
  secondary: { flexDirection: 'row', gap: size.actionGap },
  // Half-width buttons need less side padding to fit icon + label on small phones.
  half: { flex: 1, paddingHorizontal: space.md },
  full: { flex: 1 },
  notice: { ...font.caption, color: colors.danger, textAlign: 'center' },
  noticeInfo: { color: colors.textMuted },
});
