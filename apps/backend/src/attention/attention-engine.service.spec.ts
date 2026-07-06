import { describe, expect, it, vi } from "vitest";
import type { GithubNormalizedFact } from "../github/github.types";
import { AttentionCategory, AttentionStatus } from "./attention.types";
import { AttentionEngineService } from "./attention-engine.service";

const baseFact: GithubNormalizedFact = {
	type: "review_requested",
	deliveryId: "delivery-1",
	eventName: "pull_request",
	repositoryFullName: "org/repo",
	pullRequestNumber: 1,
	actorLogin: "reviewer",
	occurredAt: new Date("2026-07-05T12:00:00Z"),
};

describe("AttentionEngineService", () => {
	it("applies classified transitions through the repository", async () => {
		const repository = {
			contextForFact: vi.fn().mockResolvedValue({
				repositoryId: "repo-id",
				pullRequestId: "pr-id",
				pullRequestAuthorLogin: "author",
			}),
			upsertActive: vi.fn(),
			resolve: vi.fn(),
		};
		const service = new AttentionEngineService(repository as never);

		const results = await service.processFacts([baseFact]);

		expect(results).toMatchObject([{ applied: true }]);
		expect(repository.upsertActive).toHaveBeenCalledWith(
			expect.objectContaining({
				repositoryId: "repo-id",
				pullRequestId: "pr-id",
				githubUserLogin: "reviewer",
				category: AttentionCategory.NeedsReview,
				status: AttentionStatus.Active,
			}),
		);
	});

	it("skips facts that do not have persisted pull request context", async () => {
		const repository = {
			contextForFact: vi.fn().mockResolvedValue({}),
			upsertActive: vi.fn(),
			resolve: vi.fn(),
		};
		const service = new AttentionEngineService(repository as never);

		const results = await service.processFacts([baseFact]);

		expect(results).toEqual([
			expect.objectContaining({
				applied: false,
				reason: "No persisted pull request context",
			}),
		]);
		expect(repository.upsertActive).not.toHaveBeenCalled();
	});
});
