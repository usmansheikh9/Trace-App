import { DEV_NO_AUTH } from '@/config';
import { mockBox } from '@/dev';
import { request } from './http';

/** One step of the box's session workflow (backend StageProgressDto). */
export type StageProgress = {
  stageName: string;
  /** 1-based order in the workflow. */
  position: number;
  done: boolean;
  completedByName: string | null;
  /** ISO-8601, or null while pending. */
  completedAt: string | null;
};

/** The box's own fields (backend BoxDto minus workflow). A role's visibleFields pick from these keys. */
export type BoxFields = {
  centerName: string;
  subject: string;
  version: string;
  /** The QR value and the box's identifier. */
  copyNumber: string;
  packetNumber: number;
  subjectId: number;
  bagNo: number;
};

/** Lookup result (backend BoxDto): every box field plus the workflow progress, in stage order. */
export type BoxDto = BoxFields & { workflow: StageProgress[] };

/** Keys a role can list in visibleFields; they are the box field names. */
export type BoxField = keyof BoxFields;

/** Readable labels, in the backend's canonical order (Trace.Core BoxFields.All). */
export const BOX_FIELD_LABELS: Record<BoxField, string> = {
  centerName: 'Center Name',
  subject: 'Subject',
  version: 'Version',
  copyNumber: 'Copy Number',
  packetNumber: 'Packet Number',
  subjectId: 'Subject ID',
  bagNo: 'Bag No.',
};

/** The role's visible rows as [label, value]. Keys the app doesn't know are skipped. */
export function boxRows(box: BoxFields, fields: readonly string[]): { key: BoxField; label: string; value: string }[] {
  return fields
    .filter((f): f is BoxField => f in BOX_FIELD_LABELS)
    .map((key) => ({ key, label: BOX_FIELD_LABELS[key], value: String(box[key] ?? '—') }));
}

/**
 * How a code was committed on the scanner.
 * - 'scan': a batch scan; the Result screen offers Save (if the role can save).
 * - 'find': a loose individual copy (Find Copy); view-only, nothing to record.
 */
export type ScanMode = 'scan' | 'find';

export const boxApi = {
  /**
   * Used by both Scan and Find Copy. 404 when no box has that copy number; coded 403
   * wrong_session / no_session when it isn't the caller's to see.
   */
  lookup(copyNumber: string): Promise<BoxDto> {
    if (DEV_NO_AUTH) return Promise.resolve(mockBox(copyNumber));
    return request<BoxDto>('GET', `/boxes/lookup?copyNumber=${encodeURIComponent(copyNumber)}`, {
      tag: 'boxes.lookup',
    });
  },
};
