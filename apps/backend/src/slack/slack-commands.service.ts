import { Inject, Injectable } from "@nestjs/common";
import { AttentionRepository } from "../attention/attention-repository";
import type { SlackCommandPayload } from "./slack.types";
import { SlackDebugExamplesService } from "./slack-debug-examples.service";
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
		@Inject(SlackDebugExamplesService)
		private readonly debugExamples: SlackDebugExamplesService,
	) {}

	async handle(command: SlackCommandPayload): Promise<SlackCommandResponse> {
		const [subcommand = "help", ...args] = (command.text ?? "")
			.trim()
			.split(/\s+/);

		switch (subcommand.toLowerCase()) {
			case "link":
				return this.link(command, args[0]);
			case "unlink":
				return this.unlink(command);
			case "inbox":
				return this.inbox(command);
			case "debug":
				return this.debug(command, args);
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
				text: "Usage: /review-radar link <github-login>",
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
				? "Your Review Radar GitHub link was removed."
				: "No Review Radar link was found for your Slack user.",
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
				text: "Link your GitHub account first: /review-radar link <github-login>",
			};
		}
		const items = await this.attention.listActiveByGithubUser(link.githubLogin);
		return {
			response_type: "ephemeral",
			text: this.messages.buildInboxText(items),
		};
	}

	private async debug(
		command: SlackCommandPayload,
		args: string[],
	): Promise<SlackCommandResponse> {
		if (args[0]?.toLowerCase() !== "examples") {
			return {
				response_type: "ephemeral",
				text: "Usage: /review-radar debug examples",
			};
		}

		const sentCount = await this.debugExamples.sendExamplesToSlackUser(
			command.user_id,
		);
		return {
			response_type: "ephemeral",
			text: `Sent ${sentCount} example Review Radar messages to you.`,
		};
	}

	private helpText(): string {
		return [
			"Review Radar commands:",
			"/review-radar link <github-login> — link your Slack user to GitHub",
			"/review-radar unlink — remove your link",
			"/review-radar inbox — show active attention items",
			"/review-radar help — show this help",
		].join("\n");
	}
}
