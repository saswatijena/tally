import { z } from 'zod';

export const CreateSettlementSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().positive(),
});

export type CreateSettlementInput = z.infer<typeof CreateSettlementSchema>;
