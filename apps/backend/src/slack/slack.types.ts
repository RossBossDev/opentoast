import type {
	AttentionCategory,
	AttentionQueryItem,
} from "../attention/attention.types";

export interface SlackRequestHeaders {
	timestamp?: string;
	signature?: string;
}

export interface SlackCommandPayload {
	team_id: string;
	team_domain?: string;
	user_id: string;
	user_name?: string;
	command: string;
	text?: string;
	trigger_id?: string;
	response_url?: string;
}

export interface SlackUserLink {
	workspaceId: string;
	slackUserPk: string;
	slackTeamId: string;
	slackUserId: string;
	githubLogin: string;
	githubUserId: string | null;
}

export interface SlackMessageContext {
	id: string;
	category: AttentionCategory;
	assigneeLogin: string | null;
	reason: string;
	pullRequest: {
		number: number;
		title: string;
		htmlUrl: string;
		repositoryFullName: string;
	};
}

export interface SlackInboxItem extends AttentionQueryItem {
	pullRequest?: SlackMessageContext["pullRequest"];
}

export interface SlackPostMessageRequest {
	channel: string;
	text: string;
	blocks?: unknown[];
}

export interface SlackClient {
	postMessage(
		message: SlackPostMessageRequest,
	): Promise<{ channel?: string; ts?: string }>;
	publishHomeView(userId: string, view: unknown): Promise<void>;
}
