export type Role = 'user' | 'admin';

export interface Principal {
  /** Internal app user id (Postgres) or legacy JWT sub. */
  sub: string;
  email: string;
  role: Role;
  /** Set when the caller authenticated with a Clerk session token. */
  clerkUserId: string | null;
}
