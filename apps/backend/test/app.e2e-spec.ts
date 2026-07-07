import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KYSELY_DB } from "../src/database/database.tokens";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
	"postgres://postgres:postgres@localhost:5432/review-radar";
process.env.APP_BASE_URL = "http://localhost:3000";
process.env.GITHUB_APP_ID = "123";
process.env.GITHUB_WEBHOOK_SECRET = "secret";
process.env.GITHUB_PRIVATE_KEY = "private-key";
process.env.SLACK_SIGNING_SECRET = "secret";
process.env.SLACK_BOT_TOKEN = "xoxb-token";
process.env.DIGEST_CRON = "0 9 * * 1-5";
process.env.STALE_REVIEW_DURATION_HOURS = "24";

describe("Health endpoints", () => {
	let app: INestApplication;

	beforeEach(async () => {
		const { AppModule } = await import("../src/app.module");
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(KYSELY_DB)
			.useValue({
				selectNoFrom: () => ({
					executeTakeFirstOrThrow: async () => ({ ok: 1 }),
				}),
			})
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app?.close();
	});

	it("reports liveness", async () => {
		await request(app.getHttpServer())
			.get("/health/live")
			.expect(200)
			.expect({ status: "ok" });
	});

	it("reports readiness", async () => {
		const response = await request(app.getHttpServer())
			.get("/health/ready")
			.expect(200);
		expect(response.body.status).toBe("ok");
	});
});
