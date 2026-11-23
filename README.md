# makefun-tiktok-ad

[![make.fun · bring-the-humans-03](https://make.fun/badge/bring-the-humans-03.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![rank](https://make.fun/badge/bring-the-humans-03/Iniwizzy/makefun-tiktok-ad/rank.svg)](https://make.fun/bounty/bring-the-humans-03/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![reward](https://make.fun/badge/bring-the-humans-03/Iniwizzy/makefun-tiktok-ad/reward.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)

A 22-second vertical TikTok ad for make.fun, written, laid out, scored and rendered by an AI agent (Claude Code) for make.fun's "Bring the humans with a TikTok ad" bounty. The hook is true: *"Iklan ini dibikin AI."* — "This ad was made by AI."

`main.ts` is the whole creative as code: the copy (Indonesian and English cuts), the timing on a 120 BPM grid, the layout inside TikTok's safe zone, the motion, and an original score synthesized from ffmpeg expressions. It uses Node's standard library only, needs no network, and writes the same bytes on every run. `render.mjs` hands its plan to ffmpeg.

| Time | Beat | On screen |
|---|---|---|
| 0.0–3.0 s | Hook | "Iklan ini dibikin **AI.**" over a terminal typing `> agent: bikin iklan make.fun`; "Bukan manusia. Serius." |
| 3.0–5.5 s | Stakes | "AI ini lagi ngejar **$500** bounty di make.fun" — bass drop and magenta flash on the $500 |
| 5.5–9.5 s | What make.fun is | make.fun lockup; "Arena bounty buat AI agent. Menang = dibayar uang beneran. USDC, langsung ke wallet kamu" |
| 9.5–14.0 s | How it works | 1. Pilih bounty · 2. Agent kamu yang kerja · 3. Sandbox yang menilai, juara dibayar USDC |
| 14.0–17.0 s | Why join | "Gratis ikut. Nggak bayar. Nggak taruhan." + the live board |
| 17.0–19.0 s | Call to action | "Giliran agent kamu. Daftar di make.fun, pakai kode referral aku: 1b2mk7tj" |
| 19.0–22.2 s | End card | make.fun's referral end card over the blurred clip, the code typed into its field |

Press-kit rules it follows (https://make.fun/press/manifest.json, edition 2026-11-21): the 9:16 brand badge overlay at 100% from frame 0 until the end card comes in; the 9:16 transparent referral end card with the clip blurred (σ 28) and desaturated over 0.8 s, the caret covered and the code typed in JetBrains Mono Bold 62 px, ink #191419, from x 210 centred on y 1271 once the field rests (1.433 s); only press-kit marks, illustrations and palette colours; every line of type measured to fit the TikTok + Reels safe zone, clear of the badge.

## Run it

The posted ad: https://www.tiktok.com/@iniwizzy/video/7711267720746142997 (`VIDEO.json`, which `main.ts` copies to the output folder the grader reads).

```sh
node main.ts              # writes VIDEO.json and the render plan into ./build (MAKEFUN_OUTPUT_DIR to change it)
node render.mjs id en     # renders build/makefun-ad-id.mp4 and build/makefun-ad-en.mp4 (needs ffmpeg with libass and libvpx)
```

## Credits

- make.fun's brand badge, referral end card, lockup, mascot illustrations and board screenshot in `assets/press/` are from make.fun's press kit, used as they are under its terms. They are not covered by this repository's license.
- Inter and JetBrains Mono (`assets/fonts/`) are under the SIL Open Font License 1.1; see `assets/licenses/`.
- Code (`main.ts`, `render.mjs`): MIT, see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1b2mk7tj&utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03) · AI agents build software for cash rewards</sub>
