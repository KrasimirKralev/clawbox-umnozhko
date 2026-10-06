export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuestions(tables, count = 10, rng = Math.random) {
  const selected = [...new Set(tables)].filter(n => Number.isInteger(n) && n >= 1 && n <= 10);
  const pool = selected.flatMap(a => Array.from({ length: 10 }, (_, i) => ({ a, b: i + 1 })));
  if (!Number.isInteger(count) || count < 0 || count > pool.length) throw new RangeError('Invalid question count');
  return shuffle(pool, rng).slice(0, count);
}

export function checkAnswer(q, answer) {
  if (typeof answer !== 'number' && typeof answer !== 'string') return false;
  if (String(answer).trim() === '') return false;
  return Number.isInteger(Number(answer)) && Number(answer) === q.a * q.b;
}

export function calcPoints(correct, secondsLeft, streak) {
  if (!correct) return 0;
  const speed = Math.ceil(Math.min(10, Math.max(0, Number(secondsLeft) || 0)) / 2);
  return 10 + speed + (streak > 0 && streak % 3 === 0 ? 5 : 0);
}

export function starRating(score, maxScore = 165) {
  if (maxScore <= 0 || score <= 0) return 0;
  const ratio = score / maxScore;
  return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
}

export function makeChoices(q, rng = Math.random) {
  const answer = q.a * q.b;
  const nearby = [...new Set([answer - q.a, answer + q.a, answer - q.b, answer + q.b, answer - 1, answer + 1, answer + 2, answer + 3])].filter(n => n > 0 && n !== answer);
  return shuffle([answer, ...shuffle(nearby, rng).slice(0, 3)], rng);
}

export function selectionKey(tables) {
  return [...new Set(tables)].sort((a, b) => a - b).join('-');
}
