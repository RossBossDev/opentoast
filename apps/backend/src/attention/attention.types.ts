import type { GithubNormalizedFact } from "../github/github.types";

export enum AttentionCategory {
	NeedsReview = "needs_review",
	Mentioned = "mentioned",
	NewComments = "new_comments",
	FailedCi = "failed_ci",
	WaitingOnResponse = "waiting_on_response",
	WaitingOnOthers = "waiting_on_others",
	StaleReviewRequest = "stale_review_request",
	ClosedOrMerged = "closed_or_merged",
}

export enum AttentionStatus {
	Active = "active",
	Waiting = "waiting",
	Resolved = "resolved",
}

export interface AttentionItemModel {
	provider: "github";
	installationId?: string;
	repositoryId: string;
	pullRequestId: string;
	githubUserLogin: string;
	category: AttentionCategory;
	status: AttentionStatus;
	reason: string;
	firstSeenAt: Date;
	lastRelevantActivityAt: Date;
	dedupeKey: string;
	updatedAt: Date;
}

export interface AttentionFactContext {
	repositoryId?: string;
	pullRequestId?: string;
	pullRequestAuthorLogin?: string;
	requestedReviewerLogins?: string[];
	knownParticipantLogins?: string[];
}

export interface AttentionClassifierConfig {
	staleReviewRequestAfterMs: number;
}

export type AttentionTransition =
	| {
			kind: "upsert";
			category: AttentionCategory;
			status: AttentionStatus;
			githubUserLogin: string;
			reason: string;
			occurredAt: Date;
			dedupeKey: string;
	  }
	| {
			kind: "resolve";
			category?: AttentionCategory;
			githubUserLogin?: string;
			reason: string;
			occurredAt: Date;
	  }
	| {
			kind: "resolve_pr";
			reason: string;
			occurredAt: Date;
	  };

export interface AttentionRepositoryUpsert {
	repositoryId: string;
	pullRequestId: string;
	githubUserLogin: string;
	category: AttentionCategory;
	status: AttentionStatus;
	reason: string;
	occurredAt: Date;
	dedupeKey: string;
}

export interface AttentionQueryItem {
	id: string;
	pullRequestId: string;
	category: AttentionCategory;
	status: AttentionStatus;
	assigneeGithubUserId: string | null;
	assigneeLogin: string | null;
	reason: string;
	dedupeKey: string;
	detectedAt: Date;
	lastRelevantActivityAt: Date;
	resolvedAt: Date | null;
	updatedAt: Date;
}

export interface AttentionDigestDeliveryItem extends AttentionQueryItem {
	repositoryFullName: string;
	pullRequestNumber: number;
	pullRequestTitle: string;
	pullRequestUrl: string;
}

export interface AttentionDigestGroup {
	githubUserLogin: string;
	items: AttentionDigestDeliveryItem[];
}

export interface StaleReminderCandidate extends AttentionQueryItem {
	pullRequestState: string;
	pullRequestDraft: boolean;
	lastReminderDeliveredAt: Date | null;
}

export interface AttentionFactProcessingResult {
	fact: GithubNormalizedFact;
	transitions: AttentionTransition[];
	applied: boolean;
	reason?: string;
}
