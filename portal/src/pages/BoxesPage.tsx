import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Add from '@mui/icons-material/Add';
import { sessionsApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminSession } from '../api/types';
import { AddBoxDialog } from '../components/AddBoxDialog';
import { BoxesTable } from '../components/BoxesTable';
import { PageHeader } from '../components/PageHeader';

export function BoxesPage() {
  // The session filter lives in the URL (?session=2) so it survives reloads and can be linked.
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('session') ? Number(params.get('session')) : undefined;

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<string>();

  useEffect(() => {
    sessionsApi
      .list()
      .then(setSessions)
      .catch((e) => setError(toApiError(e).message));
  }, []);

  return (
    <>
      <PageHeader
        title="Boxes"
        subtitle="Boxes of answer copies, looked up in the app by their QR copy number. Each belongs to one session."
        action={
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <TextField
              select
              size="small"
              label="Session"
              value={sessionId ?? 'all'}
              onChange={(e) => setParams(e.target.value === 'all' ? {} : { session: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All sessions</MenuItem>
              {sessions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)} disabled={sessions.length === 0}>
              Add box
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {!error && sessions.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>Create a session first: every box belongs to one.</Alert>
      ) : null}

      <BoxesTable sessionId={sessionId} showSession={sessionId === undefined} reloadKey={reloadKey} />

      <AddBoxDialog
        open={adding}
        sessions={sessions}
        fixedSessionId={undefined}
        onClose={() => setAdding(false)}
        onDone={(b) => {
          setAdding(false);
          setToast(`Box ${b.copyNumber} added to ${b.sessionName ?? 'session'}`);
          setReloadKey((k) => k + 1);
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </>
  );
}
