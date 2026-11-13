import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { boxesApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminBox, AdminSession, CreateBoxRequest } from '../api/types';

const EMPTY = { centerName: '', subject: '', version: '', copyNumber: '', packetNumber: '', subjectId: '', bagNo: '' };
type Draft = typeof EMPTY;

type Props = {
  open: boolean;
  sessions: AdminSession[];
  /** Locks the session (adding from inside a session). */
  fixedSessionId?: number;
  onClose: () => void;
  onDone: (b: AdminBox) => void;
};

/** POST /admin/boxes. A box always belongs to a session. */
export function AddBoxDialog({ open, sessions, fixedSessionId, onClose, onDone }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY);
    setSessionId(fixedSessionId ?? (sessions.length === 1 ? sessions[0].id : ''));
    setFieldErrors({});
    setError(undefined);
  }, [open, fixedSessionId, sessions]);

  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(undefined);
    setSaving(true);
    const body: CreateBoxRequest = {
      sessionId: sessionId === '' ? null : sessionId,
      centerName: draft.centerName,
      subject: draft.subject,
      version: draft.version,
      copyNumber: draft.copyNumber,
      packetNumber: num(draft.packetNumber),
      subjectId: num(draft.subjectId),
      bagNo: num(draft.bagNo),
    };
    try {
      onDone(await boxesApi.create(body));
    } catch (err) {
      const apiError = toApiError(err);
      if (Object.keys(apiError.fieldErrors).length) setFieldErrors(apiError.fieldErrors);
      else setError(apiError.message); // e.g. 409 "Box 30000003 already exists"
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof Draft, label: string, extra: { maxLength?: number; numeric?: boolean } = {}) => (
    <TextField
      label={label}
      value={draft[key]}
      onChange={(e) => {
        const v = extra.numeric ? e.target.value.replace(/\D/g, '') : e.target.value;
        setDraft((d) => ({ ...d, [key]: v }));
      }}
      error={!!fieldErrors[key]}
      helperText={fieldErrors[key]}
      required
      fullWidth
      slotProps={{ htmlInput: { maxLength: extra.maxLength, inputMode: extra.numeric ? 'numeric' : undefined } }}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>Add box</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              select
              label="Session"
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
              disabled={fixedSessionId !== undefined}
              error={!!fieldErrors.sessionId}
              helperText={fieldErrors.sessionId ?? 'Only users in this session can scan the box.'}
              required
              fullWidth
            >
              {sessions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                  {s.isActive ? '' : ' (inactive)'}
                </MenuItem>
              ))}
            </TextField>
            {field('copyNumber', 'Copy number (QR value)', { maxLength: 10 })}
            {field('centerName', 'Center name')}
            <Stack direction="row" sx={{ gap: 2 }}>
              {field('subject', 'Subject', { maxLength: 20 })}
              {field('version', 'Version', { maxLength: 2 })}
            </Stack>
            <Stack direction="row" sx={{ gap: 2 }}>
              {field('packetNumber', 'Packet number', { numeric: true })}
              {field('subjectId', 'Subject ID', { numeric: true })}
              {field('bagNo', 'Bag no.', { numeric: true })}
            </Stack>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={saving}>
            Add box
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
