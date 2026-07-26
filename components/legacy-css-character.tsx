import type { CSSProperties } from "react";
import type { ClothingItem } from "@/lib/story-data";

export type LegacyCharacterMood = "ready" | "happy" | "thinking";

type LegacyCssCharacterProps = {
  selectedItems: readonly ClothingItem[];
  mood?: LegacyCharacterMood;
  ariaLabel: string;
};

export function LegacyCssCharacter({
  selectedItems,
  mood = "ready",
  ariaLabel,
}: LegacyCssCharacterProps) {
  const bySlot = new Map(selectedItems.map((item) => [item.slot, item]));
  const top = bySlot.get("top");
  const bottom = bySlot.get("bottom");
  const shoes = bySlot.get("shoes");
  const accessory = bySlot.get("accessory");
  const accessoryStyle = accessory?.styleKey ?? "";
  const isUmbrella = accessoryStyle === "umbrella";
  const isBand = accessoryStyle === "band";
  const isBag = ["backpack", "bag", "basket", "gift-bag", "tote"].includes(
    accessoryStyle,
  );
  const itemStyle = (item?: ClothingItem) =>
    item
      ? ({
          "--item-color": item.color,
          "--item-accent": item.accent,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={`character character-${mood}`}
      role="img"
      aria-label={ariaLabel}
      data-renderer="legacy-css"
    >
      <div className="character-shadow" aria-hidden="true" />
      {accessory && isUmbrella && (
        <div
          className={`umbrella ${
            accessory.tags.includes("transparent") ? "umbrella-clear" : ""
          }`}
          style={itemStyle(accessory)}
          aria-hidden="true"
        >
          <span className="umbrella-canopy" />
          <span className="umbrella-stick" />
        </div>
      )}
      <div className="character-head" aria-hidden="true">
        <span className="character-hair hair-left" />
        <span className="character-hair hair-right" />
        <span className="ear ear-left" />
        <span className="ear ear-right" />
        <span className="eye eye-left" />
        <span className="eye eye-right" />
        <span className="nose" />
        <span className="mouth" />
        <span className="cheek cheek-left" />
        <span className="cheek cheek-right" />
        {top?.id === "yellow-raincoat" && <span className="rain-hood" />}
      </div>
      <div className="character-neck" aria-hidden="true" />
      <div
        className={`character-top ${top ? "has-item" : ""} ${
          top?.styleKey ?? "base-top"
        }`}
        style={itemStyle(top)}
        aria-hidden="true"
      >
        <span className="top-collar" />
        <span className="top-zip" />
        <span className="top-pocket pocket-left" />
        <span className="top-pocket pocket-right" />
      </div>
      <span
        className={`arm arm-left ${top ? "has-item" : ""}`}
        style={itemStyle(top)}
        aria-hidden="true"
      />
      <span
        className={`arm arm-right ${top ? "has-item" : ""}`}
        style={itemStyle(top)}
        aria-hidden="true"
      />
      <div
        className={`character-bottom ${bottom ? "has-item" : ""} ${
          bottom?.styleKey ?? "base-bottom"
        }`}
        style={itemStyle(bottom)}
        aria-hidden="true"
      >
        <span className="leg leg-left" />
        <span className="leg leg-right" />
      </div>
      <span
        className={`shoe shoe-left ${shoes ? "has-item" : ""} ${
          shoes?.styleKey ?? "base-shoe"
        }`}
        style={itemStyle(shoes)}
        aria-hidden="true"
      />
      <span
        className={`shoe shoe-right ${shoes ? "has-item" : ""} ${
          shoes?.styleKey ?? "base-shoe"
        }`}
        style={itemStyle(shoes)}
        aria-hidden="true"
      />
      {accessory && isBand && (
        <span
          className="reflective-band"
          style={itemStyle(accessory)}
          aria-hidden="true"
        />
      )}
      {accessory && isBag && (
        <span
          className="tote-bag"
          style={itemStyle(accessory)}
          aria-hidden="true"
        />
      )}
      {accessory && !isUmbrella && !isBand && !isBag && (
        <span
          className="generic-accessory"
          style={itemStyle(accessory)}
          aria-hidden="true"
        >
          {accessory.symbol}
        </span>
      )}
    </div>
  );
}
