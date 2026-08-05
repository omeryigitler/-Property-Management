import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL(
    '../src/components/dashboard/settings/MonthlyFinanceSettings.tsx',
    import.meta.url
  ),
  'utf8'
);

test('monthly finance does not expose the inactive Repeat control', () => {
  assert.equal(source.includes('Repeat'), false);
  assert.equal(source.includes('isRecurring'), false);
});
