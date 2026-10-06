import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateQuestions, checkAnswer, calcPoints, starRating, makeChoices, selectionKey, shuffle } from '../logic.js';

const rng = () => 0.37;
test('a single table produces all ten unique questions with that factor', () => {
  for (let table = 1; table <= 10; table++) {
    const questions = generateQuestions([table], 10, rng);
    assert.equal(questions.length, 10);
    assert.ok(questions.every(q => q.a === table));
    assert.equal(new Set(questions.map(q => `${q.a}x${q.b}`)).size, 10);
    assert.deepEqual(questions.map(q => q.b).sort((a,b) => a-b), [1,2,3,4,5,6,7,8,9,10]);
  }
});
test('multiple tables are deduplicated and selection is respected', () => {
  const questions = generateQuestions([2,7,2], 20, rng);
  assert.equal(new Set(questions.map(q => `${q.a}:${q.b}`)).size, 20);
  assert.ok(questions.every(q => [2,7].includes(q.a)));
  assert.throws(() => generateQuestions([], 10), RangeError);
  assert.throws(() => generateQuestions([7], 11), RangeError);
  assert.throws(() => generateQuestions([1], -1), RangeError);
  assert.deepEqual(generateQuestions([1], 0), []);
});
test('shuffling is deterministic with supplied rng and leaves source untouched', () => {
  const source = [1,2,3,4];
  assert.deepEqual(shuffle(source, rng), shuffle(source, rng));
  assert.deepEqual(source, [1,2,3,4]);
});
test('answers accept numeric input and reject empty, malformed and incorrect values', () => {
  const q = { a: 7, b: 8 };
  for (const answer of [56, '56', ' 56 ']) assert.equal(checkAnswer(q, answer), true);
  for (const answer of ['', ' ', null, undefined, 55, '56x', 56.2, Infinity, true, [56]]) assert.equal(checkAnswer(q, answer), false);
});
test('points include bounded speed bonus and every third correct answer bonus', () => {
  assert.equal(calcPoints(false, 10, 3), 0);
  assert.equal(calcPoints(true, 0, 1), 10);
  assert.equal(calcPoints(true, 10, 1), 15);
  assert.equal(calcPoints(true, 9.5, 2), 15);
  assert.equal(calcPoints(true, 8.01, 1), 15);
  assert.equal(calcPoints(true, 8, 1), 14);
  assert.equal(calcPoints(true, 0.1, 1), 11);
  assert.equal(calcPoints(true, 6, 3), 18);
  assert.equal(calcPoints(true, 10, 6), 20);
  assert.equal(calcPoints(true, -5, 0), 10);
  assert.equal(calcPoints(true, 99, 0), 15);
  assert.equal(calcPoints(true, NaN, 1), 10);
  assert.equal(Array.from({length: 10}, (_, i) => calcPoints(true, 10, i + 1)).reduce((a,b) => a+b), 165);
});
test('stars use explicit score thresholds and stay within 0–3', () => {
  assert.equal(starRating(0, 100), 0);
  assert.equal(starRating(1, 100), 1);
  assert.equal(starRating(49, 100), 1);
  assert.equal(starRating(50, 100), 2);
  assert.equal(starRating(79, 100), 2);
  assert.equal(starRating(80, 100), 3);
  assert.equal(starRating(200, 100), 3);
  assert.equal(starRating(100, 0), 0);
  assert.equal(starRating(132), 3);
});
test('all multiplication facts have four distinct positive choices and one correct choice', () => {
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
    for (const random of [rng, () => 0, () => 0.99999]) {
      const choices = makeChoices({a,b}, random);
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices).size, 4);
      assert.ok(choices.every(n => Number.isInteger(n) && n > 0));
      assert.equal(choices.filter(n => n === a*b).length, 1);
    }
  }
});
test('progress keys do not depend on selection order or duplicates', () => {
  assert.equal(selectionKey([10,2,7,2]), '2-7-10');
  assert.equal(selectionKey([7,2]), selectionKey([2,7]));
});
test('direct-file fallback is identical to the tested ES module logic', async () => {
  const source = await readFile(new URL('../logic.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(app.includes(source.replaceAll('export function ', 'function ')));
});
