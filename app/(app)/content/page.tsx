import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getConfig, type LoginHero } from "@/lib/appConfig";
import { DEFAULT_HERO } from "@/app/login/defaults";
import { PageHead, SectionLabel } from "@/components/ui";
import { HeroForm, EntryList, CollageManager, type EntryRow } from "./forms";
import type { ContentEntryRow, CollageImageRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS)) redirect("/dashboard");

  const db = createClient();
  const [{ data: entries }, { data: images }, hero] = await Promise.all([
    db
      .from("content_entries")
      .select("*")
      .order("category")
      .order("sort_order"),
    db.from("collage_images").select("*").order("sort_order"),
    getConfig<LoginHero>(db, "login_hero"),
  ]);

  const rows = (entries ?? []) as ContentEntryRow[];
  const byCat = (c: string): EntryRow[] =>
    rows
      .filter((r) => r.category === c)
      .map((r) => ({
        id: r.id,
        body: r.body,
        attribution: r.attribution,
        is_active: r.is_active,
      }));

  const imageRows = (images ?? []) as CollageImageRow[];
  const imageViews = imageRows.map((r) => ({
    id: r.id,
    url: db.storage.from("public-assets").getPublicUrl(r.storage_path).data
      .publicUrl,
    alt: r.alt ?? "",
  }));

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHead
        title="Login &amp; Content"
        sub="Everything on the public sign-in page — hero text, the field-note / quote rail, and the photo collage."
      />

      <SectionLabel>Hero text</SectionLabel>
      <div className="card">
        <HeroForm
          title={hero?.title ?? DEFAULT_HERO.title}
          subtitle={hero?.subtitle ?? DEFAULT_HERO.subtitle}
        />
      </div>

      <SectionLabel>Rail — three rotating columns</SectionLabel>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <EntryList category="field_note" label="FIELD NOTE" entries={byCat("field_note")} />
        <EntryList
          category="from_the_hide"
          label="FROM THE HIDE"
          entries={byCat("from_the_hide")}
        />
        <EntryList category="on_birding" label="ON BIRDING" entries={byCat("on_birding")} />
      </div>

      <SectionLabel>Collage images</SectionLabel>
      <div className="card">
        <CollageManager images={imageViews} />
      </div>
    </div>
  );
}
