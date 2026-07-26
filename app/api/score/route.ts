import { scoreOutfit } from "@/lib/scoring";
import { getEpisode } from "@/lib/story-data";

type ScoreRequest = {
  scenarioSlug?: unknown;
  selectedItemIds?: unknown;
  elapsedSeconds?: unknown;
};

export async function POST(request: Request) {
  let body: ScoreRequest;

  try {
    body = (await request.json()) as ScoreRequest;
  } catch {
    return Response.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }

  if (
    typeof body.scenarioSlug !== "string" ||
    !Array.isArray(body.selectedItemIds) ||
    body.selectedItemIds.length > 4 ||
    body.selectedItemIds.some((id) => typeof id !== "string") ||
    typeof body.elapsedSeconds !== "number" ||
    !Number.isFinite(body.elapsedSeconds)
  ) {
    return Response.json({ error: "코디 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const episode = getEpisode(body.scenarioSlug);
  if (!episode) {
    return Response.json({ error: "존재하지 않는 스토리 임무입니다." }, { status: 404 });
  }

  const availableItemIds = new Set(episode.itemIds);
  if (body.selectedItemIds.some((itemId) => !availableItemIds.has(itemId))) {
    return Response.json(
      { error: "이 임무에서 선택할 수 없는 아이템이 포함되어 있습니다." },
      { status: 400 },
    );
  }

  const result = scoreOutfit(
    episode,
    body.selectedItemIds,
    body.elapsedSeconds,
  );
  return Response.json(result);
}
