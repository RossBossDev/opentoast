import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
	await db.schema
		.alterTable("attention_items")
		.addColumn("assignee_github_login", "text")
		.addColumn("dedupe_key", "text")
		.addColumn("last_relevant_activity_at", "timestamptz")
		.addColumn("acknowledged_at", "timestamptz")
		.execute();

	await db.schema
		.createIndex("attention_items_dedupe_key_unique")
		.on("attention_items")
		.column("dedupe_key")
		.unique()
		.where("dedupe_key", "is not", null)
		.execute();

	await db.schema
		.createIndex("attention_items_assignee_status_idx")
		.on("attention_items")
		.columns(["assignee_github_login", "status"])
		.execute();

	await db.schema
		.createIndex("attention_items_updated_at_idx")
		.on("attention_items")
		.column("updated_at")
		.execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
	await db.schema.dropIndex("attention_items_updated_at_idx").execute();
	await db.schema.dropIndex("attention_items_assignee_status_idx").execute();
	await db.schema.dropIndex("attention_items_dedupe_key_unique").execute();
	await db.schema
		.alterTable("attention_items")
		.dropColumn("acknowledged_at")
		.dropColumn("last_relevant_activity_at")
		.dropColumn("dedupe_key")
		.dropColumn("assignee_github_login")
		.execute();
}
