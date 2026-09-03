import { env } from "@/lib/env";

const RECALL_BASE = process.env.RECALL_API_BASE || "https://api.recall.ai/api/v1";

export interface BotResult {
  botId?: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Schedule a Recall.ai bot to join a Google Meet call and record it.
 * PRE-CHECK before enabling in production: confirm current Recall.ai pricing —
 * assume pay-as-you-go (~$1/hr), NOT a free tier. The Society standardises on
 * Google Meet; Zoom/Teams/Jiomeet also work with Recall.
 * Returns {skipped:true} when RECALL_API_KEY is unset.
 */
export async function scheduleBot(meetLink: string): Promise<BotResult> {
  const key = env.recallKey();
  if (!key) return { skipped: true };
  try {
    const res = await fetch(`${RECALL_BASE}/bot`, {
      method: "POST",
      headers: {
        authorization: `Token ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: meetLink,
        bot_name: "Deccan Birders Assistant",
        recording_config: { transcript: { provider: { meeting_captions: {} } } },
      }),
    });
    if (!res.ok) {
      return { error: `Recall ${res.status}: ${await res.text()}` };
    }
    const data = (await res.json()) as { id: string };
    return { botId: data.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface RecallWebhookPayload {
  event?: string;
  data?: {
    bot_id?: string;
    bot?: { id?: string };
    transcript?: unknown;
  };
}
