export type TransferOption = {
  id: string;
  label: string;
};

export type EpisodeLearning = {
  reasonPrompt: string;
  reasonClues: string[];
  modelAnswer: string;
  transfer: {
    situation: string;
    question: string;
    options: TransferOption[];
    correctOptionId: string;
    successFeedback: string;
    retryFeedback: string;
  };
};

const EPISODE_LEARNING: Record<string, EpisodeLearning> = {
  "rescue-team-trial": {
    reasonPrompt: "왜 이 코디가 구조 훈련에 맞을까요?",
    reasonClues: ["밝게 보이기", "편하게 움직이기", "머리와 발 보호하기"],
    modelAnswer:
      "구조 훈련장에서는 밝아서 잘 보이고, 달리기 편하며, 안전모와 미끄럼 방지 운동화로 몸을 보호해야 해요.",
    transfer: {
      situation: "새 상황 · 비 오는 저녁 시장 심부름",
      question: "이 상황에서는 어떤 기능을 가장 먼저 찾아야 할까요?",
      options: [
        { id: "waterproof-visibility", label: "비를 막고 앞이 잘 보이는 기능" },
        { id: "formal", label: "격식 있고 반짝이는 장식" },
        { id: "indoor-soft", label: "실내에서 푹신한 기능" },
      ],
      correctOptionId: "waterproof-visibility",
      successFeedback:
        "맞아요! 상황이 달라지면 필요한 기능도 달라져요. 비와 어두운 길을 함께 생각했어요.",
      retryFeedback:
        "시간·장소·상황을 다시 살펴보세요. 비와 어두운 길에서 몸을 지킬 기능이 필요해요.",
    },
  },
};

export function getEpisodeLearning(
  episodeSlug: string,
): EpisodeLearning | undefined {
  return EPISODE_LEARNING[episodeSlug];
}
