import { describe, expect, it } from "vitest";
import { SESSION_TTL_SEC, adminConfigStatus, createSessionToken, passwordMatches, verifySessionToken } from "@/lib/session";

const env = { ADMIN_PASSWORD: "a-long-test-passphrase", SESSION_SECRET: "s".repeat(40) } as unknown as NodeJS.ProcessEnv;

describe("admin session", () => {
  it("is off unless both secrets are set and long enough", () => {
    expect(adminConfigStatus({} as NodeJS.ProcessEnv).ok).toBe(false);
    expect(adminConfigStatus({ ...env, ADMIN_PASSWORD: "admin123", NODE_ENV: "production" }).ok).toBe(false);
    expect(adminConfigStatus({ ...env, ADMIN_PASSWORD: "admin123", NODE_ENV: "development" }).ok).toBe(true);
    expect(adminConfigStatus({ ...env, ADMIN_PASSWORD: "", NODE_ENV: "development" }).ok).toBe(false);
    expect(adminConfigStatus({ ...env, SESSION_SECRET: "short" }).ok).toBe(false);
    expect(adminConfigStatus(env).ok).toBe(true);
  });

  it("checks the passphrase", () => {
    expect(passwordMatches("a-long-test-passphrase", env)).toBe(true);
    expect(passwordMatches("a-long-test-passphrasE", env)).toBe(false);
    expect(passwordMatches("", env)).toBe(false);
    expect(passwordMatches("anything", {} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("accepts its own token and nothing else", () => {
    const now = Date.UTC(2027, 0, 1);
    const token = createSessionToken(now, env);
    expect(verifySessionToken(token, now + 1000, env)).toBe(true);
    expect(verifySessionToken(token, now + (SESSION_TTL_SEC + 1) * 1000, env)).toBe(false);
    expect(verifySessionToken(undefined, now, env)).toBe(false);
    expect(verifySessionToken("garbage", now, env)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(verifySessionToken(`${Number(exp) + 9999}.${sig}`, now, env)).toBe(false);
    expect(verifySessionToken(token, now, { ...env, SESSION_SECRET: "t".repeat(40) })).toBe(false);
  });
});
