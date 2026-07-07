export const GITHUB_QUEUE = "github";
export const SLACK_QUEUE = "slack";

export const GithubJobName = {
	ProcessWebhookEvent: "process-webhook-event",
	ReconcileStalePrs: "reconcile-stale-prs",
} as const;

export const SlackJobName = {
	DeliverAttentionItem: "deliver-attention-item",
	SendDigest: "send-digest",
} as const;

export type GithubJobName = (typeof GithubJobName)[keyof typeof GithubJobName];
export type SlackJobName = (typeof SlackJobName)[keyof typeof SlackJobName];
