import { Inject, Injectable } from "@nestjs/common";
import { AttentionRepository } from "../attention/attention-repository";
import type { SlackCommandPayload } from "./slack.types";
import { SlackMessageBuilder } from "./slack-message-builder";
import { SlackUserLinkService } from "./slack-user-link.service";

export interface SlackCommandResponse {
	response_type?: "ephemeral" | "in_channel";
	text: string;
}

@Injectable()
export class SlackCommandsService {
	constructor(
		@Inject(SlackUserLinkService) private readonly links: SlackUserLinkService,
		@Inject(AttentionRepository)
		private readonly attention: AttentionRepository,
		@Inject(SlackMessageBuilder) private readonly messages: SlackMessageBuilder,
	) {}

	async handle(command: SlackCommandPayload): Promise<SlackCommandResponse> {
		const [subcommand = "help", arg] = (command.text ?? "")
			.trim()
			.split(/\s+/, 2);

		switch (subcommand.toLowerCase()) {
			case "link":
				return this.link(command, arg);
			case "unlink":
				return this.unlink(command);
			case "inbox":
				return this.inbox(command);
			case "help":
			case "":
				return { response_type: "ephemeral", text: this.helpText() };
			default:
				return {
					response_type: "ephemeral",
					text: `Unknown command: ${subcommand}\n\n${this.helpText()}`,
				};
		}
	}

	private async link(
		command: SlackCommandPayload,
		githubLogin?: string,
	): Promise<SlackCommandResponse> {
		if (!githubLogin) {
			return {
				response_type: "ephemeral",
				text: "Usage: /opentoast link <github-login>",
			};
		}
		const link = await this.links.link(command, githubLogin);
		return {
			response_type: "ephemeral",
			text: `Linked <@${link.slackUserId}> to GitHub user ${link.githubLogin}.`,
		};
	}

	private async unlink(
		command: SlackCommandPayload,
	): Promise<SlackCommandResponse> {
		const removed = await this.links.unlink(command);
		return {
			response_type: "ephemeral",
			text: removed
				? "Your OpenToast GitHub link was removed."
				: "No OpenToast link was found for your Slack user.",
		};
	}

	private async inbox(
		command: SlackCommandPayload,
	): Promise<SlackCommandResponse> {
		const link = await this.links.findBySlackUser(
			command.team_id,
			command.user_id,
		);
		if (!link) {
			return {
				response_type: "ephemeral",
				text: "Link your GitHub account first: /opentoast link <github-login>",
			};
		}
		const items = await this.attention.listActiveByGithubUser(link.githubLogin);
		return {
			response_type: "ephemeral",
			text: this.messages.buildInboxText(items),
		};
	}

	private helpText(): string {
		return [
			"OpenToast commands:",
			"/opentoast link <github-login> — link your Slack user to GitHub",
			"/opentoast unlink — remove your link",
			"/opentoast inbox — show active attention items",
			"/opentoast help — show this help",
		].join("\n");
	}
}
