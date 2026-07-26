import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rigRoot = path.join(
  root,
  "art-source",
  "character-rig",
  "otter-v1",
);
const revisionRoot = path.join(rigRoot, "revision-r2");
const publicRoot = path.join(
  root,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
);
const contract = JSON.parse(
  await readFile(path.join(rigRoot, "revision-r0", "wear-contract.json"), "utf8"),
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
const failures = [];
const sourceResults = [];
const thumbnailResults = [];

function fail(message) {
  failures.push(message);
}

function attribute(source, name) {
  return source.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
}

const inventoryIds = contract.inventory.map((item) => item.id).sort();
const episodeIds = [...(episode?.itemIds ?? [])].sort();
const manifestIds = manifest.items.map((item) => item.id).sort();
if (inventoryIds.length !== 16) fail("R2 contract must contain 16 items");
if (JSON.stringify(inventoryIds) !== JSON.stringify(episodeIds)) {
  fail("R2 contract inventory does not match episode 1");
}
if (JSON.stringify(manifestIds) !== JSON.stringify(episodeIds)) {
  fail("R2 public manifest does not match episode 1");
}
if (manifest.sourcePolicy !== "thumbnail is derived from the same SVG wear master") {
  fail("public manifest must declare wear-master-derived thumbnails");
}

const slotCounts = { top: 0, bottom: 0, shoes: 0, accessory: 0 };
const roleCounts = {
  top: { best: 0, acceptable: 0, partial: 0, mismatch: 0 },
  bottom: { best: 0, acceptable: 0, partial: 0, mismatch: 0 },
  shoes: { best: 0, acceptable: 0, partial: 0, mismatch: 0 },
  accessory: { best: 0, acceptable: 0, partial: 0, mismatch: 0 },
};
for (const item of contract.inventory) {
  slotCounts[item.slot] += 1;
  roleCounts[item.slot][item.role] += 1;
}
for (const slot of Object.keys(slotCounts)) {
  if (slotCounts[slot] !== 4) fail(`${slot}: expected four R2 items`);
  if (Object.values(roleCounts[slot]).some((count) => count !== 1)) {
    fail(`${slot}: requires one item for each fit role`);
  }
}

const productionGarments = contract.inventory.filter((item) =>
  ["top", "bottom"].includes(item.slot),
);
for (const item of productionGarments) {
  const sourcePath = path.join(
    revisionRoot,
    "items",
    item.id,
    "wear-main.svg",
  );
  let source;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch {
    fail(`${item.id}: production SVG is missing`);
    continue;
  }

  const centerX = Number(attribute(source, "data-rig-center-x"));
  const waistY = Number(attribute(source, "data-waist-y"));
  const left = Number(attribute(source, "data-connection-left"));
  const right = Number(attribute(source, "data-connection-right"));
  const overlap = Number(attribute(source, "data-overlap"));
  const pathCount = (source.match(/<path\b/g) ?? []).length;
  const gzipBytes = gzipSync(Buffer.from(source)).byteLength;

  if (attribute(source, "viewBox") !== contract.canvas.viewBox) {
    fail(`${item.id}: invalid viewBox`);
  }
  if (attribute(source, "data-item-id") !== item.id) {
    fail(`${item.id}: data item id mismatch`);
  }
  if (attribute(source, "data-slot") !== item.slot) {
    fail(`${item.id}: data slot mismatch`);
  }
  if (
    Math.abs(centerX - contract.rig.centerX) >
      contract.rig.waistConnection.maxAnchorDrift ||
    Math.abs(waistY - contract.rig.waistAnchor.y) >
      contract.rig.waistConnection.maxAnchorDrift
  ) {
    fail(`${item.id}: anchor drift exceeds 4px`);
  }
  if (
    Math.abs(left - contract.rig.waistConnection.left) >
      contract.rig.waistConnection.maxSideError ||
    Math.abs(right - contract.rig.waistConnection.right) >
      contract.rig.waistConnection.maxSideError
  ) {
    fail(`${item.id}: waist connection width exceeds tolerance`);
  }
  if (
    overlap < contract.rig.waistConnection.acceptedOverlap.min ||
    overlap > contract.rig.waistConnection.acceptedOverlap.max
  ) {
    fail(`${item.id}: overlap ${overlap}px is outside the accepted range`);
  }
  if (pathCount > contract.sourcePolicy.maxPathsPerItem) {
    fail(`${item.id}: too many SVG paths`);
  }
  if (gzipBytes > contract.sourcePolicy.maxSvgGzipBytes) {
    fail(`${item.id}: compressed SVG exceeds the hard limit`);
  }
  if (/<(?:image|filter|foreignObject)\b/i.test(source)) {
    fail(`${item.id}: forbidden SVG feature`);
  }
  if (/\btransform\s*=/i.test(source)) {
    fail(`${item.id}: runtime-style source transform is forbidden`);
  }

  sourceResults.push({
    itemId: item.id,
    slot: item.slot,
    waistMode: attribute(source, "data-waist-mode"),
    overlap,
    pathCount,
    gzipBytes,
  });
}

for (const itemId of episodeIds) {
  const thumbnailPath = path.join(publicRoot, "items", itemId, "thumb.webp");
  try {
    const [file, metadata] = await Promise.all([
      stat(thumbnailPath),
      sharp(thumbnailPath).metadata(),
    ]);
    if (metadata.width !== 384 || metadata.height !== 240) {
      fail(`${itemId}: thumbnail must be 384x240`);
    }
    if (file.size > 35_000) {
      fail(`${itemId}: thumbnail exceeds 35KB`);
    }
    thumbnailResults.push({
      itemId,
      width: metadata.width,
      height: metadata.height,
      bytes: file.size,
    });
  } catch {
    fail(`${itemId}: thumbnail is missing`);
  }
}

const report = {
  revision: "R2",
  generatedAt: new Date().toISOString(),
  result: failures.length === 0 ? "passed" : "failed",
  inventoryCount: inventoryIds.length,
  slotCounts,
  roleCounts,
  sourceResults,
  thumbnailResults,
  failures,
};
await writeFile(
  path.join(revisionRoot, "production-validation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error(`Episode 1 production rig failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Episode 1 production rig passed: ${inventoryIds.length} items, ${sourceResults.length} waist-connected garments`,
  );
}
