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
const revisionR2Root = path.join(rigRoot, "revision-r2", "items");
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
    layers: [
      ["back", path.join(gate4Root, "items", "rescue-top", "layers", "top-back.svg")],
      ["main", path.join(revisionR2Root, "rescue-jacket", "wear-main.svg")],
    ],
    waistMode: "over",
  },
  {
    id: "mint-windbreaker",
    layers: [
      ["main", path.join(revisionR2Root, "mint-windbreaker", "wear-main.svg")],
    ],
    waistMode: "over",
  },
  {
    id: "sports-hoodie",
    layers: [
      ["main", path.join(revisionR2Root, "sports-hoodie", "wear-main.svg")],
    ],
    waistMode: "over",
  },
  {
    id: "formal-jacket",
    layers: [
      ["main", path.join(revisionR2Root, "formal-jacket", "wear-main.svg")],
    ],
    waistMode: "open",
  },
  {
    id: "active-pants",
    layers: [
      ["main", path.join(revisionR2Root, "active-pants", "wear-main.svg")],
    ],
  },
  {
    id: "protective-cargo-pants",
    layers: [
      ["main", path.join(revisionR2Root, "protective-cargo-pants", "wear-main.svg")],
    ],
  },
  {
    id: "beige-shorts",
    layers: [
      ["main", path.join(revisionR2Root, "beige-shorts", "wear-main.svg")],
    ],
  },
  {
    id: "long-skirt",
    layers: [
      ["main", path.join(revisionR2Root, "long-skirt", "wear-main.svg")],
    ],
  },
  {
    id: "sneakers",
    layers: [
      ["main", path.join(gate4Root, "items", "grip-sneakers", "layers", "shoes-main.svg")],
    ],
  },
  {
    id: "hiking-boots",
    layers: [
      ["main", path.join(revisionR2Root, "hiking-boots", "wear-main.svg")],
    ],
  },
  {
    id: "dress-shoes",
    layers: [
      ["main", path.join(revisionR2Root, "dress-shoes", "wear-main.svg")],
    ],
  },
  {
    id: "slippers",
    layers: [
      ["main", path.join(gate5Root, "items", "house-slippers", "layers", "shoes-main.svg")],
    ],
  },
  {
    id: "rescue-cap",
    layers: [
      ["back", path.join(gate4Root, "items", "safety-helmet", "layers", "headwear-back.svg")],
      ["front", path.join(gate4Root, "items", "safety-helmet", "layers", "headwear-front.svg")],
    ],
  },
  {
    id: "reflective-band",
    layers: [
      ["main", path.join(revisionR2Root, "reflective-band", "wear-main.svg")],
    ],
  },
  {
    id: "whistle",
    layers: [
      ["main", path.join(revisionR2Root, "whistle", "wear-main.svg")],
    ],
  },
  {
    id: "canvas-tote",
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

  const renderedLayers = [];
  for (const [kind, source] of item.layers) {
    const destination = path.join(itemRoot, `wear-${kind}.webp`);
    await renderSvg(source, destination, {
      width: 1024,
      height: 1536,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    renderedLayers.push(destination);
  }

  const thumbnailMaster = await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(renderedLayers.map((input) => ({ input })))
    .png()
    .toBuffer();

  await sharp(thumbnailMaster)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: 384,
      height: 240,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 91, alphaQuality: 100 })
    .toFile(path.join(itemRoot, "thumb.webp"));
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

async function makeInventoryPreview() {
  const cardWidth = 300;
  const cardHeight = 220;
  const gap = 18;
  const margin = 24;
  const cards = [];

  for (const item of items) {
    const thumbnail = await sharp(
      path.join(outputRoot, "items", item.id, "thumb.webp"),
    )
      .resize({
        width: 250,
        height: 150,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}">
        <rect x="1" y="1" width="${cardWidth - 2}" height="${cardHeight - 2}" rx="14"
              fill="#fffaf0" stroke="#cad3da" stroke-width="2"/>
        <text x="${cardWidth / 2}" y="198" text-anchor="middle"
              font-family="Arial, sans-serif" font-size="17" font-weight="700"
              fill="#18324a">${item.id}</text>
      </svg>
    `);
    cards.push(
      await sharp(label)
        .composite([{ input: thumbnail, left: 25, top: 20 }])
        .png()
        .toBuffer(),
    );
  }

  const columns = 4;
  const rows = Math.ceil(cards.length / columns);
  const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = margin * 2 + rows * cardHeight + (rows - 1) * gap;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 224, g: 233, b: 238, alpha: 1 },
    },
  })
    .composite(
      cards.map((input, index) => ({
        input,
        left: margin + (index % columns) * (cardWidth + gap),
        top: margin + Math.floor(index / columns) * (cardHeight + gap),
      })),
    )
    .webp({ quality: 92 })
    .toFile(path.join(outputRoot, "preview-all-items.webp"));
}

async function writeManifest() {
  const manifest = {
    schemaVersion: 4,
    artVersion: "v4-otter-r2-inventory",
    episode: "rescue-team-trial",
    characterRigVersion: "otter-v1.0.0",
    canvas: { width: 1024, height: 1536 },
    sourcePolicy: "thumbnail is derived from the same SVG wear master",
    background: "background.webp",
    character: {
      ready: "character/ready.webp",
      success: "character/success.webp",
      retry: "character/retry.webp",
    },
    items: items.map((item) => ({
      id: item.id,
      thumbnail: `items/${item.id}/thumb.webp`,
      ...(item.waistMode ? { waistMode: item.waistMode } : {}),
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
  await makeInventoryPreview();

  console.log(`Prepared episode 1 otter assets at ${outputRoot}`);
}

await main();
