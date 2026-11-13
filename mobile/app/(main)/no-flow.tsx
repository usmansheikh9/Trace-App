import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { hasFlow } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/auth/useMe';
import { Enter } from '@/components/Enter';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { colors, font, size, space } from '@/theme';

/** Approved, but missing a role or a work session (or both). Nothing to act on. */
export default function NoFlow() {
  const router = useRouter();
  const { state, signOut } = useAuth();
  useMe(); // refreshes the role and work session on every focus

  const session = state.status === 'signedIn' ? state.session : null;
  const ready = hasFlow(session);
  useEffect(() => {
    if (ready) router.replace('/profile');
  }, [ready, router]);

  // Say what's missing, so the manager knows what to assign.
  const missing = !session?.role && !session?.session ? 'a role and a session' : !session?.role ? 'a role' : 'a session';

  return (
    <Screen centered narrow style={styles.column}>
      <Enter index={0}>
        <Ionicons name="hourglass-outline" size={size.pendingIcon} color={colors.textMuted} />
      </Enter>
      <Enter index={1}>
        <Text style={styles.title}>No flow assigned yet</Text>
      </Enter>
      <Enter index={2}>
        <Text style={styles.body}>{`Contact your manager to get ${missing} assigned.`}</Text>
      </Enter>
      {/* Clearing the session is enough: AuthGate returns signed-out users to Login. */}
      <Enter index={3} style={styles.signOut}>
        <TextLink title="Sign out" onPress={() => void signOut()} />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  title: {
    ...font.titleMobile,
    color: colors.text,
    textAlign: 'center',
    marginTop: space.lg,
  },
  body: {
    ...font.input,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
  },
  signOut: { marginTop: space.xl },
});
