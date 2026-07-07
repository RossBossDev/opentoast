import { Injectable } from "@nestjs/common";
import {
	AttentionCategory,
	type StaleReminderCandidate,
} from "../attention/attention.types";

export interface StaleAttentionPolicy {
	staleReviewDurationHours: number;
	reminderCooldownHours: number;
}

@Injectable()
export class StaleAttentionService {
	isEligible(
		candidate: StaleReminderCandidate,
		policy: StaleAttentionPolicy,
		now = new Date(),
	): boolean {
		if (candidate.category !== AttentionCategory.NeedsReview) {
			return false;
		}
		if (candidate.resolvedAt) {
			return false;
		}
		if (candidate.pullRequestState !== "open" || candidate.pullRequestDraft) {
			return false;
		}

		const staleAt = addHours(
			candidate.lastRelevantActivityAt,
			policy.staleReviewDurationHours,
		);
		if (staleAt > now) {
			return false;
		}

		if (!candidate.lastReminderDeliveredAt) {
			return true;
		}

		const cooldownEndsAt = addHours(
			candidate.lastReminderDeliveredAt,
			policy.reminderCooldownHours,
		);
		return cooldownEndsAt <= now;
	}
}

function addHours(date: Date, hours: number): Date {
	return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
