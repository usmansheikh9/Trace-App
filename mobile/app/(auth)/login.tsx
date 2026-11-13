import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ApiError, AUTH_CODES, authApi } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { FooterPrompt } from '@/components/FooterPrompt';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DEV_NO_AUTH } from '@/config';
import { mockSession } from '@/dev';
import { CNIC_PATTERN, formatCnic } from '@/format';
import { colors, font, radius, size, space } from '@/theme';

type Errors = { cnic?: string; password?: string; form?: string };

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (DEV_NO_AUTH) {
      // DEV: no API, no validation. AuthGate routes to the profile.
      await signIn(mockSession());
      return;
    }

    const next: Errors = {};
    if (!CNIC_PATTERN.test(cnic)) next.cnic = 'Enter a valid CNIC';
    if (!password) next.password = 'Required';
    setErrors(next);
    if (next.cnic || next.password) return;

    setLoading(true);
    try {
      const session = await authApi.login(cnic, password);
      // AuthGate routes to the profile once the session is stored.
      await signIn(session);
    } catch (e) {
      if (e instanceof ApiError && e.code === AUTH_CODES.pending) {
        // Registered but not yet approved: same screen as after registering.
        setErrors({});
        router.push('/pending');
      } else if (e instanceof ApiError && e.code === AUTH_CODES.rejected) {
        setErrors({ form: e.message });
      } else if (e instanceof ApiError) {
        setErrors({
          cnic: e.fieldErrors.cnic,
          password: e.fieldErrors.password,
          form: Object.keys(e.fieldErrors).length ? undefined : e.message,
        });
      } else {
        setErrors({ form: 'Something went wrong' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll centered narrow style={styles.column}>
      <Enter index={0} style={styles.header}>
        <View style={styles.logoTile}>
          <Ionicons name="qr-code-outline" size={size.logoIcon} color={colors.primary} />
        </View>
        <Text style={styles.brand}>Trace</Text>
      </Enter>

      <View style={styles.form}>
        <View style={styles.fields}>
          <Enter index={1}>
            <TextField
              density="login"
              label="CNIC"
              placeholder="00000-0000000-0"
              keyboardType="number-pad"
              maxLength={15}
              value={cnic}
              onChangeText={(t) => setCnic(formatCnic(t))}
              error={errors.cnic}
            />
          </Enter>
          <Enter index={2}>
            <TextField
              density="login"
              label="Password"
              secureTextEntry
              revealable
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              returnKeyType="go"
              error={errors.password}
            />
          </Enter>
        </View>

        {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

        <Enter index={3}>
          <Button title="Sign in" onPress={submit} loading={loading} style={styles.submit} />
        </Enter>
      </View>

      <Enter index={4}>
        <FooterPrompt
          prompt="Need an account?"
          action="Register"
          onPress={() => router.push('/register')}
          style={styles.footer}
        />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { paddingVertical: space.xl },
  header: { alignItems: 'center' },
  logoTile: {
    width: size.logoTile,
    height: size.logoTile,
    borderRadius: radius.logoTile,
    backgroundColor: colors.logoTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...font.display,
    color: colors.text,
    marginTop: space.lg,
  },
  form: { marginTop: space.md },
  fields: { gap: space.md },
  formError: {
    ...font.caption,
    color: colors.danger,
    paddingLeft: space.xs,
    marginTop: space.sm,
  },
  submit: { marginTop: space.sm },
  footer: { marginTop: space.lg },
});
