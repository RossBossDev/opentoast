import { Inject, Injectable } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import { KYSELY_DB } from "../database/database.tokens";
import type { Database } from "../database/database.types";
import type { SlackCommandPayload, SlackUserLink } from "./slack.types";

@Injectable()
export class SlackUserLinkService {
	constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

	async link(
		command: SlackCommandPayload,
		githubLogin: string,
	): Promise<SlackUserLink> {
		const workspace = await this.upsertWorkspace(command);
		const githubUser = await this.db
			.selectFrom("github_users")
			.select("id")
			.where("login", "=", githubLogin.toLowerCase())
			.executeTakeFirst();

		const row = await this.db
			.insertInto("slack_users")
			.values({
				workspace_id: workspace.id,
				slack_user_id: command.user_id,
				name: command.user_name ?? null,
				github_login: githubLogin.toLowerCase(),
				github_user_id: githubUser?.id ?? null,
			})
			.onConflict((oc) =>
				oc.columns(["workspace_id", "slack_user_id"]).doUpdateSet({
					name: command.user_name ?? null,
					github_login: githubLogin.toLowerCase(),
					github_user_id: githubUser?.id ?? null,
					updated_at: sql`now()`,
				}),
			)
			.returning(["id", "slack_user_id", "github_login", "github_user_id"])
			.executeTakeFirstOrThrow();

		return {
			workspaceId: workspace.id,
			slackUserPk: row.id,
			slackTeamId: command.team_id,
			slackUserId: row.slack_user_id,
			githubLogin: row.github_login ?? githubLogin.toLowerCase(),
			githubUserId: row.github_user_id,
		};
	}

	async unlink(command: SlackCommandPayload): Promise<boolean> {
		const workspace = await this.findWorkspace(command.team_id);
		if (!workspace) {
			return false;
		}
		const result = await this.db
			.updateTable("slack_users")
			.set({ github_login: null, github_user_id: null, updated_at: sql`now()` })
			.where("workspace_id", "=", workspace.id)
			.where("slack_user_id", "=", command.user_id)
			.executeTakeFirst();
		return Number(result.numUpdatedRows) > 0;
	}

	async findBySlackUser(
		teamId: string,
		slackUserId: string,
	): Promise<SlackUserLink | undefined> {
		const row = await this.db
			.selectFrom("slack_users as su")
			.innerJoin("slack_workspaces as sw", "sw.id", "su.workspace_id")
			.select([
				"sw.id as workspaceId",
				"sw.slack_team_id as slackTeamId",
				"su.id as slackUserPk",
				"su.slack_user_id as slackUserId",
				"su.github_login as githubLogin",
				"su.github_user_id as githubUserId",
			])
			.where("sw.slack_team_id", "=", teamId)
			.where("su.slack_user_id", "=", slackUserId)
			.where("su.github_login", "is not", null)
			.executeTakeFirst();

		if (!row?.githubLogin) {
			return undefined;
		}
		return { ...row, githubLogin: row.githubLogin };
	}

	async findByGithubLogin(
		githubLogin: string,
	): Promise<SlackUserLink | undefined> {
		const row = await this.db
			.selectFrom("slack_users as su")
			.innerJoin("slack_workspaces as sw", "sw.id", "su.workspace_id")
			.select([
				"sw.id as workspaceId",
				"sw.slack_team_id as slackTeamId",
				"su.id as slackUserPk",
				"su.slack_user_id as slackUserId",
				"su.github_login as githubLogin",
				"su.github_user_id as githubUserId",
			])
			.where("su.github_login", "=", githubLogin.toLowerCase())
			.executeTakeFirst();
		if (!row?.githubLogin) {
			return undefined;
		}
		return { ...row, githubLogin: row.githubLogin };
	}

	private async upsertWorkspace(
		command: SlackCommandPayload,
	): Promise<{ id: string }> {
		return this.db
			.insertInto("slack_workspaces")
			.values({
				slack_team_id: command.team_id,
				name: command.team_domain ?? null,
			})
			.onConflict((oc) =>
				oc.column("slack_team_id").doUpdateSet({
					name: command.team_domain ?? null,
					updated_at: sql`now()`,
				}),
			)
			.returning("id")
			.executeTakeFirstOrThrow();
	}

	private async findWorkspace(
		teamId: string,
	): Promise<{ id: string } | undefined> {
		return this.db
			.selectFrom("slack_workspaces")
			.select("id")
			.where("slack_team_id", "=", teamId)
			.executeTakeFirst();
	}
}
