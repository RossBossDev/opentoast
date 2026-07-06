import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
	await db.schema
		.alterTable("slack_users")
		.addColumn("github_login", "text")
		.addColumn("github_user_id", "uuid", (col) =>
			col.references("github_users.id").onDelete("set null"),
		)
		.execute();

	await db.schema
		.createIndex("slack_users_github_login_idx")
		.on("slack_users")
		.column("github_login")
		.execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
	await db.schema.dropIndex("slack_users_github_login_idx").execute();
	await db.schema
		.alterTable("slack_users")
		.dropColumn("github_user_id")
		.dropColumn("github_login")
		.execute();
}
