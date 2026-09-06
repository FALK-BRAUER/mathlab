/**
 * Engine checks. No test framework — the point is to be runnable with plain node.
 *
 * `node tools/check-engine.mjs`
 *
 * These assertions are only worth anything once each has been seen failing. When you add
 * one, break the code it covers first and confirm this script goes red.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'shared', 'engine.js'), 'utf8');

// engine.js targets a browser and ends with a global assignment; evaluate it and grab it.
const MathLab = new Function(source + '\nreturn MathLab;')();

let failed = 0;

const check = (label, actual, expected) => {
  const ok = Object.is(actual, expected);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got ${actual}, want ${expected}`}`);
};

const same = (a, b) => MathLab.sameExpression(a, b);

console.log('\n-- canonical form --');
check('collects like terms', MathLab.canon('3pq+4pq-pq'), MathLab.canon('6pq'));
check('order of variables is irrelevant', MathLab.canon('6qp'), MathLab.canon('6pq'));
check('order of terms is irrelevant', MathLab.canon('2x^2+3x'), MathLab.canon('3x+2x^2'));
check('terms that cancel disappear', MathLab.canon('5a-5a+2b'), MathLab.canon('2b'));
check('everything cancelling gives 0', MathLab.canon('5a-5a'), '0');
check('implicit coefficient of 1', MathLab.canon('x+x'), MathLab.canon('2x'));
check('xx folds into x^2', MathLab.canon('xx'), MathLab.canon('x^2'));
check('unicode superscript', MathLab.canon('3x²'), MathLab.canon('3x^2'));
check('unicode minus', MathLab.canon('3x−x'), MathLab.canon('2x'));
check('spaces ignored', MathLab.canon('2 a b + 3 ab'), MathLab.canon('5ab'));

console.log('\n-- things that must NOT be equal --');
check('different powers are not like terms', same('2x^2', '2x'), false);
check('different letters are not like terms', same('3pq', '3pr'), false);
check('sign matters', same('5x', '-5x'), false);
check('x^2y is not xy^2', same('4x^2y', '4xy^2'), false);

console.log('\n-- unparseable input is rejected, not guessed --');
check('gibberish returns null', MathLab.canon('what?'), null);
check('empty string returns null', MathLab.canon(''), null);
check('gibberish never matches', same('what?', '6pq'), false);

console.log('\n-- display formatting --');
check('coefficient 1 is hidden', MathLab.formatTerm({ coeff: 1, vars: { x: 1 } }), 'x');
check('coefficient -1 keeps its sign', MathLab.formatTerm({ coeff: -1, vars: { x: 1 } }), '-x');
check('powers render as superscript', MathLab.formatTerm({ coeff: 3, vars: { x: 2 } }), '3x²');
check('bare constant keeps its number', MathLab.formatTerm({ coeff: 7, vars: {} }), '7');
check(
  'sums get spaced operators',
  MathLab.formatSum([{ coeff: 2, vars: { x: 2 } }, { coeff: -3, vars: { x: 1 } }]),
  '2x² - 3x',
);

console.log(failed ? `\n${failed} check(s) FAILED\n` : '\nall checks passed\n');
process.exit(failed ? 1 : 0);
