import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import DragIndicator from '@mui/icons-material/DragIndicator';
import { sessionsApi } from '../api/admin';
import { toApiError } from '../api/client';
import type { Role, WorkflowStage } from '../api/types';
import { findOrphans, isDirty, norm, rowErrors as validateRows } from './workflowRules';
import type { Orphan, StageItem as Item } from './workflowRules';

let nextKey = 0;
const toItems = (stages: WorkflowStage[]): Item[] =>
  stages.map((s) => ({ key: `k${nextKey++}`, name: s.stageName, originalName: s.stageName, scanCount: s.scanCount }));

type Props = {
  sessionId: number;
  roles: Role[];
  /** Called after a successful save with the stage names, so the page can refresh its summary. */
  onSaved?: (stages: string[]) => void;
};

export function WorkflowBuilder({ sessionId, roles, onSaved }: Props) {
  const [saved, setSaved] = useState<WorkflowStage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [draftName, setDraftName] = useState('');
  const [addError, setAddError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Orphan[] | null>(null);
  const [notice, setNotice] = useState<string>();

  // Drag state: the row being dragged and the gap it would drop into (0..items.length).
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let active = true;
    setLoading(true);
    sessionsApi
      .getWorkflow(sessionId)
      .then((wf) => {
        if (!active) return;
        setSaved(wf.stages);
        setItems(toItems(wf.stages));
        setLoadError(undefined);
      })
      .catch((e) => active && setLoadError(toApiError(e).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Which roles save at each stage (by normalized name): a stage no role saves at is a dead end.
  const rolesByStage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of roles) {
      if (!r.saveStage || !r.canSave) continue;
      const k = norm(r.saveStage);
      map.set(k, [...(map.get(k) ?? []), r.isActive ? r.name : `${r.name} (inactive)`]);
    }
    return map;
  }, [roles]);

  // Suggestions: role save stages not already in the list.
  const suggestions = useMemo(() => {
    const taken = new Set(items.map((i) => norm(i.name)));
    const out: string[] = [];
    for (const r of roles) {
      const stage = r.saveStage?.trim();
      if (!stage || taken.has(norm(stage))) continue;
      taken.add(norm(stage)); // one suggestion per name
      out.push(stage);
    }
    return out;
  }, [roles, items]);

  const rowErrors = useMemo(() => validateRows(items), [items]);
  const listError = items.length === 0 ? 'Add at least one stage' : undefined;
  const invalid = !!listError || [...rowErrors.values()].some(Boolean);
  const dirty = isDirty(saved, items);

  function update(key: string, name: string) {
    setNotice(undefined);
    setItems((list) => list.map((i) => (i.key === key ? { ...i, name } : i)));
  }

  function remove(key: string) {
    setNotice(undefined);
    setItems((list) => list.filter((i) => i.key !== key));
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    setNotice(undefined);
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function add(raw: string | null) {
    const name = (raw ?? draftName).trim();
    if (!name) return;
    if (items.some((i) => norm(i.name) === norm(name))) {
      setAddError(`${name} is already in the workflow`);
      return;
    }
    setNotice(undefined);
    setItems((list) => [...list, { key: `k${nextKey++}`, name, originalName: null, scanCount: 0 }]);
    setDraftName('');
    setAddError(undefined);
  }

  // ---- Drag to reorder (native HTML5 DnD; the handle starts it, rows are drop targets) ----
  function onDragStart(e: DragEvent, key: string) {
    setDragKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
    const row = rowRefs.current.get(key);
    if (row) e.dataTransfer.setDragImage(row, 24, 24);
  }

  function onDragOver(e: DragEvent, index: number) {
    if (!dragKey) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Top half of a row = drop before it, bottom half = after it.
    setDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (dragKey !== null && dropIndex !== null) {
      const from = items.findIndex((i) => i.key === dragKey);
      // Removing the dragged row first shifts later gaps up by one.
      move(from, dropIndex > from ? dropIndex - 1 : dropIndex);
    }
    endDrag();
  }

  function endDrag() {
    setDragKey(null);
    setDropIndex(null);
  }

  // ---- Save ----
  function requestSave() {
    setSubmitted(true);
    setServerError(undefined);
    if (invalid) return;
    const affected: Orphan[] = findOrphans(saved, items);
    if (affected.length) setConfirm(affected);
    else void save();
  }

  async function save() {
    setConfirm(null);
    setSaving(true);
    try {
      const wf = await sessionsApi.saveWorkflow(sessionId, items.map((i) => i.name.trim()));
      setSaved(wf.stages);
      setItems(toItems(wf.stages));
      setSubmitted(false);
      setNotice('Workflow saved');
      onSaved?.(wf.stages.map((s) => s.stageName));
    } catch (e) {
      const err = toApiError(e);
      setServerError(err.fieldErrors.stages ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  function revert() {
    setItems(toItems(saved));
    setSubmitted(false);
    setServerError(undefined);
    setNotice(undefined);
  }

  if (loading) return <Typography color="text.secondary">Loading workflow…</Typography>;
  if (loadError) return <Alert severity="error">{loadError}</Alert>;

  return (
    <Stack sx={{ gap: 2, maxWidth: 760 }}>
      <Typography variant="body2" color="text.secondary">
        Every box in this session moves through these stages in order. A user saves at their role's stage, and only once the
        stage before it is done. The first stage is always open. Drag to reorder.
      </Typography>

      <Paper onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropIndex(null)}>
        {items.map((item, index) => {
          const err = submitted || item.name !== item.originalName ? rowErrors.get(item.key) : undefined;
          const savers = rolesByStage.get(norm(item.name));
          return (
            <Box
              key={item.key}
              ref={(el: HTMLDivElement | null) => {
                if (el) rowRefs.current.set(item.key, el);
                else rowRefs.current.delete(item.key);
              }}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={onDrop}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderTop: index === 0 ? 'none' : '1px solid #EEEDF3',
                opacity: dragKey === item.key ? 0.4 : 1,
                // Drop indicator: a primary line in the gap the row would land in.
                boxShadow:
                  dropIndex === index
                    ? 'inset 0 2px 0 #005AB3'
                    : dropIndex === index + 1 && index === items.length - 1
                      ? 'inset 0 -2px 0 #005AB3'
                      : 'none',
              }}
            >
              <Box
                draggable
                onDragStart={(e) => onDragStart(e, item.key)}
                onDragEnd={endDrag}
                aria-label={`Drag ${item.name || 'stage'}`}
                sx={{ cursor: 'grab', color: 'text.secondary', display: 'flex', pt: 1, '&:active': { cursor: 'grabbing' } }}
              >
                <DragIndicator />
              </Box>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  mt: 0.5,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: '#E8F1FB',
                  color: 'primary.main',
                  fontWeight: 700,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={item.name}
                  onChange={(e) => update(item.key, e.target.value)}
                  error={!!err}
                  helperText={err}
                  slotProps={{ htmlInput: { 'aria-label': `Stage ${index + 1} name`, maxLength: 100 } }}
                />
                <Stack direction="row" sx={{ gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                  {savers ? (
                    <Typography variant="caption" color="text.secondary">
                      Saved by {savers.join(', ')}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="warning.main">
                      No role saves at this stage yet
                    </Typography>
                  )}
                  {item.scanCount > 0 ? (
                    <Chip size="small" variant="outlined" label={`${item.scanCount} scanned`} sx={{ height: 20 }} />
                  ) : null}
                  {item.originalName === null ? <Chip size="small" color="primary" label="New" sx={{ height: 20 }} /> : null}
                </Stack>
              </Box>
              <Stack direction="row" sx={{ pt: 0.25 }}>
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move up">
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => move(index, index + 1)}
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove">
                  <IconButton size="small" color="error" onClick={() => remove(item.key)} aria-label={`Remove ${item.name}`}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          );
        })}
        {items.length === 0 ? (
          <Typography color={submitted ? 'error' : 'text.secondary'} sx={{ p: 3, textAlign: 'center' }}>
            {submitted ? listError : 'No stages yet. Add the first one below.'}
          </Typography>
        ) : null}
      </Paper>

      <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
        <Autocomplete
          freeSolo
          options={suggestions}
          inputValue={draftName}
          onInputChange={(_, v) => {
            setDraftName(v);
            setAddError(undefined);
          }}
          onChange={(_, v) => typeof v === 'string' && add(v)}
          sx={{ flexGrow: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Add a stage"
              placeholder="Pick a role's save stage or type a new one"
              error={!!addError}
              helperText={addError}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draftName.trim()) {
                  e.preventDefault();
                  add(null);
                }
              }}
            />
          )}
        />
        <Button variant="outlined" startIcon={<Add />} onClick={() => add(null)} disabled={!draftName.trim()} sx={{ height: 40 }}>
          Add
        </Button>
      </Stack>

      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      {notice && !dirty ? <Alert severity="success">{notice}</Alert> : null}

      <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={revert} disabled={!dirty || saving}>
          Revert
        </Button>
        <Button variant="contained" onClick={requestSave} disabled={!dirty || (submitted && invalid)} loading={saving}>
          Save workflow
        </Button>
      </Stack>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Orphan recorded progress?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            These stages already have scans. Boxes keep their records, but the records stop counting toward the workflow, so
            those boxes will show the stage as not done:
          </DialogContentText>
          <Stack component="ul" sx={{ m: 0, pl: 3, gap: 0.5 }}>
            {confirm?.map((o) => (
              <li key={o.stage.stageName}>
                <Typography variant="body2">
                  <strong>{o.stage.stageName}</strong> ({o.stage.scanCount} scanned){' '}
                  {o.renamedTo ? (
                    <>
                      renamed to <strong>{o.renamedTo}</strong>
                    </>
                  ) : (
                    'removed'
                  )}
                </Typography>
              </li>
            ))}
          </Stack>
          <DialogContentText sx={{ mt: 1.5 }}>
            Roles whose save stage no longer matches can't save in this session until their stage is updated.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Keep editing</Button>
          <Button color="warning" variant="contained" onClick={() => void save()}>
            Save anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
