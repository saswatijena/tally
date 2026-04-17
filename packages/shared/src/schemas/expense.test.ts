import { describe, it, expect } from 'vitest';
import { CreateExpenseSchema, PaginationSchema } from './expense.js';

describe('CreateExpenseSchema', () => {
  it('parses valid input', () => {
    expect(() =>
      CreateExpenseSchema.parse({
        description: 'Dinner',
        amount: 120.00,
        paidBy: '00000000-0000-0000-0000-000000000001',
        splitAmong: ['00000000-0000-0000-0000-000000000001'],
      })
    ).not.toThrow();
  });

  it('rejects negative amount', () => {
    expect(() =>
      CreateExpenseSchema.parse({
        description: 'Dinner',
        amount: -10,
        paidBy: '00000000-0000-0000-0000-000000000001',
        splitAmong: ['00000000-0000-0000-0000-000000000001'],
      })
    ).toThrow();
  });

  it('rejects zero amount', () => {
    expect(() =>
      CreateExpenseSchema.parse({
        description: 'Dinner',
        amount: 0,
        paidBy: '00000000-0000-0000-0000-000000000001',
        splitAmong: ['00000000-0000-0000-0000-000000000001'],
      })
    ).toThrow();
  });

  it('rejects empty splitAmong', () => {
    expect(() =>
      CreateExpenseSchema.parse({
        description: 'Dinner',
        amount: 50,
        paidBy: '00000000-0000-0000-0000-000000000001',
        splitAmong: [],
      })
    ).toThrow();
  });

  it('rejects invalid uuid in paidBy', () => {
    expect(() =>
      CreateExpenseSchema.parse({
        description: 'Dinner',
        amount: 50,
        paidBy: 'not-a-uuid',
        splitAmong: ['00000000-0000-0000-0000-000000000001'],
      })
    ).toThrow();
  });
});

describe('PaginationSchema', () => {
  it('applies defaults', () => {
    const result = PaginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('rejects limit over 100', () => {
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
  });

  it('rejects page below 1', () => {
    expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
  });
});
