import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const episodeSlug = "rescue-team-trial";
const outputRoot = path.join(
  projectRoot,
  "public",
  "art",
  "v4",
  "episodes",
  episodeSlug,
);
const catalog = JSON.parse(
  await readFile(path.join(projectRoot, "lib", "story-catalog.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(outputRoot, "art-manifest.json"), "utf8"),
);
const episode = catalog.episodes.find((entry) => entry.slug === episodeSlug);
const failures = [];
const checked = [];

function fail(message) {
  failures.push(message);
}

async function validateImage(
  relativePath,
  { width, height, maxWidth, maxHeight, transparency, maxBytes },
) {
  try {
    const imagePath = path.resolve(outputRoot, ...relativePath.split("/"));
    if (!imagePath.startsWith(path.resolve(outputRoot))) {
      throw new Error(`Unsafe asset path: ${relativePath}`);
    }
    const file = await stat(imagePath);
    const metadata = await sharp(imagePath).metadata();

    if (metadata.format !== "webp") {
      fail(`${relativePath}: expected WebP, got ${metadata.format ?? "unknown"}`);
    }
    if (width && metadata.width !== width) {
      fail(`${relativePath}: expected width ${width}, got ${metadata.width}`);
    }
    if (height && metadata.height !== height) {
      fail(`${relativePath}: expected height ${height}, got ${metadata.height}`);
    }
    if (maxWidth && (!metadata.width || metadata.width > maxWidth)) {
      fail(`${relativePath}: width exceeds ${maxWidth}`);
    }
    if (maxHeight && (!metadata.height || metadata.height > maxHeight)) {
      fail(`${relativePath}: height exceeds ${maxHeight}`);
    }
    if (transparency === "required" && !metadata.hasAlpha) {
      fail(`${relativePath}: transparency is required`);
    }
    if (transparency === "opaque" && metadata.hasAlpha) {
      fail(`${relativePath}: background must be opaque`);
    }
    if (file.size <= 0 || file.size > maxBytes) {
      fail(`${relativePath}: unexpected size ${file.size} bytes`);
    }
    checked.push(relativePath);
  } catch (error) {
    fail(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (!episode) fail(`catalog episode ${episodeSlug} is missing`);
if (manifest.schemaVersion !== 4) fail("manifest schemaVersion must be 4");
if (manifest.episode !== episodeSlug) fail("manifest episode slug mismatch");
if (manifest.canvas?.width !== 1024 || manifest.canvas?.height !== 1536) {
  fail("manifest character canvas must be 1024x1536");
}

const manifestItemIds = (manifest.items ?? []).map((item) => item.id).sort();
const episodeItemIds = [...(episode?.itemIds ?? [])].sort();
if (JSON.stringify(manifestItemIds) !== JSON.stringify(episodeItemIds)) {
  fail("manifest item IDs do not match episode 1");
}

await validateImage("background.webp", {
  width: 1024,
  height: 1536,
  transparency: "opaque",
  maxBytes: 2_000_000,
});
for (const mood of ["ready", "success", "retry"]) {
  await validateImage(`character/${mood}.webp`, {
    width: 1024,
    height: 1536,
    transparency: "required",
    maxBytes: 1_500_000,
  });
}
for (const itemId of episodeItemIds) {
  const manifestItem = manifest.items.find((item) => item.id === itemId);
  if (!manifestItem) {
    fail(`${itemId}: manifest item is missing`);
    continue;
  }
  await validateImage(manifestItem.thumbnail, {
    maxWidth: 720,
    maxHeight: 720,
    transparency: "required",
    maxBytes: 700_000,
  });
  for (const layer of manifestItem.layers) {
    await validateImage(layer, {
      width: 1024,
      height: 1536,
      transparency: "required",
      maxBytes: 1_500_000,
    });
  }
}

const expectedImageCount =
  1 +
  3 +
  manifest.items.length +
  manifest.items.reduce((sum, item) => sum + item.layers.length, 0);
if (checked.length !== expectedImageCount) {
  fail(`expected ${expectedImageCount} images, checked ${checked.length}`);
}

if (failures.length) {
  console.error(`Episode 1 art validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Episode 1 art valid: ${checked.length} WebP images`);
