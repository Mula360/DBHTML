/**
 * RLS smoke test (Prompt 1, Step 3). Requires a running local Supabase:
 *   npx supabase start && npx supabase db reset
 * then set TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SERVICE_ROLE_KEY
 * (printed by `supabase status`). Skipped automatically when unset.
 *
 * Asserts: a plain EC member (EC5) sees zero rows in society_members and zero
 * of other members' expense_claims.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.TEST_SUPABASE_URL;
const ANON = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE = process.env.TEST_SERVICE_ROLE_KEY;

const run = URL && ANON && SERVICE ? describe : describe.skip;

run("RLS: plain member is walled off", () => {
  let anonMemberClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    const admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false },
    });

    // seed a general member + a claim owned by someone else
    await admin.from("society_members").insert({
      name: "General Member",
      status: "Active",
    });

    const { data: ec1 } = await admin
      .from("member_positions")
      .select("member_id")
      .eq("position", "President")
      .maybeSingle();
    if (ec1) {
      await admin.from("expense_claims").insert({
        member_id: ec1.member_id,
        amount: 500,
        description: "Test claim",
      });
    }

    // sign in as EC5 (a plain member) via a fresh magic-link user
    const { data: ec5 } = await admin
      .from("member_positions")
      .select("member_id, members!inner(email)")
      .eq("position", "EC5")
      .single();
    const email = (ec5 as unknown as { members: { email: string } }).members.email;

    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    // link the auth user to the member row
    await admin
      .from("members")
      .update({ auth_id: link.user!.id })
      .eq("id", (ec5 as { member_id: string }).member_id);

    anonMemberClient = createClient(URL!, ANON!, {
      auth: { persistSession: false },
    });
    await anonMemberClient.auth.admin; // no-op typing guard
    // verify OTP to get a session
    const otp = new global.URL(link!.properties!.action_link).searchParams.get(
      "token",
    );
    await anonMemberClient.auth.verifyOtp({
      email,
      token: otp!,
      type: "magiclink",
    });
  });

  it("society_members returns zero rows", async () => {
    const { data } = await anonMemberClient.from("society_members").select("*");
    expect(data).toEqual([]);
  });

  it("other members' expense_claims are hidden", async () => {
    const { data } = await anonMemberClient
      .from("expense_claims")
      .select("*");
    expect(data).toEqual([]);
  });
});
