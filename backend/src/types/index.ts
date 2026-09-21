export type Role = 'admin' | 'user' | 'client';

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
