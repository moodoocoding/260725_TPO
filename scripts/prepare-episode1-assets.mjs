import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "art-source", "episode1-rescue-team-trial");
const outputRoot = join(
  root,
  "public",
  "art",
  "v3",
  "episodes",
  "rescue-team-trial",
);
const tempRoot = join(root, ".art-work", "episode1-rescue-team-trial");
const removeChromaScript =
  process.env.CODEX_REMOVE_CHROMA_SCRIPT ??
  join(
    homedir(),
    ".codex",
    "skills",
    ".system",
    "imagegen",
    "scripts",
    "remove_chroma_key.py",
  );

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const sheets = [
  {
    file: "tops-keyed.png",
    entries: [
      ["rescue-jacket", 0, { left: 220, top: 405, width: 590, height: 510 }],
      ["sports-hoodie", 1, { left: 220, top: 400, width: 590, height: 520 }],
      ["yellow-raincoat", 2, { left: 210, top: 395, width: 610, height: 575 }],
      ["party-shirt", 3, { left: 245, top: 415, width: 535, height: 465 }],
    ],
  },
  {
    file: "bottoms-keyed.png",
    entries: [
      ["active-pants", 0, { left: 330, top: 720, width: 365, height: 610 }],
      ["sky-denim", 1, { left: 330, top: 720, width: 365, height: 610 }],
      ["beige-shorts", 2, { left: 330, top: 720, width: 365, height: 270 }],
      ["long-skirt", 3, { left: 280, top: 715, width: 465, height: 660 }],
    ],
  },
  {
    file: "shoes-keyed.png",
    entries: [
      ["sneakers", 0, { left: 275, top: 1210, width: 475, height: 260 }],
      ["rain-boots", 1, { left: 290, top: 1135, width: 445, height: 335 }],
      ["slippers", 2, { left: 285, top: 1230, width: 455, height: 225 }],
      ["dress-shoes", 3, { left: 285, top: 1215, width: 455, height: 245 }],
    ],
  },
  {
    file: "accessories-keyed.png",
    entries: [
      ["reflective-band", 0, { left: 635, top: 645, width: 100, height: 75 }],
      ["rescue-cap", 1, { left: 330, top: 60, width: 365, height: 245 }],
      ["whistle", 2, { left: 405, top: 395, width: 215, height: 330 }],
      ["canvas-tote", 3, { left: 615, top: 650, width: 290, height: 365 }],
    ],
  },
];

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

function removeChroma(input, output) {
  execFileSync(
    "python",
    [
      removeChromaScript,
      "--input",
      input,
      "--out",
      output,
      "--auto-key",
      "border",
      "--soft-matte",
      "--transparent-threshold",
      "12",
      "--opaque-threshold",
      "220",
      "--despill",
      "--force",
    ],
    { stdio: "inherit" },
  );
}

async function trimTransparent(input) {
  return sharp(input).trim({ background: transparent }).png().toBuffer();
}

async function makeWearLayer(asset, placement, destination) {
  const piece = await sharp(asset)
    .resize({
      width: placement.width,
      height: placement.height,
      fit: "contain",
      background: transparent,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: transparent,
    },
  })
    .composite([{ input: piece, left: placement.left, top: placement.top }])
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(destination);
}

async function processCharacter(mood) {
  const keyed = join(sourceRoot, `character-${mood}-keyed.png`);
  const transparentPng = join(tempRoot, `character-${mood}.png`);
  const destination = join(outputRoot, "character", `${mood}.webp`);

  removeChroma(keyed, transparentPng);
  await sharp(transparentPng)
    .resize({
      width: 1024,
      height: 1536,
      fit: "contain",
      background: transparent,
    })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(destination);
}

async function processSheet(sheet) {
  const keyed = join(sourceRoot, sheet.file);
  const transparentPng = join(tempRoot, sheet.file.replace("-keyed", ""));
  removeChroma(keyed, transparentPng);

  const metadata = await sharp(transparentPng).metadata();
  const cellWidth = Math.floor(metadata.width / 2);
  const cellHeight = Math.floor(metadata.height / 2);

  for (const [id, index, placement] of sheet.entries) {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cropped = await sharp(transparentPng)
      .extract({
        left: column * cellWidth,
        top: row * cellHeight,
        width:
          column === 1 ? metadata.width - cellWidth : cellWidth,
        height:
          row === 1 ? metadata.height - cellHeight : cellHeight,
      })
      .png()
      .toBuffer();
    const asset = await trimTransparent(cropped);
    const itemRoot = join(outputRoot, "items", id);
    await ensureDir(itemRoot);

    await sharp(asset)
      .resize({ width: 720, height: 720, fit: "inside" })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(join(itemRoot, "thumb.webp"));
    await makeWearLayer(asset, placement, join(itemRoot, "wear-main.webp"));
  }
}

async function writeManifest() {
  const items = sheets.flatMap((sheet) =>
    sheet.entries.map(([id]) => ({
      id,
      thumbnail: `items/${id}/thumb.webp`,
      layers: [`items/${id}/wear-main.webp`],
    })),
  );
  const manifest = {
    schemaVersion: 3,
    artVersion: "v3-episode-slice",
    episode: "rescue-team-trial",
    canvas: { width: 1024, height: 1536 },
    generatedWith: "OpenAI built-in image generation",
    background: "background.webp",
    character: {
      ready: "character/ready.webp",
      success: "character/success.webp",
      retry: "character/retry.webp",
    },
    items,
  };
  await writeFile(
    join(outputRoot, "art-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function makePreview() {
  const selected = [
    join(outputRoot, "items", "active-pants", "wear-main.webp"),
    join(outputRoot, "items", "sneakers", "wear-main.webp"),
    join(outputRoot, "items", "rescue-jacket", "wear-main.webp"),
    join(outputRoot, "items", "reflective-band", "wear-main.webp"),
  ];
  const dressedCharacter = await sharp(
    join(outputRoot, "character", "ready.webp"),
  )
    .composite(selected.map((input) => ({ input })))
    .webp({ quality: 94, alphaQuality: 100 })
    .toBuffer();
  const characterOnScene = await sharp(dressedCharacter)
    .resize({
      width: 600,
      height: 900,
      fit: "contain",
      background: transparent,
    })
    .webp({ quality: 94, alphaQuality: 100 })
    .toBuffer();

  await sharp(join(outputRoot, "background.webp"))
    .resize({ width: 900, height: 1100, fit: "cover", position: "left" })
    .composite([{ input: characterOnScene, left: 40, top: 165 }])
    .webp({ quality: 90 })
    .toFile(join(sourceRoot, "preview-best-outfit.webp"));

  const cells = [];
  for (const [index, [id]] of sheets
    .flatMap((sheet) => sheet.entries)
    .entries()) {
    const composedCharacter = await sharp(
      join(outputRoot, "character", "ready.webp"),
    )
      .composite([
        {
          input: join(outputRoot, "items", id, "wear-main.webp"),
        },
      ])
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer();
    const character = await sharp(composedCharacter)
      .resize({
        width: 256,
        height: 384,
        fit: "contain",
        background: transparent,
      })
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer();
    cells.push({
      input: character,
      left: (index % 4) * 256,
      top: Math.floor(index / 4) * 384,
    });
  }

  await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 246, g: 240, b: 227, alpha: 1 },
    },
  })
    .composite(cells)
    .webp({ quality: 90 })
    .toFile(join(sourceRoot, "preview-all-items.webp"));
}

async function main() {
  await rm(tempRoot, { recursive: true, force: true });
  await ensureDir(tempRoot);
  await ensureDir(join(outputRoot, "character"));

  await sharp(join(sourceRoot, "background.png"))
    .resize({ width: 1536, height: 1152, fit: "cover" })
    .webp({ quality: 90 })
    .toFile(join(outputRoot, "background.webp"));

  for (const mood of ["ready", "success", "retry"]) {
    await processCharacter(mood);
  }
  for (const sheet of sheets) {
    await processSheet(sheet);
  }
  await writeManifest();
  await makePreview();

  await rm(tempRoot, { recursive: true, force: true });
  console.log(`Prepared episode 1 assets at ${outputRoot}`);
}

await main();
