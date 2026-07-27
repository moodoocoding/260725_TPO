import type { Slot } from "@/lib/story-data";
import {
  EPISODE_ONE_SLUG,
  getEpisodeItemAssetPath,
  getEpisodeOneRoot,
} from "@/lib/art-paths";
import storyArtManifestSource from "@/public/art/v5/character-manifest.json";

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

const CHARACTER_ROOT = "/art/v2/character";
const STORY_ART_ROOT = "/art/v5";
const EPISODE_ONE_ROOT = getEpisodeOneRoot();

type StoryCharacterEntry = {
  mode: "full-frame-moods" | "layered-base-face";
  base?: string;
  faces?: Partial<Record<ArtMood, string>>;
  moods?: Partial<Record<ArtMood, string>>;
};

type StoryItemEntry = {
  thumbnail: string;
  layers: Partial<Record<WearLayerKind, string>>;
};

type StoryArtManifest = {
  artVersion: string;
  roots: {
    characters: string;
    items: string;
  };
  episodeMap: Record<string, StoryCharacterEntry>;
  items: Record<string, StoryItemEntry>;
};

const STORY_ART_MANIFEST =
  storyArtManifestSource as unknown as StoryArtManifest;

const SLOT_PLANE: Record<Slot, ArtPlane> = {
  top: "top",
  bottom: "bottom",
  shoes: "shoes",
  accessory: "accessory",
};

export const ART_MANIFEST = {
  schemaVersion: 2,
  artVersion: STORY_ART_MANIFEST.artVersion,
  canvas: ART_CANVAS,
  roots: {
    character: CHARACTER_ROOT,
    storyCharacters: STORY_ART_MANIFEST.roots.characters,
    items: STORY_ART_MANIFEST.roots.items,
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

function resolveStoryAssetUrl(src: string): string {
  return src.startsWith("/") ? src : `${STORY_ART_ROOT}/${src}`;
}

function resolveItemLayers(
  item: WearableArtItem,
  episodeSlug?: string,
): ArtLayer[] {
  const assetId = item.assetId ?? item.id;
  const manifestItem = STORY_ART_MANIFEST.items[assetId];
  const usesEpisodeAssets = episodeSlug === EPISODE_ONE_SLUG;
  const layers = usesEpisodeAssets ? undefined : manifestItem?.layers;
  const layerKinds = usesEpisodeAssets
    ? item.layerKinds?.length
      ? item.layerKinds
      : (["main"] as const)
    : (["back", "main", "front"] as const).filter(
        (kind) => layers?.[kind],
      );
  const resolvedKinds = layerKinds.length
    ? layerKinds
    : item.layerKinds?.length
      ? item.layerKinds
      : (["main"] as const);

  return resolvedKinds.map((kind) => ({
    id: `${item.id}-${kind}`,
    src:
      getEpisodeItemAssetPath(
        episodeSlug,
        assetId,
        `wear-${kind}.webp`,
      ) ??
      (layers?.[kind]
        ? resolveStoryAssetUrl(layers[kind])
        : `${STORY_ART_MANIFEST.roots.items}/${assetId}/wear-${kind}.webp`),
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
  const storyCharacter = episodeSlug
    ? STORY_ART_MANIFEST.episodeMap[episodeSlug]
    : undefined;
  const moodAsset =
    storyCharacter?.mode === "full-frame-moods"
      ? storyCharacter.moods?.[mood]
      : undefined;
  const characterLayers = moodAsset
    ? [
        {
          id: `${episodeSlug}-character-${mood}`,
          src: resolveStoryAssetUrl(moodAsset),
          plane: "body" as const,
          order: 0,
        },
      ]
    : storyCharacter?.mode === "layered-base-face" && storyCharacter.base
      ? [
          {
            id: `${episodeSlug}-character-base`,
            src: resolveStoryAssetUrl(storyCharacter.base),
            plane: "body" as const,
            order: 0,
          },
        ]
    : [ART_MANIFEST.character.base];
  const faceAsset =
    storyCharacter?.mode === "layered-base-face"
      ? storyCharacter.faces?.[mood]
      : undefined;
  const faceLayers = moodAsset
    ? []
    : faceAsset
      ? [
          {
            id: `${episodeSlug}-face-${mood}`,
            src: resolveStoryAssetUrl(faceAsset),
            plane: "face" as const,
            order: 0,
          },
        ]
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
  const episodeAsset = getEpisodeItemAssetPath(
    episodeSlug,
    assetId,
    "thumb.webp",
  );
  if (episodeAsset) return episodeAsset;

  const thumbnail = STORY_ART_MANIFEST.items[assetId]?.thumbnail;
  return thumbnail
    ? resolveStoryAssetUrl(thumbnail)
    : `${STORY_ART_MANIFEST.roots.items}/${assetId}/thumb.webp`;
}

export function getEpisodeBackground(slug: string): string {
  if (slug === EPISODE_ONE_SLUG) {
    return `${EPISODE_ONE_ROOT}/background.webp`;
  }
  return `${ART_MANIFEST.roots.episodes}/${slug}/background.webp`;
}
