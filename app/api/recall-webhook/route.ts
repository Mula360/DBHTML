import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { extractMom } from "@/lib/ai/mom";
import { normaliseMom } from "@/lib/meetings";
import type { MemberRow, MomContent } from "@/lib/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recall.ai webhook. Verifies the shared secret, stores the transcript on the
 * meeting, runs Claude MoM extraction, and pre-fills a Draft MoM plus staged
 * action items. NOTHING is emailed to members — the Secretary edits and
 * approves via the meeting page.
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get("x-recall-signature") ||
    new URL(request.url).searchParams.get("secret");
  if (!env.recallWebhookSecret() || secret !== env.recallWebhookSecret()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    data?: { bot_id?: string; bot?: { id?: string }; transcript?: unknown };
  };
  const botId = body.data?.bot_id || body.data?.bot?.id;
  if (!botId) return NextResponse.json({ error: "no bot id" }, { status: 400 });

  const db = createAdminClient();
  const { data: meeting } = await db
    .from("meetings")
    .select("*")
    .eq("recall_bot_id", botId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ ok: true, note: "no matching meeting" });
  }

  const transcript =
    typeof body.data?.transcript === "string"
      ? body.data.transcript
      : JSON.stringify(body.data?.transcript ?? "");

  await db
    .from("meetings")
    .update({ transcript_text: transcript })
    .eq("id", meeting.id);

  const { data: members } = await db
    .from("members")
    .select("id, name")
    .eq("is_active", true);
  const memberList = (members ?? []) as Pick<MemberRow, "id" | "name">[];
  const extracted = await extractMom(
    transcript,
    memberList.map((m) => m.name),
  );

  const matchId = (name: string | null) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    return (
      memberList.find(
        (m) =>
          m.name.toLowerCase() === lower ||
          m.name.toLowerCase().split(" ")[0] === lower.split(" ")[0],
      )?.id ?? null
    );
  };

  const content: MomContent = normaliseMom({
    decisions: extracted.decisions,
    announcements: [],
    nextSteps: [],
    actionItems: extracted.action_items.map((a) => ({
      title: a.task,
      assignee: matchId(a.assignee),
      due: a.due_date,
    })),
  } as MomContent);

  const { data: existing } = await db
    .from("moms")
    .select("id, status")
    .eq("meeting_id", meeting.id)
    .maybeSingle();
  if (!existing || existing.status === "Draft") {
    await db
      .from("moms")
      .upsert(
        { meeting_id: meeting.id, content_json: content, status: "Draft" },
        { onConflict: "meeting_id" },
      );
  }

  return NextResponse.json({
    ok: true,
    decisions: extracted.decisions.length,
    action_items: extracted.action_items.length,
  });
}
