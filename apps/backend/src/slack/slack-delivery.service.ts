import { Inject, Injectable } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import type {
	AttentionDigestDeliveryItem,
	AttentionQueryItem,
} from "../attention/attention.types";
import { KYSELY_DB } from "../database/database.tokens";
import type { Database } from "../database/database.types";
import { DigestBuilder } from "../notifications/digest-builder";
import type { SlackMessageContext } from "./slack.types";
import { SlackHttpClient } from "./slack-http-client";
import { SlackMessageBuilder } from "./slack-message-builder";
import { SlackUserLinkService } from "./slack-user-link.service";

export type SlackDeliveryStatus =
	| "delivered"
	| "duplicate"
	| "skipped_unlinked"
	| "failed";

@Injectable()
export class SlackDeliveryService {
	constructor(
		@Inject(KYSELY_DB) private readonly db: Kysely<Database>,
		@Inject(SlackUserLinkService) private readonly links: SlackUserLinkService,
		@Inject(SlackMessageBuilder) private readonly messages: SlackMessageBuilder,
		@Inject(DigestBuilder) private readonly digests: DigestBuilder,
		@Inject(SlackHttpClient) private readonly slack: SlackHttpClient,
	) {}

	async deliverDigest(params: {
		githubUserLogin: string;
		items: AttentionDigestDeliveryItem[];
		bucket: string;
	}): Promise<SlackDeliveryStatus> {
		const message = this.digests.build(params.items);
		if (!message) {
			return "duplicate";
		}

		const link = await this.links.findByGithubLogin(params.githubUserLogin);
		const dedupeKey = `daily_digest:${params.githubUserLogin}:${params.bucket}`;
		if (!link) {
			await this.recordDelivery({
				dedupeKey,
				deliveryType: "daily_digest",
				status: "skipped_unlinked",
				errorMessage: "No linked Slack user for digest assignee",
			});
			return "skipped_unlinked";
		}

		const inserted = await this.insertPendingDelivery({
			workspaceId: link.workspaceId,
			slackUserPk: link.slackUserPk,
			dedupeKey,
			deliveryType: "daily_digest",
		});
		if (!inserted) {
			return "duplicate";
		}

		try {
			const result = await this.slack.postMessage({
				channel: link.slackUserId,
				...message,
			});
			await this.markDeliveryDelivered(
				dedupeKey,
				result.channel ?? link.slackUserId,
			);
			return "delivered";
		} catch (error) {
			await this.markDeliveryFailed(dedupeKey, error);
			return "failed";
		}
	}

	async deliverAttentionItem(
		item: AttentionQueryItem,
		deliveryType = "dm",
		dedupeBucket = item.updatedAt.toISOString(),
	): Promise<SlackDeliveryStatus> {
		const dedupeKey = `${item.id}:${deliveryType}:${dedupeBucket}`;
		const link = item.assigneeLogin
			? await this.links.findByGithubLogin(item.assigneeLogin)
			: undefined;

		if (!link) {
			await this.recordSkipped(
				item.id,
				dedupeKey,
				deliveryType,
				"No linked Slack user for attention assignee",
			);
			return "skipped_unlinked";
		}

		const inserted = await this.insertPendingDelivery({
			attentionItemId: item.id,
			workspaceId: link.workspaceId,
			slackUserPk: link.slackUserPk,
			dedupeKey,
			deliveryType,
		});
		if (!inserted) {
			return "duplicate";
		}

		try {
			const context = await this.contextForItem(item);
			const message = this.messages.buildAttentionMessage(context);
			const result = await this.slack.postMessage({
				channel: link.slackUserId,
				...message,
			});
			await this.markDeliveryDelivered(
				dedupeKey,
				result.channel ?? link.slackUserId,
			);
			return "delivered";
		} catch (error) {
			await this.markDeliveryFailed(dedupeKey, error);
			return "failed";
		}
	}

	private async contextForItem(
		item: AttentionQueryItem,
	): Promise<SlackMessageContext> {
		const row = await this.db
			.selectFrom("attention_items as ai")
			.innerJoin("pull_requests as pr", "pr.id", "ai.pull_request_id")
			.innerJoin("github_repositories as repo", "repo.id", "pr.repository_id")
			.select([
				"ai.id",
				"ai.attention_type as category",
				"ai.assignee_github_login as assigneeLogin",
				"ai.reason",
				"pr.number",
				"pr.title",
				"pr.html_url as htmlUrl",
				"repo.full_name as repositoryFullName",
			])
			.where("ai.id", "=", item.id)
			.executeTakeFirst();

		if (!row) {
			throw new Error(`Attention item ${item.id} not found`);
		}

		return {
			id: row.id,
			category: row.category as SlackMessageContext["category"],
			assigneeLogin: row.assigneeLogin,
			reason: row.reason,
			pullRequest: {
				number: row.number,
				title: row.title,
				htmlUrl: row.htmlUrl,
				repositoryFullName: row.repositoryFullName,
			},
		};
	}

	private async insertPendingDelivery(params: {
		attentionItemId?: string;
		workspaceId: string;
		slackUserPk: string;
		dedupeKey: string;
		deliveryType: string;
	}): Promise<boolean> {
		const row = await this.db
			.insertInto("deliveries")
			.values({
				attention_item_id: params.attentionItemId ?? null,
				workspace_id: params.workspaceId,
				slack_user_id: params.slackUserPk,
				dedupe_key: params.dedupeKey,
				delivery_type: params.deliveryType,
				status: "pending",
			})
			.onConflict((oc) => oc.column("dedupe_key").doNothing())
			.returning("id")
			.executeTakeFirst();
		return Boolean(row);
	}

	private async recordSkipped(
		attentionItemId: string,
		dedupeKey: string,
		deliveryType: string,
		message: string,
	): Promise<void> {
		await this.recordDelivery({
			attentionItemId,
			dedupeKey,
			deliveryType,
			status: "skipped_unlinked",
			errorMessage: message,
		});
	}

	private async recordDelivery(params: {
		attentionItemId?: string;
		dedupeKey: string;
		deliveryType: string;
		status: string;
		errorMessage?: string;
	}): Promise<void> {
		await this.db
			.insertInto("deliveries")
			.values({
				attention_item_id: params.attentionItemId ?? null,
				dedupe_key: params.dedupeKey,
				delivery_type: params.deliveryType,
				status: params.status,
				error_message: params.errorMessage ?? null,
			})
			.onConflict((oc) => oc.column("dedupe_key").doNothing())
			.execute();
	}

	private async markDeliveryDelivered(
		dedupeKey: string,
		channelId: string,
	): Promise<void> {
		await this.db
			.updateTable("deliveries")
			.set({
				status: "delivered",
				channel_id: channelId,
				delivered_at: new Date(),
				updated_at: sql`now()`,
			})
			.where("dedupe_key", "=", dedupeKey)
			.execute();
	}

	private async markDeliveryFailed(
		dedupeKey: string,
		error: unknown,
	): Promise<void> {
		await this.db
			.updateTable("deliveries")
			.set({
				status: "failed",
				error_message:
					error instanceof Error
						? error.message
						: "Unknown Slack delivery failure",
				updated_at: sql`now()`,
			})
			.where("dedupe_key", "=", dedupeKey)
			.execute();
	}
}
