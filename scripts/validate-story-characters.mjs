import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(
  projectRoot,
  "art-source",
  "character-rig",
  "story-cast-v5",
);
const publicRoot = path.join(projectRoot, "public", "art", "v5");
const validationRoot = path.join(
  projectRoot,
  "art-validation",
  "story-cast-v5",
);
const v4HaruRoot = path.join(
  projectRoot,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
  "character",
);
const catalog = JSON.parse(
  await readFile(path.join(projectRoot, "lib", "story-catalog.json"), "utf8"),
);
const spec = JSON.parse(
  await readFile(path.join(sourceRoot, "cast-spec.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(
    path.join(publicRoot, "character-manifest.json"),
    "utf8",
  ),
);

const failures = [];
const characterResults = [];
const itemResults = [];
const moods = ["ready", "success", "retry"];
const expectedAnchors = {
  headTop: { x: 526, y: 159 },
  headCenter: { x: 526, y: 360 },
  earLeft: { x: 318, y: 299 },
  earRight: { x: 736, y: 299 },
  neckCenter: { x: 526, y: 590 },
  shoulderLeft: { x: 401, y: 602 },
  shoulderRight: { x: 650, y: 602 },
  elbowLeft: { x: 309, y: 744 },
  elbowRight: { x: 742, y: 744 },
  wristLeft: { x: 274, y: 849 },
  wristRight: { x: 779, y: 849 },
  handLeft: { x: 267, y: 883 },
  handRight: { x: 788, y: 883 },
  waistCenter: { x: 526, y: 862 },
  hipLeft: { x: 443, y: 1002 },
  hipRight: { x: 610, y: 1002 },
  kneeLeft: { x: 409, y: 1093 },
  kneeRight: { x: 643, y: 1093 },
  ankleLeft: { x: 410, y: 1202 },
  ankleRight: { x: 648, y: 1202 },
  footLeft: { x: 389, y: 1242 },
  footRight: { x: 671, y: 1242 },
  groundCenter: { x: 526, y: 1278 },
};
const expectedPlanes = {
  wearBack: 10,
  body: 20,
  bottom: 30,
  shoes: 40,
  top: 50,
  accessory: 60,
  wearFront: 70,
  face: 80,
};
const expectedCast = {
  "school-pe-rush": ["minjun-puppy", "민준", "puppy"],
  "bedtime-ready": ["somi-hamster", "소미", "hamster"],
  "friend-birthday-party": ["jiwoo-quokka", "지우", "quokka"],
  "rainy-market-errand": ["haru-otter-v4", "하루", "otter"],
  "summer-waterpark": ["seojun-penguin", "서준", "penguin"],
  "winter-ski-class": ["yerin-polar-bear", "예린", "polar-bear"],
  "wedding-flower-child": ["daon-red-panda", "다온", "red-panda"],
  "family-funeral": ["eunho-silver-fox", "은호", "silver-fox"],
  "lunar-new-year-visit": ["harin-squirrel", "하린", "squirrel"],
  "science-lab-experiment": ["doyoon-badger", "도윤", "badger"],
  "family-cooking": ["chaewon-calico-cat", "채원", "calico-cat"],
  "zombie-city-escape": ["taeo-ferret", "태오", "ferret"],
};

function fail(message) {
  failures.push(message);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function alphaBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      count += 1;
    }
  }
  return { left, top, right, bottom, count };
}

function inside(bounds, safe) {
  return (
    bounds.left >= safe.left &&
    bounds.top >= safe.top &&
    bounds.right <= safe.right &&
    bounds.bottom <= safe.bottom
  );
}

function alphaHash(data, width, top, bottom) {
  const hash = createHash("sha256");
  const row = Buffer.alloc(width);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      row[x] = data[(y * width + x) * 4 + 3] > 8 ? 255 : 0;
    }
    hash.update(row);
  }
  return hash.digest("hex");
}

function hasAlphaNear(data, width, height, point, radius = 8) {
  for (
    let y = Math.max(0, point.y - radius);
    y <= Math.min(height - 1, point.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, point.x - radius);
      x <= Math.min(width - 1, point.x + radius);
      x += 1
    ) {
      if (data[(y * width + x) * 4 + 3] > 8) return true;
    }
  }
  return false;
}

async function fileHash(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function readImage(filePath) {
  const [file, metadata, raw] = await Promise.all([
    stat(filePath),
    sharp(filePath).metadata(),
    sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  return { file, metadata, raw };
}

async function validateSvg(filePath, attributes) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch {
    fail(`${path.relative(projectRoot, filePath)}: source SVG missing`);
    return;
  }
  if (!source.includes('viewBox="0 0 1024 1536"')) {
    fail(`${path.relative(projectRoot, filePath)}: invalid viewBox`);
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (!source.includes(`data-${name}="${value}"`)) {
      fail(
        `${path.relative(projectRoot, filePath)}: data-${name} must be ${value}`,
      );
    }
  }
  if (/<(?:image|filter|foreignObject)\b/i.test(source)) {
    fail(`${path.relative(projectRoot, filePath)}: forbidden SVG feature`);
  }
  if (/\btransform\s*=/i.test(source)) {
    fail(`${path.relative(projectRoot, filePath)}: transform is forbidden`);
  }
}

if (manifest.schemaVersion !== 2) fail("manifest schemaVersion must be 2");
if (manifest.deterministic !== true) fail("manifest must be deterministic");
if (!same(manifest.canvas, { width: 1024, height: 1536 })) {
  fail("manifest canvas must be 1024x1536");
}
if (manifest.rig?.id !== "otter-v1.0.0") {
  fail("all v5 assets must use the approved v4 otter rig");
}
if (!same(manifest.rig?.anchors, expectedAnchors)) {
  fail("v5 anchor contract differs from the approved v4 rig");
}
if (!same(manifest.rig?.planeZ, expectedPlanes)) {
  fail("v5 layer order differs from the current renderer");
}
if (
  manifest.rig?.baseGroundY !== 1278 ||
  manifest.rig?.shoeGroundY !== 1308
) {
  fail("ground contract must be bare feet 1278 and shoes 1308");
}

const orderedEpisodes = [...catalog.episodes].sort(
  (left, right) => left.order - right.order,
);
if (orderedEpisodes.length !== 13) fail("catalog must contain 13 episodes");
if (Object.keys(manifest.episodeMap ?? {}).length !== 13) {
  fail("manifest must map all 13 episodes");
}
for (const episode of orderedEpisodes) {
  const mapping = manifest.episodeMap?.[episode.slug];
  if (!mapping) {
    fail(`${episode.slug}: missing character mapping`);
    continue;
  }
  if (
    !mapping.characterId ||
    !mapping.name ||
    !mapping.species ||
    mapping.episodeOrder !== episode.order
  ) {
    fail(`${episode.slug}: incomplete slug-to-character mapping`);
  }
  if (mapping.rigId !== "otter-v1.0.0") {
    fail(`${episode.slug}: mapping uses a non-v4 rig`);
  }
  if (episode.order >= 2) {
    const expected = expectedCast[episode.slug];
    if (
      !expected ||
      !same(
        [mapping.characterId, mapping.name, mapping.species],
        expected,
      )
    ) {
      fail(`${episode.slug}: mapping differs from the approved art direction`);
    }
  }
}

const expectedItemIds = [
  ...new Set(
    catalog.episodes
      .filter((episode) => episode.order >= 2)
      .flatMap((episode) => episode.itemIds),
  ),
].sort();
if (!same(Object.keys(manifest.items ?? {}).sort(), expectedItemIds)) {
  fail("v5 item manifest does not match the EP2-13 union");
}

const haruHashes = {};
for (const mood of moods) {
  const source = path.join(v4HaruRoot, `${mood}.webp`);
  const copied = path.join(
    publicRoot,
    "characters",
    "haru-otter-v4",
    `${mood}.webp`,
  );
  try {
    const [sourceHash, copiedHash, image] = await Promise.all([
      fileHash(source),
      fileHash(copied),
      readImage(copied),
    ]);
    if (sourceHash !== copiedHash) {
      fail(`Haru ${mood}: v5 copy SHA differs from the preserved EP1 v4 asset`);
    }
    haruHashes[mood] = { episode1V4: sourceHash, episode5V5: copiedHash };
    if (
      image.metadata.width !== 1024 ||
      image.metadata.height !== 1536 ||
      !image.metadata.hasAlpha
    ) {
      fail(`Haru ${mood}: copied asset must be transparent 1024x1536 WebP`);
    }
  } catch (error) {
    fail(`Haru ${mood}: ${error.message}`);
  }
}

let commonBodyHash = null;
for (const character of spec.cast) {
  const mapping = manifest.episodeMap?.[character.episodeSlug];
  if (
    mapping?.characterId !== character.id ||
    mapping?.name !== character.name ||
    mapping?.species !== character.species
  ) {
    fail(`${character.id}: public episode mapping mismatch`);
  }
  const baseSvg = path.join(
    sourceRoot,
    "characters",
    character.id,
    "base.svg",
  );
  await validateSvg(baseSvg, {
    "rig-id": "otter-v1.0.0",
    "character-id": character.id,
    layer: "base",
  });
  const basePath = path.join(
    publicRoot,
    "characters",
    character.id,
    "base.webp",
  );
  let base;
  try {
    base = await readImage(basePath);
  } catch (error) {
    fail(`${character.id}: base missing (${error.message})`);
    continue;
  }
  if (
    base.metadata.width !== 1024 ||
    base.metadata.height !== 1536 ||
    !base.metadata.hasAlpha
  ) {
    fail(`${character.id}: base must be transparent 1024x1536 WebP`);
  }
  const bounds = alphaBounds(
    base.raw.data,
    base.raw.info.width,
    base.raw.info.height,
  );
  if (!inside(bounds, manifest.rig.safeAreas.character)) {
    fail(`${character.id}: base exceeds the v4 character safe area`);
  }
  if (bounds.bottom < 1274 || bounds.bottom > 1278) {
    fail(`${character.id}: bare-foot ground ${bounds.bottom} is not 1278±4`);
  }
  const bodyHash = alphaHash(base.raw.data, base.raw.info.width, 525, 1278);
  if (commonBodyHash === null) commonBodyHash = bodyHash;
  if (bodyHash !== commonBodyHash) {
    fail(`${character.id}: shared v4 body alpha mask drifted`);
  }
  const faces = [];
  for (const mood of moods) {
    await validateSvg(
      path.join(
        sourceRoot,
        "characters",
        character.id,
        "faces",
        `${mood}.svg`,
      ),
      {
        "rig-id": "otter-v1.0.0",
        "character-id": character.id,
        layer: mood,
      },
    );
    const facePath = path.join(
      publicRoot,
      "characters",
      character.id,
      "faces",
      `${mood}.webp`,
    );
    try {
      const face = await readImage(facePath);
      if (
        face.metadata.width !== 1024 ||
        face.metadata.height !== 1536 ||
        !face.metadata.hasAlpha
      ) {
        fail(`${character.id}/${mood}: face must be transparent 1024x1536 WebP`);
      }
      const faceBounds = alphaBounds(
        face.raw.data,
        face.raw.info.width,
        face.raw.info.height,
      );
      if (!inside(faceBounds, manifest.rig.safeAreas.face)) {
        fail(`${character.id}/${mood}: face exceeds its safe area`);
      }
      faces.push({ mood, bytes: face.file.size, bounds: faceBounds });
    } catch (error) {
      fail(`${character.id}/${mood}: ${error.message}`);
    }
  }
  characterResults.push({
    id: character.id,
    baseBytes: base.file.size,
    bounds,
    bodyHash,
    faces,
  });
}

const itemById = new Map(catalog.items.map((item) => [item.id, item]));
let expectedWearCount = 0;
const slotCounts = { top: 0, bottom: 0, shoes: 0, accessory: 0 };
let waistAnchorChecks = 0;
let waistAnchorErrors = 0;
let ankleAnchorChecks = 0;
let ankleAnchorErrors = 0;
let shoeGroundErrors = 0;
for (const itemId of expectedItemIds) {
  const catalogItem = itemById.get(itemId);
  const publicItem = manifest.items?.[itemId];
  if (!catalogItem || !publicItem) continue;
  slotCounts[catalogItem.slot] += 1;
  const layerKinds = catalogItem.layerKinds?.length
    ? catalogItem.layerKinds
    : ["main"];
  expectedWearCount += layerKinds.length;
  if (!same(Object.keys(publicItem.layers).sort(), [...layerKinds].sort())) {
    fail(`${itemId}: layerKinds are missing or extra`);
  }
  const layerResults = [];
  for (const kind of layerKinds) {
    await validateSvg(
      path.join(
        sourceRoot,
        "items",
        itemId,
        `wear-${kind}.svg`,
      ),
      {
        "rig-id": "otter-v1.0.0",
        "item-id": itemId,
        slot: catalogItem.slot,
        layer: kind,
      },
    );
    const wearPath = path.join(
      publicRoot,
      "items",
      itemId,
      `wear-${kind}.webp`,
    );
    try {
      const wear = await readImage(wearPath);
      if (
        wear.metadata.width !== 1024 ||
        wear.metadata.height !== 1536 ||
        !wear.metadata.hasAlpha
      ) {
        fail(`${itemId}/${kind}: wear must be transparent 1024x1536 WebP`);
      }
      const bounds = alphaBounds(
        wear.raw.data,
        wear.raw.info.width,
        wear.raw.info.height,
      );
      if (!inside(bounds, manifest.rig.safeAreas.wear)) {
        fail(`${itemId}/${kind}: wear exceeds the v4 safe area`);
      }
      if (
        catalogItem.slot === "shoes" &&
        kind === "main" &&
        (bounds.bottom < 1304 || bounds.bottom > 1312)
      ) {
        shoeGroundErrors += 1;
        fail(`${itemId}: shoe ground ${bounds.bottom} is not 1308±4`);
      }
      if (
        kind === "main" &&
        (catalogItem.slot === "top" || catalogItem.slot === "bottom")
      ) {
        waistAnchorChecks += 1;
        if (
          !hasAlphaNear(
            wear.raw.data,
            wear.raw.info.width,
            wear.raw.info.height,
            expectedAnchors.waistCenter,
            8,
          )
        ) {
          waistAnchorErrors += 1;
          fail(`${itemId}: main layer misses waist anchor 526,862`);
        }
      }
      if (kind === "main" && catalogItem.slot === "shoes") {
        ankleAnchorChecks += 2;
        for (const [name, point] of [
          ["left", expectedAnchors.ankleLeft],
          ["right", expectedAnchors.ankleRight],
        ]) {
          if (
            !hasAlphaNear(
              wear.raw.data,
              wear.raw.info.width,
              wear.raw.info.height,
              point,
              12,
            )
          ) {
            ankleAnchorErrors += 1;
            fail(`${itemId}: ${name} shoe misses its ankle anchor`);
          }
        }
      }
      if (wear.file.size > 500_000) {
        fail(`${itemId}/${kind}: wear exceeds 500KB`);
      }
      layerResults.push({ kind, bytes: wear.file.size, bounds });
    } catch (error) {
      fail(`${itemId}/${kind}: ${error.message}`);
    }
  }
  const thumbnailPath = path.join(
    publicRoot,
    "items",
    itemId,
    "thumb.webp",
  );
  try {
    const thumbnail = await sharp(thumbnailPath).metadata();
    if (
      thumbnail.width !== 384 ||
      thumbnail.height !== 240 ||
      !thumbnail.hasAlpha
    ) {
      fail(`${itemId}: thumbnail must be transparent 384x240 WebP`);
    }
  } catch (error) {
    fail(`${itemId}: thumbnail missing (${error.message})`);
  }
  itemResults.push({
    id: itemId,
    slot: catalogItem.slot,
    layers: layerResults,
  });
}

try {
  const contactSheet = await sharp(
    path.join(validationRoot, "ep2-13-ready-contact-sheet.webp"),
  ).metadata();
  if (contactSheet.format !== "webp") {
    fail("EP2-13 contact sheet must be WebP");
  }
} catch {
  fail("EP2-13 ready contact sheet is missing");
}
try {
  const outfitSheet = await sharp(
    path.join(validationRoot, "ep2-13-outfit-contact-sheet.webp"),
  ).metadata();
  if (outfitSheet.format !== "webp") {
    fail("EP2-13 outfit contact sheet must be WebP");
  }
} catch {
  fail("EP2-13 outfit contact sheet is missing");
}

const runtimeFiles = await walk(publicRoot);
const runtimeWebps = runtimeFiles.filter(
  (file) => path.extname(file).toLowerCase() === ".webp",
);
const unexpectedRuntimeFiles = runtimeFiles.filter(
  (file) =>
    path.extname(file).toLowerCase() !== ".webp" &&
    path.basename(file) !== "character-manifest.json",
);
if (unexpectedRuntimeFiles.length) {
  fail("v5 runtime contains files other than WebP and its JSON manifest");
}
const expectedRuntimeWebps =
  spec.cast.length * 4 +
  3 +
  expectedItemIds.length +
  expectedWearCount;
if (runtimeWebps.length !== expectedRuntimeWebps) {
  fail(
    `expected ${expectedRuntimeWebps} runtime WebPs, found ${runtimeWebps.length}`,
  );
}

const sourceFiles = await walk(sourceRoot);
const sourceSvgs = sourceFiles.filter(
  (file) => path.extname(file).toLowerCase() === ".svg",
);
const expectedSourceSvgs = spec.cast.length * 4 + expectedWearCount;
if (sourceSvgs.length !== expectedSourceSvgs) {
  fail(`expected ${expectedSourceSvgs} source SVGs, found ${sourceSvgs.length}`);
}

const report = {
  artVersion: manifest.artVersion,
  result: failures.length ? "failed" : "passed",
  episodeMappings: Object.keys(manifest.episodeMap).length,
  layeredCharacters: spec.cast.length,
  preservedHaruMoodFiles: 3,
  preservedHaruHashes: haruHashes,
  itemCount: expectedItemIds.length,
  wearLayerCount: expectedWearCount,
  slotCounts,
  connectionQa: {
    waistAnchor: expectedAnchors.waistCenter,
    waistAnchorChecks,
    waistAnchorErrors,
    ankleAnchors: {
      left: expectedAnchors.ankleLeft,
      right: expectedAnchors.ankleRight,
    },
    ankleAnchorChecks,
    ankleAnchorErrors,
    expectedShoeGroundY: 1308,
    shoeGroundTolerance: 4,
    shoeGroundErrors,
  },
  sourceSvgCount: sourceSvgs.length,
  runtimeWebpCount: runtimeWebps.length,
  anchorCount: Object.keys(expectedAnchors).length,
  commonBodyAlphaHash: commonBodyHash,
  characterResults,
  itemResults,
  failures,
};
await mkdir(validationRoot, { recursive: true });
await writeFile(
  path.join(validationRoot, "validation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failures.length) {
  console.error(`Story v5 validation failed (${failures.length}):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Story v5 valid: 13 episode mappings, ${spec.cast.length} layered characters + preserved Haru`,
);
console.log(
  `Assets: ${sourceSvgs.length} SVG sources, ${runtimeWebps.length} runtime WebPs, ${expectedItemIds.length} items / ${expectedWearCount} wear layers`,
);
console.log(
  `Anchors: ${Object.keys(expectedAnchors).length}, shared body hash ${commonBodyHash}`,
);
