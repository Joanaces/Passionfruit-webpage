# 百香果 · CAT SUSPECT FILE

Plain HTML / CSS / JS — no install, no build step.

## Run it
- Quickest: double-click `index.html`.
- Or serve the folder: `python3 -m http.server 8000` → open http://localhost:8000

## Add your content
| What | Where |
|---|---|
| Opening portrait (your original, untouched) | `images/opening-portrait.jpg` |
| Photos for each age | `images/age-1/`, `images/age-2/`, `images/age-3/` |
| Meow sound | `audio/meow.mp3` |
| Photo list, order, captions, meow path, idle interval | `js/config.js` |

- Order in `photos` = order in the gallery. The first photo opens in the center and is the thumbnail on the records screen.
- Use 3–5 photos per age.
- Leave `caption` empty and the site says "no note yet" — it never invents memories.
- Missing photo files show a clearly labeled PLACEHOLDER with the path it expects.
- No `audio/meow.mp3` yet? A short synthesized placeholder meow plays instead. Drop in a real file and it takes over automatically.

## Behaviour notes
- Petting: press on the top of the head and drag left → right. Clicking elsewhere does nothing. Touch works. Keyboard: focus the head and press Enter.
- Idle meow every 20 s on the opening screen only; never overlaps; waits for the first user gesture (browser autoplay rules); mute button top-right (remembered).
- `Esc` goes back one screen. Reduced-motion preference is respected.
