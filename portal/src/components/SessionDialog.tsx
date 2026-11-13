import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { sessionsApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminSession } from '../api/types';

type Props = {
  open: boolean;
  /** Null = create. */
  session: AdminSession | null;
  onClose: () => void;
  onDone: (s: AdminSession) => void;
};

/** Create or edit a session's name and active flag (POST / PUT /admin/sessions). */
export function SessionDialog({ open, session, onClose, onDone }: Props) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(session?.name ?? '');
    setIsActive(session?.isActive ?? true);
    setFieldErrors({});
    setError(undefined);
  }, [open, session]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(undefined);
    setSaving(true);
    try {
      const body = { name, isActive };
      onDone(session ? await sessionsApi.update(session.id, body) : await sessionsApi.create(body));
    } catch (err) {
      const apiError = toApiError(err);
      if (Object.keys(apiError.fieldErrors).length) setFieldErrors(apiError.fieldErrors);
      else setError(apiError.message); // e.g. 409 "A session named X already exists"
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{session ? 'Edit session' : 'New session'}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name ?? 'e.g. Matric Annual 2026'}
              required
              autoFocus
              fullWidth
            />
            <div>
              <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" />
              <FormHelperText sx={{ mt: -0.5, ml: 6 }}>
                Users in an inactive session can't look up or save boxes, and no one can be newly assigned to it.
              </FormHelperText>
            </div>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={saving}>
            {session ? 'Save' : 'Create session'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
