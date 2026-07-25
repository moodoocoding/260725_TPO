"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  getItemThumbnail,
  resolveCharacterLayers,
  type ArtMood,
} from "@/lib/art-manifest";
import type { ClothingItem } from "@/lib/game-data";
import {
  LegacyCssCharacter,
  type LegacyCharacterMood,
} from "@/components/legacy-css-character";

type CharacterRendererProps = {
  selectedItems: readonly ClothingItem[];
  mood?: ArtMood;
  priority?: boolean;
};

type ImageCharacterRendererProps = {
  selectedItems: readonly ClothingItem[];
  mood: ArtMood;
  ariaLabel: string;
  priority: boolean;
  onAssetError: () => void;
};

const LEGACY_MOOD: Record<ArtMood, LegacyCharacterMood> = {
  ready: "ready",
  success: "happy",
  retry: "thinking",
};

function getCharacterSummary(selectedItems: readonly ClothingItem[]): string {
  if (selectedItems.length === 0) {
    return "옷을 고르기 전의 하루 캐릭터";
  }

  return `하루의 현재 코디: ${selectedItems
    .map((item) => item.name)
    .join(", ")}`;
}

export function ImageCharacterRenderer({
  selectedItems,
  mood,
  ariaLabel,
  priority,
  onAssetError,
}: ImageCharacterRendererProps) {
  const layers = useMemo(
    () =>
      resolveCharacterLayers(
        mood,
        selectedItems.map((item) => item.assetId),
      ),
    [mood, selectedItems],
  );

  return (
    <div
      className="character image-character"
      role="img"
      aria-label={ariaLabel}
      data-renderer="image-v1"
    >
      <div className="image-character-canvas" aria-hidden="true">
        {layers.map((layer) => (
          <Image
            key={layer.id}
            className="image-character-layer"
            src={layer.src}
            alt=""
            fill
            sizes="(max-width: 720px) 190px, 280px"
            priority={priority}
            draggable={false}
            onError={onAssetError}
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
}: CharacterRendererProps) {
  const assetSignature = `${mood}:${selectedItems
    .map((item) => item.assetId)
    .sort()
    .join(",")}`;
  const [failedSignature, setFailedSignature] = useState<string | null>(null);
  const ariaLabel = getCharacterSummary(selectedItems);

  if (failedSignature === assetSignature) {
    return (
      <LegacyCssCharacter
        selectedItems={selectedItems}
        mood={LEGACY_MOOD[mood]}
        ariaLabel={ariaLabel}
      />
    );
  }

  return (
    <ImageCharacterRenderer
      selectedItems={selectedItems}
      mood={mood}
      ariaLabel={ariaLabel}
      priority={priority}
      onAssetError={() => setFailedSignature(assetSignature)}
    />
  );
}

export function ItemThumbnail({ item }: { item: ClothingItem }) {
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
      src={getItemThumbnail(item.assetId)}
      alt=""
      fill
      sizes="(max-width: 720px) 42vw, 180px"
      draggable={false}
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}
