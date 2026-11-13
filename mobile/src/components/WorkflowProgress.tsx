import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StageProgress } from '@/api';
import { formatDateTime } from '@/format';
import { boxShadow, colors, font, radius, size, space } from '@/theme';

type Props = {
  steps: StageProgress[];
  /** The caller's role save stage; matched case-insensitively, like the server. */
  myStage?: string | null;
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The box's workflow as a vertical progress list: done stages with who and when, pending
 * stages muted, and the caller's own stage marked as their step. Display only; the server
 * still decides whether a save is allowed.
 */
export function WorkflowProgress({ steps, myStage }: Props) {
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  if (ordered.length === 0) return null;

  return (
    <View style={styles.card} accessibilityRole="list" accessibilityLabel="Workflow progress">
      <Text style={styles.heading}>Workflow</Text>
      {ordered.map((step, i) => {
        const mine = !!myStage && same(step.stageName, myStage);
        const previous = ordered[i - 1];
        const last = i === ordered.length - 1;

        let detail: string;
        if (step.done) {
          const when = formatDateTime(step.completedAt);
          detail = [step.completedByName ? `by ${step.completedByName}` : 'Done', when].filter(Boolean).join(' · ');
        } else if (mine) {
          detail = previous && !previous.done ? `Waiting on ${previous.stageName}` : 'Ready for you';
        } else {
          detail = 'Pending';
        }

        return (
          <View
            key={`${step.position}-${step.stageName}`}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`Step ${step.position}, ${step.stageName}${mine ? ', your step' : ''}: ${detail}`}
          >
            <View style={styles.track}>
              <Marker done={step.done} mine={mine} position={step.position} />
              {/* The rail below a step is filled once that step is done. */}
              {last ? null : <View style={[styles.rail, step.done && styles.railDone]} />}
            </View>
            <View style={[styles.body, !last && styles.bodySpaced]}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !step.done && !mine && styles.muted]} numberOfLines={1}>
                  {step.stageName}
                </Text>
                {mine ? (
                  <View style={styles.youTag}>
                    <Text style={styles.youText}>YOUR STEP</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.detail, mine && !step.done && styles.detailMine]}>{detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Marker({ done, mine, position }: { done: boolean; mine: boolean; position: number }) {
  if (done) {
    return (
      <View style={[styles.marker, styles.markerDone]}>
        <Ionicons name="checkmark" size={size.stepIcon} color={colors.onPrimary} />
      </View>
    );
  }
  return (
    <View style={[styles.marker, mine ? styles.markerMine : styles.markerPending]}>
      <Text style={[styles.markerText, mine && styles.markerTextMine]}>{position}</Text>
    </View>
  );
}

// Re-exported for screens that only need the same-stage rule.
export { same as sameStage };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    boxShadow: boxShadow.card,
    padding: space.md,
  },
  heading: { ...font.label, color: colors.textMuted, marginBottom: space.md },

  row: { flexDirection: 'row', gap: space.md },
  track: { alignItems: 'center', width: size.stepMarker },
  rail: { flex: 1, width: size.stepRail, marginVertical: space.xs, borderRadius: size.stepRail, backgroundColor: colors.surfaceContainer },
  railDone: { backgroundColor: colors.success },

  marker: {
    width: size.stepMarker,
    height: size.stepMarker,
    borderRadius: size.stepMarker / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { backgroundColor: colors.success },
  markerPending: { borderWidth: size.stepRail, borderColor: colors.surfaceContainerHigh },
  markerMine: { borderWidth: size.stepRail, borderColor: colors.primary, backgroundColor: colors.tint },
  markerText: { ...font.badge, color: colors.outline },
  markerTextMine: { color: colors.primary },

  body: { flex: 1, minHeight: size.stepMarker },
  bodySpaced: { paddingBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size.stepMarker },
  title: { ...font.rowValue, color: colors.text, flexShrink: 1 },
  muted: { color: colors.outline },
  detail: { ...font.caption, color: colors.textMuted },
  detailMine: { color: colors.primary },

  youTag: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.tint,
  },
  youText: { ...font.badge, color: colors.primary },
});
