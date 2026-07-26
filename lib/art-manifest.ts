import type { Slot } from "@/lib/story-data";

export const ART_CANVAS = {
  width: 1024,
  height: 1536,
} as const;

export const ART_PLANE_Z = {
  wearBack: 10,
  body: 20,
  bottom: 30,
  shoes: 40,
  top: 50,
  accessory: 60,
  wearFront: 70,
  face: 80,
} as const;

export type ArtPlane = keyof typeof ART_PLANE_Z;
export type ArtMood = "ready" | "success" | "retry";
export type WearLayerKind = "back" | "main" | "front";

export type WearableArtItem = {
  id: string;
  assetId?: string;
  slot: Slot;
  layerKinds?: readonly WearLayerKind[];
};

export type ArtLayer = {
  id: string;
  src: string;
  plane: ArtPlane;
  order: number;
};

export type ResolvedArtLayer = ArtLayer & {
  zIndex: number;
};

const ITEM_ROOT = "/art/v2/items";
const CHARACTER_ROOT = "/art/v2/character";

const SLOT_PLANE: Record<Slot, ArtPlane> = {
  top: "top",
  bottom: "bottom",
  shoes: "shoes",
  accessory: "accessory",
};

export const ART_MANIFEST = {
  schemaVersion: 2,
  artVersion: "v2",
  canvas: ART_CANVAS,
  roots: {
    character: CHARACTER_ROOT,
    items: ITEM_ROOT,
    episodes: "/art/v2/episodes",
  },
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
} as const;

function resolveLayer(layer: ArtLayer): ResolvedArtLayer {
  return {
    ...layer,
    zIndex: ART_PLANE_Z[layer.plane] + layer.order,
  };
}

function resolveItemLayers(item: WearableArtItem): ArtLayer[] {
  const layerKinds = item.layerKinds?.length ? item.layerKinds : ["main"];
  const root = `${ITEM_ROOT}/${item.assetId ?? item.id}`;

  return layerKinds.map((kind) => ({
    id: `${item.id}-${kind}`,
    src: `${root}/wear-${kind}.webp`,
    plane:
      kind === "back"
        ? "wearBack"
        : kind === "front"
          ? "wearFront"
          : SLOT_PLANE[item.slot],
    order: kind === "front" && item.slot === "accessory" ? 2 : 0,
  }));
}

export function resolveCharacterLayers(
  mood: ArtMood,
  items: readonly WearableArtItem[],
): ResolvedArtLayer[] {
  const uniqueItems = [
    ...new Map(items.map((item) => [item.id, item])).values(),
  ];

  return [
    ART_MANIFEST.character.base,
    ...uniqueItems.flatMap(resolveItemLayers),
    ART_MANIFEST.character.faces[mood],
  ]
    .map(resolveLayer)
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

export function getItemThumbnail(assetId: string): string {
  return `${ITEM_ROOT}/${assetId}/thumb.webp`;
}

export function getEpisodeBackground(slug: string): string {
  return `${ART_MANIFEST.roots.episodes}/${slug}/background.webp`;
}
