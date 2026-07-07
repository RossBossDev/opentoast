import { describe, expect, it } from "vitest";
import { AttentionCategory } from "../attention/attention.types";
import { DigestBuilder, type DigestMessageItem } from "./digest-builder";

describe("DigestBuilder", () => {
	const builder = new DigestBuilder();

	it("omits empty digests", () => {
		expect(builder.build([])).toBeUndefined();
	});

	it("groups categories in stable priority order", () => {
		const message = builder.build([
			item({
				category: AttentionCategory.WaitingOnOthers,
				repo: "acme/search",
				number: 55,
			}),
			item({
				category: AttentionCategory.FailedCi,
				repo: "acme/payments",
				number: 87,
			}),
			item({
				category: AttentionCategory.NeedsReview,
				repo: "acme/api",
				number: 281,
			}),
			item({
				category: AttentionCategory.WaitingOnResponse,
				repo: "acme/frontend",
				number: 412,
			}),
		]);

		expect(message?.text).toBe(
			[
				"Good morning 👋",
				"",
				"Needs review",
				"• <https://github.example/acme/api/pull/281|api #281>",
				"Waiting on response",
				"• <https://github.example/acme/frontend/pull/412|frontend #412>",
				"Failed CI",
				"• <https://github.example/acme/payments/pull/87|payments #87>",
				"Waiting on others",
				"• <https://github.example/acme/search/pull/55|search #55>",
			].join("\n"),
		);
	});
});

function item(params: {
	category: AttentionCategory;
	repo: string;
	number: number;
}): DigestMessageItem {
	return {
		id: `${params.repo}-${params.number}`,
		category: params.category,
		repositoryFullName: params.repo,
		pullRequestNumber: params.number,
		pullRequestTitle: "Example PR",
		pullRequestUrl: `https://github.example/${params.repo}/pull/${params.number}`,
	};
}
