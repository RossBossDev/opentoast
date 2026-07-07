import { describe, expect, it, vi } from "vitest";
import { HeartbeatService } from "./heartbeat.service";

describe("HeartbeatService", () => {
	it("enqueues digest jobs using a deterministic daily bucket", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-07T15:00:00.000Z"));
		const slackJobs = {
			enqueueSendDigest: vi.fn().mockResolvedValue(undefined),
		};
		const config = { get: vi.fn().mockReturnValue("http://localhost:3000") };
		const service = new HeartbeatService(config as never, slackJobs as never);

		await service.enqueueDigest();

		expect(slackJobs.enqueueSendDigest).toHaveBeenCalledWith({
			bucket: "http://localhost:3000:2026-07-07",
		});
		vi.useRealTimers();
	});
});
