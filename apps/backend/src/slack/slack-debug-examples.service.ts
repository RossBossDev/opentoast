import { Inject, Injectable } from "@nestjs/common";
import { AttentionCategory } from "../attention/attention.types";
import {
	DigestBuilder,
	type DigestMessageItem,
} from "../notifications/digest-builder";
import type { SlackMessageContext } from "./slack.types";
import { SlackHttpClient } from "./slack-http-client";
import { SlackMessageBuilder } from "./slack-message-builder";

@Injectable()
export class SlackDebugExamplesService {
	constructor(
		@Inject(SlackMessageBuilder) private readonly messages: SlackMessageBuilder,
		@Inject(DigestBuilder) private readonly digests: DigestBuilder,
		@Inject(SlackHttpClient) private readonly slack: SlackHttpClient,
	) {}

	async sendExamplesToSlackUser(slackUserId: string): Promise<number> {
		const messages = [
			this.messages.buildAttentionMessage({
				id: "debug-needs-review",
				category: AttentionCategory.NeedsReview,
				assigneeLogin: "octocat",
				reason: "Sam requested your review on this pull request.",
				pullRequest: {
					number: 281,
					title: "Add webhook retry handling",
					htmlUrl: "https://github.example/acme/api/pull/281",
					repositoryFullName: "acme/api",
				},
			} satisfies SlackMessageContext),
			this.messages.buildAttentionMessage({
				id: "debug-waiting-on-response",
				category: AttentionCategory.WaitingOnResponse,
				assigneeLogin: "octocat",
				reason: "There are reviewer comments waiting for your response.",
				pullRequest: {
					number: 412,
					title: "Refine Slack digest formatting",
					htmlUrl: "https://github.example/acme/frontend/pull/412",
					repositoryFullName: "acme/frontend",
				},
			} satisfies SlackMessageContext),
		];

		const digest = this.digests.build(this.digestItems());
		if (digest) {
			messages.push(digest);
		}

		for (const message of messages) {
			await this.slack.postMessage({
				channel: slackUserId,
				...message,
			});
		}

		return messages.length;
	}

	private digestItems(): DigestMessageItem[] {
		return [
			{
				id: "debug-digest-needs-review",
				category: AttentionCategory.NeedsReview,
				repositoryFullName: "acme/api",
				pullRequestNumber: 281,
				pullRequestTitle: "Add webhook retry handling",
				pullRequestUrl: "https://github.example/acme/api/pull/281",
			},
			{
				id: "debug-digest-waiting-on-response",
				category: AttentionCategory.WaitingOnResponse,
				repositoryFullName: "acme/frontend",
				pullRequestNumber: 412,
				pullRequestTitle: "Refine Slack digest formatting",
				pullRequestUrl: "https://github.example/acme/frontend/pull/412",
			},
			{
				id: "debug-digest-failed-ci",
				category: AttentionCategory.FailedCi,
				repositoryFullName: "acme/payments",
				pullRequestNumber: 87,
				pullRequestTitle: "Update payment reconciliation job",
				pullRequestUrl: "https://github.example/acme/payments/pull/87",
			},
		];
	}
}
