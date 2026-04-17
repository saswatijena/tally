import { describe, it, expect } from 'vitest';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from './auth.js';

describe('RegisterSchema', () => {
  it('parses valid input', () => {
    expect(() =>
      RegisterSchema.parse({ email: 'alice@example.com', name: 'Alice', password: 'secret123' })
    ).not.toThrow();
  });

  it('rejects short password', () => {
    expect(() =>
      RegisterSchema.parse({ email: 'alice@example.com', name: 'Alice', password: 'short' })
    ).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() =>
      RegisterSchema.parse({ email: 'not-an-email', name: 'Alice', password: 'secret123' })
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      RegisterSchema.parse({ email: 'alice@example.com', name: '', password: 'secret123' })
    ).toThrow();
  });
});

describe('LoginSchema', () => {
  it('parses valid input', () => {
    expect(() =>
      LoginSchema.parse({ email: 'alice@example.com', password: 'secret123' })
    ).not.toThrow();
  });

  it('rejects missing password', () => {
    expect(() =>
      LoginSchema.parse({ email: 'alice@example.com' })
    ).toThrow();
  });
});

describe('RefreshTokenSchema', () => {
  it('parses valid input', () => {
    expect(() =>
      RefreshTokenSchema.parse({ refreshToken: 'some-token' })
    ).not.toThrow();
  });

  it('rejects empty token', () => {
    expect(() =>
      RefreshTokenSchema.parse({ refreshToken: '' })
    ).toThrow();
  });
});
