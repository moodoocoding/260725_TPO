import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  readWebPDimensions,
  readWebPMetadata,
  validateArtAssets,
} from "../scripts/validate-art-assets.mjs";

const ITEMS = {
  "yellow-raincoat": ["top", ["wear-back.webp", "wear-main.webp"]],
  "mint-windbreaker": ["top", ["wear-main.webp"]],
  "navy-cardigan": ["top", ["wear-main.webp"]],
  "cream-sweater": ["top", ["wear-main.webp"]],
  "active-pants": ["bottom", ["wear-main.webp"]],
  "sky-denim": ["bottom", ["wear-main.webp"]],
  "beige-shorts": ["bottom", ["wear-main.webp"]],
  "long-skirt": ["bottom", ["wear-main.webp"]],
  "rain-boots": ["shoes", ["wear-main.webp"]],
  sneakers: ["shoes", ["wear-main.webp"]],
  slippers: ["shoes", ["wear-main.webp"]],
  "dress-shoes": ["shoes", ["wear-main.webp"]],
  "clear-umbrella": [
    "accessory",
    ["wear-back.webp", "wear-front.webp"],
  ],
  "black-umbrella": [
    "accessory",
    ["wear-back.webp", "wear-front.webp"],
  ],
  "reflective-band": ["accessory", ["wear-front.webp"]],
  "canvas-tote": ["accessory", ["wear-back.webp", "wear-front.webp"]],
};

function makeExtendedWebP(width, height, { alpha = false } = {}) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer[20] = alpha ? 0x10 : 0;
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  buffer[24] = encodedWidth & 0xff;
  buffer[25] = (encodedWidth >>> 8) & 0xff;
  buffer[26] = (encodedWidth >>> 16) & 0xff;
  buffer[27] = encodedHeight & 0xff;
  buffer[28] = (encodedHeight >>> 8) & 0xff;
  buffer[29] = (encodedHeight >>> 16) & 0xff;
  return buffer;
}

async function writeFile(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents);
}

async function createValidFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tpo-art-test-"));
  const artRoot = path.join(root, "public/art/v1");

  const gameObjects = Object.entries(ITEMS)
    .map(([id, [slot]]) => `  { id: "${id}", slot: "${slot}" },`)
    .join("\n");
  await writeFile(
    root,
    "lib/game-data.ts",
    `export const CLOTHING_ITEMS = [\n${gameObjects}\n];\n`,
  );

  const manifestItems = [];
  for (const [id, [slot, layers]] of Object.entries(ITEMS)) {
    manifestItems.push({
      id,
      slot,
      thumbnail: `items/${id}/thumb.webp`,
      layers: layers.map((file, z) => ({
        src: `items/${id}/${file}`,
        z,
      })),
    });
    await writeFile(
      artRoot,
      `items/${id}/thumb.webp`,
      makeExtendedWebP(512, 384),
    );
    for (const layer of layers) {
      await writeFile(
        artRoot,
        `items/${id}/${layer}`,
        makeExtendedWebP(1024, 1536, { alpha: true }),
      );
    }
  }

  for (const commonFile of [
    "character/base.webp",
    "character/faces/ready.webp",
    "character/faces/success.webp",
    "character/faces/retry.webp",
    "episodes/rainy-market-errand/effects/rain-back.webp",
    "episodes/rainy-market-errand/effects/rain-front.webp",
    "episodes/rainy-market-errand/effects/reflective-glow.webp",
  ]) {
    await writeFile(
      artRoot,
      commonFile,
      makeExtendedWebP(1024, 1536, { alpha: true }),
    );
  }

  await writeFile(
    artRoot,
    "episodes/rainy-market-errand/background.webp",
    makeExtendedWebP(1920, 1440),
  );
  await writeFile(
    artRoot,
    "art-manifest.json",
    JSON.stringify({
      version: 1,
      canvas: { width: 1024, height: 1536 },
      character: {
        base: "character/base.webp",
        faces: {
          ready: "character/faces/ready.webp",
          success: "character/faces/success.webp",
          retry: "character/faces/retry.webp",
        },
      },
      episode: {
        background: "episodes/rainy-market-errand/background.webp",
        effects: {
          rainBack: {
            src: "episodes/rainy-market-errand/effects/rain-back.webp",
          },
          rainFront: {
            src: "episodes/rainy-market-errand/effects/rain-front.webp",
          },
          reflectiveGlow: {
            src: "episodes/rainy-market-errand/effects/reflective-glow.webp",
          },
        },
      },
      items: manifestItems,
    }),
  );

  return root;
}

async function removeFixture(root) {
  await fs.rm(root, { recursive: true, force: true });
}

test("WebP VP8X 헤더에서 이미지 크기를 읽는다", () => {
  assert.deepEqual(readWebPDimensions(makeExtendedWebP(512, 384)), {
    width: 512,
    height: 384,
  });
  assert.equal(
    readWebPMetadata(
      makeExtendedWebP(1024, 1536, { alpha: true }),
    ).hasAlpha,
    true,
  );
});

test("16개 아이템과 공통 에셋이 완전하면 검증을 통과한다", async (t) => {
  const root = await createValidFixture();
  t.after(() => removeFixture(root));

  const result = await validateArtAssets({ projectRoot: root });

  assert.equal(
    result.ok,
    true,
    result.errors.map((error) => `${error.code}: ${error.message}`).join("\n"),
  );
  assert.equal(result.summary.gameItems, 16);
  assert.equal(result.summary.manifestItems, 16);
  assert.equal(result.summary.thumbnails, 16);
  assert.equal(result.summary.wearLayers, 20);
});

test("누락된 썸네일과 필수 앞뒤 레이어를 보고한다", async (t) => {
  const root = await createValidFixture();
  t.after(() => removeFixture(root));
  const artRoot = path.join(root, "public/art/v1");

  await fs.rm(path.join(artRoot, "items/clear-umbrella/thumb.webp"));
  const manifestPath = path.join(artRoot, "art-manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.items.find((item) => item.id === "canvas-tote").layers = [];
  await fs.writeFile(manifestPath, JSON.stringify(manifest));

  const result = await validateArtAssets({ projectRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "MISSING_FILE" &&
        error.file.endsWith("clear-umbrella/thumb.webp"),
    ),
  );
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "REQUIRED_LAYER" &&
        error.message.includes("canvas-tote"),
    ),
  );
  assert.ok(
    result.errors.some((error) => error.code === "THUMBNAIL_COUNT"),
  );
});

test("잘못된 캔버스·투명도·금지 형식·추가 디렉터리를 보고한다", async (t) => {
  const root = await createValidFixture();
  t.after(() => removeFixture(root));
  const artRoot = path.join(root, "public/art/v1");

  await fs.writeFile(
    path.join(artRoot, "items/rain-boots/wear-main.webp"),
    makeExtendedWebP(512, 768, { alpha: true }),
  );
  await fs.writeFile(
    path.join(artRoot, "items/cream-sweater/wear-main.webp"),
    makeExtendedWebP(1024, 1536),
  );
  await fs.mkdir(path.join(artRoot, "items/unknown-item"));
  await fs.writeFile(path.join(artRoot, "source.svg"), "<svg></svg>");
  await fs.writeFile(path.join(artRoot, "preview.png"), "not-a-runtime-asset");

  const result = await validateArtAssets({ projectRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "IMAGE_SIZE"));
  assert.ok(result.errors.some((error) => error.code === "MISSING_ALPHA"));
  assert.ok(result.errors.some((error) => error.code === "RUNTIME_SVG"));
  assert.ok(result.errors.some((error) => error.code === "RUNTIME_PNG"));
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "ITEM_DIRECTORY_SET" &&
        error.message.includes("unknown-item"),
    ),
  );
});
