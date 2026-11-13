// Mirrors the backend DTOs in C:\Projects\trace-be\src\Trace.Core\Dtos. Keep in step.

/** Box field keys a role can show (Trace.Core BoxFields.All, canonical order). */
export const BOX_FIELDS = [
  'centerName',
  'subject',
  'version',
  'copyNumber',
  'packetNumber',
  'subjectId',
  'bagNo',
] as const;
export type BoxField = (typeof BOX_FIELDS)[number];

export const BOX_FIELD_LABELS: Record<BoxField, string> = {
  centerName: 'Center Name',
  subject: 'Subject',
  version: 'Version',
  copyNumber: 'Copy Number',
  packetNumber: 'Packet Number',
  subjectId: 'Subject ID',
  bagNo: 'Bag No.',
};

/** RoleConfigDto: what the mobile app renders from. */
export type RoleConfig = {
  id: number;
  name: string;
  saveStage: string | null;
  canScan: boolean;
  canFindCopy: boolean;
  canSave: boolean;
  canPrint: boolean;
  visibleFields: BoxField[];
};

/** SessionRefDto: a work session by id and name. */
export type SessionRef = { id: number; name: string };

/**
 * SessionDto from POST /auth/login (the login session, not a work session).
 * Flat profile fields; no admin flag (checked server-side per request).
 */
export type Session = {
  token: string;
  /** ISO-8601. */
  expiresAt: string;
  userId: string;
  role: RoleConfig | null;
  /** The user's work session; null for admins and unassigned users. */
  session: SessionRef | null;
  name: string;
  /** 00000-0000000-0 */
  cnic: string;
  email: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
};

export type UserStatus = 'Pending' | 'Approved' | 'Rejected';
export const USER_STATUSES: UserStatus[] = ['Pending', 'Approved', 'Rejected'];

/** AdminUserDto. */
export type AdminUser = {
  id: number;
  name: string;
  cnic: string;
  email: string;
  dateOfBirth: string;
  status: UserStatus;
  isAdmin: boolean;
  role: { id: number; name: string } | null;
  session: SessionRef | null;
  approvedByUserId: number | null;
  approvedAt: string | null;
  createdAt: string;
};

/** RoleDto (admin view). */
export type Role = RoleConfig & {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** SaveRoleRequest: body for both POST and PUT /admin/roles. */
export type SaveRoleRequest = {
  name: string;
  saveStage: string | null;
  canScan: boolean;
  canFindCopy: boolean;
  canSave: boolean;
  canPrint: boolean;
  visibleFields: BoxField[];
  isActive: boolean;
};

/** AdminSessionDto: a work session with its stage names (in order) and counts. */
export type AdminSession = {
  id: number;
  name: string;
  isActive: boolean;
  stages: string[];
  userCount: number;
  boxCount: number;
  createdAt: string;
  updatedAt: string;
};

/** SaveSessionRequest: body for both POST and PUT /admin/sessions. */
export type SaveSessionRequest = { name: string; isActive: boolean };

/** WorkflowStageDto. scanCount = records at this stage for the session's boxes. */
export type WorkflowStage = { stageName: string; position: number; scanCount: number };

/** WorkflowDto from GET/PUT /admin/sessions/{id}/workflow. */
export type Workflow = { sessionId: number; stages: WorkflowStage[] };

/** AdminBoxDto. */
export type AdminBox = {
  id: number;
  sessionId: number;
  sessionName: string | null;
  centerName: string;
  subject: string;
  version: string;
  copyNumber: string;
  packetNumber: number;
  subjectId: number;
  bagNo: number;
};

/** CreateBoxRequest. Numbers may be null so the server reports them as required. */
export type CreateBoxRequest = {
  sessionId: number | null;
  centerName: string;
  subject: string;
  version: string;
  copyNumber: string;
  packetNumber: number | null;
  subjectId: number | null;
  bagNo: number | null;
};
