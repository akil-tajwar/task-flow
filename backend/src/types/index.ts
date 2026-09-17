export type Role = 'super_admin' | 'admin' | 'user';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: Role;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    tenantId: string;
  }
}
