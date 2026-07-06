import type { GithubNormalizedFact } from "../github/github.types";
import {
	AttentionCategory,
	type AttentionClassifierConfig,
	type AttentionFactContext,
	AttentionStatus,
	type AttentionTransition,
} from "./attention.types";

const DEFAULT_STALE_AFTER_MS = 72 * 60 * 60 * 1000;

export const defaultAttentionClassifierConfig: AttentionClassifierConfig = {
	staleReviewRequestAfterMs: DEFAULT_STALE_AFTER_MS,
};

export function classifyGithubFact(
	fact: GithubNormalizedFact,
	context: AttentionFactContext,
	config: AttentionClassifierConfig = defaultAttentionClassifierConfig,
): AttentionTransition[] {
	if (!context.pullRequestId) {
		return [];
	}

	switch (fact.type) {
		case "review_requested":
			return classifyReviewRequested(fact, config);
		case "review_submitted":
			return classifyReviewSubmitted(fact, context);
		case "review_dismissed":
			return classifyReviewDismissed(fact);
		case "comment_created":
			return classifyCommentCreated(fact, context);
		case "mention_detected":
			return classifyMention(fact);
		case "check_completed":
			return classifyCheckCompleted(fact, context);
		case "pr_closed":
		case "pr_merged":
			return [
				{
					kind: "resolve_pr",
					reason:
						fact.type === "pr_merged"
							? "Pull request was merged"
							: "Pull request was closed",
					occurredAt: fact.occurredAt,
				},
			];
		default:
			return [];
	}
}

function classifyReviewRequested(
	fact: GithubNormalizedFact,
	config: AttentionClassifierConfig,
): AttentionTransition[] {
	const reviewerLogin = fact.actorLogin?.toLowerCase();
	if (!reviewerLogin) {
		return [];
	}

	const transitions: AttentionTransition[] = [
		{
			kind: "upsert",
			category: AttentionCategory.NeedsReview,
			status: AttentionStatus.Active,
			githubUserLogin: reviewerLogin,
			reason: "Review requested",
			occurredAt: fact.occurredAt,
			dedupeKey: dedupeKey(fact, AttentionCategory.NeedsReview, reviewerLogin),
		},
	];

	if (isStale(fact.occurredAt, new Date(), config.staleReviewRequestAfterMs)) {
		transitions.push({
			kind: "upsert",
			category: AttentionCategory.StaleReviewRequest,
			status: AttentionStatus.Active,
			githubUserLogin: reviewerLogin,
			reason: "Review request is stale",
			occurredAt: fact.occurredAt,
			dedupeKey: dedupeKey(
				fact,
				AttentionCategory.StaleReviewRequest,
				reviewerLogin,
			),
		});
	}

	return transitions;
}

function classifyReviewSubmitted(
	fact: GithubNormalizedFact,
	context: AttentionFactContext,
): AttentionTransition[] {
	const reviewerLogin = fact.actorLogin?.toLowerCase();
	const transitions: AttentionTransition[] = [];
	if (reviewerLogin) {
		transitions.push({
			kind: "resolve",
			category: AttentionCategory.NeedsReview,
			githubUserLogin: reviewerLogin,
			reason: "Review submitted",
			occurredAt: fact.occurredAt,
		});
		transitions.push({
			kind: "resolve",
			category: AttentionCategory.StaleReviewRequest,
			githubUserLogin: reviewerLogin,
			reason: "Review submitted",
			occurredAt: fact.occurredAt,
		});
	}

	if (context.pullRequestAuthorLogin) {
		transitions.push({
			kind: "upsert",
			category: AttentionCategory.WaitingOnResponse,
			status: AttentionStatus.Waiting,
			githubUserLogin: reviewerLogin ?? context.pullRequestAuthorLogin,
			reason: "Reviewer is waiting on author response",
			occurredAt: fact.occurredAt,
			dedupeKey: dedupeKey(
				fact,
				AttentionCategory.WaitingOnResponse,
				reviewerLogin ?? context.pullRequestAuthorLogin,
			),
		});
	}

	return transitions;
}

function classifyReviewDismissed(
	fact: GithubNormalizedFact,
): AttentionTransition[] {
	const reviewerLogin = fact.actorLogin?.toLowerCase();
	if (!reviewerLogin) {
		return [];
	}
	return [
		{
			kind: "upsert",
			category: AttentionCategory.NeedsReview,
			status: AttentionStatus.Active,
			githubUserLogin: reviewerLogin,
			reason: "Review was dismissed",
			occurredAt: fact.occurredAt,
			dedupeKey: dedupeKey(fact, AttentionCategory.NeedsReview, reviewerLogin),
		},
	];
}

function classifyCommentCreated(
	fact: GithubNormalizedFact,
	context: AttentionFactContext,
): AttentionTransition[] {
	const authorLogin = context.pullRequestAuthorLogin?.toLowerCase();
	if (!authorLogin || fact.actorLogin?.toLowerCase() === authorLogin) {
		return [];
	}
	return [
		{
			kind: "upsert",
			category: AttentionCategory.NewComments,
			status: AttentionStatus.Active,
			githubUserLogin: authorLogin,
			reason: "New comment on your pull request",
			occurredAt: fact.occurredAt,
			dedupeKey: dedupeKey(
				fact,
				AttentionCategory.NewComments,
				authorLogin,
				fact.subjectId,
			),
		},
	];
}

function classifyMention(fact: GithubNormalizedFact): AttentionTransition[] {
	return [...new Set(fact.mentionedLogins ?? [])].map((login) => ({
		kind: "upsert" as const,
		category: AttentionCategory.Mentioned,
		status: AttentionStatus.Active,
		githubUserLogin: login.toLowerCase(),
		reason: "Mentioned on pull request",
		occurredAt: fact.occurredAt,
		dedupeKey: dedupeKey(
			fact,
			AttentionCategory.Mentioned,
			login.toLowerCase(),
			fact.subjectId,
		),
	}));
}

function classifyCheckCompleted(
	fact: GithubNormalizedFact,
	context: AttentionFactContext,
): AttentionTransition[] {
	const authorLogin = context.pullRequestAuthorLogin?.toLowerCase();
	if (!authorLogin) {
		return [];
	}
	if (isFailedCheck(fact.checkConclusion)) {
		return [
			{
				kind: "upsert",
				category: AttentionCategory.FailedCi,
				status: AttentionStatus.Active,
				githubUserLogin: authorLogin,
				reason: `${fact.checkName ?? "Checks"} failed`,
				occurredAt: fact.occurredAt,
				dedupeKey: dedupeKey(fact, AttentionCategory.FailedCi, authorLogin),
			},
		];
	}
	if (fact.checkConclusion === "success") {
		return [
			{
				kind: "resolve",
				category: AttentionCategory.FailedCi,
				githubUserLogin: authorLogin,
				reason: "Checks passed",
				occurredAt: fact.occurredAt,
			},
		];
	}
	return [];
}

function dedupeKey(
	fact: GithubNormalizedFact,
	category: AttentionCategory,
	login: string,
	subjectId?: string,
): string {
	return [
		"github",
		fact.repositoryFullName ?? "unknown-repo",
		fact.pullRequestNumber ?? "unknown-pr",
		category,
		login,
		subjectId ?? "default",
	].join(":");
}

function isFailedCheck(conclusion: string | null | undefined): boolean {
	return ["failure", "timed_out", "cancelled", "action_required"].includes(
		conclusion ?? "",
	);
}

function isStale(firstSeenAt: Date, now: Date, staleAfterMs: number): boolean {
	return now.getTime() - firstSeenAt.getTime() >= staleAfterMs;
}
