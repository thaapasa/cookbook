import { z } from 'zod';

export const LoginRequest = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const User = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
});
export type User = z.infer<typeof User>;
