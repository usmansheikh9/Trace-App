import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import ChevronRight from '@mui/icons-material/ChevronRight';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { sessionsApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminSession } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { SessionDialog } from '../components/SessionDialog';

export function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<AdminSession | 'new' | null>(null);
  const [toast, setToast] = useState<string>();

  const load = useCallback(async () => {
    try {
      setSessions(await sessionsApi.list());
      setError(undefined);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="A session owns its workflow (the ordered stages every box passes through), its users and its boxes."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>
            New session
          </Button>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell align="right">Users</TableCell>
              <TableCell align="right">Boxes</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id} hover onClick={() => navigate(`/sessions/${s.id}`)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell>
                  <Chip label={s.isActive ? 'Active' : 'Inactive'} size="small" color={s.isActive ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  {s.stages.length ? (
                    <Typography variant="body2">
                      <Typography component="span" variant="body2" color="text.secondary">
                        {s.stages.length} {s.stages.length === 1 ? 'stage' : 'stages'}:{' '}
                      </Typography>
                      {s.stages.join(' → ')}
                    </Typography>
                  ) : (
                    <Chip label="No workflow yet" size="small" color="warning" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right">{s.userCount}</TableCell>
                <TableCell align="right">{s.boxCount}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Edit name / active">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(s);
                      }}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <ChevronRight fontSize="small" sx={{ color: 'text.secondary', verticalAlign: 'middle', ml: 1 }} />
                </TableCell>
              </TableRow>
            ))}
            {!loading && sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No sessions yet. Create one, then build its workflow.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <SessionDialog
        open={editing !== null}
        session={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onDone={(s) => {
          const created = editing === 'new';
          setEditing(null);
          if (created) {
            // Straight into the new session so its workflow can be built.
            navigate(`/sessions/${s.id}`);
          } else {
            setToast(`Session ${s.name} saved`);
            void load();
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </>
  );
}
