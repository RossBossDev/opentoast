import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import type { Job } from "bullmq";
import { AttentionEngineService } from "../attention/attention-engine.service";
import { GITHUB_QUEUE, GithubJobName } from "../queue/queue.constants";
import { GithubEventStore } from "./github-event-store";
import type { ProcessGithubWebhookEventJob } from "./github-jobs.producer";
import { GithubNormalizer } from "./github-normalizer";
import { GithubPrSnapshotService } from "./github-pr-snapshot.service";

@Processor(GITHUB_QUEUE)
export class GithubJobsProcessor extends WorkerHost {
	constructor(
		@Inject(GithubEventStore)
		private readonly eventStore: GithubEventStore,
		@Inject(GithubPrSnapshotService)
		private readonly snapshots: GithubPrSnapshotService,
		@Inject(GithubNormalizer)
		private readonly normalizer: GithubNormalizer,
		@Inject(AttentionEngineService)
		private readonly attention: AttentionEngineService,
	) {
		super();
	}

	async process(job: Job): Promise<void> {
		switch (job.name) {
			case GithubJobName.ProcessWebhookEvent:
				return this.processWebhookEvent(
					job as Job<ProcessGithubWebhookEventJob>,
				);
			case GithubJobName.ReconcileStalePrs:
				return;
			default:
				throw new Error(`Unknown GitHub job: ${job.name}`);
		}
	}

	private async processWebhookEvent(
		job: Job<ProcessGithubWebhookEventJob>,
	): Promise<void> {
		const event = await this.eventStore.findById(job.data.eventId);
		if (!event) {
			throw new Error(`GitHub event ${job.data.eventId} not found`);
		}

		const snapshot = await this.snapshots.upsertFromPayload(event.payload);
		const facts = this.normalizer.normalize({
			deliveryId: event.deliveryId,
			eventName: event.eventName,
			payload: event.payload,
		});

		await this.attention.processFacts(facts);
		await this.eventStore.markProcessed({
			eventId: event.id,
			installationId: snapshot.installationId,
			repositoryId: snapshot.repositoryId,
		});
	}
}
