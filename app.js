'use strict';

const ROUND_LENGTH = 10;
const START_LETTERS = 5;        // letters in play at the very beginning
const LETTER_MASTERED = 3;      // correct-first-try streak that counts as "knows it"
const WORD_MASTERED = 2;
const STORE_KEY = 'sa-citim-v1';

const $ = (id) => document.getElementById(id);

// ---------- Saved state ----------
const defaults = {
  letterPool: START_LETTERS,
  letterStats: {},
  wordsUnlocked: false,
  wordLevel: 0,
  wordStats: {},
  settings: { mode: 'auto', case: 'lower', rate: 0.85, hint: true, customWords: '' },
};
let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) return { ...defaults, ...saved, settings: { ...defaults.settings, ...saved.settings } };
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(defaults));
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

// ---------- Voice ----------
// Recorded clips (audio/, made by the GitHub workflow) sound much better than the phone's
// built-in voice, so use them when they exist and fall back to speech synthesis otherwise.
const synth = window.speechSynthesis;
const player = new Audio();
let clips = new Set();
let roVoice = null;

fetch('audio/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .then((ids) => { clips = new Set(ids); updateVoiceStatus(); })
  .catch(() => {});

function pickVoice() {
  if (!synth) return;
  const ro = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('ro'));
  roVoice = ro.find((v) => /enhanced|premium|natural/i.test(v.name)) || ro[0] || null;
  updateVoiceStatus();
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

function updateVoiceStatus() {
  const status = $('voiceStatus');
  if (clips.size) {
    status.textContent = `Voce înregistrată (${clips.size} fraze). Recorded voice is on.`;
    $('voiceWarning').hidden = true;
  } else if (!synth) {
    status.textContent = 'This browser cannot speak. Try Safari on the iPhone.';
  } else if (roVoice) {
    status.textContent = `Voce: ${roVoice.name} (${roVoice.lang})`;
    $('voiceWarning').hidden = true;
  } else {
    status.textContent = 'No Romanian voice found yet. On iPhone: Settings › Accessibility › Spoken Content › Voices › Romanian, then download “Ioana”.';
  }
}
// Voices load late on some devices, so only warn after giving them a moment.
setTimeout(() => {
  if (!clips.size && synth && !roVoice) {
    const warn = $('voiceWarning');
    warn.textContent = 'Nu am găsit vocea română. / No Romanian voice found. On iPhone: Settings › Accessibility › Spoken Content › Voices › Romanian › Ioana.';
    warn.hidden = false;
  }
}, 1500);

function playClip(id) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      player.onended = player.onerror = player.onpause = null;
      ok ? resolve() : reject();
    };
    player.onended = () => done(true);
    player.onpause = () => done(true);   // stopped by a newer sentence
    player.onerror = () => done(false);
    player.src = `audio/${id}.mp3`;
    player.playbackRate = Math.min(1.3, Math.max(0.6, (Number(state.settings.rate) || 0.85) / 0.85));
    const p = player.play();
    if (p) p.catch(() => done(false));
    setTimeout(() => done(true), 12000);
  });
}

function synthesize(text) {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ro-RO';
    if (roVoice) u.voice = roVoice;
    u.rate = Number(state.settings.rate) || 0.85;
    let finished = false;
    const done = () => { if (!finished) { finished = true; resolve(); } };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
    // Safety net: some browsers never fire onend.
    setTimeout(done, 1500 + text.length * 140);
  });
}

function stopSpeaking() {
  synth && synth.cancel();
  if (!player.paused) player.pause();
}

// Say one or more sentences in order. A newer call interrupts an older one.
let speakToken = 0;
async function speak(...parts) {
  const token = ++speakToken;
  const btn = $('repeatBtn');
  stopSpeaking();
  btn.classList.add('speaking');
  for (const text of parts) {
    if (token !== speakToken) return;
    const id = clipId(text);
    if (clips.has(id)) {
      try { await playClip(id); continue; } catch (e) { /* fall back to synthesis */ }
    }
    if (token !== speakToken) return;
    await synthesize(text);
  }
  if (token === speakToken) btn.classList.remove('speaking');
}

// ---------- Gentle sounds ----------
let audioCtx = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}
function chime() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523.25, 783.99].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.5);
    o.connect(g).connect(audioCtx.destination);
    o.start(t + i * 0.12);
    o.stop(t + i * 0.12 + 0.55);
  });
}

// ---------- Helpers ----------
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

function displayLetter(c) {
  const up = c.toLocaleUpperCase('ro');
  if (state.settings.case === 'upper') return up;
  if (state.settings.case === 'both') return up + c;
  return c;
}
function displayWord(w) {
  return state.settings.case === 'upper' ? w.toLocaleUpperCase('ro') : w;
}

// ---------- Pools ----------
function letterPool() {
  return LETTERS.slice(0, Math.min(state.letterPool, LETTERS.length));
}
function customWords() {
  return state.settings.customWords
    .split('\n').map((w) => w.trim()).filter(Boolean)
    .map((w) => [w, '⭐']);
}
function wordPool() {
  const base = WORD_LEVELS.slice(0, state.wordLevel + 1).flat();
  const seen = new Set(base.map((w) => w[0]));
  return base.concat(customWords().filter((w) => !seen.has(w[0])));
}
function streakOf(stats, key) { return (stats[key] && stats[key].streak) || 0; }
function masteredShare(items, stats, need) {
  if (!items.length) return 0;
  return items.filter((k) => streakOf(stats, k) >= need).length / items.length;
}

// Pick a target, favouring items she is still learning and avoiding repeats.
const recent = [];
function pickWeighted(keys, stats, need) {
  const weights = keys.map((k) => {
    let w = 1 / (1 + Math.min(streakOf(stats, k), need));
    if (!stats[k]) w *= 2;                // brand new: show it soon
    if (recent.includes(k)) w *= 0.05;    // don't repeat right away
    return w;
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}
function remember(key) {
  recent.push(key);
  if (recent.length > 3) recent.shift();
}

// ---------- Building a question ----------
function chooseKind() {
  const mode = state.settings.mode;
  if (mode === 'letters') return 'letter';
  if (mode === 'words') return 'word';
  if (!state.wordsUnlocked) return 'letter';
  return Math.random() < 0.2 ? 'letter' : 'word';
}

function makeLetterQuestion() {
  const pool = letterPool().map((l) => l.c);
  const target = pickWeighted(pool, state.letterStats, LETTER_MASTERED);
  const info = LETTERS.find((l) => l.c === target);
  const distractors = new Set();
  // Once a letter is partly known, sometimes include a look-alike from the pool.
  if (streakOf(state.letterStats, target) >= 1 && Math.random() < 0.6) {
    const look = (CONFUSABLE[target] || []).filter((c) => pool.includes(c));
    if (look.length) distractors.add(rand(look));
  }
  for (const c of shuffle(pool)) {
    if (distractors.size >= 3) break;
    if (c !== target) distractors.add(c);
  }
  const prompt = SAY.letterPrompt(info, state.settings.hint);
  return {
    kind: 'letter',
    key: target,
    options: shuffle([target, ...distractors]),
    prompt,
    short: SAY.letterShort(info),
    showMe: SAY.letterShowMe(info),
    label: displayLetter,
    reward: displayLetter(target),
  };
}

function makeWordQuestion() {
  const pool = wordPool();
  const keys = pool.map((w) => w[0]);
  const target = pickWeighted(keys, state.wordStats, WORD_MASTERED);
  const emoji = pool.find((w) => w[0] === target)[1];
  // Harder distractors once the word is partly known: same first letter or similar length.
  const known = streakOf(state.wordStats, target) >= 1;
  const others = shuffle(keys.filter((k) => k !== target));
  const similar = others.filter((k) => k[0] === target[0] || Math.abs(k.length - target.length) <= 1);
  const ordered = known ? similar.concat(others) : others;
  const distractors = [...new Set(ordered)].slice(0, 3);
  return {
    kind: 'word',
    key: target,
    options: shuffle([target, ...distractors]),
    prompt: SAY.wordPrompt(target),
    short: SAY.wordShort(target),
    showMe: SAY.wordShowMe(target),
    label: displayWord,
    reward: emoji,
  };
}

// ---------- Game flow ----------
let q = null;
let mistakes = 0;
let busy = false;
let roundCount = 0;
let roundCorrect = 0;

function renderDots() {
  $('dots').innerHTML = Array.from({ length: ROUND_LENGTH }, (_, i) =>
    `<span class="${i < roundCount ? 'done' : ''}"></span>`).join('');
}

async function nextQuestion() {
  if (roundCount >= ROUND_LENGTH) return endRound();
  q = chooseKind() === 'word' ? makeWordQuestion() : makeLetterQuestion();
  remember(q.key);
  mistakes = 0;
  busy = false;
  renderDots();

  const box = $('options');
  box.className = 'options' + (q.kind === 'word' ? ' words' : '') +
    (q.kind === 'word' && q.options.some((o) => o.length > 7) ? ' long' : '');
  box.innerHTML = '';
  q.options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = q.label(opt);
    b.dataset.value = opt;
    b.lang = 'ro';
    b.addEventListener('click', () => answer(b));
    box.appendChild(b);
  });
  $('promptText').textContent = q.kind === 'word' ? 'Care cuvânt?' : 'Care literă?';
  $('reward').className = 'reward';
  await speak(q.prompt);
}

async function answer(btn) {
  if (busy || btn.disabled) return;
  const value = btn.dataset.value;
  const stats = q.kind === 'word' ? state.wordStats : state.letterStats;
  const s = stats[q.key] || (stats[q.key] = { seen: 0, correct: 0, streak: 0 });

  if (value === q.key) {
    busy = true;
    if (mistakes === 0) { s.correct++; s.streak++; roundCorrect++; }
    s.seen++;
    roundCount++;
    btn.classList.add('correct');
    document.querySelectorAll('.opt').forEach((b) => { if (b !== btn) b.classList.add('faded'); b.disabled = true; });
    chime();
    if (q.kind === 'word') {
      $('reward').textContent = q.reward;
      $('reward').classList.add('show');
    }
    renderDots();
    const unlocked = progress();
    save();
    await speak(mistakes === 0 ? rand(PRAISE) : SAY.ok);
    await wait(500);
    if (unlocked) await celebrateWords();
    nextQuestion();
    return;
  }

  // Wrong answer: stay gentle. After two misses, show the right one.
  mistakes++;
  s.streak = 0;
  btn.classList.add('wrong');
  btn.disabled = true;
  save();
  busy = true;
  if (mistakes >= 2) {
    document.querySelectorAll('.opt').forEach((b) => {
      if (b.dataset.value === q.key) b.classList.add('show-me');
      else { b.disabled = true; b.classList.add('faded'); }
    });
    busy = false;
    await speak(q.showMe);
  } else {
    busy = false;
    await speak(rand(RETRY), q.short);
  }
}

// Grow the letter or word pool when most of it is known.
// Returns true when words have just been unlocked.
function progress() {
  if (q.kind === 'letter') {
    const pool = letterPool().map((l) => l.c);
    if (masteredShare(pool, state.letterStats, LETTER_MASTERED) >= 0.8) {
      if (state.letterPool < LETTERS.length) {
        state.letterPool = Math.min(LETTERS.length, state.letterPool + 2);
      } else if (!state.wordsUnlocked) {
        state.wordsUnlocked = true;
        return state.settings.mode === 'auto';
      }
    }
  } else {
    const keys = wordPool().map((w) => w[0]);
    if (state.wordLevel < WORD_LEVELS.length - 1 &&
        masteredShare(keys, state.wordStats, WORD_MASTERED) >= 0.8) {
      state.wordLevel++;
    }
  }
  return false;
}

async function celebrateWords() {
  $('options').innerHTML = '';
  $('reward').textContent = '🎉';
  $('reward').classList.add('show');
  await speak(SAY.celebrate);
  await wait(600);
}

function startRound() {
  roundCount = 0;
  roundCorrect = 0;
  showScreen('game');
  nextQuestion();
}

function endRound() {
  showScreen('roundEnd');
  $('stars').textContent = '⭐'.repeat(Math.max(1, roundCorrect));
  const msg = roundCorrect >= 8 ? SAY.roundGreat : roundCorrect >= 5 ? SAY.roundGood : SAY.roundOk;
  $('roundMsg').textContent = msg;
  speak(msg);
}

// ---------- Settings ----------
function openSettings() {
  stopSpeaking();
  const st = state.settings;
  $('setMode').value = st.mode;
  $('setCase').value = st.case;
  $('setRate').value = st.rate;
  $('setHint').checked = st.hint;
  $('setWords').value = st.customWords;
  const learned = LETTERS.filter((l) => streakOf(state.letterStats, l.c) >= LETTER_MASTERED).length;
  $('progressNote').textContent =
    `Progres: ${learned} din ${LETTERS.length} litere știute, ${state.letterPool} în joc. ` +
    (state.wordsUnlocked ? `Cuvinte: nivelul ${state.wordLevel + 1} din ${WORD_LEVELS.length}.` : 'Cuvintele vin după litere.');
  updateVoiceStatus();
  $('settings').showModal();
}
function readSettings() {
  const st = state.settings;
  st.mode = $('setMode').value;
  st.case = $('setCase').value;
  st.rate = Number($('setRate').value);
  st.hint = $('setHint').checked;
  st.customWords = $('setWords').value;
  save();
}

document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', openSettings));
$('settings').addEventListener('close', () => {
  readSettings();
  if ($('game').classList.contains('active')) nextQuestion();
});
$('testVoice').addEventListener('click', () => { readSettings(); speak(SAY.test); });
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Ștergi tot progresul? / Reset all progress?')) return;
  const settings = state.settings;
  state = JSON.parse(JSON.stringify(defaults));
  state.settings = settings;
  save();
  openSettings();
});

// ---------- Start ----------
$('startBtn').addEventListener('click', () => {
  unlockAudio();
  pickVoice();
  startRound();
});
$('againBtn').addEventListener('click', startRound);
$('doneBtn').addEventListener('click', () => {
  speak(SAY.bye);
  showScreen('start');
});
$('repeatBtn').addEventListener('click', () => { if (q) speak(q.prompt); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
