import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Testinfrastruktur', () => {
  it('vitest läuft mit jsdom-Umgebung', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('fast-check ist verfügbar', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      })
    );
  });
});
