import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { Screen } from '@/components/Screen';
import { colors, font, size, space } from '@/theme';

export default function Pending() {
  const router = useRouter();

  return (
    <Screen centered narrow style={styles.column}>
      <Enter index={0}>
        <Ionicons name="time-outline" size={size.pendingIcon} color={colors.textMuted} />
      </Enter>
      <Enter index={1}>
        <Text style={styles.title}>Account sent for approval</Text>
      </Enter>
      <Enter index={2}>
        <Text style={styles.body}>
          You'll be able to sign in once an admin approves your account.
        </Text>
      </Enter>
      <Enter index={3} style={styles.action}>
        <Button title="Back to Sign in" onPress={() => router.replace('/login')} />
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
  action: { marginTop: space.xl, alignSelf: 'stretch' },
});
