import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import QrCode2 from '@mui/icons-material/QrCode2';
import { toApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/** 00000-0000000-0 while typing (same mask as the mobile app). */
function formatCnic(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/users';

  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setFieldErrors({});
    setLoading(true);
    try {
      await signIn(cnic, password);
      navigate(from, { replace: true });
    } catch (err) {
      const apiError = toApiError(err);
      if (Object.keys(apiError.fieldErrors).length) setFieldErrors(apiError.fieldErrors);
      else setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Stack sx={{ alignItems: 'center', mb: 3 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: '#EEEDF3', display: 'grid', placeItems: 'center' }}>
            <QrCode2 color="primary" fontSize="large" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
            Trace Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in with an admin account
          </Typography>
        </Stack>

        <Stack sx={{ gap: 2 }}>
          <TextField
            label="CNIC"
            placeholder="00000-0000000-0"
            value={cnic}
            onChange={(e) => setCnic(formatCnic(e.target.value))}
            error={!!fieldErrors.cnic}
            helperText={fieldErrors.cnic}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 15 } }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            fullWidth
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button type="submit" variant="contained" size="large" loading={loading} fullWidth>
            Sign in
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
