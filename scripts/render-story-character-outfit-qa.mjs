import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(projectRoot, "public", "art", "v5");
const validationRoot = path.join(
  projectRoot,
  "art-validation",
  "story-cast-v5",
);
const manifest = JSON.parse(
  await readFile(
    path.join(publicRoot, "character-manifest.json"),
    "utf8",
  ),
);
const catalog = JSON.parse(
  await readFile(path.join(projectRoot, "lib", "story-catalog.json"), "utf8"),
);
const itemById = new Map(catalog.items.map((item) => [item.id, item]));
const slots = ["top", "bottom", "shoes", "accessory"];

function publicPath(relativePath) {
  if (relativePath.startsWith("/art/v4/")) {
    return path.join(projectRoot, "public", ...relativePath.slice(1).split("/"));
  }
  return path.join(publicRoot, ...relativePath.split("/"));
}

function canonicalItems(episode) {
  return slots.flatMap((slot) => {
    const itemId = episode.itemIds.find(
      (candidate) => itemById.get(candidate)?.slot === slot,
    );
    return itemId ? [itemId] : [];
  });
}

async function compositeEpisode(episode) {
  const mapping = manifest.episodeMap[episode.slug];
  const selectedItems = canonicalItems(episode).map(
    (itemId) => manifest.items[itemId],
  );
  const layers = [];
  for (const item of selectedItems) {
    if (item.layers.back) layers.push(publicPath(item.layers.back));
  }
  if (mapping.mode === "full-frame-moods") {
    layers.push(publicPath(mapping.moods.ready));
  } else {
    layers.push(publicPath(mapping.base));
  }
  for (const slot of ["bottom", "shoes", "top", "accessory"]) {
    const item = selectedItems.find((candidate) => candidate.slot === slot);
    if (item?.layers.main) layers.push(publicPath(item.layers.main));
  }
  for (const item of selectedItems) {
    if (item.layers.front) layers.push(publicPath(item.layers.front));
  }
  if (mapping.mode === "layered-base-face") {
    layers.push(publicPath(mapping.faces.ready));
  }

  return sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers.map((input) => ({ input })))
    .png()
    .toBuffer();
}

async function main() {
  const episodes = catalog.episodes
    .filter((episode) => episode.order >= 2)
    .sort((left, right) => left.order - right.order);
  const cardWidth = 256;
  const cardHeight = 420;
  const columns = 4;
  const cards = [];

  for (const episode of episodes) {
    const mapping = manifest.episodeMap[episode.slug];
    const outfit = await compositeEpisode(episode);
    const figure = await sharp(outfit)
      .resize({
        width: 220,
        height: 340,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}">
      <rect x="1" y="1" width="${cardWidth - 2}" height="${cardHeight - 2}" rx="18" fill="#fffaf0" stroke="#b9c9d2" stroke-width="2"/>
      <text x="128" y="376" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#18324a">${mapping.name}</text>
      <text x="128" y="403" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#60768a">EP${episode.order} · canonical outfit</text>
    </svg>`);
    cards.push(
      await sharp(label)
        .composite([{ input: figure, left: 18, top: 16 }])
        .png()
        .toBuffer(),
    );
  }

  const gap = 18;
  const margin = 24;
  const rows = Math.ceil(cards.length / columns);
  await mkdir(validationRoot, { recursive: true });
  await sharp({
    create: {
      width: margin * 2 + columns * cardWidth + (columns - 1) * gap,
      height: margin * 2 + rows * cardHeight + (rows - 1) * gap,
      channels: 4,
      background: { r: 225, g: 235, b: 240, alpha: 1 },
    },
  })
    .composite(
      cards.map((input, index) => ({
        input,
        left: margin + (index % columns) * (cardWidth + gap),
        top: margin + Math.floor(index / columns) * (cardHeight + gap),
      })),
    )
    .webp({ quality: 92, effort: 6 })
    .toFile(path.join(validationRoot, "ep2-13-outfit-contact-sheet.webp"));

  console.log(`Rendered ${episodes.length} canonical outfit QA composites`);
}

await main();
