import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import { rolesApi, sessionsApi, usersApi } from '../api/admin';
import { toApiError } from '../api/client';
import { USER_STATUSES } from '../api/types';
import type { AdminSession, AdminUser, Role, UserStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AssignDialog } from '../components/AssignDialog';
import { PageHeader } from '../components/PageHeader';
import { RejectDialog } from '../components/RejectDialog';
import { UsersTable } from '../components/UsersTable';

export function UsersPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<UserStatus | 'all'>('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  const [assigning, setAssigning] = useState<AdminUser | null>(null);
  const [rejecting, setRejecting] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [u, r, s] = await Promise.all([
        usersApi.list(filter === 'all' ? undefined : filter),
        rolesApi.list(),
        sessionsApi.list(),
      ]);
      setUsers(u);
      setRoles(r);
      setSessions(s);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (updated: AdminUser) => setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Approve new accounts and assign each one a role and a session. A user needs both to scan."
        action={
          <TextField
            select
            size="small"
            label="Status"
            value={filter}
            onChange={(e) => setFilter(e.target.value as UserStatus | 'all')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All</MenuItem>
            {USER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <UsersTable
        users={users}
        selfId={session?.userId}
        loading={loading}
        emptyText={`No users${filter === 'all' ? '' : ` with status ${filter}`}.`}
        onAssign={setAssigning}
        onReject={setRejecting}
      />

      <AssignDialog
        open={!!assigning}
        user={assigning}
        roles={roles}
        sessions={sessions}
        onClose={() => setAssigning(null)}
        onDone={(u) => {
          setAssigning(null);
          replace(u);
          setToast(`${u.name}: ${u.role?.name} in ${u.session?.name}`);
        }}
      />
      <RejectDialog
        user={rejecting}
        onClose={() => setRejecting(null)}
        onDone={(u) => {
          setRejecting(null);
          replace(u);
          setToast(`${u.name} rejected`);
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </>
  );
}
