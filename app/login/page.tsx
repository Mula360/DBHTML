import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { LoginView } from "./LoginView";
import {
  DEFAULT_HERO,
  DEFAULT_FACTS,
  DEFAULT_JOKES,
  DEFAULT_QUOTES,
  type Entry,
} from "./defaults";
import type { ContentEntryRow, CollageImageRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

// The login page is pre-auth: RLS policies are `to authenticated`, so it reads
// CMS content through the service-role client. This is a read-only projection
// of officer-authored copy — no user data.
async function loadContent() {
  try {
    const db = createAdminClient();
    const [{ data: entries }, { data: images }, { data: hero }] =
      await Promise.all([
        db
          .from("content_entries")
          .select("category, body, attribution, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        db
          .from("collage_images")
          .select("storage_path, alt, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        db
          .from("app_config")
          .select("value")
          .eq("key", "login_hero")
          .maybeSingle(),
      ]);

    const rows = (entries ?? []) as Pick<
      ContentEntryRow,
      "category" | "body" | "attribution" | "sort_order"
    >[];
    const pick = (cat: string, fallback: Entry[]): Entry[] => {
      const list = rows
        .filter((r) => r.category === cat)
        .map((r) => ({ text: r.body, source: r.attribution ?? "" }));
      return list.length ? list : fallback;
    };

    const imgRows = (images ?? []) as Pick<
      CollageImageRow,
      "storage_path" | "alt"
    >[];
    const imageUrls = imgRows.map((r) => ({
      url: db.storage.from("public-assets").getPublicUrl(r.storage_path).data
        .publicUrl,
      alt: r.alt ?? "",
    }));

    const heroVal = (hero?.value ?? null) as
      | { title?: string; subtitle?: string }
      | null;

    return {
      hero: {
        title: heroVal?.title || DEFAULT_HERO.title,
        subtitle: heroVal?.subtitle || DEFAULT_HERO.subtitle,
      },
      facts: pick("field_note", DEFAULT_FACTS),
      jokes: pick("from_the_hide", DEFAULT_JOKES),
      quotes: pick("on_birding", DEFAULT_QUOTES),
      images: imageUrls,
    };
  } catch {
    return {
      hero: DEFAULT_HERO,
      facts: DEFAULT_FACTS,
      jokes: DEFAULT_JOKES,
      quotes: DEFAULT_QUOTES,
      images: [] as { url: string; alt: string }[],
    };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const content = await loadContent();
  return (
    <LoginView
      {...content}
      passwordEnabled={env.allowPasswordLogin()}
      error={searchParams.error}
    />
  );
}
