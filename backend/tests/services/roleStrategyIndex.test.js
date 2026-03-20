import { describe, expect, it } from 'vitest';
import { getRoleStrategy } from '../../services/role-strategy/index.js';

describe('role-strategy index exports', () => {
  it('re-exports getRoleStrategy', () => {
    expect(typeof getRoleStrategy).toBe('function');
  });
});
