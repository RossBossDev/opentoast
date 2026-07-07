import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { SLACK_QUEUE, SlackJobName } from "../queue/queue.constants";

export interface DeliverAttentionItemJob {
	attentionItemId: string;
	deliveryType?: string;
}

export interface SendDigestJob {
	bucket: string;
}

@Injectable()
export class SlackJobsProducer {
	constructor(@InjectQueue(SLACK_QUEUE) private readonly queue: Queue) {}

	async enqueueDeliverAttentionItem(
		job: DeliverAttentionItemJob,
	): Promise<void> {
		await this.queue.add(SlackJobName.DeliverAttentionItem, job, {
			jobId: `slack-deliver:${job.attentionItemId}:${job.deliveryType ?? "dm"}`,
			attempts: 5,
			backoff: { type: "exponential", delay: 10_000 },
			removeOnComplete: 1_000,
			removeOnFail: 5_000,
		});
	}

	async enqueueSendDigest(job: SendDigestJob): Promise<void> {
		await this.queue.add(SlackJobName.SendDigest, job, {
			jobId: `slack-digest:${job.bucket}`,
			attempts: 3,
			backoff: { type: "exponential", delay: 30_000 },
			removeOnComplete: 1_000,
			removeOnFail: 5_000,
		});
	}
}
