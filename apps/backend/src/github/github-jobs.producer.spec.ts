import { describe, expect, it, vi } from "vitest";
import { GithubJobName } from "../queue/queue.constants";
import { GithubJobsProducer } from "./github-jobs.producer";

describe("GithubJobsProducer", () => {
	it("enqueues webhook processing with deterministic job id and retries", async () => {
		const queue = { add: vi.fn().mockResolvedValue(undefined) };
		const producer = new GithubJobsProducer(queue as never);

		await producer.enqueueProcessWebhookEvent({
			eventId: "event-id",
			deliveryId: "delivery-id",
		});

		expect(queue.add).toHaveBeenCalledWith(
			GithubJobName.ProcessWebhookEvent,
			{ eventId: "event-id", deliveryId: "delivery-id" },
			expect.objectContaining({
				jobId: "github-webhook:event-id",
				attempts: 5,
			}),
		);
	});
});
