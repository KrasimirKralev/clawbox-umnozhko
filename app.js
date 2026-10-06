// Direct-file fallback mirrors logic.js because browsers block file:// module imports.
// Keep this snapshot in sync with logic.js; tests verify parity.
(async () => {
function fileLogic() {
function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateQuestions(tables, count = 10, rng = Math.random) {
  const selected = [...new Set(tables)].filter(n => Number.isInteger(n) && n >= 1 && n <= 10);
  const pool = selected.flatMap(a => Array.from({ length: 10 }, (_, i) => ({ a, b: i + 1 })));
  if (!Number.isInteger(count) || count < 0 || count > pool.length) throw new RangeError('Invalid question count');
  return shuffle(pool, rng).slice(0, count);
}

function checkAnswer(q, answer) {
  if (typeof answer !== 'number' && typeof answer !== 'string') return false;
  if (String(answer).trim() === '') return false;
  return Number.isInteger(Number(answer)) && Number(answer) === q.a * q.b;
}

function calcPoints(correct, secondsLeft, streak) {
  if (!correct) return 0;
  const speed = Math.ceil(Math.min(10, Math.max(0, Number(secondsLeft) || 0)) / 2);
  return 10 + speed + (streak > 0 && streak % 3 === 0 ? 5 : 0);
}

function starRating(score, maxScore = 165) {
  if (maxScore <= 0 || score <= 0) return 0;
  const ratio = score / maxScore;
  return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
}

function makeChoices(q, rng = Math.random) {
  const answer = q.a * q.b;
  const nearby = [...new Set([answer - q.a, answer + q.a, answer - q.b, answer + q.b, answer - 1, answer + 1, answer + 2, answer + 3])].filter(n => n > 0 && n !== answer);
  return shuffle([answer, ...shuffle(nearby, rng).slice(0, 3)], rng);
}

function selectionKey(tables) {
  return [...new Set(tables)].sort((a, b) => a - b).join('-');
}

return { shuffle, generateQuestions, checkAnswer, calcPoints, starRating, makeChoices, selectionKey };
}
const logic = location.protocol === "file:" ? fileLogic() : await import("./logic.js");
const { generateQuestions, checkAnswer, calcPoints, starRating, makeChoices, selectionKey } = logic;
const $ = id => document.getElementById(id);
const allTables = Array.from({ length: 10 }, (_, i) => i + 1);
let tables = new Set(allTables), mode = 'easy', questions = [], index = 0;
let score = 0, streak = 0, correctCount = 0, answered = false, screen = 'start';
let timerId, nextId, deadline, roundStart, input = '', activeKey = '';
let progress = { best: {}, stars: 0 };
try {
  const saved = JSON.parse(localStorage.getItem('umnozhko-progress'));
  if (saved && typeof saved.best === 'object' && saved.best !== null) {
    progress.best = Object.fromEntries(Object.entries(saved.best).filter(([, value]) => Number.isFinite(value) && value >= 0));
    progress.stars = Number.isInteger(saved.stars) && saved.stars >= 0 ? saved.stars : 0;
  }
} catch { /* The game also works when local storage is unavailable. */ }
function bestFor(key) { return progress.best[key] || 0; }
function updateSetup() {
  document.querySelectorAll('.table-button').forEach(button => {
    const selected = tables.has(Number(button.dataset.table));
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('all-tables').setAttribute('aria-pressed', String(tables.size === 10));
  $('all-tables').innerHTML = `Всички <span aria-hidden="true">${tables.size === 10 ? '✓' : '+'}</span>`;
  $('start-button').disabled = tables.size === 0;
  $('selection-message').textContent = tables.size ? '' : 'Избери поне една таблица.';
  $('start-best').textContent = bestFor(selectionKey([...tables]));
  $('total-stars').textContent = progress.stars;
}
allTables.forEach(n => {
  const button = document.createElement('button');
  button.className = 'table-button selected';
  button.dataset.table = n;
  button.textContent = n;
  button.setAttribute('aria-label', `Таблица по ${n}`);
  button.addEventListener('click', () => { tables.has(n) ? tables.delete(n) : tables.add(n); updateSetup(); });
  $('table-picker').append(button);
});
$('all-tables').addEventListener('click', () => { tables = tables.size === 10 ? new Set() : new Set(allTables); updateSetup(); });
['easy', 'hard'].forEach(value => $(value + '-mode').addEventListener('click', () => {
  mode = value;
  ['easy', 'hard'].forEach(v => { $(v + '-mode').classList.toggle('selected', v === mode); $(v + '-mode').setAttribute('aria-pressed', String(v === mode)); });
}));
function showScreen(name) {
  screen = name;
  ['start', 'game', 'result'].forEach(value => $(value + '-screen').hidden = value !== name);
}
function startRound() {
  if (!tables.size) return;
  clearInterval(timerId); clearTimeout(nextId);
  questions = generateQuestions([...tables]);
  activeKey = selectionKey([...tables]);
  index = score = streak = correctCount = 0;
  roundStart = performance.now();
  showScreen('game');
  showQuestion();
  $('game-title').focus();
}
function tick() {
  const seconds = Math.max(0, (deadline - performance.now()) / 1000);
  $('timer-fill').style.transform = `scaleX(${seconds / 10})`;
  $('timer').setAttribute('aria-valuenow', String(Math.ceil(seconds)));
  $('timer').classList.toggle('urgent', seconds <= 3);
  $('time-left').textContent = `${Math.ceil(seconds)} сек.`;
  if (seconds <= 0 && !answered) submitAnswer(null, true);
}
function showQuestion() {
  answered = false; input = '';
  $('question-count').textContent = `${index + 1}/10`;
  $('score').textContent = score;
  const { a, b } = questions[index];
  $('question').innerHTML = `<span aria-hidden="true">${a} × ${b} = ?</span><span class="sr-only">Въпрос ${index + 1} от 10: ${a} по ${b} равно на колко?</span>`;
  $('streak').textContent = streak >= 2 ? `Серия: ${streak} верни отговора!` : 'Всяка задача е нов шанс!';
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  $('confetti').replaceChildren();
  document.querySelector('.question-card').classList.remove('shake');
  const area = $('answer-area'); area.replaceChildren();
  if (mode === 'easy') {
    const choices = document.createElement('div'); choices.className = 'choices';
    choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', 'question');
    makeChoices(questions[index]).forEach(n => {
      const button = document.createElement('button');
      button.className = 'answer-button'; button.textContent = n; button.dataset.answer = n;
      button.addEventListener('click', () => submitAnswer(n)); choices.append(button);
    });
    area.append(choices);
  } else {
    const display = document.createElement('input');
    display.id = 'numeric-answer'; display.className = 'numeric-display'; display.readOnly = true;
    display.inputMode = 'none'; display.placeholder = '?'; display.setAttribute('aria-label', 'Твоят отговор');
    display.setAttribute('aria-describedby', 'question');
    const keypad = document.createElement('div'); keypad.className = 'keypad';
    keypad.setAttribute('role', 'group'); keypad.setAttribute('aria-labelledby', 'question');
    ['1','2','3','4','5','6','7','8','9','⌫','0','Готово'].forEach(key => {
      const button = document.createElement('button'); button.textContent = key;
      if (key === '⌫') button.setAttribute('aria-label', 'Изтрий последната цифра');
      if (key === 'Готово') button.className = 'submit';
      button.addEventListener('click', () => enterKey(key)); keypad.append(button);
    });
    area.append(display, keypad);
  }
  deadline = performance.now() + 10000;
  tick(); timerId = setInterval(tick, 50);
  if (index > 0) area.querySelector('button').focus({ preventScroll: true });
}
function enterKey(key) {
  if (answered || screen !== 'game') return;
  if (key === 'Готово') { if (input) submitAnswer(input); return; }
  if (key === '⌫') input = input.slice(0, -1);
  else if (/^\d$/.test(key) && input.length < 3) input += key;
  $('numeric-answer').value = input;
}
document.addEventListener('keydown', event => {
  if (screen !== 'game' || mode !== 'hard' || answered || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Enter' && event.target.closest && event.target.closest('button')) return;
  if (/^\d$/.test(event.key) || ['Backspace', 'Enter'].includes(event.key)) {
    event.preventDefault(); enterKey(event.key === 'Backspace' ? '⌫' : event.key === 'Enter' ? 'Готово' : event.key);
  }
});
function celebrate() {
  for (let i = 0; i < 20; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${Math.cos(i * 2.4) * (90 + i * 5)}px`);
    piece.style.setProperty('--y', `${Math.sin(i * 2.4) * 140}px`);
    piece.style.setProperty('--rotation', `${i * 60}deg`);
    piece.style.setProperty('--color', ['#ffd45b','#52abe4','#6cbf8e','#eb9586'][i % 4]);
    $('confetti').append(piece);
  }
}
function submitAnswer(answer, timedOut = false) {
  if (answered) return;
  const secondsLeft = Math.max(0, (deadline - performance.now()) / 1000);
  timedOut = timedOut || secondsLeft <= 0;
  answered = true; clearInterval(timerId);
  const correct = !timedOut && checkAnswer(questions[index], answer);
  streak = correct ? streak + 1 : 0;
  if (correct) correctCount++;
  const points = calcPoints(correct, secondsLeft, streak);
  score += points; $('score').textContent = score;
  document.querySelectorAll('#answer-area button').forEach(button => {
    button.disabled = true;
    if (button.dataset.answer) {
      if (Number(button.dataset.answer) === questions[index].a * questions[index].b) button.classList.add('correct');
      else if (String(answer) === button.dataset.answer) button.classList.add('wrong');
    }
  });
  const feedback = $('feedback');
  feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
  if (correct) {
    feedback.innerHTML = `<span class="bounce-star" aria-hidden="true">★</span>${streak % 3 === 0 ? 'Супер серия!' : 'Браво!'} +${points} точки`;
    celebrate();
  } else {
    feedback.textContent = `${timedOut ? 'Времето изтече!' : 'Опитай пак!'} ${questions[index].a} × ${questions[index].b} = ${questions[index].a * questions[index].b}`;
    document.querySelector('.question-card').classList.add('shake');
  }
  const finishTime = performance.now();
  const advance = () => { clearTimeout(nextId); if (screen !== 'game' || !answered) return; index++; if (index === questions.length) finishRound(finishTime); else showQuestion(); };
  const next = document.createElement('button');
  next.className = 'next-button'; next.textContent = index + 1 === questions.length ? 'Към резултата →' : 'Следваща задача →';
  next.addEventListener('click', advance);
  $('answer-area').append(next); next.focus({ preventScroll: true });
  nextId = setTimeout(advance, correct ? 1800 : 3500);
}
function finishRound(finishTime) {
  const previousBest = bestFor(activeKey), stars = starRating(score);
  progress.best[activeKey] = Math.max(score, previousBest);
  progress.stars += stars;
  try { localStorage.setItem('umnozhko-progress', JSON.stringify(progress)); } catch { /* Private mode can block storage. */ }
  $('final-score').textContent = score;
  $('correct-count').textContent = `${correctCount}/10`;
  $('round-time').textContent = `${Math.round((finishTime - roundStart) / 1000)} сек.`;
  $('best-score').textContent = `${progress.best[activeKey]} т.`;
  $('new-record').hidden = score <= previousBest;
  $('result-stars').innerHTML = Array.from({ length: 3 }, (_, i) => `<span class="${i < stars ? '' : 'empty'}" aria-hidden="true">★</span>`).join('');
  $('result-stars').setAttribute('aria-label', `${stars} от 3 звезди`);
  $('result-message').textContent = stars === 3 ? 'Ти си звезда в умножението!' : stars === 2 ? 'Страхотна работа! Продължавай напред.' : stars === 1 ? 'Добро начало! С практика ще блестиш.' : 'Опитай пак! Всяка задача те учи на нещо.';
  showScreen('result'); $('result-title').focus();
}
$('start-button').addEventListener('click', startRound);
$('new-game').addEventListener('click', () => { updateSetup(); showScreen('start'); $('start-button').focus(); });
updateSetup();
})();
