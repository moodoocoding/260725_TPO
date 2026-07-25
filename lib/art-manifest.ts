import type { ClothingItemId, Slot } from "@/lib/game-data";

export const ART_CANVAS = {
  width: 1024,
  height: 1536,
} as const;

export const ART_PLANE_Z = {
  sceneBack: 0,
  wearBack: 10,
  body: 20,
  bottom: 30,
  shoes: 40,
  top: 50,
  accessory: 60,
  wearFront: 70,
  face: 80,
  effect: 90,
} as const;

export type ArtPlane = keyof typeof ART_PLANE_Z;
export type ArtMood = "ready" | "success" | "retry";
export type WearLayerKind = "back" | "main" | "front";

export type ArtLayer = {
  id: string;
  src: string;
  plane: ArtPlane;
  order: number;
};

export type ArtItemManifest = {
  id: ClothingItemId;
  slot: Slot;
  thumbnail: string;
  layers: readonly ArtLayer[];
};

const ITEM_ROOT = "/art/v1/items";
const CHARACTER_ROOT = "/art/v1/character";

const SLOT_PLANE: Record<Slot, ArtPlane> = {
  top: "top",
  bottom: "bottom",
  shoes: "shoes",
  accessory: "accessory",
};

function createItemManifest(
  id: ClothingItemId,
  slot: Slot,
  layerKinds: readonly WearLayerKind[] = ["main"],
): ArtItemManifest {
  const root = `${ITEM_ROOT}/${id}`;
  const layers = layerKinds.map((kind) => {
    const plane =
      kind === "back"
        ? "wearBack"
        : kind === "front"
          ? "wearFront"
          : SLOT_PLANE[slot];

    return {
      id: `${id}-${kind}`,
      src: `${root}/wear-${kind}.webp`,
      plane,
      order: kind === "front" && slot === "accessory" ? 2 : 0,
    };
  });

  return { id, slot, thumbnail: `${root}/thumb.webp`, layers };
}

const items = {
  "yellow-raincoat": createItemManifest("yellow-raincoat", "top", [
    "back",
    "main",
  ]),
  "mint-windbreaker": createItemManifest("mint-windbreaker", "top"),
  "navy-cardigan": createItemManifest("navy-cardigan", "top"),
  "cream-sweater": createItemManifest("cream-sweater", "top"),
  "active-pants": createItemManifest("active-pants", "bottom"),
  "sky-denim": createItemManifest("sky-denim", "bottom"),
  "beige-shorts": createItemManifest("beige-shorts", "bottom"),
  "long-skirt": createItemManifest("long-skirt", "bottom"),
  "rain-boots": createItemManifest("rain-boots", "shoes"),
  sneakers: createItemManifest("sneakers", "shoes"),
  slippers: createItemManifest("slippers", "shoes"),
  "dress-shoes": createItemManifest("dress-shoes", "shoes"),
  "clear-umbrella": createItemManifest("clear-umbrella", "accessory", [
    "back",
    "front",
  ]),
  "black-umbrella": createItemManifest("black-umbrella", "accessory", [
    "back",
    "front",
  ]),
  "reflective-band": createItemManifest("reflective-band", "accessory", [
    "front",
  ]),
  "canvas-tote": createItemManifest("canvas-tote", "accessory", [
    "back",
    "front",
  ]),
} satisfies Record<ClothingItemId, ArtItemManifest>;

export const ART_MANIFEST = {
  schemaVersion: 1,
  artVersion: "v1",
  canvas: ART_CANVAS,
  character: {
    id: "haru",
    base: {
      id: "haru-base",
      src: `${CHARACTER_ROOT}/base.webp`,
      plane: "body",
      order: 0,
    } satisfies ArtLayer,
    faces: {
      ready: {
        id: "haru-face-ready",
        src: `${CHARACTER_ROOT}/faces/ready.webp`,
        plane: "face",
        order: 0,
      },
      success: {
        id: "haru-face-success",
        src: `${CHARACTER_ROOT}/faces/success.webp`,
        plane: "face",
        order: 0,
      },
      retry: {
        id: "haru-face-retry",
        src: `${CHARACTER_ROOT}/faces/retry.webp`,
        plane: "face",
        order: 0,
      },
    } satisfies Record<ArtMood, ArtLayer>,
  },
  items,
  episodes: {
    "rainy-market-errand": {
      background: "/art/v1/episodes/rainy-market-errand/background.webp",
      rainBack:
        "/art/v1/episodes/rainy-market-errand/effects/rain-back.webp",
      rainFront:
        "/art/v1/episodes/rainy-market-errand/effects/rain-front.webp",
      reflectiveGlow:
        "/art/v1/episodes/rainy-market-errand/effects/reflective-glow.webp",
    },
  },
} as const;

export type ResolvedArtLayer = ArtLayer & {
  zIndex: number;
};

function resolveLayer(layer: ArtLayer): ResolvedArtLayer {
  return {
    ...layer,
    zIndex: ART_PLANE_Z[layer.plane] + layer.order,
  };
}

export function resolveCharacterLayers(
  mood: ArtMood,
  itemIds: readonly ClothingItemId[],
): ResolvedArtLayer[] {
  const uniqueItemIds = [...new Set(itemIds)];
  const episode = ART_MANIFEST.episodes["rainy-market-errand"];
  const itemLayers = uniqueItemIds.flatMap(
    (itemId) => ART_MANIFEST.items[itemId].layers,
  );
  const sceneLayers: ArtLayer[] = [
    {
      id: "rain-back",
      src: episode.rainBack,
      plane: "sceneBack",
      order: 0,
    },
    ...(uniqueItemIds.includes("reflective-band")
      ? [
          {
            id: "reflective-glow",
            src: episode.reflectiveGlow,
            plane: "effect" as const,
            order: 0,
          },
        ]
      : []),
    {
      id: "rain-front",
      src: episode.rainFront,
      plane: "effect",
      order: 1,
    },
  ];

  return [
    sceneLayers[0],
    ART_MANIFEST.character.base,
    ...itemLayers,
    ART_MANIFEST.character.faces[mood],
    ...sceneLayers.slice(1),
  ]
    .map(resolveLayer)
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

export function getItemThumbnail(itemId: ClothingItemId): string {
  return ART_MANIFEST.items[itemId].thumbnail;
}
