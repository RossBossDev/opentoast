import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { GITHUB_QUEUE, GithubJobName } from "../queue/queue.constants";

export interface ProcessGithubWebhookEventJob {
	eventId: string;
	deliveryId: string;
}

@Injectable()
export class GithubJobsProducer {
	constructor(@InjectQueue(GITHUB_QUEUE) private readonly queue: Queue) {}

	async enqueueProcessWebhookEvent(
		job: ProcessGithubWebhookEventJob,
	): Promise<void> {
		await this.queue.add(GithubJobName.ProcessWebhookEvent, job, {
			jobId: `github-webhook:${job.eventId}`,
			attempts: 5,
			backoff: { type: "exponential", delay: 5_000 },
			removeOnComplete: 1_000,
			removeOnFail: 5_000,
		});
	}

	async enqueueReconcileStalePrs(bucket: string): Promise<void> {
		await this.queue.add(
			GithubJobName.ReconcileStalePrs,
			{ bucket },
			{
				jobId: `github-reconcile-stale-prs:${bucket}`,
				attempts: 3,
				backoff: { type: "exponential", delay: 30_000 },
				removeOnComplete: 1_000,
				removeOnFail: 5_000,
			},
		);
	}
}
