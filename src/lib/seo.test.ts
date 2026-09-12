import { describe, expect, it } from "vitest";
import { getSeoConfig } from "./seo";

describe("SEO launch protection", () => {
  it("requires explicit opt-in on a public HTTPS domain", () => {
    expect(getSeoConfig("https://example.com", "true").indexable).toBe(true);
    expect(getSeoConfig("https://example.com", "false").indexable).toBe(false);
    expect(getSeoConfig("http://example.com", "true").indexable).toBe(false);
  });
  it.each(["http://localhost:3100", "https://127.0.0.1", "https://ayl.test", "https://ayl.local", "https://[::1]"])("does not index local origin %s", origin => {
    expect(getSeoConfig(origin, "true").indexable).toBe(false);
  });
  it.each(["https://example.com/path", "https://example.com?token=x", "https://user:pass@example.com", "ftp://example.com"])("rejects an invalid canonical origin %s", origin => {
    expect(() => getSeoConfig(origin, "true")).toThrow();
  });
});
