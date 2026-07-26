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
const EPISODE_ONE_SLUG = "rescue-team-trial";
const EPISODE_ONE_ROOT = `/art/v4/episodes/${EPISODE_ONE_SLUG}`;

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

function resolveItemLayers(
  item: WearableArtItem,
  episodeSlug?: string,
): ArtLayer[] {
  const isEpisodeOneSlice = episodeSlug === EPISODE_ONE_SLUG;
  const layerKinds = item.layerKinds?.length
    ? item.layerKinds
    : ["main" as const];
  const root = isEpisodeOneSlice
    ? `${EPISODE_ONE_ROOT}/items/${item.assetId ?? item.id}`
    : `${ITEM_ROOT}/${item.assetId ?? item.id}`;

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
  episodeSlug?: string,
): ResolvedArtLayer[] {
  const uniqueItems = [
    ...new Map(items.map((item) => [item.id, item])).values(),
  ];
  const isEpisodeOneSlice = episodeSlug === EPISODE_ONE_SLUG;
  const characterLayers = isEpisodeOneSlice
    ? [
        {
          id: `episode-one-character-${mood}`,
          src: `${EPISODE_ONE_ROOT}/character/${mood}.webp`,
          plane: "body" as const,
          order: 0,
        },
      ]
    : [ART_MANIFEST.character.base];
  const faceLayers = isEpisodeOneSlice
    ? []
    : [ART_MANIFEST.character.faces[mood]];

  return [
    ...characterLayers,
    ...uniqueItems.flatMap((item) => resolveItemLayers(item, episodeSlug)),
    ...faceLayers,
  ]
    .map(resolveLayer)
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

export function getItemThumbnail(
  assetId: string,
  episodeSlug?: string,
): string {
  if (episodeSlug === EPISODE_ONE_SLUG) {
    return `${EPISODE_ONE_ROOT}/items/${assetId}/thumb.webp`;
  }
  return `${ITEM_ROOT}/${assetId}/thumb.webp`;
}

export function getEpisodeBackground(slug: string): string {
  if (slug === EPISODE_ONE_SLUG) {
    return `${EPISODE_ONE_ROOT}/background.webp`;
  }
  return `${ART_MANIFEST.roots.episodes}/${slug}/background.webp`;
}
