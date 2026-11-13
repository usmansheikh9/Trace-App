import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import { rolesApi } from '../api/admin';
import { toApiError } from '../api/client';
import { BOX_FIELD_LABELS, BOX_FIELDS } from '../api/types';
import type { BoxField, Role, SaveRoleRequest } from '../api/types';
import { PageHeader } from '../components/PageHeader';

const EMPTY: SaveRoleRequest = {
  name: '',
  saveStage: '',
  canScan: true,
  canFindCopy: false,
  canSave: false,
  canPrint: false,
  visibleFields: [...BOX_FIELDS],
  isActive: true,
};

const SWITCHES: { key: 'canScan' | 'canFindCopy' | 'canSave' | 'canPrint'; label: string; help: string }[] = [
  { key: 'canScan', label: 'Scan', help: 'Shows the Scan button (batch scanning).' },
  { key: 'canFindCopy', label: 'Find Copy', help: 'Shows Find Copy (view-only lookup of a loose copy).' },
  { key: 'canSave', label: 'Save', help: 'Records scans at the save stage. Scan Next also saves.' },
  { key: 'canPrint', label: 'Print Slip', help: 'Shows Print Slip on the result.' },
];

const byCanonical = (fields: BoxField[]) => BOX_FIELDS.filter((f) => fields.includes(f));

/** "new" = the create form; a number = editing that role. */
type Selection = 'new' | number;

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [listError, setListError] = useState<string>();
  const [selected, setSelected] = useState<Selection>('new');
  const [form, setForm] = useState<SaveRoleRequest>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>();

  const loadList = useCallback(async () => {
    try {
      setRoles(await rolesApi.list());
      setListError(undefined);
    } catch (e) {
      setListError(toApiError(e).message);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function resetMessages() {
    setFieldErrors({});
    setFormError(undefined);
  }

  function startNew() {
    resetMessages();
    setSelected('new');
    setForm(EMPTY);
  }

  async function select(id: number) {
    resetMessages();
    setSelected(id);
    try {
      // Fresh copy of the role, in case someone else edited it.
      const r = await rolesApi.get(id);
      setForm({
        name: r.name,
        saveStage: r.saveStage ?? '',
        canScan: r.canScan,
        canFindCopy: r.canFindCopy,
        canSave: r.canSave,
        canPrint: r.canPrint,
        visibleFields: byCanonical(r.visibleFields),
        isActive: r.isActive,
      });
    } catch (e) {
      setFormError(toApiError(e).message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setSaving(true);
    const body: SaveRoleRequest = { ...form, saveStage: form.saveStage?.trim() ? form.saveStage.trim() : null };
    try {
      const saved = selected === 'new' ? await rolesApi.create(body) : await rolesApi.update(selected, body);
      await loadList();
      setSelected(saved.id);
      setForm({ ...body, saveStage: saved.saveStage ?? '', visibleFields: byCanonical(saved.visibleFields) });
      setToast(selected === 'new' ? `Role ${saved.name} created` : `Role ${saved.name} saved`);
    } catch (err) {
      const apiError = toApiError(err);
      if (Object.keys(apiError.fieldErrors).length) setFieldErrors(apiError.fieldErrors);
      else setFormError(apiError.message); // e.g. 409 "A role named X already exists"
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof SaveRoleRequest>(key: K, value: SaveRoleRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Each role is a flow: the switches decide what the app shows, and saves are stamped with the role's stage."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={startNew}>
            New role
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
        <Paper sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
          {listError ? <Alert severity="error" sx={{ m: 2 }}>{listError}</Alert> : null}
          <List disablePadding>
            {roles.map((r, i) => (
              <Box key={r.id}>
                {i > 0 ? <Divider /> : null}
                <ListItemButton selected={selected === r.id} onClick={() => void select(r.id)} sx={{ py: 1.5 }}>
                  <ListItemText
                    primary={
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>{r.name}</Typography>
                        {!r.isActive ? <Chip label="Inactive" size="small" /> : null}
                      </Stack>
                    }
                    secondary={
                      <Stack component="span" direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                        {SWITCHES.filter((s) => r[s.key]).map((s) => (
                          <Chip key={s.key} label={s.label} size="small" color="primary" variant="outlined" component="span" />
                        ))}
                        {r.saveStage ? <Chip label={`Stage: ${r.saveStage}`} size="small" component="span" /> : null}
                      </Stack>
                    }
                    slotProps={{ secondary: { component: 'div' } }}
                  />
                </ListItemButton>
              </Box>
            ))}
            {roles.length === 0 && !listError ? (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No roles yet.
              </Typography>
            ) : null}
          </List>
        </Paper>

        <Paper component="form" onSubmit={submit} sx={{ flexGrow: 1, p: 3, width: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {selected === 'new' ? 'New role' : `Edit ${roles.find((r) => r.id === selected)?.name ?? 'role'}`}
          </Typography>

          <Stack sx={{ gap: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                required
                fullWidth
              />
              <TextField
                label="Save stage"
                value={form.saveStage ?? ''}
                onChange={(e) => set('saveStage', e.target.value)}
                error={!!fieldErrors.saveStage}
                helperText={fieldErrors.saveStage ?? 'Stamped on every scan this role saves, e.g. Received. Required when Save is on.'}
                fullWidth
              />
            </Stack>

            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Capabilities
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ flexWrap: 'wrap', columnGap: 3 }}>
                {SWITCHES.map((s) => (
                  <Box key={s.key} sx={{ width: { sm: 'calc(50% - 12px)' } }}>
                    <FormControlLabel
                      control={<Switch checked={form[s.key]} onChange={(e) => set(s.key, e.target.checked)} />}
                      label={s.label}
                    />
                    <FormHelperText sx={{ mt: -0.5, mb: 1, ml: 6 }}>{s.help}</FormHelperText>
                  </Box>
                ))}
              </Stack>
            </div>

            <TextField
              select
              label="Visible fields"
              value={form.visibleFields}
              onChange={(e) => {
                const v = e.target.value as unknown as BoxField[] | string;
                set('visibleFields', byCanonical(typeof v === 'string' ? (v.split(',') as BoxField[]) : v));
              }}
              error={!!fieldErrors.visibleFields}
              helperText={fieldErrors.visibleFields ?? 'Box fields shown on the result screen, in this order.'}
              fullWidth
              slotProps={{
                select: {
                  multiple: true,
                  renderValue: (value) => (
                    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                      {(value as BoxField[]).map((f) => (
                        <Chip key={f} label={BOX_FIELD_LABELS[f]} size="small" />
                      ))}
                    </Stack>
                  ),
                },
              }}
            >
              {BOX_FIELDS.map((f) => (
                <MenuItem key={f} value={f}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" size="small" checked={form.visibleFields.includes(f)} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemText primary={BOX_FIELD_LABELS[f]} secondary={f} />
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />}
              label="Active"
            />
            <FormHelperText sx={{ mt: -2.5, ml: 6 }}>
              Users on an inactive role see "No flow assigned" and can't be newly assigned to it.
            </FormHelperText>

            {formError ? <Alert severity="error">{formError}</Alert> : null}

            <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
              {selected !== 'new' ? <Button onClick={() => void select(selected)}>Revert</Button> : null}
              <Button type="submit" variant="contained" loading={saving}>
                {selected === 'new' ? 'Create role' : 'Save changes'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </>
  );
}
