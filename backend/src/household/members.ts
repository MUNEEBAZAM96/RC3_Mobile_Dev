import { AppError } from '../http/errors';
import type { CreateMemberInput, Member, UpdateMemberInput } from './types';

/** Rubric-style ids (M01) or short alphanumeric ids for custom entries. */
export const MEMBER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Next id for auto-assignment: scan /^M(\d+)$/, take max N, return M with (N+1).
 * Zero-pads to 2 digits when N+1 < 100 (M04 … M99); M100+ uses unpadded width (M100).
 */
export function nextMemberId(existing: Member[]): string {
  let max = 0;
  for (const member of existing) {
    const match = /^M(\d+)$/.exec(member.id);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  const next = max > 0 ? max + 1 : 4;
  const id = next < 100 ? `M${String(next).padStart(2, '0')}` : `M${next}`;
  return id;
}

export function normalizeMemberName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Member name must be 1–80 characters.');
  }
  return trimmed;
}

export function validateMemberId(id: string): string {
  const trimmed = id.trim();
  if (!MEMBER_ID_PATTERN.test(trimmed)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Member id must be 1–32 characters (letters, numbers, underscore, hyphen).',
    );
  }
  return trimmed;
}

export function assertUniqueMemberId(members: Member[], id: string): void {
  if (members.some((m) => m.id === id)) {
    throw new AppError(409, 'CONFLICT', `Member id already exists: ${id}`);
  }
}

export function assertUniqueMemberName(members: Member[], name: string, exceptId?: string): void {
  const lower = name.trim().toLowerCase();
  for (const member of members) {
    if (exceptId && member.id === exceptId) continue;
    if (member.name.trim().toLowerCase() === lower) {
      throw new AppError(409, 'CONFLICT', `A member named "${name}" already exists.`);
    }
  }
}

export function findMember(members: Member[], id: string): Member {
  const member = members.find((m) => m.id === id);
  if (!member) {
    throw new AppError(404, 'NOT_FOUND', `Member not found: ${id}`);
  }
  return member;
}

export function prepareCreateMember(members: Member[], input: CreateMemberInput): Member {
  const name = normalizeMemberName(input.name);
  assertUniqueMemberName(members, name);
  const id = input.id ? validateMemberId(input.id) : nextMemberId(members);
  assertUniqueMemberId(members, id);
  const joined_at = new Date().toISOString().slice(0, 10);
  return {
    id,
    name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    joined_at,
  };
}

export function applyMemberUpdate(existing: Member, input: UpdateMemberInput): Member {
  const name = input.name !== undefined ? normalizeMemberName(input.name) : existing.name;
  return {
    ...existing,
    name,
    phone: input.phone !== undefined ? (input.phone?.trim() || null) : existing.phone ?? null,
    email: input.email !== undefined ? (input.email?.trim() || null) : existing.email ?? null,
    notes: input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes ?? null,
  };
}

export const MEMBER_SELECT_SQLITE =
  'id, name, phone, email, notes, joined_at FROM household_members ORDER BY id';

export const MEMBER_SELECT_POSTGRES =
  'id, name, phone, email, notes, joined_at::text AS joined_at FROM household_members ORDER BY id';

export function mapMemberRow(row: {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  joined_at?: string | null;
}): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    notes: row.notes ?? null,
    joined_at: row.joined_at ?? null,
  };
}
