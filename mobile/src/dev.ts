// DEV_NO_AUTH helpers. Delete this file together with the flag in config.ts.
import type { BoxDto, RoleConfig, Session } from '@/api';

/** Mirrors the backend's dev seed roles so the switch model can be exercised offline. */
export const DEV_ROLES: readonly RoleConfig[] = [
  {
    id: 1,
    name: 'Receiver',
    saveStage: 'Received',
    canScan: true,
    canFindCopy: false,
    canSave: true,
    canPrint: false,
    visibleFields: ['centerName', 'subject', 'version', 'copyNumber', 'packetNumber'],
  },
  {
    id: 2,
    name: 'Cutter',
    saveStage: 'Cut',
    canScan: true,
    canFindCopy: true,
    canSave: true,
    canPrint: true,
    visibleFields: ['centerName', 'subject', 'version', 'copyNumber', 'packetNumber', 'subjectId', 'bagNo'],
  },
  {
    id: 3,
    name: 'Packer',
    saveStage: 'Packed',
    canScan: true,
    canFindCopy: false,
    canSave: true,
    canPrint: false,
    visibleFields: ['centerName', 'subject', 'copyNumber', 'packetNumber', 'bagNo'],
  },
];

/** Placeholder code used when the Scan button bypasses the camera. */
export const DEV_SCAN_CODE = '30000003';

type Profile = Pick<Session, 'name' | 'cnic' | 'email' | 'dateOfBirth'>;

/** Any blank field falls back to sample data so the Profile screen always has content. */
export function mockSession(role: RoleConfig | null = DEV_ROLES[0], profile: Partial<Profile> = {}): Session {
  return {
    token: 'dev-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    userId: 'dev-user',
    role,
    session: DEV_SESSION,
    name: profile.name || 'Ayesha Khan',
    cnic: profile.cnic || '35202-1234567-1',
    email: profile.email || 'ayesha.khan@example.com',
    dateOfBirth: profile.dateOfBirth || '1996-03-14',
  };
}

export function nextRole(role: RoleConfig | null): RoleConfig {
  const i = DEV_ROLES.findIndex((r) => r.id === role?.id);
  return DEV_ROLES[(i + 1) % DEV_ROLES.length];
}

/** Mirrors the backend's dev seed session. */
export const DEV_SESSION = { id: 1, name: 'Sample Session' } as const;

/** Received done, Cut and Packed pending: lets each dev role see a different step state. */
export function mockBox(copyNumber: string): BoxDto {
  return {
    centerName: 'Govt. High School No. 1, Lahore',
    subject: 'Physics',
    version: 'A',
    copyNumber,
    packetNumber: 102,
    subjectId: 12,
    bagNo: 1,
    workflow: [
      { stageName: 'Received', position: 1, done: true, completedByName: 'Rida Receiver', completedAt: new Date().toISOString() },
      { stageName: 'Cut', position: 2, done: false, completedByName: null, completedAt: null },
      { stageName: 'Packed', position: 3, done: false, completedByName: null, completedAt: null },
    ],
  };
}
