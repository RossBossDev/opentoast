import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import type { AppConfig } from "../config/app-config";
import { SlackJobsProducer } from "../slack/slack-jobs.producer";

@Injectable()
export class HeartbeatService {
	constructor(
		@Inject(ConfigService)
		private readonly config: ConfigService<AppConfig, true>,
		@Inject(SlackJobsProducer)
		private readonly slackJobs: SlackJobsProducer,
	) {}

	@Cron(process.env.DIGEST_CRON ?? "0 9 * * 1-5")
	async enqueueDigest(): Promise<void> {
		const bucket = this.digestBucket(new Date());
		await this.slackJobs.enqueueSendDigest({ bucket });
	}

	private digestBucket(date: Date): string {
		const baseUrl = this.config.get("APP_BASE_URL");
		return `${baseUrl}:${date.toISOString().slice(0, 10)}`;
	}
}
