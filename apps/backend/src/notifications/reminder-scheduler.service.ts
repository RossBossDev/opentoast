import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { AttentionRepository } from "../attention/attention-repository";
import type { AppConfig } from "../config/app-config";
import { SlackDeliveryService } from "../slack/slack-delivery.service";
import { StaleAttentionService } from "./stale-attention.service";

@Injectable()
export class ReminderSchedulerService {
	constructor(
		@Inject(ConfigService)
		private readonly config: ConfigService<AppConfig, true>,
		@Inject(AttentionRepository)
		private readonly attention: AttentionRepository,
		@Inject(SlackDeliveryService)
		private readonly delivery: SlackDeliveryService,
		@Inject(StaleAttentionService)
		private readonly staleAttention: StaleAttentionService,
	) {}

	@Cron(process.env.REMINDER_CRON ?? "0 * * * *", {
		name: "stale-review-reminders",
		timeZone: process.env.DIGEST_TIMEZONE,
	})
	async sendStaleReminders(now = new Date()): Promise<void> {
		const policy = {
			staleReviewDurationHours: this.config.get("STALE_REVIEW_DURATION_HOURS", {
				infer: true,
			}),
			reminderCooldownHours: this.config.get("REMINDER_COOLDOWN_HOURS", {
				infer: true,
			}),
		};
		const candidates = await this.attention.listStaleReminderCandidates();
		const eligible = candidates.filter((candidate) =>
			this.staleAttention.isEligible(candidate, policy, now),
		);
		const bucket = reminderBucket(now);
		await Promise.all(
			eligible.map((item) =>
				this.delivery.deliverAttentionItem(item, "stale_reminder", bucket),
			),
		);
	}
}

export function reminderBucket(date: Date): string {
	return date.toISOString().slice(0, 13);
}
