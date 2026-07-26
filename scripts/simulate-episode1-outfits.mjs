import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(
  root,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
);
const outputRoot = path.join(
  root,
  "art-source",
  "character-rig",
  "otter-v1",
  "revision-r2",
);
const catalog = JSON.parse(
  await readFile(path.join(root, "lib", "story-catalog.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(publicRoot, "art-manifest.json"), "utf8"),
);
const episode = catalog.episodes.find(
  (entry) => entry.slug === "rescue-team-trial",
);
const itemById = new Map(catalog.items.map((item) => [item.id, item]));
const manifestById = new Map(manifest.items.map((item) => [item.id, item]));
const slots = ["top", "bottom", "shoes", "accessory"];
const moods = ["ready", "success", "retry"];
const slotItems = Object.fromEntries(
  slots.map((slot) => [
    slot,
    [
      null,
      ...episode.itemIds.filter((itemId) => itemById.get(itemId).slot === slot),
    ],
  ]),
);
const width = 128;
const height = 192;
const layerCache = new Map();
const failures = [];
const readyCards = [];
let stateCount = 0;
let compositeCount = 0;

async function loadLayer(relativePath) {
  if (!layerCache.has(relativePath)) {
    layerCache.set(
      relativePath,
      await sharp(path.join(publicRoot, ...relativePath.split("/")))
        .resize({
          width,
          height,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer(),
    );
  }
  return layerCache.get(relativePath);
}

function layerKind(relativePath) {
  return relativePath.match(/wear-(back|main|front)\.webp$/)?.[1] ?? "main";
}

async function resolveLayers(mood, selectedIds) {
  const selected = selectedIds.filter(Boolean);
  const entries = selected.map((itemId) => ({
    item: itemById.get(itemId),
    art: manifestById.get(itemId),
  }));
  const layers = [];

  for (const entry of entries) {
    for (const relativePath of entry.art.layers.filter(
      (candidate) => layerKind(candidate) === "back",
    )) {
      layers.push(await loadLayer(relativePath));
    }
  }
  layers.push(await loadLayer(`character/${mood}.webp`));

  for (const slot of slots) {
    for (const entry of entries.filter(
      (candidate) => candidate.item.slot === slot,
    )) {
      for (const relativePath of entry.art.layers.filter(
        (candidate) => layerKind(candidate) === "main",
      )) {
        layers.push(await loadLayer(relativePath));
      }
    }
  }

  for (const entry of entries) {
    for (const relativePath of entry.art.layers.filter(
      (candidate) => layerKind(candidate) === "front",
    )) {
      layers.push(await loadLayer(relativePath));
    }
  }
  return layers;
}

for (const top of slotItems.top) {
  for (const bottom of slotItems.bottom) {
    for (const shoes of slotItems.shoes) {
      for (const accessory of slotItems.accessory) {
        const selection = [top, bottom, shoes, accessory];
        stateCount += 1;
        for (const mood of moods) {
          try {
            const layers = await resolveLayers(mood, selection);
            const rendered = await sharp({
              create: {
                width,
                height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            })
              .composite(layers.map((input) => ({ input })))
              .png()
              .toBuffer();
            const metadata = await sharp(rendered).metadata();
            if (
              metadata.width !== width ||
              metadata.height !== height ||
              !metadata.hasAlpha
            ) {
              failures.push(`${mood}:${selection.join(",")}: invalid output`);
            }
            if (mood === "ready") {
              readyCards.push(
                await sharp(rendered)
                  .resize({ width: 72, height: 108, fit: "contain" })
                  .png()
                  .toBuffer(),
              );
            }
            compositeCount += 1;
          } catch (error) {
            failures.push(
              `${mood}:${selection.join(",")}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }
    }
  }
}

const columns = 25;
const rows = 25;
const cellWidth = 76;
const cellHeight = 112;
await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * cellHeight,
    channels: 4,
    background: { r: 235, g: 240, b: 242, alpha: 1 },
  },
})
  .composite(
    readyCards.map((input, index) => ({
      input,
      left: (index % columns) * cellWidth + 2,
      top: Math.floor(index / columns) * cellHeight + 2,
    })),
  )
  .webp({ quality: 80 })
  .toFile(path.join(outputRoot, "composite-contact-sheet.webp"));

const report = {
  revision: "R5",
  generatedAt: new Date().toISOString(),
  result: failures.length === 0 ? "passed" : "failed",
  dimensions: { width, height },
  slots: Object.fromEntries(
    slots.map((slot) => [slot, slotItems[slot].length]),
  ),
  moods,
  statesPerMood: stateCount,
  compositeCount,
  expectedCompositeCount: 1875,
  contactSheetCells: readyCards.length,
  failures,
};
await writeFile(
  path.join(outputRoot, "composite-simulation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (
  failures.length > 0 ||
  stateCount !== 625 ||
  compositeCount !== 1875 ||
  readyCards.length !== 625
) {
  console.error(
    `Episode 1 composite simulation failed: ${failures.length} rendering errors`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Episode 1 composite simulation passed: ${stateCount} states × ${moods.length} moods = ${compositeCount}`,
  );
}
