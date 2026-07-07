import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import type { Job } from "bullmq";
import { AttentionRepository } from "../attention/attention-repository";
import { SLACK_QUEUE, SlackJobName } from "../queue/queue.constants";
import { SlackDeliveryService } from "./slack-delivery.service";
import type {
	DeliverAttentionItemJob,
	SendDigestJob,
} from "./slack-jobs.producer";
import { SlackJobsProducer } from "./slack-jobs.producer";

@Processor(SLACK_QUEUE)
export class SlackJobsProcessor extends WorkerHost {
	constructor(
		@Inject(AttentionRepository)
		private readonly attention: AttentionRepository,
		@Inject(SlackDeliveryService)
		private readonly delivery: SlackDeliveryService,
		@Inject(SlackJobsProducer)
		private readonly producer: SlackJobsProducer,
	) {
		super();
	}

	async process(job: Job): Promise<void> {
		switch (job.name) {
			case SlackJobName.DeliverAttentionItem:
				return this.deliverAttentionItem(job as Job<DeliverAttentionItemJob>);
			case SlackJobName.SendDigest:
				return this.sendDigest(job as Job<SendDigestJob>);
			default:
				throw new Error(`Unknown Slack job: ${job.name}`);
		}
	}

	private async deliverAttentionItem(
		job: Job<DeliverAttentionItemJob>,
	): Promise<void> {
		const item = await this.attention.findById(job.data.attentionItemId);
		if (!item) {
			throw new Error(`Attention item ${job.data.attentionItemId} not found`);
		}

		const status = await this.delivery.deliverAttentionItem(
			item,
			job.data.deliveryType,
		);
		if (status === "failed") {
			throw new Error(`Slack delivery failed for attention item ${item.id}`);
		}
	}

	private async sendDigest(_job: Job<SendDigestJob>): Promise<void> {
		const groups = await this.attention.listDigestGroupsByGithubUser();
		await Promise.all(
			groups.flatMap((group) =>
				group.items.map((item) =>
					this.producer.enqueueDeliverAttentionItem({
						attentionItemId: item.id,
						deliveryType: "digest",
					}),
				),
			),
		);
	}
}
