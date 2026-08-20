import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesheet = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../style.css'),
  'utf8'
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ruleBody = (selector) => {
  const selectorPattern = escapeRegExp(selector);
  const match = stylesheet.match(new RegExp(`${selectorPattern}\\s*\\{([^{}]*)\\}`));
  expect(match, `Missing CSS rule: ${selector}`).not.toBeNull();
  return match[1];
};

const declaration = (rule, property) => {
  const match = rule.match(new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+);`));
  expect(match, `Missing CSS declaration: ${property}`).not.toBeNull();
  return match[1].trim();
};

const equalizerMetrics = [
  { property: '--equalizer-bar-width', baseline: 4 },
  { property: '--equalizer-bar-gap', baseline: 3 },
  { property: '--equalizer-max-height', baseline: 20 },
];

describe('Feature: ui-polish, Property 4: Equalizer-Maße skalieren gemeinsam', () => {
  it('uses one scale for Equalizer dimensions and preserves CSS animation behavior', () => {
    // **Validates: Requirements 4.2, 4.3, 5.3, 5.4**
    const rootRule = ruleBody(':root');
    const overlayRule = ruleBody('.overlay');
    const equalizerRule = ruleBody('.equalizer');
    const barRule = ruleBody('.equalizer .bar');
    const scale = Number(declaration(rootRule, '--ui-polish-scale'));

    expect(scale).toBeGreaterThan(1);

    fc.assert(
      fc.property(
        fc.shuffledSubarray(equalizerMetrics, { minLength: 3, maxLength: 3 }),
        (metrics) => {
          const ratios = metrics.map(({ property, baseline }) => {
            const value = declaration(overlayRule, property);
            const match = value.match(
              new RegExp(`^calc\\((\\d+(?:\\.\\d+)?)px \\* var\\(--ui-polish-scale\\)\\)$`)
            );

            expect(match, `${property} must derive from the shared scale`).not.toBeNull();
            expect(Number(match[1])).toBe(baseline);
            return Number(match[1]) * scale / baseline;
          });

          ratios.forEach((ratio) => expect(ratio).toBeCloseTo(scale, 10));
          expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1e-12);
        }
      ),
      { numRuns: 100 }
    );

    // The custom properties must be consumed by the rendered Equalizer rules.
    expect(declaration(equalizerRule, 'gap')).toBe('var(--equalizer-bar-gap)');
    expect(declaration(equalizerRule, 'height')).toBe('var(--equalizer-max-height)');
    expect(declaration(barRule, 'width')).toBe('var(--equalizer-bar-width)');

    expect(barRule).toMatch(
      /animation:\s*equalize\s+var\(--equalizer-duration\)\s+ease-in-out\s+infinite\s+alternate/
    );
    expect(stylesheet).toMatch(
      /@keyframes\s+equalize\s*\{[\s\S]*?0%\s*\{\s*transform:\s*scaleY\(0\.2\);\s*\}[\s\S]*?100%\s*\{\s*transform:\s*scaleY\(1\);\s*\}/
    );

    const delayRules = [
      ...stylesheet.matchAll(/\.equalizer \.bar:nth-child\(\d+\)\s*\{([^{}]*)\}/g),
    ];
    const delays = delayRules.map(([, body]) => declaration(body, 'animation-delay'));
    expect(delays.length).toBeGreaterThanOrEqual(3);
    expect(new Set(delays).size).toBe(delays.length);
  });
});
