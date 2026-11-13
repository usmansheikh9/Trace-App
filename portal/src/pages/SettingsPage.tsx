import { useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { settingsApi } from '../api/admin';
import { toApiError } from '../api/client';
import { PageHeader } from '../components/PageHeader';

/** Matches the backend's SettingsService.MinMasterPasswordLength. */
const MIN_LENGTH = 8;

export function SettingsPage() {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ value?: string; confirm?: string }>({});
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setResult(undefined);
    const next: typeof errors = {};
    if (value.length < MIN_LENGTH) next.value = `Must be at least ${MIN_LENGTH} characters`;
    if (confirm !== value) next.confirm = "Passwords don't match";
    setErrors(next);
    if (next.value || next.confirm) return;

    setSaving(true);
    try {
      await settingsApi.setMasterPassword(value);
      setValue('');
      setConfirm('');
      setResult({ ok: true, text: 'Master password updated. Use the new one when registering staff in person.' });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.fieldErrors.value) setErrors({ value: apiError.fieldErrors.value });
      else setResult({ ok: false, text: apiError.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Paper component="form" onSubmit={submit} sx={{ p: 3, maxWidth: 520 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Master password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
          Entered on the app's registration screen by an admin registering someone in person. A correct master
          password approves the account immediately.
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <TextField
            label="New master password"
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={!!errors.value}
            helperText={errors.value ?? `At least ${MIN_LENGTH} characters.`}
            fullWidth
          />
          <TextField
            label="Confirm new master password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={!!errors.confirm}
            helperText={errors.confirm}
            fullWidth
          />
          {result ? <Alert severity={result.ok ? 'success' : 'error'}>{result.text}</Alert> : null}
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" loading={saving}>
              Update master password
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
