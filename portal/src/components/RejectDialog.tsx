import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { usersApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminUser } from '../api/types';

export function RejectDialog({ user, onClose, onDone }: { user: AdminUser | null; onClose: () => void; onDone: (u: AdminUser) => void }) {
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => setError(undefined), [user]);

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      onDone(await usersApi.reject(user.id));
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reject {user?.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>They won't be able to sign in. You can approve them again later.</DialogContentText>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={submit} loading={saving}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
