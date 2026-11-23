// Renders the ad: runs main.ts (which writes the plan into ./build), then ffmpeg with the
// command line main.ts wrote, then pulls check frames and a contact sheet out of the MP4.
//   node render.mjs            -> Indonesian cut
//   node render.mjs id en      -> both cuts
// Needs ffmpeg with libass, libfreetype and libvpx on PATH. Standard library only.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ["id"];
const OUT = "build"; // relative to the repository root, where ffmpeg runs
const resolveOut = (s) => s.replaceAll("{out}", OUT);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (res.status !== 0) {
    console.error(`${cmd} exited with ${res.status}`);
    process.exit(res.status ?? 1);
  }
}

run(process.execPath, ["main.ts"], { env: { ...process.env, MAKEFUN_OUTPUT_DIR: join(root, "build") } });

for (const lang of langs) {
  const plan = JSON.parse(readFileSync(join(root, OUT, `render.${lang}.json`), "utf8"));
  plan.mp4 = resolveOut(plan.mp4);
  // main.ts names its folder "{out}"; write a copy of the filtergraph with the real folder in it
  const filter = `${OUT}/ad.${lang}.filter.txt`;
  const resolved = `${OUT}/ad.${lang}.filter.resolved.txt`;
  writeFileSync(join(root, resolved), resolveOut(readFileSync(join(root, filter), "utf8")));
  const argv = plan.ffmpeg.map(resolveOut).map((a) => (a === filter ? resolved : a));
  console.log(`\nrendering ${plan.mp4} ...`);
  const t0 = Date.now();
  run("ffmpeg", argv);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  const dir = join(root, "build", `check-${lang}`);
  mkdirSync(dir, { recursive: true });
  for (const [name, t] of Object.entries(plan.checks)) {
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", plan.mp4, "-frames:v", "1", join(dir, `${name}.png`)]);
  }
  // contact sheet of the check frames, 1/4 size
  const names = Object.keys(plan.checks);
  const ins = names.flatMap((n) => ["-i", join(dir, `${n}.png`)]);
  const scaled = names.map((_, i) => `[${i}:v]scale=270:480[s${i}]`).join(";");
  const cols = 5;
  const layout = names
    .map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`)
    .join("|");
  run("ffmpeg", [
    "-v", "error", "-y", ...ins,
    "-filter_complex", `${scaled};${names.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${names.length}:layout=${layout}:fill=black[o]`,
    "-map", "[o]", "-frames:v", "1", join(root, "build", `contact-${lang}.png`),
  ]);
  console.log(`checks in build/check-${lang}/, sheet build/contact-${lang}.png`);
}
