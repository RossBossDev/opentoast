import { Injectable } from "@nestjs/common";
import { AttentionCategory } from "../attention/attention.types";

export interface DigestMessageItem {
	id: string;
	category: AttentionCategory;
	repositoryFullName: string;
	pullRequestNumber: number;
	pullRequestTitle: string;
	pullRequestUrl: string;
}

export interface DigestMessage {
	text: string;
	blocks: unknown[];
}

const CATEGORY_ORDER = [
	AttentionCategory.NeedsReview,
	AttentionCategory.WaitingOnResponse,
	AttentionCategory.FailedCi,
	AttentionCategory.WaitingOnOthers,
	AttentionCategory.Mentioned,
	AttentionCategory.NewComments,
	AttentionCategory.StaleReviewRequest,
] as const;

@Injectable()
export class DigestBuilder {
	build(items: DigestMessageItem[]): DigestMessage | undefined {
		if (items.length === 0) {
			return undefined;
		}

		const sections = CATEGORY_ORDER.flatMap((category) => {
			const categoryItems = items.filter((item) => item.category === category);
			if (categoryItems.length === 0) {
				return [];
			}
			return [
				this.headingFor(category),
				...categoryItems.map((item) => this.itemLine(item)),
			];
		});

		const text = ["Good morning 👋", "", ...sections].join("\n");

		return {
			text,
			blocks: [
				{
					type: "section",
					text: { type: "mrkdwn", text },
				},
			],
		};
	}

	private itemLine(item: DigestMessageItem): string {
		const repositoryName = item.repositoryFullName.split("/").at(-1);
		return `• <${item.pullRequestUrl}|${repositoryName} #${item.pullRequestNumber}>`;
	}

	private headingFor(category: AttentionCategory): string {
		switch (category) {
			case AttentionCategory.NeedsReview:
				return "Needs review";
			case AttentionCategory.WaitingOnResponse:
				return "Waiting on response";
			case AttentionCategory.FailedCi:
				return "Failed CI";
			case AttentionCategory.WaitingOnOthers:
				return "Waiting on others";
			case AttentionCategory.Mentioned:
				return "Mentioned";
			case AttentionCategory.NewComments:
				return "New comments";
			case AttentionCategory.StaleReviewRequest:
				return "Stale review requests";
			case AttentionCategory.ClosedOrMerged:
				return "Resolved";
		}
	}
}
