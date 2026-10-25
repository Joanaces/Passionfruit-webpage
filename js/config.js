/*
 * 百香果 · CAT SUSPECT FILE — site configuration
 * ------------------------------------------------
 * Everything you are likely to change lives here.
 *
 *  - Swap photos: drop files into images/age-1/, images/age-2/, images/age-3/
 *    and make sure the `src` below matches the file name.
 *  - Reorder photos: change the order of the entries in `photos`.
 *    The FIRST photo is shown large in the center when the gallery opens
 *    (and is used as the thumbnail on the records screen).
 *  - Captions: fill in `caption` with your own words. Empty captions show a
 *    "no note yet" message instead of an invented memory.
 *  - Add/remove photos: 3–5 per age works best with the layout.
 *  - Meow sound: change `meow` (default: audio/meow.mp3).
 *
 * Photos whose file is missing automatically show a labeled placeholder.
 */
window.CAT_CONFIG = {
  name: "百香果",
  label: "CAT SUSPECT FILE",

  // The original portrait. Used as-is, never re-encoded or filtered.
  portrait: "images/opening-portrait.jpg",

  // Meow sound. If this file is missing, a short synthesized placeholder
  // meow is played instead so the interaction still works.
  meow: "audio/meow.mp3",
  meowVolume: 0.35,        // 0 – 1, kept quiet on purpose
  idleMeowSeconds: 20,     // idle meow interval on the opening screen

  ages: [
    {
      id: 1,
      tag: "AGE 01",
      title: "1 岁 · 刚被捡到",
      photos: [
        { src: "images/age-1/01.jpg", caption: "" },
        { src: "images/age-1/02.jpg", caption: "" },
        { src: "images/age-1/03.jpg", caption: "" },
        { src: "images/age-1/04.jpg", caption: "" }
      ]
    },
    {
      id: 2,
      tag: "AGE 02",
      title: "2 岁 · 成长中",
      photos: [
        { src: "images/age-2/01.jpg", caption: "" },
        { src: "images/age-2/02.jpg", caption: "" },
        { src: "images/age-2/03.jpg", caption: "" },
        { src: "images/age-2/04.jpg", caption: "" }
      ]
    },
    {
      id: 3,
      tag: "AGE 03",
      title: "3 岁 · 现在的百香果",
      photos: [
        { src: "images/age-3/01.jpg", caption: "" },
        { src: "images/age-3/02.jpg", caption: "" },
        { src: "images/age-3/03.jpg", caption: "" },
        { src: "images/age-3/04.jpg", caption: "" }
      ]
    }
  ]
};
