import type {
	ColumnType,
	Generated,
	Insertable,
	Selectable,
	Updateable,
} from "kysely";

export type Timestamp = ColumnType<
	Date,
	Date | string | undefined,
	Date | string
>;

export interface GithubInstallationsTable {
	id: Generated<string>;
	github_installation_id: string;
	account_login: string | null;
	account_type: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface GithubRepositoriesTable {
	id: Generated<string>;
	github_repository_id: string;
	installation_id: string;
	owner: string;
	name: string;
	full_name: string;
	default_branch: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface GithubUsersTable {
	id: Generated<string>;
	github_user_id: string;
	login: string;
	name: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface SlackWorkspacesTable {
	id: Generated<string>;
	slack_team_id: string;
	name: string | null;
	bot_user_id: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface SlackUsersTable {
	id: Generated<string>;
	workspace_id: string;
	slack_user_id: string;
	name: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface WorkspaceLinksTable {
	id: Generated<string>;
	installation_id: string;
	workspace_id: string;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface PullRequestsTable {
	id: Generated<string>;
	repository_id: string;
	github_pull_request_id: string;
	number: number;
	title: string;
	author_github_user_id: string | null;
	state: string;
	draft: boolean;
	html_url: string;
	created_at: Timestamp;
	updated_at: Timestamp;
	merged_at: Timestamp | null;
	closed_at: Timestamp | null;
}

export interface PullRequestParticipantsTable {
	id: Generated<string>;
	pull_request_id: string;
	github_user_id: string;
	role: string;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface GithubEventsTable {
	id: Generated<string>;
	github_delivery_id: string;
	event_name: string;
	installation_id: string | null;
	repository_id: string | null;
	payload: unknown;
	received_at: Timestamp;
	processed_at: Timestamp | null;
}

export interface AttentionItemsTable {
	id: Generated<string>;
	pull_request_id: string;
	attention_type: string;
	assignee_github_user_id: string | null;
	assignee_github_login: string | null;
	reason: string;
	status: string;
	detected_at: Timestamp;
	last_relevant_activity_at: Timestamp | null;
	resolved_at: Timestamp | null;
	acknowledged_at: Timestamp | null;
	dedupe_key: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface DeliveriesTable {
	id: Generated<string>;
	attention_item_id: string | null;
	workspace_id: string | null;
	slack_user_id: string | null;
	channel_id: string | null;
	dedupe_key: string;
	delivery_type: string;
	status: string;
	error_message: string | null;
	delivered_at: Timestamp | null;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface AppSettingsTable {
	key: string;
	value: unknown;
	created_at: Timestamp;
	updated_at: Timestamp;
}

export interface Database {
	github_installations: GithubInstallationsTable;
	github_repositories: GithubRepositoriesTable;
	github_users: GithubUsersTable;
	slack_workspaces: SlackWorkspacesTable;
	slack_users: SlackUsersTable;
	workspace_links: WorkspaceLinksTable;
	pull_requests: PullRequestsTable;
	pull_request_participants: PullRequestParticipantsTable;
	github_events: GithubEventsTable;
	attention_items: AttentionItemsTable;
	deliveries: DeliveriesTable;
	app_settings: AppSettingsTable;
}

export type GithubInstallation = Selectable<GithubInstallationsTable>;
export type NewGithubInstallation = Insertable<GithubInstallationsTable>;
export type GithubInstallationUpdate = Updateable<GithubInstallationsTable>;
