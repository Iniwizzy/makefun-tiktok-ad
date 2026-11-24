/**
 * "Iklan ini dibikin AI." / "This ad was made by AI."
 * A vertical TikTok ad for make.fun, built for the bounty bring-the-humans-03.
 *
 * This file is the whole creative: the copy, the timing, the layout, the motion and the
 * music score. It uses Node's standard library only, needs no network and reads nothing
 * but the fonts in assets/fonts (to measure text so every line fits the safe zone).
 * Nothing depends on the clock or on randomness, so two runs write the same bytes.
 *
 * It writes, into MAKEFUN_OUTPUT_DIR (default ./build):
 *   VIDEO.json                                the entry: the posted video's address, copied as the grader reads it
 *   ad.<lang>.back.ass, ad.<lang>.front.ass   animated type and shapes (rendered by libass)
 *   ad.<lang>.filter.txt                      the ffmpeg filtergraph: picture, badge, end card, score
 *   render.<lang>.json                        the ffmpeg command line that renders the MP4
 *   storyboard.<lang>.md, caption.<lang>.txt  the plan and the TikTok caption
 *   plan.json                                 the action log
 * render.mjs runs ffmpeg with that command line (ffmpeg needs libass, libfreetype and libvpx).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------------------------

const BOT_DIR: string = process.env.MAKEFUN_BOT_DIR ?? import.meta.dirname;
const OUT_DIR: string = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? join(BOT_DIR, "build"));

/** The poster's own make.fun referral code (8 chars of 0-9 and a-z without i, l, o, u). */
const REFERRAL_CODE = "1b2mk7tj";
if (!/^[0-9a-hj-km-np-tv-z]{8}$/.test(REFERRAL_CODE)) throw new Error("bad referral code");

const BOUNTY = "bring-the-humans-03";
const LANGS = ["id", "en"] as const;
type Lang = (typeof LANGS)[number];

// ---------------------------------------------------------------------------------------------
// Frame, brand and press-kit numbers (https://make.fun/press/manifest.json, edition 2026-11-21)
// ---------------------------------------------------------------------------------------------

const W = 1080;
const H = 1920;
const FPS = 60;

/** Colours from the press kit's palette.txt (Dark mode) and manifest brand colours. */
const C = {
  canvas: "#11141B",
  surface: "#171B24",
  hairline: "#232936",
  secondary: "#BFC7DC",
  magenta: "#C41C83",
  magentaInk: "#FF88C4",
  white: "#FFFFFF",
  ink: "#191419",
};

/** Safe zone of TikTok In-Feed and Instagram Reels together, and the brand badge's box. */
const SAFE = { x: 120, y: 269, w: 840, h: 979 };
const BADGE = { x: 120, y: 272, w: 330, h: 128, clear: 24 };
const CONTENT_LEFT = SAFE.x;
const CONTENT_W = SAFE.w;
const CX = W / 2;

const PRESS = {
  badge: "assets/press/brand-badge/9x16/makefun-badge-9x16.png",
  card: "assets/press/referral-card/9x16/makefun-card-9x16-transparent.webm",
  lockup: "assets/press/lockup-on-dark-2400.png",
  ghostLaptop: "assets/press/illustrations/ghost-laptop-recording.png",
  ghostTrophy: "assets/press/illustrations/ghost-pile-trophy.png",
  ghostSpyglass: "assets/press/illustrations/ghost-spyglass.png",
  ghostJudge: "assets/press/illustrations/ghost-judge-paddle.png",
  ghostWave: "assets/press/illustrations/ghost-wave-mail.png",
  ghostBox: "assets/press/illustrations/ghost-box-files.png",
};
/** Pixel sizes of the press files above, from the manifest. */
const SIZE: Record<string, [number, number]> = {
  [PRESS.lockup]: [2400, 739],
  [PRESS.ghostLaptop]: [741, 610],
  [PRESS.ghostTrophy]: [1396, 1968],
  [PRESS.ghostSpyglass]: [884, 677],
  [PRESS.ghostJudge]: [755, 885],
  [PRESS.ghostWave]: [1410, 1404],
  [PRESS.ghostBox]: [870, 778],
};

/** The 9:16 referral end card and its field (manifest referral_card.fields["9:16"]). */
const CARD = {
  len: 2.5,
  rest: 1.433,
  caretCover: { x: 208, y: 1230, w: 9, h: 82 },
  codeX: 210,
  codeMid: 1271,
  codeSize: 62,
  codeBox: { y: 1232, h: 78 },
  codeFont: "assets/fonts/jetbrains-mono-700.ttf",
};

const FONTS_DIR = "assets/fonts";

// ---------------------------------------------------------------------------------------------
// Timeline. The score runs at 120 BPM, so every cut and every big hit sits on a beat.
// ---------------------------------------------------------------------------------------------

const BEAT = 0.5;
const T_CARD = 19.0; // the end card comes in here and the badge goes off
const HOLD = 0.7; // the card's last frame is held a little so the code can be read
const DURATION = T_CARD + CARD.len + HOLD; // 22.2 s
const DROP = 3.5; // the "$500" hit

const SCENE = {
  hook: [0, 3.0],
  stakes: [3.0, 5.5],
  what: [5.5, 9.5],
  how: [9.5, 14.0],
  why: [14.0, 17.0],
  cta: [17.0, DURATION], // stays under the end card's wash
} as const;

const CODE_TYPE_START = T_CARD + CARD.rest;
const CODE_CHAR_DT = 0.05;
const CODE_TYPED = CODE_TYPE_START + REFERRAL_CODE.length * CODE_CHAR_DT;

// ---------------------------------------------------------------------------------------------
// Copy. "*word*" is set in make.fun's reward pink (Magenta ink, Dark mode).
// Every claim comes from make.fun's own pages: the homepage ("Free to enter", "a sandbox grades
// every entry", bounties for games, sites and code) and this bounty's page ($500).
//
// Cut 2 (2026-11-24): TikTok removed cut 1 under its Community Guidelines. Its likely triggers
// were money and crypto words (USDC, wallet, "real money", "no betting", "trading bots") and a
// board screenshot full of trading-bot bounties, so cut 2 talks about prize competitions for AI
// agents instead, drops those words and the screenshot, and keeps everything the bounty asks for.
// ---------------------------------------------------------------------------------------------

type Copy = {
  hook: { l1: string; l2: string; term1: string; term2: string; ok: string; sub: string };
  stakes: { kicker: string; l1: string; big: string; l2: string };
  what: { kicker: string; l1: string; l2: string; b1: string; b2: string };
  how: { title: string; steps: [string, string][] };
  why: { l1: string; sub: string; chips: string[] };
  cta: { l1: string; l2: string; b1: string; b2: string };
  caption: string;
};

const CAPTION_BOUNTY_LINE = "Made by my AI agent for a $500 bounty on make.fun: make.fun/bounty/bring-the-humans-03";

const COPY: Record<Lang, Copy> = {
  id: {
    hook: {
      l1: "Iklan ini",
      l2: "dibikin *AI.*",
      term1: "> agent: bikin iklan make.fun",
      term2: "> render iklan.mp4 ... ",
      ok: "OK",
      sub: "Bukan manusia. Serius.",
    },
    stakes: { kicker: "Kenapa?", l1: "AI ini lagi ngejar", big: "$500", l2: "bounty di make.fun" },
    what: {
      kicker: "make.fun itu apa?",
      l1: "Arena bounty",
      l2: "buat *AI agent.*",
      b1: "Lomba bikin game, web & kode.",
      b2: "Yang terbaik jadi juara",
    },
    how: {
      title: "Caranya gampang:",
      steps: [
        ["Pilih bounty", "game, web, kode, desain..."],
        ["Agent kamu yang kerja", "kamu tinggal ngarahin"],
        ["Sandbox yang menilai", "yang terbaik menang"],
      ],
    },
    why: { l1: "*Gratis* ikut.", sub: "Tanpa biaya pendaftaran.", chips: ["game", "website", "desain", "kode"] },
    cta: { l1: "Giliran", l2: "*agent kamu.*", b1: "Daftar di make.fun", b2: "pakai kode referral aku:" },
    caption: [
      "Iklan ini 100% dibikin AI agent aku.",
      CAPTION_BOUNTY_LINE,
      "",
      "<PLAY_CODE>",
      "",
      "#makefun #aiagent #ai #lomba",
    ].join("\n"),
  },
  en: {
    hook: {
      l1: "This ad was",
      l2: "made by *AI.*",
      term1: "> agent: make a make.fun ad",
      term2: "> render ad.mp4 ... ",
      ok: "OK",
      sub: "No humans. Seriously.",
    },
    stakes: { kicker: "Why?", l1: "This AI is chasing a", big: "$500", l2: "bounty on make.fun" },
    what: {
      kicker: "What's make.fun?",
      l1: "Bounties",
      l2: "for *AI agents.*",
      b1: "Contests for games, sites & code.",
      b2: "The best entry wins",
    },
    how: {
      title: "How it works:",
      steps: [
        ["Pick a bounty", "games, sites, code, design..."],
        ["Your agent does the work", "you just steer it"],
        ["A sandbox grades it", "the best one wins"],
      ],
    },
    why: { l1: "*Free* to enter.", sub: "No entry fee.", chips: ["games", "websites", "design", "code"] },
    cta: { l1: "Put your agent", l2: "*to work.*", b1: "Sign up at make.fun", b2: "with my referral code:" },
    caption: [
      "This ad was made 100% by my AI agent.",
      CAPTION_BOUNTY_LINE,
      "",
      "<PLAY_CODE>",
      "",
      "#makefun #aiagent #ai #contest",
    ].join("\n"),
  },
};

// ---------------------------------------------------------------------------------------------
// Font measuring: just enough TrueType parsing (cmap 4, hmtx, OS/2 win metrics) to know how
// wide libass will set a line. libass sizes a face so usWinAscent + usWinDescent = font size.
// ---------------------------------------------------------------------------------------------

type Face = { glyph: Map<number, number>; adv: (g: number) => number; height: number };

function loadFace(file: string): Face {
  const b = readFileSync(join(BOT_DIR, file));
  const tables: Record<string, number> = {};
  const n = b.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + 16 * i;
    tables[b.toString("latin1", o, o + 4)] = b.readUInt32BE(o + 8);
  }
  const numHMetrics = b.readUInt16BE(tables["hhea"] + 34);
  const os2 = tables["OS/2"];
  const height = b.readUInt16BE(os2 + 74) + b.readUInt16BE(os2 + 76);
  const cmap = tables["cmap"];
  let sub = -1;
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
    const p = b.readUInt16BE(cmap + 4 + 8 * i);
    const e = b.readUInt16BE(cmap + 6 + 8 * i);
    const off = cmap + b.readUInt32BE(cmap + 8 + 8 * i);
    if (p === 3 && e === 1 && b.readUInt16BE(off) === 4) sub = off;
  }
  if (sub < 0) throw new Error(`${file}: no cmap format 4`);
  const segX2 = b.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  const glyph = new Map<number, number>();
  for (let s = 0; s < segX2 / 2; s++) {
    const end = b.readUInt16BE(ends + 2 * s);
    const start = b.readUInt16BE(starts + 2 * s);
    const delta = b.readInt16BE(deltas + 2 * s);
    const ro = b.readUInt16BE(ranges + 2 * s);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let g = 0;
      if (ro === 0) g = (c + delta) & 0xffff;
      else {
        g = b.readUInt16BE(ranges + 2 * s + ro + 2 * (c - start));
        if (g !== 0) g = (g + delta) & 0xffff;
      }
      glyph.set(c, g);
    }
  }
  const hmtx = tables["hmtx"];
  const adv = (g: number) => b.readUInt16BE(hmtx + 4 * Math.min(g, numHMetrics - 1));
  return { glyph, adv, height };
}

type StyleName = "Head" | "Bold" | "Semi" | "Mono";
const STYLE: Record<StyleName, { font: string; file: string; bold: number; spacing: number }> = {
  Head: { font: "Inter ExtraBold", file: "inter-800.ttf", bold: 0, spacing: -2 },
  Bold: { font: "Inter", file: "inter-700.ttf", bold: -1, spacing: -1 },
  Semi: { font: "Inter SemiBold", file: "inter-600.ttf", bold: 0, spacing: 0 },
  Mono: { font: "JetBrains Mono", file: "jetbrains-mono-700.ttf", bold: -1, spacing: 0 },
};
const FACES = Object.fromEntries(
  (Object.keys(STYLE) as StyleName[]).map((s) => [s, loadFace(`${FONTS_DIR}/${STYLE[s].file}`)]),
) as Record<StyleName, Face>;

const plain = (s: string) => s.replaceAll("*", "");

function measure(style: StyleName, text: string, size: number): number {
  const f = FACES[style];
  let units = 0;
  const chars = [...plain(text)];
  for (const ch of chars) units += f.adv(f.glyph.get(ch.codePointAt(0) ?? 32) ?? 0);
  return (units * size) / f.height + STYLE[style].spacing * chars.length;
}

/** Headlines keep 20 px inside each side of the safe zone. */
const TEXT_W = CONTENT_W - 40;
/** libass sets lines a few percent wider than the bare advances (hinting, rounding). */
const MEASURE_SLACK = 1.04;

/** The largest size up to `max` at which `text` fits `width` px. */
function fit(style: StyleName, text: string, max: number, width = TEXT_W): number {
  const w = measure(style, text, max) * MEASURE_SLACK;
  return w <= width ? max : Math.floor((max * width) / w);
}

// ---------------------------------------------------------------------------------------------
// ASS (libass) writing
// ---------------------------------------------------------------------------------------------

const n2 = (v: number) => String(v).padStart(2, "0");
function assTime(t: number): string {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${n2(Math.floor(cs / 6000) % 60)}:${n2(Math.floor(cs / 100) % 60)}.${n2(cs % 100)}`;
}
function col(hex: string): string {
  return `&H${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}&`.toUpperCase();
}
/** ASS alpha from opacity 0..1. */
function alpha(opacity: number): string {
  return `&H${Math.round((1 - opacity) * 255).toString(16).padStart(2, "0").toUpperCase()}&`;
}
const r = (v: number) => Math.round(v);

type Ev = { layer: number; t0: number; t1: number; style: StyleName; text: string };

class Track {
  events: Ev[] = [];
  add(layer: number, t0: number, t1: number, style: StyleName, text: string) {
    this.events.push({ layer, t0, t1, style, text });
  }
  write(file: string) {
    const styles = (Object.keys(STYLE) as StyleName[]).map((s) => {
      const st = STYLE[s];
      return `Style: ${s},${st.font},60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,${st.bold},0,0,0,100,100,${st.spacing},0,1,0,0,5,0,0,0,1`;
    });
    const lines = [
      "[Script Info]",
      "ScriptType: v4.00+",
      `PlayResX: ${W}`,
      `PlayResY: ${H}`,
      "WrapStyle: 2",
      "ScaledBorderAndShadow: yes",
      "YCbCr Matrix: None",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      ...styles,
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      ...this.events.map(
        (e) => `Dialogue: ${e.layer},${assTime(e.t0)},${assTime(e.t1)},${e.style},,0,0,0,,${e.text}`,
      ),
      "",
    ];
    writeFileSync(file, lines.join("\n"));
  }
}

/** Text with "*accent*" markup turned into colour overrides. */
function markup(text: string, base: string, accent = C.magentaInk): string {
  let on = false;
  return text
    .split("*")
    .map((part, i) => {
      if (i > 0) on = !on;
      return (i > 0 ? `{\\c${col(on ? accent : base)}}` : "") + part;
    })
    .join("");
}

function rrectPath(w: number, h: number, rad: number): string {
  const k = r(rad * 0.4477); // bezier handle offset from the corner (1 - 0.5523)
  return [
    `m ${rad} 0 l ${w - rad} 0`,
    `b ${w - k} 0 ${w} ${k} ${w} ${rad}`,
    `l ${w} ${h - rad}`,
    `b ${w} ${h - k} ${w - k} ${h} ${w - rad} ${h}`,
    `l ${rad} ${h}`,
    `b ${k} ${h} 0 ${h - k} 0 ${h - rad}`,
    `l 0 ${rad}`,
    `b 0 ${k} ${k} 0 ${rad} 0`,
  ].join(" ");
}

// Motion presets (times in ms from the event's start).
const ANIM = {
  /** Frame-0 text: already there, settling in. */
  settle: "\\fscx108\\fscy108\\t(0,320,0.6,\\fscx100\\fscy100)",
  pop: "\\fscx70\\fscy70\\t(0,140,\\fscx108\\fscy108)\\t(140,240,\\fscx100\\fscy100)\\fad(90,0)",
  bigPop: "\\fscx40\\fscy40\\t(0,170,\\fscx114\\fscy114)\\t(170,320,\\fscx100\\fscy100)\\fad(60,0)",
};
const slideUp = (x: number, y: number, d = 46, ms = 220) => `\\move(${r(x)},${r(y + d)},${r(x)},${r(y)},0,${ms})\\fad(${ms},0)`;

// ---------------------------------------------------------------------------------------------
// The picture: images laid by ffmpeg between the back and front type layers
// ---------------------------------------------------------------------------------------------

type Img = {
  file: string;
  w: number; // scaled width, px
  x: number;
  y: number;
  t0: number;
  t1: number;
  rise?: number; // px it slides up as it comes in
  rise_s?: number;
  bob?: number; // px of idle float
  fadeIn?: number;
};

type Sfx = { pops: number[]; ticks: [number, number, number][] }; // ticks: [start, count, dt]

type Built = { back: Track; front: Track; imgs: Img[]; sfx: Sfx; board: string[] };

function build(lang: Lang): Built {
  const k = COPY[lang];
  const back = new Track();
  const front = new Track();
  const imgs: Img[] = [];
  const sfx: Sfx = { pops: [], ticks: [] };
  const board: string[] = [];

  /** Centered text line. */
  const line = (
    t0: number,
    t1: number,
    style: StyleName,
    text: string,
    y: number,
    max: number,
    o: { color?: string; anim?: string; layer?: number; pop?: boolean; x?: number; width?: number } = {},
  ) => {
    const size = fit(style, text, max, o.width ?? CONTENT_W);
    const base = o.color ?? C.white;
    const x = o.x ?? CX;
    const anim = o.anim ?? "";
    const pos = anim.includes("\\move") ? "" : `\\pos(${r(x)},${r(y)})`;
    front.add(o.layer ?? 5, t0, t1, style, `{\\an5${pos}\\fs${size}\\c${col(base)}${anim}}${markup(text, base)}`);
    if (o.pop) sfx.pops.push(t0);
    board.push(`${t0.toFixed(2)}s  ${style} ${size}px  "${plain(text)}"`);
    return size;
  };

  /** Rounded rectangle on the back (default) or front track. */
  const box = (
    t0: number,
    t1: number,
    x: number,
    y: number,
    w: number,
    h: number,
    rad: number,
    fill: string,
    o: { border?: number; borderColor?: string; opacity?: number; anim?: string; layer?: number; front?: boolean; slideX?: number } = {},
  ) => {
    const track = o.front ? front : back;
    const pos = o.slideX
      ? `\\move(${r(x + o.slideX)},${r(y)},${r(x)},${r(y)},0,220)\\fad(200,0)`
      : `\\pos(${r(x)},${r(y)})`;
    track.add(
      o.layer ?? 1,
      t0,
      t1,
      "Bold",
      `{\\an7${pos}\\p1\\bord${o.border ?? 0}\\shad0\\3c${col(o.borderColor ?? C.hairline)}\\1c${col(fill)}\\1a${alpha(o.opacity ?? 1)}${o.anim ?? ""}}${rrectPath(w, h, rad)}{\\p0}`,
    );
  };

  /** Monospace line typed character by character, with a caret. */
  const typed = (
    segs: { s: string; c: string }[],
    x: number,
    y: number,
    t0: number,
    dt: number,
    t1: number,
    size: number,
    blink: boolean,
  ) => {
    const chars: { ch: string; c: string }[] = [];
    for (const sg of segs) for (const ch of sg.s) chars.push({ ch, c: sg.c });
    const render = (n: number, caret: boolean) => {
      let out = "";
      let cur = "";
      for (const { ch, c } of chars.slice(0, n)) {
        if (c !== cur) {
          out += `{\\c${col(c)}}`;
          cur = c;
        }
        out += ch;
      }
      return out + (caret ? `{\\c${col(C.magentaInk)}}_` : "");
    };
    const head = `{\\an7\\pos(${r(x)},${r(y)})\\fs${size}}`;
    const done = t0 + chars.length * dt;
    for (let i = 1; i <= chars.length; i++) {
      const a = t0 + (i - 1) * dt;
      front.add(5, a, a + dt, "Mono", head + render(i, true));
    }
    if (!blink) {
      front.add(5, done, t1, "Mono", head + render(chars.length, false));
    } else {
      let on = false;
      for (let a = done; a < t1 - 1e-6; a += 0.25) {
        front.add(5, a, Math.min(t1, a + 0.25), "Mono", head + render(chars.length, on));
        on = !on;
      }
    }
    sfx.ticks.push([t0, chars.length, dt]);
  };

  // ---- 1. HOOK ------------------------------------------------------------------------------
  {
    const [a, b] = SCENE.hook;
    line(a, b, "Head", k.hook.l1, 560, 210, { anim: ANIM.settle });
    line(a, b, "Head", k.hook.l2, 765, 220, { anim: ANIM.settle });
    // Terminal window
    const tx = CONTENT_LEFT;
    const ty = 905;
    box(a, b, tx, ty, CONTENT_W, 230, 30, C.surface, { border: 3, borderColor: C.hairline });
    [C.magenta, C.secondary, C.secondary].forEach((c, i) =>
      box(a, b, tx + 30 + i * 34, ty + 26, 20, 20, 10, c, { layer: 2, opacity: i === 0 ? 1 : 0.35 }),
    );
    const mono = Math.min(fit("Mono", k.hook.term1 + "_", 50, CONTENT_W - 80), fit("Mono", k.hook.term2 + k.hook.ok + "_", 50, CONTENT_W - 80));
    typed([{ s: k.hook.term1, c: C.secondary }], tx + 40, ty + 70, a + 0.15, 0.03, b, mono, false);
    typed(
      [
        { s: k.hook.term2, c: C.secondary },
        { s: k.hook.ok, c: C.magentaInk },
      ],
      tx + 40,
      ty + 142,
      a + 1.15,
      0.03,
      b,
      mono,
      true,
    );
    line(a + 1.95, b, "Semi", k.hook.sub, 1200, 64, { color: C.secondary, anim: slideUp(CX, 1200), pop: true });
    imgs.push({ file: PRESS.ghostLaptop, w: 230, x: 726, y: 276, t0: a, t1: b, bob: 8 });
  }

  // ---- 2. STAKES ----------------------------------------------------------------------------
  {
    const [a, b] = SCENE.stakes;
    line(a, b, "Semi", k.stakes.kicker, 492, 70, { color: C.secondary, anim: ANIM.pop, pop: true });
    line(a + 0.15, b, "Head", k.stakes.l1, 612, 124, { anim: slideUp(CX, 612) });
    // magenta flash on the drop
    back.add(0, DROP, DROP + 0.4, "Bold", `{\\an7\\pos(0,0)\\p1\\bord0\\shad0\\1c${col(C.magenta)}\\1a&H50&\\t(0,380,\\1a&HFF&)}m 0 0 l ${W} 0 ${W} ${H} 0 ${H}{\\p0}`);
    const big = fit("Head", k.stakes.big, 430);
    front.add(4, DROP, b, "Head", `{\\an5\\pos(${CX},850)\\fs${big}\\bord16\\blur32\\3c${col(C.magenta)}\\c${col(C.magenta)}\\1a&H60&\\3a&H90&${ANIM.bigPop}}${k.stakes.big}`);
    line(DROP, b, "Head", k.stakes.big, 850, 430, { color: C.magentaInk, anim: ANIM.bigPop });
    line(DROP + 0.3, b, "Head", k.stakes.l2, 1088, 118, { anim: slideUp(CX, 1088), pop: true });
    imgs.push({ file: PRESS.ghostTrophy, w: 290, x: 395, y: 1170, t0: DROP + 0.1, t1: b, rise: 140, rise_s: 0.4, bob: 6 });
  }

  // ---- 3. WHAT ------------------------------------------------------------------------------
  {
    const [a, b] = SCENE.what;
    line(a, b, "Semi", k.what.kicker, 488, 70, { color: C.secondary, anim: ANIM.pop, pop: true });
    imgs.push({ file: PRESS.lockup, w: 740, x: 170, y: 540, t0: a + 0.15, t1: b, rise: 40, rise_s: 0.3 });
    line(a + 0.5, b, "Head", k.what.l1, 870, 150, { anim: slideUp(CX, 870), pop: true });
    line(a + 0.65, b, "Head", k.what.l2, 1012, 150, { anim: slideUp(CX, 1012) });
    line(a + 1.2, b, "Semi", k.what.b1, 1138, 66, { anim: slideUp(CX, 1138), pop: true });
    line(a + 1.4, b, "Semi", k.what.b2, 1210, 52, { color: C.secondary, anim: slideUp(CX, 1210) });
  }

  // ---- 4. HOW -------------------------------------------------------------------------------
  {
    const [a, b] = SCENE.how;
    line(a, b, "Head", k.how.title, 486, 110, { anim: ANIM.pop, pop: true });
    const ghosts = [PRESS.ghostSpyglass, PRESS.ghostLaptop, PRESS.ghostJudge];
    const cardH = 210;
    const pitch = 228;
    const textX = 456;
    const textW = SAFE.x + SAFE.w - 24 - textX;
    const titleSize = Math.min(...k.how.steps.map(([t]) => fit("Bold", t, 64, textW)));
    const subSize = Math.min(...k.how.steps.map(([, s]) => fit("Semi", s, 44, textW)));
    k.how.steps.forEach(([title, sub], i) => {
      const t = a + 0.3 + i * 1.4;
      const y = 572 + i * pitch;
      const mid = y + cardH / 2;
      box(t, b, CONTENT_LEFT, y, CONTENT_W, cardH, 38, C.surface, { border: 3, borderColor: C.hairline, slideX: 70 });
      box(t, b, CONTENT_LEFT + 24, mid - 40, 80, 80, 40, C.magenta, { layer: 2, slideX: 70 });
      front.add(5, t, b, "Bold", `{\\an5\\move(${CONTENT_LEFT + 64 + 70},${mid},${CONTENT_LEFT + 64},${mid},0,220)\\fad(200,0)\\fs52}${i + 1}`);
      const [gw0, gh0] = SIZE[ghosts[i]];
      const gh = 166;
      const gw = Math.min(214, r((gw0 * gh) / gh0));
      const ghH = r((gh0 * gw) / gw0);
      imgs.push({ file: ghosts[i], w: gw, x: 228 + r((214 - gw) / 2), y: r(mid - ghH / 2), t0: t + 0.08, t1: b, rise: 30, rise_s: 0.25, bob: 4 });
      front.add(5, t + 0.1, b, "Bold", `{\\an4\\move(${textX + 70},${mid - 30},${textX},${mid - 30},0,220)\\fad(200,0)\\fs${titleSize}}${title}`);
      front.add(5, t + 0.1, b, "Semi", `{\\an4\\move(${textX + 70},${mid + 40},${textX},${mid + 40},0,220)\\fad(200,0)\\fs${subSize}\\c${col(C.secondary)}}${sub}`);
      sfx.pops.push(t);
      board.push(`${t.toFixed(2)}s  step ${i + 1}: "${title}" / "${sub}" (${titleSize}px/${subSize}px)`);
    });
  }

  // ---- 5. WHY -------------------------------------------------------------------------------
  {
    const [a, b] = SCENE.why;
    line(a, b, "Head", k.why.l1, 548, 210, { anim: ANIM.bigPop, pop: true });
    line(a + 0.3, b, "Semi", k.why.sub, 704, 66, { color: C.secondary, anim: slideUp(CX, 704) });
    // chips
    const pad = 30;
    const gap = 14;
    // the largest chip type (up to 42 px) at which the whole row fits the content width
    const textPerPx = k.why.chips.reduce((s, c) => s + measure("Bold", c, 100), 0) / 100;
    const room = CONTENT_W - gap * (k.why.chips.length - 1) - 2 * pad * k.why.chips.length;
    const chipSize = Math.min(42, Math.floor(room / textPerPx));
    const widths = k.why.chips.map((c) => r(measure("Bold", c, chipSize) + 2 * pad));
    const total = widths.reduce((s, w) => s + w, 0) + gap * (widths.length - 1);
    let x = r(CX - total / 2);
    k.why.chips.forEach((c, i) => {
      const t = a + 0.55 + i * 0.1;
      box(t, b, x, 790, widths[i], 76, 38, C.surface, { border: 3, borderColor: C.magenta, front: true, layer: 3, anim: "\\fad(120,0)" });
      front.add(4, t, b, "Bold", `{\\an5\\pos(${r(x + widths[i] / 2)},828)\\fs${chipSize}\\fad(120,0)}${c}`);
      x += widths[i] + gap;
    });
    sfx.pops.push(a + 0.55);
    // the mascot with its box of entries, from the press kit's illustrations
    const [bw0, bh0] = SIZE[PRESS.ghostBox];
    const bw = 400;
    imgs.push({ file: PRESS.ghostBox, w: bw, x: r(CX - bw / 2), y: 900, t0: a + 0.75, t1: b, rise: 110, rise_s: 0.4, bob: 6 });
    board.push(`${(a + 0.75).toFixed(2)}s  ghost-box-files ${bw}x${r((bh0 * bw) / bw0)}`);
  }

  // ---- 6. CTA (stays on under the end card's wash) ------------------------------------------
  {
    const [a, b] = SCENE.cta;
    line(a, b, "Head", k.cta.l1, 556, 200, { anim: ANIM.pop, pop: true });
    line(a + 0.12, b, "Head", k.cta.l2, 748, 200, { anim: ANIM.pop });
    line(a + 0.4, b, "Bold", k.cta.b1, 914, 84, { anim: slideUp(CX, 914), pop: true });
    line(a + 0.55, b, "Semi", k.cta.b2, 1000, 58, { color: C.secondary, anim: slideUp(CX, 1000) });
    box(a + 0.75, b, 220, 1050, 640, 140, 34, C.white, { border: 5, borderColor: C.magenta, front: true, layer: 3, anim: "\\fad(120,0)" });
    front.add(5, a + 0.75, b, "Mono", `{\\an5\\pos(${CX},1120)\\fs${fit("Mono", REFERRAL_CODE, 96, 560)}\\c${col(C.ink)}${ANIM.pop}}${REFERRAL_CODE}`);
    sfx.pops.push(a + 0.75);
    imgs.push({ file: PRESS.ghostWave, w: 250, x: 415, y: 1214, t0: a + 0.85, t1: b, rise: 90, rise_s: 0.35, bob: 7 });
  }

  return { back, front, imgs, sfx, board };
}

// ---------------------------------------------------------------------------------------------
// The score: a 120 BPM track synthesized in ffmpeg expressions (aevalsrc), A minor, Am F C G.
// ---------------------------------------------------------------------------------------------

const f3 = (v: number) => Number(v.toFixed(4)).toString();

function score(sfx: Sfx): { graph: string[]; label: string } {
  const D = f3(DURATION);
  const drumsOn = `(between(t,0,2.49)+between(t,${DROP},${f3(T_CARD - 0.01)}))`;
  const lateOn = `between(t,${DROP},${D})`;
  const kick =
    `st(0,mod(t,${BEAT}));${drumsOn}*sin(2*PI*(45*ld(0)+3.6667*(1-exp(-30*ld(0)))))*exp(-7*ld(0))*min(1,ld(0)*400)` +
    `+between(t,${DROP},${DROP + 2.5})*sin(2*PI*(36*max(0,t-${DROP})+2.5*(1-exp(-20*max(0,t-${DROP})))))*exp(-2.4*max(0,t-${DROP}))*0.9`;
  const clap = `st(0,mod(t-0.5,1));between(t,${DROP},${f3(T_CARD - 0.01)})*(2*random(1)-1)*(exp(-20*ld(0))+0.7*exp(-90*ld(0)))`;
  const hats = `st(0,mod(t-0.25,0.5));${drumsOn}*(2*random(1)-1)*exp(-80*ld(0))`;

  const whooshAt = [SCENE.what[0], SCENE.how[0], SCENE.why[0], SCENE.cta[0], T_CARD];
  const whoosh = whooshAt.map((w) => `exp(-10*max(0,${f3(w)}-t)-26*max(0,t-${f3(w)}))`).join("+");
  const riser = `between(t,2.3,${DROP})*pow((t-2.3)/${f3(DROP - 2.3)},3)`;
  const typing = [...sfx.ticks, [CODE_TYPE_START, REFERRAL_CODE.length, CODE_CHAR_DT] as [number, number, number]]
    .map(([t0, n, dt]) => `between(t,${f3(t0)},${f3(t0 + n * dt)})*exp(-500*mod(t-${f3(t0)},${f3(dt)}))*1.6`)
    .join("+");
  const air = `(2*random(1)-1)*(0.8*(${whoosh})+${riser}+${typing})`;

  const roots = [55, 43.65, 65.41, 49.0]; // A1 F1 C2 G1, a bar (2 s) each from the drop
  const chord = `st(1,mod(floor((t-${DROP})/2),4))`;
  const rootF = roots.map((f, i) => `${f}*eq(ld(1),${i})`).join("+");
  const bass =
    `st(0,mod(t,0.25));${chord};st(2,${rootF});${lateOn}*min(1,ld(0)*300)*min(1,(0.25-ld(0))*60)*exp(-4*ld(0))` +
    `*(1-0.65*exp(-10*mod(t,0.5)))*(sin(2*PI*ld(2)*ld(0))+0.5*sin(4*PI*ld(2)*ld(0))+0.25*sin(6*PI*ld(2)*ld(0)))`;
  const arpNotes = [
    [440, 523.25, 659.25, 880],
    [349.23, 440, 523.25, 698.46],
    [392, 523.25, 659.25, 783.99],
    [392, 493.88, 587.33, 783.99],
  ];
  const arpF = arpNotes.flatMap((row, m) => row.map((f, i) => `${f}*eq(ld(1),${m})*eq(ld(3),${i})`)).join("+");
  const pad = `between(t,0,${DROP})*min(1,t*4)*min(1,(${DROP}-t)*8)*(sin(2*PI*220*t)+sin(2*PI*261.63*t)+sin(2*PI*329.63*t))*0.25`;
  const arp =
    `st(0,mod(t,0.125));${chord};st(3,mod(floor(t/0.125),4));st(2,${arpF});` +
    `between(t,${SCENE.what[0]},${D})*min(1,ld(0)*500)*min(1,(0.125-ld(0))*150)*exp(-18*ld(0))*(sin(2*PI*ld(2)*ld(0))+0.3*sin(4*PI*ld(2)*ld(0)))+${pad}`;

  // Every envelope runs on a clamped local time, max(0,t-start): exp() of a large positive
  // number long before an event would overflow to inf and turn 0*inf into NaN.
  const local = (at: number | string) => `max(0,t-${typeof at === "number" ? f3(at) : at})`;
  const pops = [...new Set(sfx.pops.map(f3))]
    .map((p) => `between(t,${p},${p}+0.2)*sin(2*PI*(700*${local(p)}+12*(1-exp(-40*${local(p)}))))*exp(-25*${local(p)})`)
    .join("+");
  const coin =
    `between(t,${DROP},${DROP + 1})*sin(2*PI*1975.53*${local(DROP)})*exp(-9*${local(DROP)})` +
    `+between(t,${f3(DROP + 0.08)},${DROP + 1.1})*sin(2*PI*2637.02*${local(DROP + 0.08)})*exp(-7*${local(DROP + 0.08)})`;
  const tc = f3(CODE_TYPED);
  const chime = `between(t,${tc},${D})*(sin(2*PI*1318.51*${local(tc)})+0.6*sin(2*PI*1975.53*${local(tc)})+0.35*sin(2*PI*2637.02*${local(tc)}))*exp(-3.5*${local(tc)})`;
  const tones = `${pops}+${coin}+0.8*(${chime})`;

  const src = (expr: string, label: string, post = "") =>
    `aevalsrc=exprs='${expr}':s=44100:d=${D}${post ? "," + post : ""}[${label}]`;
  const graph = [
    src(kick, "ak", "lowpass=f=4000"),
    src(clap, "ac", "highpass=f=1500,lowpass=f=9000"),
    src(hats, "ah", "highpass=f=7000"),
    src(air, "aw", "highpass=f=700,lowpass=f=9000"),
    src(bass, "ab", "lowpass=f=1100"),
    src(arp, "aa", "lowpass=f=5000,aecho=0.8:0.5:250:0.22"),
    src(tones, "as", "lowpass=f=9000"),
    `[ak][ac][ah][aw][ab][aa][as]amix=inputs=7:weights='${MIX.join(" ")}':normalize=0,` +
      `volume=${f3(SCORE_GAIN)},alimiter=limit=0.89:attack=3:release=60:level=0,afade=t=out:st=${f3(DURATION - 1.1)}:d=1.1,` +
      `aformat=sample_rates=44100:channel_layouts=stereo[a]`,
  ];
  return { graph, label: "a" };
}

/** Mix weights: kick, clap, hats, air (whooshes, riser, typing), bass, arp + pad, tones (pops, coin, chime). */
const MIX = [0.8, 0.45, 0.3, 0.35, 0.42, 0.35, 0.3];
/** Master gain, set from a loudness measurement of the render (about -14 LUFS for TikTok). */
const SCORE_GAIN = 1.0;

// ---------------------------------------------------------------------------------------------
// The ffmpeg filtergraph and command line
// ---------------------------------------------------------------------------------------------

function filterPath(p: string): string {
  return p.replaceAll("\\", "/").replaceAll(":", "\\:");
}

function renderPlan(lang: Lang, b: Built, outRel: string) {
  const D = f3(DURATION);
  const frames = Math.round(DURATION * FPS);
  const inputs: string[] = [
    "-f", "lavfi", "-i", `color=c=${C.canvas.replace("#", "0x")}:s=${W}x${H}:r=${FPS}:d=${D}`,
    "-c:v", "libvpx-vp9", "-i", PRESS.card,
    "-i", PRESS.badge,
  ];
  const g: string[] = [];
  // Ground: canvas, a faint grid and two drifting magenta glows
  g.push(`[0:v]format=yuv444p,drawgrid=w=90:h=90:t=1:c=white@0.035[g0]`);
  g.push(
    `color=c=black:s=1000x1000:r=1:d=1,format=rgba,` +
      `geq=r='196':g='28':b='131':a='255*0.24*exp(-((X-500)*(X-500)+(Y-500)*(Y-500))/(2*170*170))',` +
      `loop=loop=${frames}:size=1,setpts=N/${FPS}/TB,split[glowA][glowB]`,
  );
  g.push(`[g0][glowA]overlay=x='40+70*sin(2*PI*t/7)':y='120+80*sin(2*PI*t/9)':eval=frame[g1]`);
  g.push(`[g1][glowB]overlay=x='60-90*sin(2*PI*t/8)':y='900+70*cos(2*PI*t/6)':eval=frame[g2]`);
  g.push(`[g2]ass=filename=${filterPath(`${outRel}/ad.${lang}.back.ass`)}:fontsdir=${FONTS_DIR}[g3]`);
  let cur = "g3";
  b.imgs.forEach((im, i) => {
    const idx = 3 + i;
    inputs.push("-i", im.file);
    const n = Math.max(1, Math.round((im.t1 - im.t0) * FPS));
    const fi = im.fadeIn ?? 0.18;
    const t0 = f3(im.t0);
    g.push(
      `[${idx}:v]scale=${im.w}:-1:flags=lanczos,format=rgba,loop=loop=${n}:size=1,` +
        `setpts=(N/${FPS}+${t0})/TB${im.t0 > 0 ? `,fade=t=in:st=${t0}:d=${f3(fi)}:alpha=1` : ""}[im${i}]`,
    );
    const rise = im.rise ?? 0;
    const rs = im.rise_s ?? 0.3;
    const y =
      `${im.y}` +
      (rise ? `+${rise}*pow(1-clip((t-${t0})/${f3(rs)},0,1),3)` : "") +
      (im.bob ? `+${im.bob}*sin(2*PI*(t-${t0})/1.8)` : "");
    g.push(`[${cur}][im${i}]overlay=x=${im.x}:y='${y}':eof_action=pass:eval=frame[c${i}]`);
    cur = `c${i}`;
  });
  g.push(`[${cur}]ass=filename=${filterPath(`${outRel}/ad.${lang}.front.ass`)}:fontsdir=${FONTS_DIR}[typed]`);
  // Brand badge, as it is, from frame 0 until the end card comes in
  const T = f3(T_CARD);
  // One frame past the cut: overlay never shows a secondary stream's last frame (its EOF lands
  // on that frame's own time), and enable= ends the badge exactly where the card comes in.
  g.push(`[2:v]format=rgba,loop=loop=${Math.round(T_CARD * FPS)}:size=1,setpts=N/${FPS}/TB[badge]`);
  g.push(`[typed][badge]overlay=0:0:enable='lt(t,${T})':eof_action=pass,format=yuva420p,split[clip][soft]`);
  // End card (press kit recipe): blur 28 px and desaturate the clip over 0.8 s, card on top
  g.push(`[soft]trim=start=${T},gblur=sigma=28,eq=saturation=0.35,fade=t=in:st=${T}:d=0.8:alpha=1[softb]`);
  g.push(`[clip][softb]overlay=eof_action=pass[bg]`);
  g.push(`[1:v]format=yuva420p,setpts=PTS-STARTPTS+${T}/TB[card]`);
  // The referral code, typed into the field once it rests: drawn whole at the recipe's place,
  // with the not-yet-typed part covered in the field's white and the magenta caret moving on.
  const cw = 0.6 * CARD.codeSize; // JetBrains Mono advance is 0.6 em: 37.2 px at 62 px
  const rest = CODE_TYPE_START;
  const codeFont = filterPath(CARD.codeFont);
  const cover = CARD.caretCover;
  const steps: string[] = [];
  for (let i = 0; i < REFERRAL_CODE.length; i++) {
    const a = f3(rest + i * CODE_CHAR_DT);
    const bb = f3(rest + (i + 1) * CODE_CHAR_DT);
    const x = r(CARD.codeX + cw * i);
    steps.push(`drawbox=x=${x}:y=${CARD.codeBox.y - 6}:w=${r(cw * (REFERRAL_CODE.length - i)) + 8}:h=${CARD.codeBox.h + 12}:color=white:t=fill:enable='between(t,${a},${bb})'`);
    steps.push(`drawbox=x=${x}:y=${CARD.codeBox.y}:w=5:h=${CARD.codeBox.h}:color=${C.magenta.replace("#", "0x")}:t=fill:enable='between(t,${a},${bb})'`);
  }
  g.push(
    `[bg][card]overlay=eof_action=repeat,` +
      `drawbox=x=${cover.x}:y=${cover.y}:w=${cover.w}:h=${cover.h}:color=white:t=fill:enable='gte(t,${f3(rest)})',` +
      `drawtext=fontfile=${codeFont}:text=${REFERRAL_CODE}:fontsize=${CARD.codeSize}:fontcolor=${C.ink.replace("#", "0x")}:` +
      `x=${CARD.codeX}:y=${CARD.codeMid}-(ascent-descent)/2:enable='gte(t,${f3(rest)})',` +
      steps.join(",") +
      `,format=yuv420p[v]`,
  );
  const audio = score(b.sfx);
  g.push(...audio.graph);

  const mp4 = `${outRel}/makefun-ad-${lang}.mp4`;
  const argv = [
    "-y", "-hide_banner", "-loglevel", "warning", "-stats",
    ...inputs,
    "-/filter_complex", `${outRel}/ad.${lang}.filter.txt`,
    "-map", "[v]", "-map", `[${audio.label}]`,
    "-t", D, "-r", String(FPS),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
    "-movflags", "+faststart",
    mp4,
  ];
  return { filter: g.join(";\n") + "\n", argv, mp4 };
}

// ---------------------------------------------------------------------------------------------
// Storyboard and caption
// ---------------------------------------------------------------------------------------------

function storyboard(lang: Lang, b: Built): string {
  const k = COPY[lang];
  const s = (x: readonly [number, number]) => `${x[0].toFixed(1)}–${x[1].toFixed(1)} s`;
  return [
    `# make.fun TikTok ad (${lang}) — storyboard`,
    "",
    `1080 x 1920, ${FPS} fps, ${DURATION.toFixed(1)} s. Brand badge (press kit overlay, as is) from frame 0 to ${T_CARD.toFixed(1)} s; referral end card from ${T_CARD.toFixed(1)} s with the code ${REFERRAL_CODE} typed in at ${CODE_TYPE_START.toFixed(3)} s.`,
    "",
    "| Time | Beat | On screen |",
    "|---|---|---|",
    `| ${s(SCENE.hook)} | Hook | "${plain(k.hook.l1)} ${plain(k.hook.l2)}" over a terminal that types \`${k.hook.term1}\` / \`${k.hook.term2}${k.hook.ok}\`; "${k.hook.sub}"; ghost at its laptop |`,
    `| ${s(SCENE.stakes)} | Stakes | "${k.stakes.kicker}" "${k.stakes.l1}" **${k.stakes.big}** "${k.stakes.l2}"; magenta flash on the drop; ghost crew with the trophy |`,
    `| ${s(SCENE.what)} | What make.fun is | "${k.what.kicker}" make.fun lockup; "${plain(k.what.l1)} ${plain(k.what.l2)}" "${k.what.b1}" "${k.what.b2}" |`,
    `| ${s(SCENE.how)} | How it works | "${k.how.title}" ${k.how.steps.map(([t, u], i) => `${i + 1}. ${t} (${u})`).join("; ")} — ghosts with spyglass, laptop, judge's paddle |`,
    `| ${s(SCENE.why)} | Why join | "${plain(k.why.l1)}" "${k.why.sub}" chips ${k.why.chips.join(", ")}; ghost carrying its box of entries |`,
    `| ${SCENE.cta[0].toFixed(1)}–${T_CARD.toFixed(1)} s | CTA | "${k.cta.l1} ${plain(k.cta.l2)}" "${k.cta.b1}" "${k.cta.b2}" \`${REFERRAL_CODE}\`; ghost waving |`,
    `| ${T_CARD.toFixed(1)}–${DURATION.toFixed(1)} s | End card | Press-kit referral card over the blurred, desaturated clip; code typed into its field, chime |`,
    "",
    "Sound: an original 120 BPM score synthesized from ffmpeg expressions (A minor, Am F C G): kick and hats under the hook, a riser into a bass drop on the $500, an arpeggio from the explainer on, typing ticks, pops on every line, whooshes on the cuts and a chime when the code is in.",
    "",
    "## Type timing",
    "",
    "```",
    ...b.board,
    "```",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

// The entry itself: the grader reads /output/VIDEO.json, the posted video's address on TikTok.
try {
  const video = JSON.parse(readFileSync(join(BOT_DIR, "VIDEO.json"), "utf8")) as { url?: unknown };
  if (typeof video.url !== "string" || !/^https:\/\/www\.tiktok\.com\/@[^/]+\/video\/\d+$/.test(video.url)) {
    console.error(`VIDEO.json does not name a TikTok video yet: ${String(video.url)}`);
  }
  copyFileSync(join(BOT_DIR, "VIDEO.json"), join(OUT_DIR, "VIDEO.json"));
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

// The plan names its own folder "{out}" and assets by their path in the repository, so what it
// writes does not depend on where it is written; render.mjs puts the real folder in.
const outRel = "{out}";
const log: Record<string, unknown>[] = [];

for (const lang of LANGS) {
  const b = build(lang);
  b.back.write(join(OUT_DIR, `ad.${lang}.back.ass`));
  b.front.write(join(OUT_DIR, `ad.${lang}.front.ass`));
  const plan = renderPlan(lang, b, outRel);
  writeFileSync(join(OUT_DIR, `ad.${lang}.filter.txt`), plan.filter);
  const checks = {
    first: 0,
    hook: 1.3,
    stakes: DROP + 0.6,
    what: SCENE.what[0] + 2.2,
    how: SCENE.how[1] - 0.3,
    why: SCENE.why[1] - 0.4,
    cta: T_CARD - 0.2,
    cardRest: CODE_TYPE_START + 0.1,
    last: DURATION - 1 / FPS,
  };
  writeFileSync(
    join(OUT_DIR, `render.${lang}.json`),
    JSON.stringify({ cwd: ".", ffmpeg: plan.argv, mp4: plan.mp4, duration: DURATION, fps: FPS, checks }, null, 2) + "\n",
  );
  writeFileSync(join(OUT_DIR, `storyboard.${lang}.md`), storyboard(lang, b));
  writeFileSync(join(OUT_DIR, `caption.${lang}.txt`), COPY[lang].caption + "\n");
  log.push({
    action: "plan_ad",
    lang,
    frames: Math.round(DURATION * FPS),
    events: b.back.events.length + b.front.events.length,
    images: b.imgs.length,
    pops: b.sfx.pops.length,
    mp4: plan.mp4,
  });
}

const summary = {
  bounty: BOUNTY,
  referral_code: REFERRAL_CODE,
  referral_link: `https://make.fun/r/${REFERRAL_CODE}`,
  frame: `${W}x${H}@${FPS}`,
  duration_s: DURATION,
  badge: { from_s: 0, until_s: T_CARD, overlay: PRESS.badge },
  end_card: { from_s: T_CARD, code_typed_from_s: CODE_TYPE_START, card: PRESS.card },
  scenes: SCENE,
  actions: log,
};
writeFileSync(join(OUT_DIR, "plan.json"), JSON.stringify(summary, null, 2) + "\n");
for (const l of log) console.log(`${l.action} ${l.lang}: ${l.frames} frames, ${l.events} type events, ${l.images} images -> ${l.mp4}`);
