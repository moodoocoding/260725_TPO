import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(
  root,
  "art-source",
  "character-rig",
  "otter-v1",
  "revision-r2",
);
const publicRoot = path.join(
  root,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
);
const tops = [
  "rescue-jacket",
  "mint-windbreaker",
  "sports-hoodie",
  "formal-jacket",
];
const bottoms = [
  "active-pants",
  "protective-cargo-pants",
  "beige-shorts",
  "long-skirt",
];

await mkdir(outputRoot, { recursive: true });

function itemLayer(itemId, kind = "main") {
  return path.join(publicRoot, "items", itemId, `wear-${kind}.webp`);
}

function labelSvg(label, width, height) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="12" fill="#fffaf0"/>
      <text x="${width / 2}" y="34" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="17" font-weight="700"
            fill="#18324a">${label}</text>
    </svg>
  `);
}

async function renderCombination(topId, bottomId) {
  const layers = [];
  if (topId === "rescue-jacket") {
    layers.push({ input: itemLayer(topId, "back") });
  }
  layers.push(
    { input: path.join(publicRoot, "character", "ready.webp") },
    { input: itemLayer(bottomId) },
    { input: itemLayer(topId) },
  );

  return sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

const fullCards = [];
const waistCards = [];
for (const topId of tops) {
  for (const bottomId of bottoms) {
    const composite = await renderCombination(topId, bottomId);
    const label = `${topId} × ${bottomId}`;
    const character = await sharp(composite)
      .resize({
        width: 260,
        height: 390,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    fullCards.push(
      await sharp({
        create: {
          width: 330,
          height: 470,
          channels: 4,
          background: { r: 247, g: 242, b: 232, alpha: 1 },
        },
      })
        .composite([
          { input: labelSvg(label, 310, 54), left: 10, top: 10 },
          { input: character, left: 35, top: 67 },
        ])
        .png()
        .toBuffer(),
    );

    const waist = await sharp(composite)
      .extract({ left: 300, top: 760, width: 452, height: 270 })
      .resize({ width: 339, height: 203, fit: "fill" })
      .png()
      .toBuffer();
    waistCards.push(
      await sharp({
        create: {
          width: 359,
          height: 277,
          channels: 4,
          background: { r: 247, g: 242, b: 232, alpha: 1 },
        },
      })
        .composite([
          { input: labelSvg(label, 339, 54), left: 10, top: 10 },
          { input: waist, left: 10, top: 64 },
        ])
        .png()
        .toBuffer(),
    );
  }
}

async function writeMatrix(cards, cardWidth, cardHeight, fileName) {
  const columns = 4;
  const rows = 4;
  const gap = 16;
  const margin = 24;
  await sharp({
    create: {
      width: margin * 2 + columns * cardWidth + (columns - 1) * gap,
      height: margin * 2 + rows * cardHeight + (rows - 1) * gap,
      channels: 4,
      background: { r: 222, g: 232, b: 237, alpha: 1 },
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
    .toFile(path.join(outputRoot, fileName));
}

await writeMatrix(
  fullCards,
  330,
  470,
  "production-outfit-matrix.webp",
);
await writeMatrix(
  waistCards,
  359,
  277,
  "production-waist-matrix.webp",
);

console.log("Rendered episode 1 production 4x4 outfit matrices");
