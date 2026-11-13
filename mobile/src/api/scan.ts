import { DEV_NO_AUTH } from '@/config';
import { request } from './http';

/** Backend ScanRecordDto. */
export type ScanRecord = {
  id: string;
  copyNumber: string;
  /** Set by the server from the caller's role (saveStage). */
  stage: string;
  roleId: number;
  /** ISO-8601 timestamp. */
  savedAt: string;
};

/**
 * Coded failures from POST /scans and GET /boxes/lookup (problem Title). In every case nothing
 * was recorded; the server's message (ApiError.message) is written for the user.
 */
export const SCAN_CODES = {
  /** 409: the box already has a record at the caller's stage. */
  alreadyScanned: 'already_scanned',
  /** 409: the previous workflow stage isn't done yet ("Must be Cut first."). */
  outOfOrder: 'out_of_order',
  /** 403: the box belongs to another session. */
  wrongSession: 'wrong_session',
  /** 403: the caller has no active session. */
  noSession: 'no_session',
  /** 403: the caller's role stage isn't a step of this session's workflow. */
  stageNotInWorkflow: 'stage_not_in_workflow',
} as const;

export type ScanCode = (typeof SCAN_CODES)[keyof typeof SCAN_CODES];

export function isScanCode(code: string | undefined): code is ScanCode {
  return !!code && (Object.values(SCAN_CODES) as string[]).includes(code);
}

export const scanApi = {
  /** Records a scan. Requires the role's canSave; the server derives the stage, so only the number is sent. */
  save(copyNumber: string): Promise<ScanRecord> {
    if (DEV_NO_AUTH) {
      return Promise.resolve({
        id: `dev-${copyNumber}-${Date.now()}`,
        copyNumber,
        stage: 'Dev',
        roleId: 0,
        savedAt: new Date().toISOString(),
      });
    }
    return request<ScanRecord>('POST', '/scans', { body: { copyNumber }, tag: 'scans.save' });
  },
};
