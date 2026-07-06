import { describe, expect, it } from "vitest";
import type { GithubNormalizedFact } from "../github/github.types";
import { AttentionCategory, AttentionStatus } from "./attention.types";
import { classifyGithubFact } from "./attention-classifier";

const occurredAt = new Date("2026-07-05T12:00:00Z");

function fact(overrides: Partial<GithubNormalizedFact>): GithubNormalizedFact {
	return {
		type: "review_requested",
		deliveryId: "delivery-1",
		eventName: "pull_request",
		repositoryFullName: "org/repo",
		pullRequestNumber: 42,
		occurredAt,
		...overrides,
	};
}

const context = {
	repositoryId: "repo-id",
	pullRequestId: "pr-id",
	pullRequestAuthorLogin: "author",
};

describe("classifyGithubFact", () => {
	it("creates one active review item for a review request", () => {
		const transitions = classifyGithubFact(
			fact({ type: "review_requested", actorLogin: "Reviewer" }),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "upsert",
				category: AttentionCategory.NeedsReview,
				status: AttentionStatus.Active,
				githubUserLogin: "reviewer",
				reason: "Review requested",
			}),
		]);
	});

	it("uses a stable dedupe key for duplicate review request deliveries", () => {
		const first = classifyGithubFact(
			fact({
				deliveryId: "delivery-1",
				type: "review_requested",
				actorLogin: "dev",
			}),
			context,
		);
		const duplicate = classifyGithubFact(
			fact({
				deliveryId: "delivery-2",
				type: "review_requested",
				actorLogin: "dev",
			}),
			context,
		);

		expect(first[0]).toMatchObject({ dedupeKey: duplicate[0]?.dedupeKey });
	});

	it("submitting a review resolves that reviewer's request", () => {
		const transitions = classifyGithubFact(
			fact({ type: "review_submitted", actorLogin: "Reviewer" }),
			context,
		);

		expect(transitions).toContainEqual(
			expect.objectContaining({
				kind: "resolve",
				category: AttentionCategory.NeedsReview,
				githubUserLogin: "reviewer",
			}),
		);
	});

	it("dismissed review reactivates the review request", () => {
		const transitions = classifyGithubFact(
			fact({ type: "review_dismissed", actorLogin: "Reviewer" }),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "upsert",
				category: AttentionCategory.NeedsReview,
				status: AttentionStatus.Active,
				githubUserLogin: "reviewer",
			}),
		]);
	});

	it("failed CI only affects the PR author", () => {
		const transitions = classifyGithubFact(
			fact({
				type: "check_completed",
				actorLogin: "ci-bot",
				checkName: "build",
				checkConclusion: "failure",
			}),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "upsert",
				category: AttentionCategory.FailedCi,
				githubUserLogin: "author",
				reason: "build failed",
			}),
		]);
	});

	it("successful CI resolves failed CI for the PR author", () => {
		const transitions = classifyGithubFact(
			fact({ type: "check_completed", checkConclusion: "success" }),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "resolve",
				category: AttentionCategory.FailedCi,
				githubUserLogin: "author",
			}),
		]);
	});

	it("PR closed resolves all active items for the PR", () => {
		const transitions = classifyGithubFact(
			fact({ type: "pr_closed" }),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "resolve_pr",
				reason: "Pull request was closed",
			}),
		]);
	});

	it("classifies stale review requests when configured duration has passed", () => {
		const oldFact = fact({
			type: "review_requested",
			actorLogin: "Reviewer",
			occurredAt: new Date("2000-01-01T00:00:00Z"),
		});

		const transitions = classifyGithubFact(oldFact, context, {
			staleReviewRequestAfterMs: 1,
		});

		expect(transitions).toContainEqual(
			expect.objectContaining({
				kind: "upsert",
				category: AttentionCategory.StaleReviewRequest,
				githubUserLogin: "reviewer",
			}),
		);
	});

	it("mentions create attention by login without requiring Slack linkage", () => {
		const transitions = classifyGithubFact(
			fact({ type: "mention_detected", mentionedLogins: ["UnlinkedUser"] }),
			context,
		);

		expect(transitions).toEqual([
			expect.objectContaining({
				kind: "upsert",
				category: AttentionCategory.Mentioned,
				githubUserLogin: "unlinkeduser",
			}),
		]);
	});
});
