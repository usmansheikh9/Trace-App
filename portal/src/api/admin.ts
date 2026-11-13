import { api, call } from './client';
import type {
  AdminBox,
  AdminSession,
  AdminUser,
  CreateBoxRequest,
  Role,
  SaveRoleRequest,
  SaveSessionRequest,
  Session,
  UserStatus,
  Workflow,
} from './types';

export const authApi = {
  login: (cnic: string, password: string) => call<Session>(api.post('/auth/login', { cnic, password })),
};

export const usersApi = {
  /** Omit status for all users. Server orders newest first. */
  list: (status?: UserStatus) => call<AdminUser[]>(api.get('/admin/users', { params: status ? { status } : {} })),
  /** Approves and assigns a role and a session (both required, both active). Also reassigns. */
  approve: (id: number, roleId: number, sessionId: number) =>
    call<AdminUser>(api.post(`/admin/users/${id}/approve`, { roleId, sessionId })),
  reject: (id: number) => call<AdminUser>(api.post(`/admin/users/${id}/reject`)),
};

export const rolesApi = {
  list: () => call<Role[]>(api.get('/admin/roles')),
  get: (id: number) => call<Role>(api.get(`/admin/roles/${id}`)),
  create: (body: SaveRoleRequest) => call<Role>(api.post('/admin/roles', body)),
  update: (id: number, body: SaveRoleRequest) => call<Role>(api.put(`/admin/roles/${id}`, body)),
};

export const sessionsApi = {
  list: () => call<AdminSession[]>(api.get('/admin/sessions')),
  get: (id: number) => call<AdminSession>(api.get(`/admin/sessions/${id}`)),
  create: (body: SaveSessionRequest) => call<AdminSession>(api.post('/admin/sessions', body)),
  update: (id: number, body: SaveSessionRequest) => call<AdminSession>(api.put(`/admin/sessions/${id}`, body)),
  getWorkflow: (id: number) => call<Workflow>(api.get(`/admin/sessions/${id}/workflow`)),
  /** Replaces the whole ordered list; positions follow array order. */
  saveWorkflow: (id: number, stages: string[]) => call<Workflow>(api.put(`/admin/sessions/${id}/workflow`, { stages })),
};

export const boxesApi = {
  /** Page is 1-based; the server caps pageSize at 500 and returns a bare array (no total). */
  list: (page: number, pageSize: number, sessionId?: number) =>
    call<AdminBox[]>(api.get('/admin/boxes', { params: { page, pageSize, ...(sessionId ? { sessionId } : {}) } })),
  create: (body: CreateBoxRequest) => call<AdminBox>(api.post('/admin/boxes', body)),
};

export const settingsApi = {
  setMasterPassword: (value: string) => call<void>(api.put('/admin/settings/master-password', { value })),
};
