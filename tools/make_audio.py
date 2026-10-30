"""Records every phrase with a Microsoft neural Romanian voice (via edge-tts) into audio/.

Usage: python tools/make_audio.py phrases.json
Only missing clips are recorded; clips no longer used are deleted.
"""
import asyncio
import json
import pathlib
import sys

import edge_tts

VOICE = "ro-RO-AlinaNeural"
RATE = "-10%"
OUT = pathlib.Path(__file__).resolve().parent.parent / "audio"


async def record(text, path):
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(path))
            return
        except Exception as e:  # network hiccups: retry a few times
            print(f"retry {attempt + 1} for {text!r}: {e}")
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"could not record {text!r}")


async def main():
    phrases = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    wanted = {p["id"] for p in phrases}
    for p in phrases:
        path = OUT / f"{p['id']}.mp3"
        if not path.exists():
            print("recording", p["text"])
            await record(p["text"], path)
    for f in OUT.glob("*.mp3"):
        if f.stem not in wanted:
            f.unlink()
    (OUT / "index.json").write_text(json.dumps(sorted(wanted)), encoding="utf-8")


asyncio.run(main())
