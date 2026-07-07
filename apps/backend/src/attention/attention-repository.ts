import { Inject, Injectable } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import { KYSELY_DB } from "../database/database.tokens";
import type { Database } from "../database/database.types";
import type { GithubNormalizedFact } from "../github/github.types";
import {
	AttentionCategory,
	type AttentionDigestGroup,
	type AttentionFactContext,
	type AttentionQueryItem,
	type AttentionRepositoryUpsert,
	AttentionStatus,
} from "./attention.types";

@Injectable()
export class AttentionRepository {
	constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

	async contextForFact(
		fact: GithubNormalizedFact,
	): Promise<AttentionFactContext> {
		if (!fact.repositoryFullName || !fact.pullRequestNumber) {
			return {};
		}

		const row = await this.db
			.selectFrom("pull_requests as pr")
			.innerJoin("github_repositories as repo", "repo.id", "pr.repository_id")
			.leftJoin(
				"github_users as author",
				"author.id",
				"pr.author_github_user_id",
			)
			.select([
				"repo.id as repositoryId",
				"pr.id as pullRequestId",
				"author.login as pullRequestAuthorLogin",
			])
			.where("repo.full_name", "=", fact.repositoryFullName)
			.where("pr.number", "=", fact.pullRequestNumber)
			.executeTakeFirst();

		if (!row) {
			return {};
		}

		const requestedReviewers = await this.db
			.selectFrom("pull_request_participants as participant")
			.innerJoin(
				"github_users as user",
				"user.id",
				"participant.github_user_id",
			)
			.select("user.login")
			.where("participant.pull_request_id", "=", row.pullRequestId)
			.where("participant.role", "=", "requested_reviewer")
			.execute();

		return {
			repositoryId: row.repositoryId,
			pullRequestId: row.pullRequestId,
			pullRequestAuthorLogin: row.pullRequestAuthorLogin ?? undefined,
			requestedReviewerLogins: requestedReviewers.map((reviewer) =>
				reviewer.login.toLowerCase(),
			),
		};
	}

	async upsertActive(params: AttentionRepositoryUpsert): Promise<void> {
		const assigneeUser = await this.findGithubUserByLogin(
			params.githubUserLogin,
		);
		await this.db
			.insertInto("attention_items")
			.values({
				pull_request_id: params.pullRequestId,
				attention_type: params.category,
				assignee_github_user_id: assigneeUser?.id ?? null,
				assignee_github_login: params.githubUserLogin.toLowerCase(),
				reason: params.reason,
				status: params.status,
				detected_at: params.occurredAt,
				last_relevant_activity_at: params.occurredAt,
				resolved_at: null,
				acknowledged_at: null,
				dedupe_key: params.dedupeKey,
			})
			.onConflict((oc) =>
				oc.column("dedupe_key").doUpdateSet({
					assignee_github_user_id: assigneeUser?.id ?? null,
					assignee_github_login: params.githubUserLogin.toLowerCase(),
					reason: params.reason,
					status: params.status,
					last_relevant_activity_at: params.occurredAt,
					resolved_at: null,
					updated_at: sql`now()`,
				}),
			)
			.execute();
	}

	async resolve(params: {
		pullRequestId: string;
		category?: AttentionCategory;
		githubUserLogin?: string;
		reason: string;
		occurredAt: Date;
	}): Promise<void> {
		let query = this.db
			.updateTable("attention_items")
			.set({
				status: AttentionStatus.Resolved,
				reason: params.reason,
				resolved_at: params.occurredAt,
				last_relevant_activity_at: params.occurredAt,
				updated_at: sql`now()`,
			})
			.where("pull_request_id", "=", params.pullRequestId)
			.where("status", "!=", AttentionStatus.Resolved);

		if (params.category) {
			query = query.where("attention_type", "=", params.category);
		}
		if (params.githubUserLogin) {
			query = query.where(
				"assignee_github_login",
				"=",
				params.githubUserLogin.toLowerCase(),
			);
		}

		await query.execute();
	}

	async acknowledge(params: {
		attentionItemId: string;
		githubUserLogin?: string;
		occurredAt?: Date;
	}): Promise<void> {
		let query = this.db
			.updateTable("attention_items")
			.set({
				status: AttentionStatus.Resolved,
				resolved_at: params.occurredAt ?? new Date(),
				acknowledged_at: params.occurredAt ?? new Date(),
				updated_at: sql`now()`,
			})
			.where("id", "=", params.attentionItemId)
			.where("attention_type", "in", [
				AttentionCategory.Mentioned,
				AttentionCategory.NewComments,
			]);

		if (params.githubUserLogin) {
			query = query.where(
				"assignee_github_login",
				"=",
				params.githubUserLogin.toLowerCase(),
			);
		}

		await query.execute();
	}

	async findById(
		attentionItemId: string,
	): Promise<AttentionQueryItem | undefined> {
		const row = await this.baseQuery()
			.where("attention_items.id", "=", attentionItemId)
			.executeTakeFirst();
		return row ? toAttentionQueryItem(row) : undefined;
	}

	async listActiveByGithubUser(
		githubUserLogin: string,
	): Promise<AttentionQueryItem[]> {
		const rows = await this.baseQuery()
			.where(
				"attention_items.assignee_github_login",
				"=",
				githubUserLogin.toLowerCase(),
			)
			.where("attention_items.status", "in", [
				AttentionStatus.Active,
				AttentionStatus.Waiting,
			])
			.orderBy("attention_items.last_relevant_activity_at", "desc")
			.execute();
		return rows.map(toAttentionQueryItem);
	}

	async listDigestGroupsByGithubUser(): Promise<AttentionDigestGroup[]> {
		const rows = await this.baseQuery()
			.where("attention_items.status", "in", [
				AttentionStatus.Active,
				AttentionStatus.Waiting,
			])
			.where("attention_items.assignee_github_login", "is not", null)
			.orderBy("attention_items.assignee_github_login", "asc")
			.orderBy("attention_items.last_relevant_activity_at", "desc")
			.execute();

		const groups = new Map<string, AttentionQueryItem[]>();
		for (const row of rows) {
			const login = row.assigneeLogin;
			if (!login) {
				continue;
			}
			groups.set(login, [
				...(groups.get(login) ?? []),
				toAttentionQueryItem(row),
			]);
		}

		return [...groups.entries()].map(([githubUserLogin, items]) => ({
			githubUserLogin,
			items,
		}));
	}

	async listChangedSince(since: Date): Promise<AttentionQueryItem[]> {
		const rows = await this.baseQuery()
			.where("attention_items.updated_at", ">=", since)
			.orderBy("attention_items.updated_at", "asc")
			.execute();
		return rows.map(toAttentionQueryItem);
	}

	private async findGithubUserByLogin(
		login: string,
	): Promise<{ id: string } | undefined> {
		return this.db
			.selectFrom("github_users")
			.select("id")
			.where("login", "=", login)
			.executeTakeFirst();
	}

	private baseQuery() {
		return this.db
			.selectFrom("attention_items")
			.select([
				"attention_items.id",
				"attention_items.pull_request_id as pullRequestId",
				"attention_items.attention_type as category",
				"attention_items.status",
				"attention_items.assignee_github_user_id as assigneeGithubUserId",
				"attention_items.assignee_github_login as assigneeLogin",
				"attention_items.reason",
				"attention_items.dedupe_key as dedupeKey",
				"attention_items.detected_at as detectedAt",
				"attention_items.last_relevant_activity_at as lastRelevantActivityAt",
				"attention_items.resolved_at as resolvedAt",
				"attention_items.updated_at as updatedAt",
			]);
	}
}

function toAttentionQueryItem(row: {
	id: string;
	pullRequestId: string;
	category: string;
	status: string;
	assigneeGithubUserId: string | null;
	assigneeLogin: string | null;
	reason: string;
	dedupeKey: string | null;
	detectedAt: Date;
	lastRelevantActivityAt: Date | null;
	resolvedAt: Date | null;
	updatedAt: Date;
}): AttentionQueryItem {
	return {
		id: row.id,
		pullRequestId: row.pullRequestId,
		category: row.category as AttentionCategory,
		status: row.status as AttentionStatus,
		assigneeGithubUserId: row.assigneeGithubUserId,
		assigneeLogin: row.assigneeLogin,
		reason: row.reason,
		dedupeKey: row.dedupeKey ?? "",
		detectedAt: row.detectedAt,
		lastRelevantActivityAt: row.lastRelevantActivityAt ?? row.detectedAt,
		resolvedAt: row.resolvedAt,
		updatedAt: row.updatedAt,
	};
}
