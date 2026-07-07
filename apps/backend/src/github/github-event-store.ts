import { Inject, Injectable } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import { KYSELY_DB } from "../database/database.tokens";
import type { Database } from "../database/database.types";
import type {
	GithubWebhookEventName,
	GithubWebhookPayload,
} from "./github.types";

export interface StoredGithubEvent {
	id: string;
	duplicate: boolean;
}

export interface PersistedGithubEvent {
	id: string;
	deliveryId: string;
	eventName: GithubWebhookEventName;
	payload: GithubWebhookPayload;
	processedAt: Date | null;
}

@Injectable()
export class GithubEventStore {
	constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

	async persistRaw(params: {
		deliveryId: string;
		eventName: GithubWebhookEventName;
		payload: GithubWebhookPayload;
	}): Promise<StoredGithubEvent> {
		const inserted = await this.db
			.insertInto("github_events")
			.values({
				github_delivery_id: params.deliveryId,
				event_name: params.eventName,
				payload: params.payload,
			})
			.onConflict((oc) => oc.column("github_delivery_id").doNothing())
			.returning("id")
			.executeTakeFirst();

		if (inserted) {
			return { id: inserted.id, duplicate: false };
		}

		const existing = await this.db
			.selectFrom("github_events")
			.select("id")
			.where("github_delivery_id", "=", params.deliveryId)
			.executeTakeFirstOrThrow();

		return { id: existing.id, duplicate: true };
	}

	async findById(eventId: string): Promise<PersistedGithubEvent | undefined> {
		const row = await this.db
			.selectFrom("github_events")
			.select([
				"id",
				"github_delivery_id as deliveryId",
				"event_name as eventName",
				"payload",
				"processed_at as processedAt",
			])
			.where("id", "=", eventId)
			.executeTakeFirst();

		if (!row) {
			return undefined;
		}

		return {
			id: row.id,
			deliveryId: row.deliveryId,
			eventName: row.eventName as GithubWebhookEventName,
			payload: row.payload as GithubWebhookPayload,
			processedAt: row.processedAt,
		};
	}

	async markProcessed(params: {
		eventId: string;
		installationId?: string;
		repositoryId?: string;
	}): Promise<void> {
		await this.db
			.updateTable("github_events")
			.set({
				installation_id: params.installationId,
				repository_id: params.repositoryId,
				processed_at: sql`now()`,
			})
			.where("id", "=", params.eventId)
			.execute();
	}
}
