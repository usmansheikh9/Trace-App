import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { usersApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminSession, AdminUser, Role } from '../api/types';

type Props = {
  open: boolean;
  /** The user to assign. Null with `candidates` = pick the user in the dialog. */
  user: AdminUser | null;
  /** Users offered when `user` is null (e.g. "Assign user" from a session). */
  candidates?: AdminUser[];
  roles: Role[];
  sessions: AdminSession[];
  /** Locks the session (assigning from inside a session). */
  fixedSessionId?: number;
  onClose: () => void;
  onDone: (u: AdminUser) => void;
};

/**
 * Approve / change assignment: a role AND a session, both required and both active
 * (POST /admin/users/{id}/approve { roleId, sessionId }).
 */
export function AssignDialog({ open, user, candidates, roles, sessions, fixedSessionId, onClose, onDone }: Props) {
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const [roleId, setRoleId] = useState<number | ''>('');
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const target = user ?? picked;
  // The server rejects inactive roles and sessions, so only offer active ones
  // (plus the locked session, so the field can show it).
  const activeRoles = roles.filter((r) => r.isActive);
  const activeSessions = sessions.filter((s) => s.isActive || s.id === fixedSessionId);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setRoleId(user?.role?.id ?? '');
    setSessionId(fixedSessionId ?? user?.session?.id ?? '');
    setFieldErrors({});
    setError(undefined);
  }, [open, user, fixedSessionId]);

  // Picking a user in the dialog pre-fills their current role.
  useEffect(() => {
    if (picked) setRoleId(picked.role?.id ?? '');
  }, [picked]);

  async function submit() {
    if (!target || roleId === '' || sessionId === '') return;
    setSaving(true);
    setFieldErrors({});
    setError(undefined);
    try {
      onDone(await usersApi.approve(target.id, roleId, sessionId));
    } catch (e) {
      const err = toApiError(e);
      if (Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const changing = target?.status === 'Approved';
  const lockedSession = sessions.find((s) => s.id === fixedSessionId);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{user ? (changing ? 'Change assignment' : 'Approve user') : `Assign user to ${lockedSession?.name ?? 'session'}`}</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 0.5 }}>
          {user ? (
            <DialogContentText>
              {user.name} ({user.cnic}) will work in this session with this role's flow. Both are required.
            </DialogContentText>
          ) : (
            <Autocomplete
              options={candidates ?? []}
              value={picked}
              onChange={(_, v) => setPicked(v)}
              getOptionLabel={(u) => `${u.name} · ${u.cnic}`}
              renderOption={(props, u) => (
                <li {...props} key={u.id}>
                  <Stack>
                    <span>{u.name}</span>
                    <Typography variant="caption" color="text.secondary">
                      {u.cnic} · {u.status}
                      {u.session ? ` · now in ${u.session.name}` : ' · no session'}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="User" autoFocus />}
              noOptionsText="Everyone is already in this session"
            />
          )}

          <TextField
            select
            fullWidth
            label="Role"
            value={roleId}
            onChange={(e) => setRoleId(Number(e.target.value))}
            error={!!fieldErrors.roleId}
            helperText={fieldErrors.roleId ?? (activeRoles.length === 0 ? 'Create an active role first.' : undefined)}
          >
            {activeRoles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
                {r.saveStage ? (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    · saves as {r.saveStage}
                  </Typography>
                ) : null}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Session"
            value={sessionId}
            onChange={(e) => setSessionId(Number(e.target.value))}
            disabled={fixedSessionId !== undefined}
            error={!!fieldErrors.sessionId}
            helperText={fieldErrors.sessionId ?? (activeSessions.length === 0 ? 'Create an active session first.' : undefined)}
          >
            {activeSessions.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
                {s.stages.length ? (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    · {s.stages.join(' → ')}
                  </Typography>
                ) : null}
              </MenuItem>
            ))}
          </TextField>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!target || roleId === '' || sessionId === ''} loading={saving}>
          {user && !changing ? 'Approve' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
