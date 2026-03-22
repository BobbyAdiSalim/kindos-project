import { describe, expect, it } from 'vitest';
import { getEmailStrategy, sendEmailByType } from '../../services/email-strategy/index.js';

describe('email-strategy index exports', () => {
  it('re-exports getEmailStrategy', () => {
    expect(typeof getEmailStrategy).toBe('function');
  });

  it('re-exports sendEmailByType', () => {
    expect(typeof sendEmailByType).toBe('function');
  });
});
