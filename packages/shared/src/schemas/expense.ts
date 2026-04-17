import { z } from 'zod';

export const CreateExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  paidBy: z.string().uuid(),
  splitAmong: z.array(z.string().uuid()).min(1),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
