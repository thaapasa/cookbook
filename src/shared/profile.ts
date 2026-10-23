import { z } from 'zod';

export const TokenKind = z.enum(['mcp', 'integration']);
export type TokenKind = z.infer<typeof TokenKind>;

export const TokenInfo = z.object({
  createdAt: z.iso.datetime(),
  lastChars: z.string(),
});
export type TokenInfo = z.infer<typeof TokenInfo>;

export const Profile = z.object({
  username: z.string(),
  displayName: z.string(),
  createdAt: z.iso.datetime(),
  passwordChangedAt: z.iso.datetime(),
  tokens: z.record(TokenKind, TokenInfo.nullable()),
});
export type Profile = z.infer<typeof Profile>;

export const UpdateProfileRequest = z.object({
  displayName: z.string().trim().min(1).max(100),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

/** Resetting the password and generating a token need the current password. */
export const ConfirmPasswordRequest = z.object({
  currentPassword: z.string().min(1),
});
export type ConfirmPasswordRequest = z.infer<typeof ConfirmPasswordRequest>;
