# Să citim! — Romanian reading game

A small web game for relearning to read Romanian after a stroke. A Romanian voice asks
"Unde este litera en? en, ca în nas." and she taps one of four big tiles. It starts with
5 letters, adds two more each time she knows most of them, and once she knows all the
letters it moves on to words (short words first, then longer ones).

- No account, no server. Progress is saved on the phone.
- Works offline once opened, and can be added to the iPhone Home Screen.
- The voice is pre-recorded (Microsoft "Alina" neural voice) by the GitHub workflow in
  `.github/workflows/voice.yml` whenever `data.js` changes. Your own words from settings use the
  phone's built-in voice.
- The ⚙︎ button has settings for you: letters/words only, upper or lower case,
  voice speed, the example-word hint, and your own words (family names etc.).

## Putting it on her iPhone
1. Host this folder on any free static host (GitHub Pages or Netlify).
2. On her iPhone, open the link in **Safari**, tap **Share › Add to Home Screen**.
3. Open it from the new icon and tap "Începe" — the first tap turns the sound on.

## If the voice is not Romanian
iPhone: Settings › Accessibility › Spoken Content › Voices › Romanian › download "Ioana".
Also check the volume is up (the voice may be quiet if the phone is on silent).

## Files
index.html, style.css, app.js (game), data.js (letters and words — edit to change content),
sw.js (offline), manifest.webmanifest + icons/ (Home Screen icon).
