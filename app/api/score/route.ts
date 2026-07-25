import { scoreOutfit } from "@/lib/scoring";

type ScoreRequest = {
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
    !Array.isArray(body.selectedItemIds) ||
    body.selectedItemIds.some((id) => typeof id !== "string") ||
    typeof body.elapsedSeconds !== "number"
  ) {
    return Response.json({ error: "코디 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const result = scoreOutfit(body.selectedItemIds, body.elapsedSeconds);
  return Response.json(result);
}
