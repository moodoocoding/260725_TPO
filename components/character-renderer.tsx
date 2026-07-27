"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  getItemThumbnail,
  resolveCharacterLayers,
  type ArtMood,
} from "@/lib/art-manifest";
import type { ClothingItem } from "@/lib/story-data";

type CharacterRendererProps = {
  selectedItems: readonly ClothingItem[];
  mood?: ArtMood;
  priority?: boolean;
  episodeSlug?: string;
  characterName?: string;
};

type ImageCharacterRendererProps = {
  selectedItems: readonly ClothingItem[];
  mood: ArtMood;
  ariaLabel: string;
  priority: boolean;
  episodeSlug?: string;
};

function getCharacterSummary(
  selectedItems: readonly ClothingItem[],
  characterName: string,
): string {
  if (selectedItems.length === 0) {
    return `옷을 고르기 전의 ${characterName} 캐릭터`;
  }

  return `${characterName}의 현재 코디: ${selectedItems
    .map((item) => item.name)
    .join(", ")}`;
}

export function ImageCharacterRenderer({
  selectedItems,
  mood,
  ariaLabel,
  priority,
  episodeSlug,
}: ImageCharacterRendererProps) {
  const [failedLayerIds, setFailedLayerIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const layers = useMemo(
    () => resolveCharacterLayers(mood, selectedItems, episodeSlug),
    [episodeSlug, mood, selectedItems],
  );
  const visibleLayers = useMemo(
    () => layers.filter((layer) => !failedLayerIds.has(layer.id)),
    [failedLayerIds, layers],
  );
  const hasCharacterLayer = visibleLayers.some(
    (layer) => layer.plane === "body",
  );

  const markLayerFailed = (layerId: string) => {
    setFailedLayerIds((current) => {
      if (current.has(layerId)) return current;
      const next = new Set(current);
      next.add(layerId);
      return next;
    });
  };

  return (
    <div
      className="character image-character"
      role="img"
      aria-label={ariaLabel}
      data-renderer="image-v5-animal"
    >
      <div className="image-character-canvas" aria-hidden="true">
        {!hasCharacterLayer && (
          <span className="animal-character-fallback">🐾</span>
        )}
        {visibleLayers.map((layer) => (
          <Image
            key={layer.id}
            className="image-character-layer"
            src={layer.src}
            alt=""
            fill
            sizes="(max-width: 720px) 190px, 280px"
            unoptimized
            priority={priority}
            draggable={false}
            onError={() => markLayerFailed(layer.id)}
            style={{ zIndex: layer.zIndex }}
          />
        ))}
      </div>
    </div>
  );
}

export function CharacterRenderer({
  selectedItems,
  mood = "ready",
  priority = false,
  episodeSlug,
  characterName = "하루",
}: CharacterRendererProps) {
  const assetSignature = `${episodeSlug ?? "global"}:${mood}:${selectedItems
    .map((item) => item.id)
    .sort()
    .join(",")}`;
  const ariaLabel = getCharacterSummary(selectedItems, characterName);

  return (
    <ImageCharacterRenderer
      key={assetSignature}
      selectedItems={selectedItems}
      mood={mood}
      ariaLabel={ariaLabel}
      priority={priority}
      episodeSlug={episodeSlug}
    />
  );
}

export function ItemThumbnail({
  item,
}: {
  item: ClothingItem;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="item-thumbnail-fallback" aria-hidden="true">
        {item.symbol}
      </span>
    );
  }

  return (
    <Image
      className="item-thumbnail-image"
      src={getItemThumbnail(item.id)}
      alt=""
      fill
      sizes="(max-width: 720px) 42vw, 180px"
      unoptimized
      draggable={false}
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}
