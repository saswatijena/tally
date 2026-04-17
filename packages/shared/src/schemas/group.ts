import { z } from 'zod';

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
