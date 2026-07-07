import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SlackSignatureVerifier } from "./slack-signature-verifier";

function sign(body: string, timestamp: string, secret: string): string {
	return `v0=${createHmac("sha256", secret)
		.update(`v0:${timestamp}:${body}`)
		.digest("hex")}`;
}

describe("SlackSignatureVerifier", () => {
	const verifier = new SlackSignatureVerifier();
	const body =
		"token=legacy&team_id=T123&user_id=U123&command=%2Freview-radar&text=help";
	const timestamp = "1700000000";
	const now = new Date(Number(timestamp) * 1000);

	it("accepts a valid Slack signature", () => {
		expect(
			verifier.verify({
				rawBody: body,
				timestamp,
				signature: sign(body, timestamp, "secret"),
				signingSecret: "secret",
				now,
			}),
		).toBe(true);
	});

	it("rejects invalid signatures", () => {
		expect(
			verifier.verify({
				rawBody: body,
				timestamp,
				signature: sign(body, timestamp, "secret"),
				signingSecret: "other-secret",
				now,
			}),
		).toBe(false);
	});

	it("rejects stale timestamps", () => {
		expect(
			verifier.verify({
				rawBody: body,
				timestamp,
				signature: sign(body, timestamp, "secret"),
				signingSecret: "secret",
				now: new Date((Number(timestamp) + 301) * 1000),
			}),
		).toBe(false);
	});
});
