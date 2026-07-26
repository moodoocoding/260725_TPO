import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "public", "art", "v2");
const catalog = JSON.parse(
  await readFile(path.join(PROJECT_ROOT, "lib", "story-catalog.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(OUTPUT_ROOT, "art-manifest.json"), "utf8"),
);

const failures = [];
const checked = [];

function fail(message) {
  failures.push(message);
}

function absolute(relativePath) {
  const result = path.resolve(OUTPUT_ROOT, ...relativePath.split("/"));
  if (!result.startsWith(path.resolve(OUTPUT_ROOT))) {
    throw new Error(`Unsafe asset path: ${relativePath}`);
  }
  return result;
}

async function validateImage(
  relativePath,
  {
    width,
    height,
    transparency,
    maxBytes,
  },
) {
  try {
    const imagePath = absolute(relativePath);
    const file = await stat(imagePath);
    const metadata = await sharp(imagePath).metadata();

    if (metadata.format !== "webp") {
      fail(`${relativePath}: format ${metadata.format ?? "unknown"}`);
    }
    if (metadata.width !== width || metadata.height !== height) {
      fail(
        `${relativePath}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`,
      );
    }
    if (file.size <= 0 || file.size > maxBytes) {
      fail(`${relativePath}: unexpected size ${file.size} bytes`);
    }
    if (transparency === "required" && !metadata.hasAlpha) {
      fail(`${relativePath}: transparent canvas required`);
    }
    if (transparency === "opaque" && metadata.hasAlpha) {
      fail(`${relativePath}: background must not contain an alpha channel`);
    }
    checked.push({ relativePath, size: file.size });
  } catch (error) {
    fail(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (manifest.schemaVersion !== 2) fail("manifest schemaVersion must be 2");
if (manifest.catalogVersion !== catalog.version) {
  fail("manifest catalogVersion does not match story catalog");
}
if (
  manifest.canvas?.width !== 1024 ||
  manifest.canvas?.height !== 1536
) {
  fail("manifest character canvas must be 1024x1536");
}
if (
  manifest.thumbnailCanvas?.width !== 512 ||
  manifest.thumbnailCanvas?.height !== 384
) {
  fail("manifest thumbnail canvas must be 512x384");
}
if (
  manifest.backgroundCanvas?.width !== 1920 ||
  manifest.backgroundCanvas?.height !== 1440
) {
  fail("manifest background canvas must be 1920x1440");
}

await validateImage("character/base.webp", {
  width: 1024,
  height: 1536,
  transparency: "required",
  maxBytes: 1_000_000,
});
for (const mood of ["ready", "success", "retry"]) {
  await validateImage(`character/faces/${mood}.webp`, {
    width: 1024,
    height: 1536,
    transparency: "required",
    maxBytes: 500_000,
  });
}

const manifestItemIds = Object.keys(manifest.items ?? {}).sort();
const catalogItemIds = catalog.items.map((item) => item.id).sort();
if (JSON.stringify(manifestItemIds) !== JSON.stringify(catalogItemIds)) {
  fail("manifest item IDs do not match the story catalog");
}

for (const item of catalog.items) {
  const entry = manifest.items?.[item.id];
  if (!entry) {
    fail(`${item.id}: missing manifest entry`);
    continue;
  }
  if (entry.slot !== item.slot || entry.styleKey !== item.styleKey) {
    fail(`${item.id}: slot/styleKey mismatch`);
  }
  const manifestLayerKinds = Object.keys(entry.layers ?? {}).sort();
  const expectedLayerKinds = [...item.layerKinds].sort();
  if (
    JSON.stringify(manifestLayerKinds) !==
    JSON.stringify(expectedLayerKinds)
  ) {
    fail(`${item.id}: layer kinds do not match catalog`);
  }

  await validateImage(`items/${item.id}/thumb.webp`, {
    width: 512,
    height: 384,
    transparency: "required",
    maxBytes: 300_000,
  });
  for (const kind of item.layerKinds) {
    await validateImage(`items/${item.id}/wear-${kind}.webp`, {
      width: 1024,
      height: 1536,
      transparency: "required",
      maxBytes: 800_000,
    });
  }
}

const manifestEpisodeIds = Object.keys(manifest.episodes ?? {}).sort();
const catalogEpisodeIds = catalog.episodes
  .map((episode) => episode.slug)
  .sort();
if (
  JSON.stringify(manifestEpisodeIds) !==
  JSON.stringify(catalogEpisodeIds)
) {
  fail("manifest episode IDs do not match the story catalog");
}

for (const episode of catalog.episodes) {
  const entry = manifest.episodes?.[episode.slug];
  if (!entry || entry.backgroundStyle !== episode.backgroundStyle) {
    fail(`${episode.slug}: missing or mismatched background manifest entry`);
  }
  await validateImage(`episodes/${episode.slug}/background.webp`, {
    width: 1920,
    height: 1440,
    transparency: "opaque",
    maxBytes: 1_500_000,
  });
}

const expectedImageCount =
  4 +
  catalog.items.length +
  catalog.items.reduce(
    (total, item) => total + item.layerKinds.length,
    0,
  ) +
  catalog.episodes.length;
if (checked.length !== expectedImageCount) {
  fail(`expected ${expectedImageCount} images, checked ${checked.length}`);
}

if (failures.length) {
  console.error(`Story art validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const totalBytes = checked.reduce((total, asset) => total + asset.size, 0);
console.log(
  `Story art valid: ${checked.length} WebP images, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`,
);
