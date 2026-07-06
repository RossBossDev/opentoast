import { Inject, Injectable } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import type { AttentionQueryItem } from "../attention/attention.types";
import { KYSELY_DB } from "../database/database.tokens";
import type { Database } from "../database/database.types";
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
		@Inject(SlackHttpClient) private readonly slack: SlackHttpClient,
	) {}

	async deliverAttentionItem(
		item: AttentionQueryItem,
		deliveryType = "dm",
	): Promise<SlackDeliveryStatus> {
		const dedupeKey = `${item.id}:${deliveryType}:${item.updatedAt.toISOString()}`;
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
			await this.db
				.updateTable("deliveries")
				.set({
					status: "delivered",
					channel_id: result.channel ?? link.slackUserId,
					delivered_at: new Date(),
					updated_at: sql`now()`,
				})
				.where("dedupe_key", "=", dedupeKey)
				.execute();
			return "delivered";
		} catch (error) {
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
		attentionItemId: string;
		workspaceId: string;
		slackUserPk: string;
		dedupeKey: string;
		deliveryType: string;
	}): Promise<boolean> {
		const row = await this.db
			.insertInto("deliveries")
			.values({
				attention_item_id: params.attentionItemId,
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
		await this.db
			.insertInto("deliveries")
			.values({
				attention_item_id: attentionItemId,
				dedupe_key: dedupeKey,
				delivery_type: deliveryType,
				status: "skipped_unlinked",
				error_message: message,
			})
			.onConflict((oc) => oc.column("dedupe_key").doNothing())
			.execute();
	}
}
