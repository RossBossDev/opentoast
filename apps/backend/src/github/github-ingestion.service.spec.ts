import { describe, expect, it, vi } from "vitest";
import type { GithubWebhookPayload } from "./github.types";
import { GithubIngestionService } from "./github-ingestion.service";

const payload: GithubWebhookPayload = {
	action: "opened",
	installation: { id: 123, account: { login: "org", type: "Organization" } },
	repository: { id: 1, name: "repo", full_name: "org/repo" },
	pull_request: {
		id: 10,
		number: 4,
		title: "Hello",
		state: "open",
		html_url: "https://github.com/org/repo/pull/4",
		body: "ping @reviewer",
		user: { id: 2, login: "author" },
	},
};

describe("GithubIngestionService", () => {
	it("does not enqueue duplicate deliveries", async () => {
		const eventStore = {
			persistRaw: vi
				.fn()
				.mockResolvedValue({ id: "event-id", duplicate: true }),
		};
		const jobs = { enqueueProcessWebhookEvent: vi.fn() };
		const service = new GithubIngestionService(
			eventStore as never,
			jobs as never,
		);
		const listener = vi.fn();
		service.onFacts(listener);

		const result = await service.ingest(
			{ deliveryId: "delivery-id", eventName: "pull_request" },
			payload,
		);

		expect(result).toEqual({
			deliveryId: "delivery-id",
			duplicate: true,
			facts: [],
		});
		expect(jobs.enqueueProcessWebhookEvent).not.toHaveBeenCalled();
		expect(listener).not.toHaveBeenCalled();
	});

	it("persists and enqueues new raw events without inline attention processing", async () => {
		const eventStore = {
			persistRaw: vi
				.fn()
				.mockResolvedValue({ id: "event-id", duplicate: false }),
		};
		const jobs = {
			enqueueProcessWebhookEvent: vi.fn().mockResolvedValue(undefined),
		};
		const service = new GithubIngestionService(
			eventStore as never,
			jobs as never,
		);
		const listener = vi.fn();
		service.onFacts(listener);

		const result = await service.ingest(
			{ deliveryId: "delivery-id", eventName: "pull_request" },
			payload,
		);

		expect(result).toEqual({
			deliveryId: "delivery-id",
			duplicate: false,
			facts: [],
		});
		expect(jobs.enqueueProcessWebhookEvent).toHaveBeenCalledWith({
			eventId: "event-id",
			deliveryId: "delivery-id",
		});
		expect(listener).not.toHaveBeenCalled();
	});
});
