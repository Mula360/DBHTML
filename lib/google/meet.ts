import { googleGet } from "./auth";

const MEET = "https://meet.googleapis.com/v2";

export interface ConferenceRecord {
  name: string; // conferenceRecords/<id>
  startTime: string;
  endTime?: string;
}

export interface MeetParticipant {
  displayName: string;
  email: string | null;
  minutesPresent: number;
}

/** Conference records for the standing Meet room since `sinceIso`. */
export async function listConferenceRecords(
  meetingCode: string,
  sinceIso: string,
): Promise<ConferenceRecord[]> {
  const filter = encodeURIComponent(
    `space.meeting_code="${meetingCode}" AND start_time>="${sinceIso}"`,
  );
  const out: ConferenceRecord[] = [];
  let pageToken = "";
  do {
    const url =
      `${MEET}/conferenceRecords?filter=${filter}&pageSize=50` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const json = await googleGet<{
      conferenceRecords?: ConferenceRecord[];
      nextPageToken?: string;
    }>(url);
    if (!json) break;
    out.push(...(json.conferenceRecords ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

interface RawParticipant {
  name: string; // conferenceRecords/x/participants/y
  signedinUser?: { user: string; displayName: string };
  anonymousUser?: { displayName: string };
  phoneUser?: { displayName: string };
}

interface RawSession {
  startTime?: string;
  endTime?: string;
}

/** Participants of a conference with summed minutes on the call. */
export async function listParticipants(
  recordName: string,
): Promise<MeetParticipant[]> {
  const parts: RawParticipant[] = [];
  let pageToken = "";
  do {
    const url =
      `${MEET}/${recordName}/participants?pageSize=100` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const json = await googleGet<{
      participants?: RawParticipant[];
      nextPageToken?: string;
    }>(url);
    if (!json) break;
    parts.push(...(json.participants ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);

  const out: MeetParticipant[] = [];
  for (const p of parts) {
    const sessions = await listSessions(p.name);
    const minutes = sessions.reduce((acc, s) => {
      if (!s.startTime || !s.endTime) return acc;
      return (
        acc +
        (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
          60000
      );
    }, 0);
    const displayName =
      p.signedinUser?.displayName ||
      p.anonymousUser?.displayName ||
      p.phoneUser?.displayName ||
      "Unknown";
    // signedinUser.user is a directory people/<id>; the API does not return the
    // email directly. Name matching covers the common case; a google_email set
    // on the member record is the exact path when names collide.
    out.push({ displayName, email: null, minutesPresent: Math.round(minutes) });
  }
  return out;
}

async function listSessions(participantName: string): Promise<RawSession[]> {
  const out: RawSession[] = [];
  let pageToken = "";
  do {
    const url =
      `${MEET}/${participantName}/participantSessions?pageSize=100` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const json = await googleGet<{
      participantSessions?: RawSession[];
      nextPageToken?: string;
    }>(url);
    if (!json) break;
    out.push(...(json.participantSessions ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return out;
}
