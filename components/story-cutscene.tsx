"use client";

import type { CSSProperties } from "react";
import { CharacterRenderer } from "@/components/character-renderer";

export type CutsceneBeat = {
  id: string;
  speaker?: string;
  text: string;
  visualKey?: string;
  mood?: "bright" | "calm" | "urgent" | "solemn";
};

type StoryCutsceneProps = {
  eyebrow: string;
  title: string;
  beats: readonly CutsceneBeat[];
  activeIndex: number;
  backgroundImage: string;
  accent: string;
  episodeSlug: string;
  characterName: string;
  badgeName?: string;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
};

const SPEAKER_LABELS: Record<string, string> = {
  narrator: "이야기",
  captain: "나래 대장",
  haru: "하루",
  hari: "하루",
  button: "단추",
  requester: "친구",
};

export function StoryCutscene({
  eyebrow,
  title,
  beats,
  activeIndex,
  backgroundImage,
  accent,
  episodeSlug,
  characterName,
  badgeName,
  nextLabel = "다음 장면",
  onBack,
  onNext,
  onSkip,
}: StoryCutsceneProps) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), beats.length - 1);
  const beat = beats[safeIndex];
  const isLast = safeIndex === beats.length - 1;
  const speakerLabel =
    beat?.speaker === "requester"
      ? characterName
      : SPEAKER_LABELS[beat?.speaker ?? "narrator"] ?? beat?.speaker;
  const style = {
    "--cutscene-accent": accent,
    "--cutscene-background": `url("${backgroundImage}")`,
  } as CSSProperties;

  if (!beat) return null;

  return (
    <section
      className={`cutscene-layout cutscene-${beat.mood ?? "bright"}`}
      style={style}
      aria-labelledby="cutscene-title"
    >
      <div className="cutscene-visual">
        <div className="cutscene-scene-label">
          <span>
            장면 {safeIndex + 1} / {beats.length}
          </span>
          {badgeName && <strong>{badgeName}</strong>}
        </div>
        <div className="cutscene-character">
          <CharacterRenderer
            selectedItems={[]}
            mood={beat.mood === "solemn" ? "ready" : "success"}
            priority
            episodeSlug={episodeSlug}
            characterName={characterName}
          />
          <span className="cutscene-character-name">{characterName}</span>
        </div>
        <div className="cutscene-compass" aria-hidden="true">
          <span>T</span>
          <span>P</span>
          <span>O</span>
        </div>
      </div>

      <div className="cutscene-copy">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="cutscene-title">{title}</h1>
        </div>
        <div className="cutscene-dialogue" aria-live="polite">
          <small>{speakerLabel}</small>
          <p>{beat.text}</p>
        </div>
        <div
          className="cutscene-progress"
          aria-label={`${beats.length}장면 중 ${safeIndex + 1}번째`}
        >
          {beats.map((item, index) => (
            <span
              key={item.id}
              className={index === safeIndex ? "active" : ""}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="cutscene-actions">
          <button className="secondary-button" onClick={onBack}>
            {safeIndex === 0 ? "스토리 맵" : "이전 장면"}
          </button>
          {onSkip && !isLast && (
            <button className="text-button" onClick={onSkip}>
              이야기 건너뛰기
            </button>
          )}
          <button className="primary-button" onClick={onNext}>
            {isLast ? nextLabel : "다음 장면"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
