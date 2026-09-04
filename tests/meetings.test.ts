import { describe, it, expect } from "vitest";
import { matchMember } from "@/lib/meetings/matchMember";
import { docIdFromUrl } from "@/lib/google/docs";

const members = [
  { id: "1", name: "Srikanth Bhamidipati", google_email: null, email: "srikanth@deccanbirders.org" },
  { id: "2", name: "Anita Rao", google_email: "anita.r@deccanbirders.org", email: "anita@personal.com" },
  { id: "3", name: "Srikanth Kumar", google_email: null, email: "sk@x.com" },
];

describe("matchMember", () => {
  it("matches an exact google_email", () => {
    expect(matchMember("anita.r@deccanbirders.org", members)).toBe("2");
  });
  it("matches an exact primary email", () => {
    expect(matchMember("srikanth@deccanbirders.org", members)).toBe("1");
  });
  it("matches an exact display name", () => {
    expect(matchMember("Anita Rao", members)).toBe("2");
  });
  it("refuses an ambiguous first name", () => {
    expect(matchMember("Srikanth", members)).toBeNull();
  });
  it("matches an unambiguous first name", () => {
    expect(matchMember("Anita", members)).toBe("2");
  });
  it("returns null for an unknown", () => {
    expect(matchMember("Nobody", members)).toBeNull();
    expect(matchMember(null, members)).toBeNull();
  });
});

describe("docIdFromUrl (SSRF allowlist)", () => {
  it("accepts a Google Docs URL", () => {
    expect(
      docIdFromUrl("https://docs.google.com/document/d/ABC_123-xyz/edit"),
    ).toBe("ABC_123-xyz");
  });
  it("rejects a non-Google host", () => {
    expect(docIdFromUrl("https://evil.example.com/document/d/ABC/edit")).toBeNull();
  });
  it("rejects http and internal hosts", () => {
    expect(docIdFromUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(docIdFromUrl("not a url")).toBeNull();
  });
});
