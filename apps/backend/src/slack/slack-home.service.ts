import { Inject, Injectable } from "@nestjs/common";
import { AttentionRepository } from "../attention/attention-repository";
import { SlackHttpClient } from "./slack-http-client";
import { SlackMessageBuilder } from "./slack-message-builder";
import { SlackUserLinkService } from "./slack-user-link.service";

@Injectable()
export class SlackHomeService {
	constructor(
		@Inject(SlackUserLinkService) private readonly links: SlackUserLinkService,
		@Inject(AttentionRepository)
		private readonly attention: AttentionRepository,
		@Inject(SlackMessageBuilder) private readonly messages: SlackMessageBuilder,
		@Inject(SlackHttpClient) private readonly slack: SlackHttpClient,
	) {}

	async publishForSlackUser(
		teamId: string,
		slackUserId: string,
	): Promise<void> {
		const link = await this.links.findBySlackUser(teamId, slackUserId);
		const items = link
			? await this.attention.listActiveByGithubUser(link.githubLogin)
			: [];
		await this.slack.publishHomeView(
			slackUserId,
			this.messages.buildHomeView(items),
		);
	}
}
