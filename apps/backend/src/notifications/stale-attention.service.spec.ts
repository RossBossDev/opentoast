import { describe, expect, it } from "vitest";
import {
	AttentionCategory,
	AttentionStatus,
	type StaleReminderCandidate,
} from "../attention/attention.types";
import { StaleAttentionService } from "./stale-attention.service";

describe("StaleAttentionService", () => {
	const service = new StaleAttentionService();
	const now = new Date("2026-07-07T12:00:00.000Z");
	const policy = { staleReviewDurationHours: 24, reminderCooldownHours: 12 };

	it("allows active review requests older than stale duration", () => {
		expect(
			service.isEligible(
				candidate({ lastRelevantActivityAt: "2026-07-06T11:00:00.000Z" }),
				policy,
				now,
			),
		).toBe(true);
	});

	it("rejects recently active review requests", () => {
		expect(
			service.isEligible(
				candidate({ lastRelevantActivityAt: "2026-07-06T13:00:00.000Z" }),
				policy,
				now,
			),
		).toBe(false);
	});

	it("respects reminder cooldown", () => {
		expect(
			service.isEligible(
				candidate({
					lastRelevantActivityAt: "2026-07-05T12:00:00.000Z",
					lastReminderDeliveredAt: "2026-07-07T01:00:00.000Z",
				}),
				policy,
				now,
			),
		).toBe(false);

		expect(
			service.isEligible(
				candidate({
					lastRelevantActivityAt: "2026-07-05T12:00:00.000Z",
					lastReminderDeliveredAt: "2026-07-06T23:00:00.000Z",
				}),
				policy,
				now,
			),
		).toBe(true);
	});

	it("ignores resolved, closed, draft, and non-review items", () => {
		expect(
			service.isEligible(candidate({ resolvedAt: now }), policy, now),
		).toBe(false);
		expect(
			service.isEligible(
				candidate({ pullRequestState: "closed" }),
				policy,
				now,
			),
		).toBe(false);
		expect(
			service.isEligible(candidate({ pullRequestDraft: true }), policy, now),
		).toBe(false);
		expect(
			service.isEligible(
				candidate({ category: AttentionCategory.WaitingOnResponse }),
				policy,
				now,
			),
		).toBe(false);
	});
});

function candidate(
	overrides: Partial<
		Omit<
			StaleReminderCandidate,
			| "lastRelevantActivityAt"
			| "lastReminderDeliveredAt"
			| "detectedAt"
			| "updatedAt"
			| "resolvedAt"
		> & {
			lastRelevantActivityAt: string;
			lastReminderDeliveredAt: string | null;
			detectedAt: string;
			updatedAt: string;
			resolvedAt: string | Date | null;
		}
	> = {},
): StaleReminderCandidate {
	return {
		id: "attention-1",
		pullRequestId: "pr-1",
		category: overrides.category ?? AttentionCategory.NeedsReview,
		status: AttentionStatus.Active,
		assigneeGithubUserId: "user-1",
		assigneeLogin: "octo",
		reason: "Review requested",
		dedupeKey: "key",
		detectedAt: new Date(overrides.detectedAt ?? "2026-07-05T12:00:00.000Z"),
		lastRelevantActivityAt: new Date(
			overrides.lastRelevantActivityAt ?? "2026-07-05T12:00:00.000Z",
		),
		resolvedAt: parseNullableDate(overrides.resolvedAt ?? null),
		updatedAt: new Date(overrides.updatedAt ?? "2026-07-05T12:00:00.000Z"),
		pullRequestState: overrides.pullRequestState ?? "open",
		pullRequestDraft: overrides.pullRequestDraft ?? false,
		lastReminderDeliveredAt: parseNullableDate(
			overrides.lastReminderDeliveredAt ?? null,
		),
	};
}

function parseNullableDate(value: string | Date | null): Date | null {
	if (!value) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
}
