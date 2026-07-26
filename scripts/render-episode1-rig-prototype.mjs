import { mkdir, readFile } from "node:fs/promises";
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
const prototypeRoot = path.join(rigRoot, "revision-r1", "prototypes");
const outputRoot = path.join(rigRoot, "revision-r1");
const basePath = path.join(rigRoot, "gate-4", "otter-base.png");

const tops = [
  ["RESCUE JACKET", "rescue-jacket-gray.svg"],
  ["MINT WINDBREAKER", "mint-windbreaker-gray.svg"],
];
const bottoms = [
  ["ACTIVE PANTS", "active-pants-gray.svg"],
  ["CARGO PANTS", "protective-cargo-pants-gray.svg"],
];

await mkdir(outputRoot, { recursive: true });

async function renderGarment(fileName) {
  return sharp(path.join(prototypeRoot, fileName), { density: 144 })
    .resize({
      width: 1024,
      height: 1536,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function renderCombination(topFile, bottomFile) {
  const [top, bottom] = await Promise.all([
    renderGarment(topFile),
    renderGarment(bottomFile),
  ]);

  return sharp(basePath)
    .resize({
      width: 1024,
      height: 1536,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([{ input: bottom }, { input: top }])
    .png()
    .toBuffer();
}

function labelSvg(label, width, height) {
  const escaped = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="18" fill="#ffffff"/>
      <text x="${width / 2}" y="44" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="23" font-weight="700"
            fill="#19324a">${escaped}</text>
    </svg>
  `);
}

const fullCards = [];
const waistCards = [];

for (const [topLabel, topFile] of tops) {
  for (const [bottomLabel, bottomFile] of bottoms) {
    const composite = await renderCombination(topFile, bottomFile);
    const label = `${topLabel} × ${bottomLabel}`;

    const fullCharacter = await sharp(composite)
      .resize({
        width: 420,
        height: 630,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const fullCard = await sharp({
      create: {
        width: 560,
        height: 730,
        channels: 4,
        background: { r: 247, g: 242, b: 232, alpha: 1 },
      },
    })
      .composite([
        { input: labelSvg(label, 520, 70), left: 20, top: 20 },
        { input: fullCharacter, left: 70, top: 82 },
      ])
      .png()
      .toBuffer();
    fullCards.push(fullCard);

    const waistCrop = await sharp(composite)
      .extract({ left: 300, top: 760, width: 452, height: 270 })
      .resize({ width: 678, height: 405, fit: "fill" })
      .png()
      .toBuffer();
    const guideOverlay = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="678" height="405">
        <path d="M123 147 H555" stroke="#ff4f4f" stroke-width="3" stroke-dasharray="10 8"/>
        <circle cx="339" cy="147" r="7" fill="#fff" stroke="#ff4f4f" stroke-width="3"/>
      </svg>
    `);
    const waistCard = await sharp({
      create: {
        width: 718,
        height: 515,
        channels: 4,
        background: { r: 247, g: 242, b: 232, alpha: 1 },
      },
    })
      .composite([
        { input: labelSvg(label, 678, 70), left: 20, top: 20 },
        { input: waistCrop, left: 20, top: 90 },
        { input: guideOverlay, left: 20, top: 90 },
      ])
      .png()
      .toBuffer();
    waistCards.push(waistCard);
  }
}

async function contactSheet(cards, cardWidth, cardHeight, destination) {
  const gap = 28;
  const margin = 36;
  const width = margin * 2 + cardWidth * 2 + gap;
  const height = margin * 2 + cardHeight * 2 + gap;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 223, g: 231, b: 235, alpha: 1 },
    },
  })
    .composite(
      cards.map((input, index) => ({
        input,
        left: margin + (index % 2) * (cardWidth + gap),
        top: margin + Math.floor(index / 2) * (cardHeight + gap),
      })),
    )
    .png()
    .toFile(destination);
}

await contactSheet(
  fullCards,
  560,
  730,
  path.join(outputRoot, "contact-sheet.png"),
);
await contactSheet(
  waistCards,
  718,
  515,
  path.join(outputRoot, "waist-contact-sheet.png"),
);

const guideSource = await readFile(
  path.join(rigRoot, "revision-r0", "rig-guide.svg"),
);
await sharp(guideSource, { density: 144 })
  .resize({ width: 768, height: 1152, fit: "contain" })
  .png()
  .toFile(path.join(outputRoot, "rig-guide.png"));

console.log(`Rendered episode 1 R1 contact sheets at ${outputRoot}`);
