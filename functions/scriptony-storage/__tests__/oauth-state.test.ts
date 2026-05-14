/**
 * Tests für OAuth-State Signierung/Verifikation.
 */

import { describe, it, expect, vi } from "vitest";
import { buildState, parseState } from "../services/oauth-state";

vi.stubEnv("APPWRITE_API_KEY", "test-api-key-for-oauth-state-signing-123");

describe("buildState / parseState", () => {
	it("roundtrip: build then parse", () => {
		const state = buildState(
			"https://app.example.com/callback",
			"google_drive",
			"user-123",
		);
		const parsed = parseState(state);
		expect(parsed).not.toBeNull();
		expect(parsed!.redirect_uri).toBe("https://app.example.com/callback");
		expect(parsed!.provider).toBe("google_drive");
		expect(parsed!.user_id).toBe("user-123");
	});

	it("rejects tampered state", () => {
		const state = buildState(
			"https://app.example.com/callback",
			"google_drive",
			"user-123",
		);
		const tampered = state.slice(0, -1) + "X";
		expect(parseState(tampered)).toBeNull();
	});

	it("rejects malformed state (no dot)", () => {
		expect(parseState("just-payload-no-sig")).toBeNull();
	});

	it("rejects empty state", () => {
		expect(parseState("")).toBeNull();
	});

	it("produces different states for different users", () => {
		const s1 = buildState("/callback", "dropbox", "user-A");
		const s2 = buildState("/callback", "dropbox", "user-B");
		expect(s1).not.toBe(s2);
		expect(parseState(s1)!.user_id).toBe("user-A");
		expect(parseState(s2)!.user_id).toBe("user-B");
	});
});
