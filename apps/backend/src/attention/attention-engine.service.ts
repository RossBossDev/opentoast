import { Inject, Injectable } from "@nestjs/common";
import type { GithubNormalizedFact } from "../github/github.types";
import type {
	AttentionClassifierConfig,
	AttentionFactProcessingResult,
	AttentionTransition,
} from "./attention.types";
import {
	classifyGithubFact,
	defaultAttentionClassifierConfig,
} from "./attention-classifier";
import { AttentionRepository } from "./attention-repository";

@Injectable()
export class AttentionEngineService {
	constructor(
		@Inject(AttentionRepository)
		private readonly repository: AttentionRepository,
	) {}

	async processFacts(
		facts: GithubNormalizedFact[],
		config: AttentionClassifierConfig = defaultAttentionClassifierConfig,
	): Promise<AttentionFactProcessingResult[]> {
		const results: AttentionFactProcessingResult[] = [];
		for (const fact of facts) {
			const context = await this.repository.contextForFact(fact);
			if (!context.repositoryId || !context.pullRequestId) {
				results.push({
					fact,
					transitions: [],
					applied: false,
					reason: "No persisted pull request context",
				});
				continue;
			}

			const transitions = classifyGithubFact(fact, context, config);
			for (const transition of transitions) {
				await this.applyTransition(transition, {
					repositoryId: context.repositoryId,
					pullRequestId: context.pullRequestId,
				});
			}

			results.push({
				fact,
				transitions,
				applied: transitions.length > 0,
			});
		}
		return results;
	}

	listActiveItemsByGithubUser(githubUserLogin: string) {
		return this.repository.listActiveByGithubUser(githubUserLogin);
	}

	listDigestGroupsByGithubUser() {
		return this.repository.listDigestGroupsByGithubUser();
	}

	listChangedItemsSince(since: Date) {
		return this.repository.listChangedSince(since);
	}

	acknowledgeItem(params: {
		attentionItemId: string;
		githubUserLogin?: string;
		occurredAt?: Date;
	}) {
		return this.repository.acknowledge(params);
	}

	private async applyTransition(
		transition: AttentionTransition,
		context: { repositoryId: string; pullRequestId: string },
	): Promise<void> {
		switch (transition.kind) {
			case "upsert":
				await this.repository.upsertActive({
					repositoryId: context.repositoryId,
					pullRequestId: context.pullRequestId,
					githubUserLogin: transition.githubUserLogin,
					category: transition.category,
					status: transition.status,
					reason: transition.reason,
					occurredAt: transition.occurredAt,
					dedupeKey: transition.dedupeKey,
				});
				break;
			case "resolve":
				await this.repository.resolve({
					pullRequestId: context.pullRequestId,
					category: transition.category,
					githubUserLogin: transition.githubUserLogin,
					reason: transition.reason,
					occurredAt: transition.occurredAt,
				});
				break;
			case "resolve_pr":
				await this.repository.resolve({
					pullRequestId: context.pullRequestId,
					reason: transition.reason,
					occurredAt: transition.occurredAt,
				});
				break;
		}
	}
}
