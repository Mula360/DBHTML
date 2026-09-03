import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface ExtractedMom {
  decisions: string[];
  action_items: { task: string; assignee: string | null; due_date: string | null }[];
  members_present: string[];
  discussion_points: Record<string, string>;
}

const EMPTY: ExtractedMom = {
  decisions: [],
  action_items: [],
  members_present: [],
  discussion_points: {},
};

/**
 * Draft minutes from a meeting transcript. Returns EMPTY (no throw) when
 * ANTHROPIC_API_KEY is unset or the model output can't be parsed — the
 * Secretary always edits and approves before anything is emailed.
 */
export async function extractMom(
  transcript: string,
  memberNames: string[],
): Promise<ExtractedMom> {
  const key = env.anthropicKey();
  if (!key || !transcript.trim()) return EMPTY;

  const client = new Anthropic({ apiKey: key });
  const system = `You are the Honorary Secretary of Deccan Birders, a birding society. From this EC meeting transcript extract:
(1) decisions — one clear sentence each;
(2) action items — {task, assignee matched to this exact member list: [${memberNames.join(", ")}], due_date if mentioned};
(3) members present matched to the list;
(4) key points per agenda item.
Output ONLY valid JSON:
{"decisions":[],"action_items":[{"task":"","assignee":"","due_date":""}],"members_present":[],"discussion_points":{}}`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: transcript.slice(0, 200_000) }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Partial<ExtractedMom>;
    return {
      decisions: parsed.decisions ?? [],
      action_items: (parsed.action_items ?? []).map((a) => ({
        task: a.task ?? "",
        assignee: a.assignee || null,
        due_date: a.due_date || null,
      })),
      members_present: parsed.members_present ?? [],
      discussion_points: parsed.discussion_points ?? {},
    };
  } catch (e) {
    console.error("extractMom failed:", e);
    return EMPTY;
  }
}
