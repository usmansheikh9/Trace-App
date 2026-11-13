import type { WorkflowStage } from '../api/types';

/** One editable row. `originalName` ties a row to the saved stage it came from (null = added here). */
export type StageItem = { key: string; name: string; originalName: string | null; scanCount: number };

/** A saved stage whose records the pending change would orphan. */
export type Orphan = { stage: WorkflowStage; renamedTo: string | null };

/** Stage names match case-insensitively on the server (Workflow.SameStage). */
export const norm = (s: string) => s.trim().toLowerCase();

/** Per-row errors, mirroring the server: non-blank, unique (case-insensitive). */
export function rowErrors(items: StageItem[]): Map<string, string | undefined> {
  const counts = new Map<string, number>();
  items.forEach((i) => counts.set(norm(i.name), (counts.get(norm(i.name)) ?? 0) + 1));
  return new Map(
    items.map((i) => [i.key, !i.name.trim() ? 'Required' : (counts.get(norm(i.name)) ?? 0) > 1 ? 'Duplicate name' : undefined]),
  );
}

/**
 * Saved stages with scans whose name no longer appears: removed, or renamed (row kept, name
 * changed). A name kept or re-added (in any case) is not orphaned.
 */
export function findOrphans(saved: WorkflowStage[], items: StageItem[]): Orphan[] {
  const names = new Set(items.map((i) => norm(i.name)));
  return saved
    .filter((s) => s.scanCount > 0 && !names.has(norm(s.stageName)))
    .map((s) => ({ stage: s, renamedTo: items.find((i) => i.originalName === s.stageName)?.name.trim() ?? null }));
}

/** True when the list differs from what's saved (order or names). */
export function isDirty(saved: WorkflowStage[], items: StageItem[]): boolean {
  return items.length !== saved.length || items.some((i, idx) => i.name.trim() !== saved[idx]?.stageName);
}
