// Prints every sentence the game can say, as JSON [{ id, text }], for tools/make_audio.py.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const d = vm.runInNewContext(code + ';({ LETTERS, WORD_LEVELS, PRAISE, RETRY, SAY, clipId })');
const { SAY } = d;

const texts = new Set([...d.PRAISE, ...d.RETRY]);
for (const l of d.LETTERS) {
  texts.add(SAY.letterPrompt(l, true));
  texts.add(SAY.letterPrompt(l, false));
  texts.add(SAY.letterShort(l));
  texts.add(SAY.letterShowMe(l));
}
for (const [w] of d.WORD_LEVELS.flat()) {
  texts.add(SAY.wordPrompt(w));
  texts.add(SAY.wordShort(w));
  texts.add(SAY.wordShowMe(w));
}
for (const v of Object.values(SAY)) if (typeof v === 'string') texts.add(v);

const out = [...texts].map((text) => ({ id: d.clipId(text), text }));
process.stdout.write(JSON.stringify(out, null, 1));
