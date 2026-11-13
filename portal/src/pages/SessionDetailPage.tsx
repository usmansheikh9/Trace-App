import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { rolesApi, sessionsApi, usersApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminSession, AdminUser, Role } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AddBoxDialog } from '../components/AddBoxDialog';
import { AssignDialog } from '../components/AssignDialog';
import { BoxesTable } from '../components/BoxesTable';
import { RejectDialog } from '../components/RejectDialog';
import { SessionDialog } from '../components/SessionDialog';
import { UsersTable } from '../components/UsersTable';
import { WorkflowBuilder } from '../components/WorkflowBuilder';

type TabKey = 'workflow' | 'users' | 'boxes';

export function SessionDetailPage() {
  const id = Number(useParams().id);
  const { session: me } = useAuth();
  const [tab, setTab] = useState<TabKey>('workflow');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [allSessions, setAllSessions] = useState<AdminSession[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();

  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState<AdminUser | 'pick' | null>(null);
  const [rejecting, setRejecting] = useState<AdminUser | null>(null);
  const [addingBox, setAddingBox] = useState(false);
  const [boxesKey, setBoxesKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, all, r, u] = await Promise.all([sessionsApi.get(id), sessionsApi.list(), rolesApi.list(), usersApi.list()]);
      setSession(s);
      setAllSessions(all);
      setRoles(r);
      setUsers(u);
      setError(undefined);
    } catch (e) {
      setError(toApiError(e).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = useMemo(() => users.filter((u) => u.session?.id === id), [users, id]);
  // Anyone not already here can be pulled in; admins stay global.
  const candidates = useMemo(() => users.filter((u) => !u.isAdmin && u.session?.id !== id), [users, id]);

  const refreshCounts = () => sessionsApi.get(id).then(setSession).catch(() => {});

  if (error && !session) return <Alert severity="error">{error}</Alert>;
  if (!session) return <Typography color="text.secondary">Loading…</Typography>;

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/sessions" underline="hover" color="inherit">
          Sessions
        </Link>
        <Typography color="text.primary">{session.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {session.name}
        </Typography>
        <Chip label={session.isActive ? 'Active' : 'Inactive'} size="small" color={session.isActive ? 'success' : 'default'} />
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
          Edit
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {session.stages.length ? session.stages.join(' → ') : 'No workflow yet'} · {session.userCount} users · {session.boxCount} boxes
      </Typography>

      {!session.isActive ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This session is inactive: its users can't look up or save boxes, and no one can be newly assigned to it.
        </Alert>
      ) : null}
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #EEEDF3' }}>
        <Tab value="workflow" label="Workflow" />
        <Tab value="users" label={`Users (${members.length})`} />
        <Tab value="boxes" label={`Boxes (${session.boxCount})`} />
      </Tabs>

      {tab === 'workflow' ? (
        <WorkflowBuilder
          sessionId={id}
          roles={roles}
          onSaved={(stages) => setSession((s) => (s ? { ...s, stages } : s))}
        />
      ) : null}

      {tab === 'users' ? (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Users who scan this session's boxes. Each still needs a role.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setAssigning('pick')} disabled={!session.isActive}>
              Assign user
            </Button>
          </Stack>
          <UsersTable
            users={members}
            selfId={me?.userId}
            showSession={false}
            emptyText="No users in this session yet."
            onAssign={setAssigning}
            onReject={setRejecting}
          />
        </>
      ) : null}

      {tab === 'boxes' ? (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Only users in this session can look up or scan these boxes.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setAddingBox(true)}>
              Add box
            </Button>
          </Stack>
          <BoxesTable sessionId={id} showSession={false} reloadKey={boxesKey} />
        </>
      ) : null}

      <SessionDialog
        open={editing}
        session={session}
        onClose={() => setEditing(false)}
        onDone={(s) => {
          setEditing(false);
          setSession(s);
          setToast('Session saved');
        }}
      />
      <AssignDialog
        open={assigning !== null}
        user={assigning === 'pick' ? null : assigning}
        candidates={candidates}
        roles={roles}
        sessions={allSessions}
        // "Assign user" pulls someone into this session; "Change assignment" may move them out.
        fixedSessionId={assigning === 'pick' ? id : undefined}
        onClose={() => setAssigning(null)}
        onDone={(u) => {
          setAssigning(null);
          setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));
          setToast(`${u.name}: ${u.role?.name} in ${u.session?.name}`);
          void refreshCounts();
        }}
      />
      <RejectDialog
        user={rejecting}
        onClose={() => setRejecting(null)}
        onDone={(u) => {
          setRejecting(null);
          setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));
          setToast(`${u.name} rejected`);
        }}
      />
      <AddBoxDialog
        open={addingBox}
        sessions={allSessions}
        fixedSessionId={id}
        onClose={() => setAddingBox(false)}
        onDone={(b) => {
          setAddingBox(false);
          setBoxesKey((k) => k + 1);
          setToast(`Box ${b.copyNumber} added`);
          void refreshCounts();
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </>
  );
}
