import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { boxesApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { AdminBox } from '../api/types';

type Props = {
  /** Only this session's boxes; undefined = all sessions. */
  sessionId?: number;
  showSession?: boolean;
  /** Bump to reload (e.g. after adding a box). */
  reloadKey?: number;
};

/** Paged box list from GET /admin/boxes. */
export function BoxesTable({ sessionId, showSession = true, reloadKey = 0 }: Props) {
  const [page, setPage] = useState(0); // 0-based in the UI, 1-based on the API
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<AdminBox[]>([]);
  const [error, setError] = useState<string>();

  // A new filter starts from the first page.
  useEffect(() => setPage(0), [sessionId]);

  const load = useCallback(async () => {
    try {
      setRows(await boxesApi.list(page + 1, pageSize, sessionId));
      setError(undefined);
    } catch (e) {
      setError(toApiError(e).message);
    }
  }, [page, pageSize, sessionId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  // The API returns a bare page with no total: a short page means it's the last one.
  const count = rows.length < pageSize ? page * pageSize + rows.length : -1;
  const cols = showSession ? 8 : 7;

  return (
    <>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Copy number</TableCell>
                {showSession ? <TableCell>Session</TableCell> : null}
                <TableCell>Center</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Version</TableCell>
                <TableCell align="right">Packet</TableCell>
                <TableCell align="right">Subject ID</TableCell>
                <TableCell align="right">Bag</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{b.copyNumber}</TableCell>
                  {showSession ? <TableCell>{b.sessionName ?? `#${b.sessionId}`}</TableCell> : null}
                  <TableCell>{b.centerName}</TableCell>
                  <TableCell>{b.subject}</TableCell>
                  <TableCell>{b.version}</TableCell>
                  <TableCell align="right">{b.packetNumber}</TableCell>
                  <TableCell align="right">{b.subjectId}</TableCell>
                  <TableCell align="right">{b.bagNo}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={cols} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No boxes {page > 0 ? 'on this page' : 'yet'}.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={count}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
        />
      </Paper>
    </>
  );
}
