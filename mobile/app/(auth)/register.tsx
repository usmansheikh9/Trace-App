import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError, authApi } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { FooterPrompt } from '@/components/FooterPrompt';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DEV_NO_AUTH } from '@/config';
import { mockSession } from '@/dev';
import { checkDob, CNIC_PATTERN, formatCnic, formatDmyInput } from '@/format';
import { colors, font, space } from '@/theme';

type Field = 'name' | 'cnic' | 'email' | 'dateOfBirth' | 'password' | 'masterPassword';
type Errors = Partial<Record<Field | 'form', string>>;

export default function Register() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  /** As typed, DD/MM/YYYY. */
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const dob = checkDob(dateOfBirth);

    if (DEV_NO_AUTH) {
      // DEV: no API. Master Password filled = approved, empty = pending.
      if (masterPassword) {
        await signIn(
          mockSession(undefined, {
            name: name.trim(),
            cnic,
            email: email.trim(),
            dateOfBirth: dob.ok ? dob.iso : undefined,
          }),
        );
      } else {
        router.replace('/pending');
      }
      return;
    }

    const next: Errors = {};
    if (!name.trim()) next.name = 'Required';
    if (!CNIC_PATTERN.test(cnic)) next.cnic = 'Enter a valid CNIC';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (!dob.ok) next.dateOfBirth = dob.error;
    if (!password) next.password = 'Required';
    setErrors(next);
    if (!dob.ok || Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await authApi.register({
        name: name.trim(),
        cnic,
        email: email.trim(),
        dateOfBirth: dob.iso,
        password,
        masterPassword: masterPassword || undefined,
      });

      if (res.status === 'Approved') {
        // AuthGate routes to the profile once the session is stored.
        await signIn(res.session);
      } else {
        router.replace('/pending');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        const hasFields = Object.keys(e.fieldErrors).length > 0;
        setErrors({
          name: e.fieldErrors.name,
          cnic: e.fieldErrors.cnic,
          email: e.fieldErrors.email,
          dateOfBirth: e.fieldErrors.dateOfBirth,
          password: e.fieldErrors.password,
          masterPassword: e.fieldErrors.masterPassword,
          form: hasFields ? undefined : e.message,
        });
      } else {
        setErrors({ form: 'Something went wrong' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Enter index={0}>
        <Text style={styles.title}>Create account</Text>
      </Enter>

      <View style={styles.fields}>
        <Enter index={1}>
          <TextField
            label="Name"
            autoCapitalize="words"
            textContentType="name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />
        </Enter>
        <Enter index={2}>
          <TextField
            label="CNIC"
            placeholder="00000-0000000-0"
            keyboardType="number-pad"
            maxLength={15}
            value={cnic}
            onChangeText={(t) => setCnic(formatCnic(t))}
            error={errors.cnic}
          />
        </Enter>
        <Enter index={3}>
          <TextField
            label="Email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />
        </Enter>
        <Enter index={4}>
          <TextField
            label="Date of Birth"
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            maxLength={10}
            value={dateOfBirth}
            onChangeText={(t) => setDateOfBirth(formatDmyInput(t))}
            error={errors.dateOfBirth}
          />
        </Enter>
        <Enter index={5}>
          <TextField
            label="Password"
            secureTextEntry
            revealable
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />
        </Enter>
        <Enter index={6}>
          <TextField
            label="Master Password"
            subtitle="Optional. Enter only if an admin is registering you in person."
            secureTextEntry
            revealable
            value={masterPassword}
            onChangeText={setMasterPassword}
            error={errors.masterPassword}
          />
        </Enter>
      </View>

      {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

      <Enter index={7}>
        <Button title="Create account" onPress={submit} loading={loading} style={styles.submit} />
      </Enter>

      <Enter index={8}>
        <FooterPrompt
          prompt="Already have an account?"
          action="Sign in"
          onPress={() => router.back()}
          style={styles.footer}
        />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...font.titleMobile,
    color: colors.text,
    paddingVertical: space.lg,
  },
  fields: { gap: space.md },
  formError: {
    ...font.caption,
    color: colors.danger,
    paddingLeft: space.xs,
    marginTop: space.md,
  },
  submit: { marginTop: space.lg },
  footer: { marginTop: space.lg, marginBottom: space.lg },
});
