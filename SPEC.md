# Умножко

**Purpose:** A playful multiplication-table quiz that helps children (ages 7–10) practise times tables 1–10 in Bulgarian.
Kids get instant feedback, earn points and streak bonuses against a timer, and watch their best score improve.

## Features
- **Table picker:** choose one or more tables (1–10) or „Всички“. Each round has 10 questions, and no question repeats within a round.
- **Two answer modes:** 4 big multiple-choice buttons („Лесно“) or a numeric keypad input („Трудно“).
- **Scoring:** +10 per correct answer, plus a speed bonus of up to +5 based on seconds left, plus +5 for every 3-answer streak. Wrong answers score 0 and show the correct result.
- **Timer:** 10 s per question shown as a shrinking progress bar. When time runs out the question counts as wrong. Total round time appears on the results screen.
- **Fun animations:** confetti burst and a bouncing star on correct answers, a gentle shake on wrong ones, and a 0–3 star rating on the results screen.
- **Progress:** best score per table selection and total stars are saved locally. Encouraging Bulgarian messages, e.g. „Браво!“, „Супер серия!“, „Опитай пак!“.

## UI notes
- Mobile-first, single column, max-width 480px centered on desktop. Large tap targets (≥56px) and big rounded numerals.
- Bright, friendly palette: sky blue background, sunny yellow accents, green/red feedback. Rounded cards with soft shadows. System font stack with no web fonts.
- Three screens in one page: **Начало** (pick tables and mode, „Започни!“ button), **Игра** (question „7 × 8 = ?“, timer bar, score, question counter „3/10“), **Резултат** (score, stars, best score, „Нова игра“).
- All UI text is in Bulgarian (`<html lang="bg">`).
- Animations are CSS-only (keyframes) and respect `prefers-reduced-motion`.
- Accessible: buttons are real `<button>` elements, feedback is announced through an `aria-live` region, and the keypad works with a physical keyboard (digits, Backspace, Enter).

## Acceptance criteria
1. Opening `index.html` directly from disk shows the start screen in Bulgarian with no console errors.
2. With only table 7 selected, all 10 questions in the round have 7 as a factor, and no question repeats within the round.
3. A correct answer increases the score by at least 10 and shows the success animation. A wrong answer adds 0, shows the correct result, and triggers the shake animation.
4. If no answer is given within 10 s, the question is marked wrong and the game moves on automatically.
5. After 10 questions the results screen shows the final score and 0–3 stars. Reloading the page keeps the best score (stored in localStorage).
6. In multiple-choice mode exactly 4 distinct options are shown, exactly one of them is correct, and all options are positive integers.
7. On a 360px-wide viewport the layout has no horizontal scroll and every button is fully visible and tappable.
8. `node --test tests/` passes. Tests cover question generation, answer checking, score/bonus calculation, star rating and distractor generation.

## Tech constraints
- Static site: files `index.html` + `style.css` + `app.js` + `logic.js`.
- Pure functions in `logic.js` as an ES module usable from Node (no DOM access). Examples: `generateQuestions(tables, count, rng)`, `checkAnswer(q, answer)`, `calcPoints(correct, secondsLeft, streak)`, `starRating(score, maxScore)`, `makeChoices(q, rng)`.
- No build step, no CDN frameworks, no API keys.
- Tests in `tests/logic.test.mjs` using `node:test` + `node:assert`.
- Data persisted in `localStorage` if needed (best scores, total stars).
