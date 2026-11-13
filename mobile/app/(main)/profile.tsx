import { Fragment, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasFlow } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/auth/useMe';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { RoleBadge } from '@/components/RoleBadge';
import { TextLink } from '@/components/TextLink';
import { DEV_NO_AUTH } from '@/config';
import { nextRole } from '@/dev';
import { formatCount, formatDate } from '@/format';
import { colors, font, lightPalette, motion, radius, size, space } from '@/theme';

const entrance = { duration: motion.profileEnterDuration, stagger: motion.profileStagger };

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // App is pinned to light (app.json). darkPalette in theme.ts is kept for later.
  const p = lightPalette;

  const { state, signIn, signOut } = useAuth();
  const session = state.status === 'signedIn' ? state.session : null;

  // Current profile, role, work session and stats; also keeps the stored session fresh.
  const me = useMe();
  const role = session?.role ?? null;
  const ready = hasFlow(session);

  // A role or work session removed server-side leaves nothing to do here.
  useEffect(() => {
    if (session && !ready) router.replace('/no-flow');
  }, [session, ready, router]);

  // (main)/_layout redirects signed-out users; nothing to draw meanwhile.
  if (!session) return null;

  const cycleRole = () => void signIn({ ...session, role: nextRole(session.role) });

  // /me is the source of truth; the session's copy fills in until it loads.
  // Passwords are never part of either, so they can't leak here.
  const user = me?.user ?? session;
  const info: { label: string; value: string }[] = [
    { label: 'Session', value: session.session?.name || '—' },
    { label: 'CNIC', value: user.cnic || '—' },
    { label: 'Email', value: user.email || '—' },
    { label: 'Date of Birth', value: formatDate(user.dateOfBirth) },
  ];
  const canUseScanner = !!role && (role.canScan || role.canFindCopy);

  const card = [styles.card, { backgroundColor: p.card, boxShadow: p.cardShadow }];

  return (
    <>
      <ScrollView
        style={{ backgroundColor: p.background }}
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Enter index={0} {...entrance} style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: p.tint }]}>
            <Ionicons name="person" size={size.profileAvatarIcon} color={colors.primary} />
          </View>
          <Text style={[styles.name, { color: p.text }]} numberOfLines={2}>
            {user.name || '—'}
          </Text>
          <View style={styles.badge}>
            <RoleBadge
              role={role?.name ?? 'No role assigned'}
              tint={p.tint}
              onPress={DEV_NO_AUTH ? cycleRole : undefined}
            />
          </View>
        </Enter>

        <Enter index={1} {...entrance} style={[card, styles.stat]}>
          <Text style={[styles.statValue, { color: p.text }]}>
            {me ? formatCount(me.stats.scannedSoFar) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: p.textMuted }]}>Scanned so far</Text>
        </Enter>

        <Enter index={2} {...entrance} style={[card, styles.info]}>
          {info.map((row, i) => (
            <Fragment key={row.label}>
              {i > 0 ? <View style={[styles.divider, { backgroundColor: p.divider }]} /> : null}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: p.textMuted }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { color: p.text }]} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            </Fragment>
          ))}
        </Enter>

        {canUseScanner ? (
          <Enter index={3} {...entrance} style={styles.action}>
            <Button
              variant="action"
              icon="qr-code-outline"
              title="Scan Now"
              pressedScale={motion.pressedScale}
              hapticOnPressIn
              onPress={() => router.push('/scanner')}
            />
          </Enter>
        ) : null}

        {/* Clearing the session is enough: AuthGate returns signed-out users to Login. */}
        <Enter index={4} {...entrance} style={styles.signOut}>
          <TextLink title="Sign out" onPress={() => void signOut()} />
        </Enter>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.screenMargin, gap: space.lg },

  identity: { alignItems: 'center', paddingTop: space.sm },
  avatar: {
    width: size.profileAvatar,
    height: size.profileAvatar,
    borderRadius: size.profileAvatar / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...font.display, textAlign: 'center', marginTop: space.md },
  badge: { marginTop: space.sm },

  card: { borderRadius: radius.card },
  stat: { padding: space.lg, alignItems: 'center' },
  statValue: font.stat,
  statLabel: { ...font.caption, marginTop: space.xs },

  info: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: size.infoRowPaddingY,
  },
  rowLabel: font.caption,
  rowValue: { ...font.rowValue, flexShrink: 1, textAlign: 'right' },
  divider: { height: size.infoDivider, marginHorizontal: space.md },

  action: { paddingTop: space.sm },
  signOut: { paddingTop: space.sm },
});
