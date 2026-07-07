import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SlackJobsProducer } from "../slack/slack-jobs.producer";

@Injectable()
export class DigestSchedulerService {
	constructor(
		@Inject(SlackJobsProducer) private readonly slackJobs: SlackJobsProducer,
	) {}

	@Cron(process.env.DIGEST_CRON ?? "0 9 * * 1-5", {
		name: "daily-digest",
		timeZone: process.env.DIGEST_TIMEZONE,
	})
	async enqueueDigest(now = new Date()): Promise<void> {
		await this.slackJobs.enqueueSendDigest({ bucket: digestBucket(now) });
	}
}

export function digestBucket(date: Date): string {
	return date.toISOString().slice(0, 10);
}
