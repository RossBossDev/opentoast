import { Injectable } from "@nestjs/common";
import {
	AttentionCategory,
	type AttentionQueryItem,
} from "../attention/attention.types";
import type { SlackMessageContext } from "./slack.types";

@Injectable()
export class SlackMessageBuilder {
	buildAttentionMessage(item: SlackMessageContext): {
		text: string;
		blocks: unknown[];
	} {
		const label = this.labelFor(item.category);
		const prLabel = `${item.pullRequest.repositoryFullName} PR #${item.pullRequest.number}`;
		const text = `${label} — ${prLabel}`;
		return {
			text,
			blocks: [
				{
					type: "section",
					text: { type: "mrkdwn", text: `*${text}*\n${item.reason}` },
				},
				{
					type: "actions",
					elements: [
						{
							type: "button",
							text: { type: "plain_text", text: "View PR" },
							url: item.pullRequest.htmlUrl,
						},
						{
							type: "button",
							text: { type: "plain_text", text: "Acknowledge" },
							value: item.id,
							action_id: "acknowledge_attention_item",
						},
					],
				},
			],
		};
	}

	buildInboxText(items: AttentionQueryItem[]): string {
		if (items.length === 0) {
			return "Your Review Radar inbox is empty.";
		}
		return items
			.map((item) => `• ${this.labelFor(item.category)} — ${item.reason}`)
			.join("\n");
	}

	buildHomeView(items: AttentionQueryItem[]): unknown {
		const blocks =
			items.length === 0
				? [
						{
							type: "section",
							text: { type: "mrkdwn", text: "No active attention items." },
						},
					]
				: this.groupHomeBlocks(items);

		return {
			type: "home",
			blocks: [
				{
					type: "header",
					text: { type: "plain_text", text: "Review Radar Inbox" },
				},
				...blocks,
			],
		};
	}

	private groupHomeBlocks(items: AttentionQueryItem[]): unknown[] {
		const groups = new Map<AttentionCategory, AttentionQueryItem[]>();
		for (const item of items) {
			groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
		}

		return [...groups.entries()].flatMap(([category, group]) => [
			{
				type: "section",
				text: { type: "mrkdwn", text: `*${this.labelFor(category)}*` },
			},
			...group.map((item) => ({
				type: "section",
				text: { type: "mrkdwn", text: `• ${item.reason}` },
			})),
		]);
	}

	private labelFor(category: AttentionCategory): string {
		switch (category) {
			case AttentionCategory.NeedsReview:
				return "Review requested";
			case AttentionCategory.Mentioned:
				return "Mentioned";
			case AttentionCategory.NewComments:
				return "New comments";
			case AttentionCategory.FailedCi:
				return "Checks failed";
			case AttentionCategory.StaleReviewRequest:
				return "Still waiting on your review";
			case AttentionCategory.WaitingOnResponse:
				return "Waiting on your response";
			case AttentionCategory.WaitingOnOthers:
				return "Waiting on others";
			case AttentionCategory.ClosedOrMerged:
				return "Resolved";
		}
	}
}
