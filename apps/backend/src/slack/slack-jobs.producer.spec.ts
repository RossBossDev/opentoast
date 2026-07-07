import { describe, expect, it, vi } from "vitest";
import { SlackJobName } from "../queue/queue.constants";
import { SlackJobsProducer } from "./slack-jobs.producer";

describe("SlackJobsProducer", () => {
	it("enqueues attention item delivery with deterministic job id", async () => {
		const queue = { add: vi.fn().mockResolvedValue(undefined) };
		const producer = new SlackJobsProducer(queue as never);

		await producer.enqueueDeliverAttentionItem({
			attentionItemId: "attention-id",
			deliveryType: "digest",
		});

		expect(queue.add).toHaveBeenCalledWith(
			SlackJobName.DeliverAttentionItem,
			{ attentionItemId: "attention-id", deliveryType: "digest" },
			expect.objectContaining({
				jobId: "slack-deliver:attention-id:digest",
				attempts: 5,
			}),
		);
	});
});
