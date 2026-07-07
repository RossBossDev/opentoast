import { describe, expect, it, vi } from "vitest";
import { GithubJobName } from "../queue/queue.constants";
import { GithubJobsProcessor } from "./github-jobs.processor";

describe("GithubJobsProcessor", () => {
	it("loads persisted event, processes facts, then marks processed", async () => {
		const payload = {
			action: "opened",
			repository: { id: 1, name: "repo", full_name: "org/repo" },
			pull_request: {
				id: 10,
				number: 4,
				title: "Hello",
				state: "open",
				html_url: "https://github.com/org/repo/pull/4",
				body: "ping @reviewer",
			},
		};
		const eventStore = {
			findById: vi.fn().mockResolvedValue({
				id: "event-id",
				deliveryId: "delivery-id",
				eventName: "pull_request",
				payload,
				processedAt: null,
			}),
			markProcessed: vi.fn().mockResolvedValue(undefined),
		};
		const snapshots = {
			upsertFromPayload: vi.fn().mockResolvedValue({
				installationId: "installation-id",
				repositoryId: "repository-id",
			}),
		};
		const normalizer = {
			normalize: vi.fn().mockReturnValue([{ type: "mention_detected" }]),
		};
		const attention = { processFacts: vi.fn().mockResolvedValue(undefined) };
		const processor = new GithubJobsProcessor(
			eventStore as never,
			snapshots as never,
			normalizer as never,
			attention as never,
		);

		await processor.process({
			name: GithubJobName.ProcessWebhookEvent,
			data: { eventId: "event-id", deliveryId: "delivery-id" },
		} as never);

		expect(eventStore.findById).toHaveBeenCalledWith("event-id");
		expect(snapshots.upsertFromPayload).toHaveBeenCalledWith(payload);
		expect(attention.processFacts).toHaveBeenCalledWith([
			{ type: "mention_detected" },
		]);
		expect(eventStore.markProcessed).toHaveBeenCalledWith({
			eventId: "event-id",
			installationId: "installation-id",
			repositoryId: "repository-id",
		});
	});
});
