import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rigRoot = path.join(
  root,
  "art-source",
  "character-rig",
  "otter-v1",
);
const gate4Root = path.join(rigRoot, "gate-4");
const gate5Root = path.join(rigRoot, "gate-5");
const outputRoot = path.join(
  root,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
);

const items = [
  {
    id: "rescue-jacket",
    card: path.join(gate4Root, "card-rescue-top.svg"),
    layers: [
      ["back", path.join(gate4Root, "items", "rescue-top", "layers", "top-back.svg")],
      ["main", path.join(gate4Root, "items", "rescue-top", "layers", "top-main.svg")],
    ],
  },
  {
    id: "formal-jacket",
    card: path.join(gate5Root, "card-formal-jacket.svg"),
    layers: [
      ["main", path.join(gate5Root, "items", "formal-jacket", "layers", "top-main.svg")],
    ],
  },
  {
    id: "active-pants",
    card: path.join(gate4Root, "card-activity-pants.svg"),
    layers: [
      ["main", path.join(gate4Root, "items", "activity-pants", "layers", "bottom-main.svg")],
    ],
  },
  {
    id: "long-skirt",
    card: path.join(gate5Root, "card-outing-skirt.svg"),
    layers: [
      ["main", path.join(gate5Root, "items", "outing-skirt", "layers", "bottom-main.svg")],
    ],
  },
  {
    id: "sneakers",
    card: path.join(gate4Root, "card-grip-sneakers.svg"),
    layers: [
      ["main", path.join(gate4Root, "items", "grip-sneakers", "layers", "shoes-main.svg")],
    ],
  },
  {
    id: "slippers",
    card: path.join(gate5Root, "card-house-slippers.svg"),
    layers: [
      ["main", path.join(gate5Root, "items", "house-slippers", "layers", "shoes-main.svg")],
    ],
  },
  {
    id: "rescue-cap",
    card: path.join(gate4Root, "card-safety-helmet.svg"),
    layers: [
      ["back", path.join(gate4Root, "items", "safety-helmet", "layers", "headwear-back.svg")],
      ["front", path.join(gate4Root, "items", "safety-helmet", "layers", "headwear-front.svg")],
    ],
  },
  {
    id: "canvas-tote",
    card: path.join(gate5Root, "card-picnic-basket.svg"),
    layers: [
      ["back", path.join(gate5Root, "items", "picnic-basket", "layers", "basket-back.svg")],
      ["front", path.join(gate5Root, "items", "picnic-basket", "layers", "basket-front.svg")],
    ],
  },
];

async function ensureDirectory(directory) {
  await mkdir(directory, { recursive: true });
}

async function renderSvg(source, destination, options = {}) {
  await sharp(source, { density: 144 })
    .resize(options)
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(destination);
}

async function prepareCharacter() {
  const source = path.join(gate4Root, "otter-base.png");
  const characterRoot = path.join(outputRoot, "character");
  await ensureDirectory(characterRoot);

  for (const mood of ["ready", "success", "retry"]) {
    await sharp(source)
      .resize({
        width: 1024,
        height: 1536,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 94, alphaQuality: 100 })
      .toFile(path.join(characterRoot, `${mood}.webp`));
  }
}

async function prepareItem(item) {
  const itemRoot = path.join(outputRoot, "items", item.id);
  await ensureDirectory(itemRoot);

  await renderSvg(item.card, path.join(itemRoot, "thumb.webp"), {
    width: 512,
    height: 384,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  for (const [kind, source] of item.layers) {
    await renderSvg(source, path.join(itemRoot, `wear-${kind}.webp`), {
      width: 1024,
      height: 1536,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
}

async function makePreview() {
  const layers = [
    path.join(outputRoot, "items", "rescue-jacket", "wear-back.webp"),
    path.join(outputRoot, "character", "ready.webp"),
    path.join(outputRoot, "items", "active-pants", "wear-main.webp"),
    path.join(outputRoot, "items", "sneakers", "wear-main.webp"),
    path.join(outputRoot, "items", "rescue-jacket", "wear-main.webp"),
    path.join(outputRoot, "items", "rescue-cap", "wear-front.webp"),
  ];

  const fullCharacter = await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers.map((input) => ({ input })))
    .webp({ quality: 94, alphaQuality: 100 })
    .toBuffer();
  const character = await sharp(fullCharacter)
    .resize({
      width: 700,
      height: 1050,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 94, alphaQuality: 100 })
    .toBuffer();

  await sharp(path.join(outputRoot, "background.webp"))
    .composite([{ input: character, left: 20, top: 400 }])
    .webp({ quality: 92 })
    .toFile(path.join(outputRoot, "preview-best-outfit.webp"));
}

async function writeManifest() {
  const manifest = {
    schemaVersion: 4,
    artVersion: "v4-otter-vertical-slice",
    episode: "rescue-team-trial",
    characterRigVersion: "otter-v1.0.0",
    canvas: { width: 1024, height: 1536 },
    sourcePolicy: "thumbnail and wear layers share the same SVG source",
    background: "background.webp",
    character: {
      ready: "character/ready.webp",
      success: "character/success.webp",
      retry: "character/retry.webp",
    },
    items: items.map((item) => ({
      id: item.id,
      thumbnail: `items/${item.id}/thumb.webp`,
      layers: item.layers.map(
        ([kind]) => `items/${item.id}/wear-${kind}.webp`,
      ),
    })),
  };

  await writeFile(
    path.join(outputRoot, "art-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await ensureDirectory(outputRoot);

  await renderSvg(
    path.join(gate4Root, "scene-background.svg"),
    path.join(outputRoot, "background.webp"),
    {
      width: 1024,
      height: 1536,
      fit: "fill",
    },
  );
  await prepareCharacter();
  for (const item of items) await prepareItem(item);
  await writeManifest();
  await makePreview();

  console.log(`Prepared episode 1 otter assets at ${outputRoot}`);
}

await main();
