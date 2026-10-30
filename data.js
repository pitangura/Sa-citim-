// Content for the game. Letter order is the order new letters are introduced.
// name = how the letter is said in Romanian, ex = example word for the hint.
const LETTERS = [
  { c: 'a', name: 'a', ex: 'apă' },
  { c: 'm', name: 'em', ex: 'mama' },
  { c: 'o', name: 'o', ex: 'ou' },
  { c: 'e', name: 'e', ex: 'elefant' },
  { c: 'n', name: 'en', ex: 'nas' },
  { c: 'i', name: 'i', ex: 'inimă' },
  { c: 't', name: 'te', ex: 'tata' },
  { c: 'u', name: 'u', ex: 'ureche' },
  { c: 's', name: 'es', ex: 'soare' },
  { c: 'p', name: 'pe', ex: 'pâine' },
  { c: 'l', name: 'el', ex: 'lapte' },
  { c: 'r', name: 'er', ex: 'roată' },
  { c: 'c', name: 'ce', ex: 'casă' },
  { c: 'd', name: 'de', ex: 'deget' },
  { c: 'b', name: 'be', ex: 'bunica' },
  { c: 'ă', name: 'ă', ex: 'casă' },
  { c: 'î', name: 'î din i', ex: 'înger' },
  { c: 'â', name: 'â din a', ex: 'pâine' },
  { c: 'ș', name: 'șe', ex: 'școală' },
  { c: 'ț', name: 'țe', ex: 'țară' },
  { c: 'f', name: 'ef', ex: 'floare' },
  { c: 'g', name: 'ge', ex: 'gură' },
  { c: 'v', name: 've', ex: 'vin' },
  { c: 'z', name: 'zet', ex: 'zahăr' },
  { c: 'h', name: 'haș', ex: 'haină' },
  { c: 'j', name: 'je', ex: 'joc' },
  { c: 'x', name: 'ics', ex: 'taxi' },
];

// Letters that look or sound alike. Used as harder distractors once a letter is partly known.
const CONFUSABLE = {
  a: ['ă', 'â', 'o'], ă: ['a', 'â'], â: ['a', 'ă', 'î'], i: ['î', 'l', 'j'], î: ['i', 'â'],
  s: ['ș', 'z'], ș: ['s', 'ț'], t: ['ț', 'f'], ț: ['t', 'ș'], b: ['d', 'p'], d: ['b', 'p'],
  p: ['b', 'd'], m: ['n', 'u'], n: ['m', 'u', 'h'], u: ['n', 'v'], e: ['c', 'o'], c: ['e', 'o'],
  o: ['c', 'a'], l: ['i', 't'], h: ['n'], v: ['u'], g: ['j'], j: ['i', 'g'], f: ['t'], z: ['s'],
};

// Words grouped by difficulty. emoji is shown after a correct answer.
const WORD_LEVELS = [
  [
    ['ou', '🥚'], ['ac', '🪡'], ['os', '🦴'], ['pom', '🌳'], ['nas', '👃'], ['cal', '🐴'],
    ['rac', '🦀'], ['pat', '🛏️'], ['cap', '🙂'], ['nor', '☁️'], ['pui', '🐥'], ['lac', '🏞️'],
    ['mac', '🌺'], ['car', '🛒'], ['sac', '🎒'], ['dop', '🍾'],
  ],
  [
    ['mama', '👩'], ['tata', '👨'], ['casă', '🏠'], ['apă', '💧'], ['masă', '🍽️'], ['lună', '🌙'],
    ['mere', '🍎'], ['pere', '🍐'], ['lapte', '🥛'], ['carte', '📖'], ['ușă', '🚪'], ['vin', '🍷'],
    ['pâine', '🍞'], ['mână', '✋'], ['câine', '🐕'], ['ceai', '🍵'], ['supă', '🍲'], ['pește', '🐟'],
    ['soare', '☀️'], ['floare', '🌸'], ['ochi', '👀'], ['gură', '👄'], ['roșu', '🔴'], ['oală', '🫕'],
  ],
  [
    ['pisică', '🐈'], ['bunica', '👵'], ['bunicul', '👴'], ['grădină', '🌷'], ['telefon', '📱'],
    ['fereastră', '🪟'], ['ciocolată', '🍫'], ['televizor', '📺'], ['doctor', '🩺'], ['familie', '👨‍👩‍👧'],
    ['prieten', '🤝'], ['dimineață', '🌅'], ['bucătărie', '🍳'], ['școală', '🏫'], ['zahăr', '🍬'],
    ['ureche', '👂'], ['inimă', '❤️'], ['ceas', '⌚'], ['cafea', '☕'], ['ploaie', '🌧️'],
  ],
];

const PRAISE = ['Bravo!', 'Foarte bine!', 'Excelent!', 'Așa este!', 'Minunat!', 'Perfect!'];
const RETRY = ['Mai încearcă.', 'Aproape. Încă o dată.', 'Nu chiar. Mai încearcă.'];

// Everything the game says. tools/phrases.js reads this to pre-record the voice clips,
// so any sentence spoken in app.js should come from here.
const SAY = {
  letterPrompt: (l, hint) => hint ? `Unde este litera ${l.name}? ${l.name}, ca în ${l.ex}.` : `Unde este litera ${l.name}?`,
  letterShort: (l) => `Litera ${l.name}.`,
  letterShowMe: (l) => `Aceasta este litera ${l.name}. Apas-o.`,
  wordPrompt: (w) => `Unde scrie: ${w}?`,
  wordShort: (w) => `${w}.`,
  wordShowMe: (w) => `Aici scrie ${w}. Apasă aici.`,
  ok: 'Bine.',
  celebrate: 'Felicitări! Știi toate literele. Acum citim cuvinte!',
  roundGreat: 'Excelent!',
  roundGood: 'Foarte bine!',
  roundOk: 'Bravo! Ai lucrat frumos.',
  bye: 'La revedere! Pe mâine.',
  test: 'Bună! Hai să citim împreună.',
};

// Name of the recorded clip for a sentence (same function in tools/phrases.js).
function clipId(text) {
  const s = text.normalize('NFC');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}
