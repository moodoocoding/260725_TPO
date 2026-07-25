import { scoreOutfit } from "@/lib/scoring";

type ScoreRequest = {
  selectedItemIds?: unknown;
  elapsedSeconds?: unknown;
  guestId?: unknown;
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
  let persisted = false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/story_runs`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          guest_id:
            typeof body.guestId === "string" ? body.guestId.slice(0, 80) : null,
          scenario_slug: "rainy-market-errand",
          selected_item_ids: body.selectedItemIds,
          elapsed_seconds: Math.max(0, Math.min(60, body.elapsedSeconds)),
          score_total: result.total,
          score_breakdown: result.breakdown,
        }),
      });
      persisted = response.ok;
    } catch {
      persisted = false;
    }
  }

  return Response.json({ ...result, persisted });
}
