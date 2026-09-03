import { istToday } from "@/lib/dates";
import { NewMeetingForm } from "./NewMeetingForm";

export default function NewMeetingPage() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <h1>New meeting</h1>
      <NewMeetingForm today={istToday()} />
    </div>
  );
}
