import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { AdminUser, UserStatus } from '../api/types';

const STATUS_ORDER: Record<UserStatus, number> = { Pending: 0, Approved: 1, Rejected: 2 };
const STATUS_COLOR = { Pending: 'warning', Approved: 'success', Rejected: 'default' } as const;

/** Pending first, then the server's order (newest first) within each status. */
export function sortUsers(users: AdminUser[]): AdminUser[] {
  return users
    .map((u, i) => ({ u, i }))
    .sort((a, b) => STATUS_ORDER[a.u.status] - STATUS_ORDER[b.u.status] || a.i - b.i)
    .map((x) => x.u);
}

const none = (
  <Typography variant="body2" color="text.secondary">
    None
  </Typography>
);

type Props = {
  users: AdminUser[];
  /** The signed-in admin, who can't reject themselves. */
  selfId?: string;
  showSession?: boolean;
  loading?: boolean;
  emptyText: string;
  onAssign: (u: AdminUser) => void;
  onReject: (u: AdminUser) => void;
};

export function UsersTable({ users, selfId, showSession = true, loading, emptyText, onAssign, onReject }: Props) {
  const rows = sortUsers(users);
  const cols = showSession ? 7 : 6;

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>CNIC</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Role</TableCell>
            {showSession ? <TableCell>Session</TableCell> : null}
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((u) => {
            const self = String(u.id) === selfId;
            return (
              <TableRow key={u.id} hover>
                <TableCell>
                  {u.name}
                  {u.isAdmin ? <Chip label="Admin" size="small" variant="outlined" sx={{ ml: 1 }} /> : null}
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{u.cnic}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.status} size="small" color={STATUS_COLOR[u.status]} />
                </TableCell>
                <TableCell>{u.role?.name ?? none}</TableCell>
                {showSession ? <TableCell>{u.session?.name ?? none}</TableCell> : null}
                <TableCell align="right">
                  <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
                    <Button size="small" variant={u.status === 'Approved' ? 'text' : 'contained'} onClick={() => onAssign(u)}>
                      {u.status === 'Approved' ? 'Change assignment' : 'Approve'}
                    </Button>
                    {u.status !== 'Rejected' && !self ? (
                      <Button size="small" color="error" onClick={() => onReject(u)}>
                        Reject
                      </Button>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
