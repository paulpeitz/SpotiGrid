import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STYLE_PATH = resolve(process.cwd(), 'style.css');
const SCALE_PROPERTY = '--ui-polish-scale';

// Baselines documented by the ui-polish design and the existing spacing rules.
const SPACING_METRICS = Object.freeze([
  { name: 'label/image spacing', selector: '.artist-label', property: 'margin-top', baseline: { value: 0.4, unit: 'rem' } },
  { name: 'artist/date spacing', selector: '.date-label', property: 'margin-top', baseline: { value: 2, unit: 'px' } },
  { name: 'horizontal grid spacing', selector: '#grid-container', property: 'gap', baseline: { value: 16, unit: 'px' } },
  { name: 'vertical grid spacing', selector: '#grid-container', property: 'gap', baseline: { value: 16, unit: 'px' } },
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function readRule(stylesheet, selector) {
  const match = stylesheet.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  expect(match, `missing CSS selector ${selector}`).not.toBeNull();
  return match[1];
}

function readDeclaration(rule, property) {
  const match = rule.match(new RegExp(`(?:^|;)\\s*${escapeRegExp(property)}\\s*:\\s*([^;]+)`));
  expect(match, `missing CSS declaration ${property}`).not.toBeNull();
  return match[1].trim();
}

function readScale(stylesheet) {
  const root = readRule(stylesheet, ':root');
  const scale = readDeclaration(root, SCALE_PROPERTY);
  expect(scale).toMatch(/^\d+(?:\.\d+)?$/);
  return Number(scale);
}

function scaledBaseline(expression, baseline) {
  const match = expression.match(new RegExp(
    `^calc\\(\\s*(\\d+(?:\\.\\d+)?)(${escapeRegExp(baseline.unit)})\\s*\\*\\s*var\\(\\s*${escapeRegExp(SCALE_PROPERTY)}\\s*\\)\\s*\\)$`
  ));
  expect(match, `expected a baseline multiplied by var(${SCALE_PROPERTY}), got ${expression}`).not.toBeNull();
  expect(Number(match[1])).toBe(baseline.value);
  return Number(match[1]);
}

/**
 * Feature: ui-polish, Property 3: Konsistente Grid-Abstände
 *
 * **Validates: Requirements 3.1, 3.2, 5.3, 5.4**
 */
describe('Feature: ui-polish, Property 3: Konsistente Grid-Abstände', () => {
  it('derives label/image and horizontal/vertical grid spacing from one shared factor', () => {
    const stylesheet = readFileSync(STYLE_PATH, 'utf8');
    const scale = readScale(stylesheet);
    expect(scale).toBeGreaterThan(1);

    const quotients = SPACING_METRICS.map(({ selector, property, baseline }) => {
      const expression = readDeclaration(readRule(stylesheet, selector), property);
      const currentBaseline = scaledBaseline(expression, baseline);
      return (currentBaseline * scale) / baseline.value;
    });

    fc.assert(
      fc.property(
        fc.shuffledSubarray(SPACING_METRICS, {
          minLength: SPACING_METRICS.length,
          maxLength: SPACING_METRICS.length,
        }),
        (metrics) => {
          const orderedQuotients = metrics.map((metric) => quotients[SPACING_METRICS.indexOf(metric)]);
          expect(orderedQuotients[0]).toBeGreaterThan(1);
          for (const quotient of orderedQuotients) {
            expect(quotient).toBeCloseTo(orderedQuotients[0], 10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
