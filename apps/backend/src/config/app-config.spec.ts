import { describe, expect, it } from "vitest";
import { validate } from "./app-config";

const validConfig = {
	NODE_ENV: "test",
	PORT: "3000",
	DATABASE_URL: "postgres://postgres:postgres@localhost:5432/review-radar",
	PROCESS_ROLE: "all",
	REDIS_URL: "redis://localhost:6379",
	APP_BASE_URL: "http://localhost:3000",
	GITHUB_APP_ID: "123",
	GITHUB_WEBHOOK_SECRET: "secret",
	GITHUB_PRIVATE_KEY: "private-key",
	SLACK_SIGNING_SECRET: "secret",
	SLACK_BOT_TOKEN: "xoxb-token",
	DIGEST_CRON: "0 9 * * 1-5",
	STALE_REVIEW_DURATION_HOURS: "24",
	LOG_LEVEL: "silent",
};

describe("config validation", () => {
	it("accepts required Review Radar environment values", () => {
		expect(validate(validConfig)).toMatchObject({
			DATABASE_URL: validConfig.DATABASE_URL,
			PROCESS_ROLE: "all",
			REDIS_URL: validConfig.REDIS_URL,
			PORT: 3000,
			STALE_REVIEW_DURATION_HOURS: 24,
		});
	});

	it("rejects missing required provider secrets", () => {
		const { SLACK_BOT_TOKEN: _removed, ...missingSlackToken } = validConfig;
		expect(() => validate(missingSlackToken)).toThrow();
	});

	it("rejects invalid process roles", () => {
		expect(() => validate({ ...validConfig, PROCESS_ROLE: "nope" })).toThrow();
	});
});
