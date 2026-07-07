import { describe, expect, it } from "vitest";
import {
	AttentionCategory,
	AttentionStatus,
} from "../attention/attention.types";
import { SlackMessageBuilder } from "./slack-message-builder";

describe("SlackMessageBuilder", () => {
	const builder = new SlackMessageBuilder();

	it.each([
		[AttentionCategory.NeedsReview, "Review requested"],
		[AttentionCategory.Mentioned, "Mentioned"],
		[AttentionCategory.NewComments, "New comments"],
		[AttentionCategory.FailedCi, "Checks failed"],
		[AttentionCategory.StaleReviewRequest, "Still waiting on your review"],
	])("formats concise text for %s", (category, expected) => {
		const message = builder.buildAttentionMessage({
			id: "attention-1",
			category,
			assigneeLogin: "octo",
			reason: "John requested your review",
			pullRequest: {
				number: 413,
				title: "Improve payments",
				htmlUrl: "https://github.example/pr/413",
				repositoryFullName: "acme/payments-api",
			},
		});

		expect(message.text).toBe(`${expected} — acme/payments-api PR #413`);
		expect(JSON.stringify(message.blocks)).toContain("View PR");
	});

	it("formats an empty inbox", () => {
		expect(builder.buildInboxText([])).toBe(
			"Your Review Radar inbox is empty.",
		);
	});

	it("formats inbox items", () => {
		expect(
			builder.buildInboxText([
				{
					id: "attention-1",
					pullRequestId: "pr-1",
					category: AttentionCategory.NewComments,
					status: AttentionStatus.Active,
					assigneeGithubUserId: null,
					assigneeLogin: "octo",
					reason: "2 new comments",
					dedupeKey: "key",
					detectedAt: new Date(),
					lastRelevantActivityAt: new Date(),
					resolvedAt: null,
					updatedAt: new Date(),
				},
			]),
		).toContain("New comments — 2 new comments");
	});
});
