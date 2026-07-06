import {
	BadRequestException,
	Body,
	Controller,
	Headers,
	HttpCode,
	Inject,
	Post,
	Req,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { AttentionRepository } from "../attention/attention-repository";
import type { AppConfig } from "../config/app-config";
import type { SlackCommandPayload } from "./slack.types";
import { SlackCommandsService } from "./slack-commands.service";
import { SlackHomeService } from "./slack-home.service";
import { SlackSignatureVerifier } from "./slack-signature-verifier";
import { SlackUserLinkService } from "./slack-user-link.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

interface SlackInteractionPayload {
	team: { id: string };
	user: { id: string };
	actions?: Array<{ action_id?: string; value?: string }>;
}

@Controller("slack")
export class SlackController {
	constructor(
		@Inject(SlackSignatureVerifier)
		private readonly verifier: SlackSignatureVerifier,
		@Inject(SlackCommandsService)
		private readonly commands: SlackCommandsService,
		@Inject(SlackHomeService) private readonly home: SlackHomeService,
		@Inject(SlackUserLinkService) private readonly links: SlackUserLinkService,
		@Inject(AttentionRepository)
		private readonly attention: AttentionRepository,
		@Inject(ConfigService)
		private readonly configService: ConfigService<AppConfig, true>,
	) {}

	@Post("commands")
	@HttpCode(200)
	async command(
		@Req() request: RawBodyRequest,
		@Body() body: SlackCommandPayload,
		@Headers("x-slack-request-timestamp") timestamp?: string,
		@Headers("x-slack-signature") signature?: string,
	) {
		this.verify(request, timestamp, signature);
		if (!body.team_id || !body.user_id) {
			throw new BadRequestException("Missing Slack command team or user");
		}
		return this.commands.handle(body);
	}

	@Post("events")
	@HttpCode(200)
	async events(
		@Req() request: RawBodyRequest,
		@Body() body: {
			type?: string;
			challenge?: string;
			event?: { type?: string; user?: string };
			team_id?: string;
		},
		@Headers("x-slack-request-timestamp") timestamp?: string,
		@Headers("x-slack-signature") signature?: string,
	) {
		this.verify(request, timestamp, signature);
		if (body.type === "url_verification") {
			return { challenge: body.challenge };
		}
		if (
			body.event?.type === "app_home_opened" &&
			body.team_id &&
			body.event.user
		) {
			await this.home.publishForSlackUser(body.team_id, body.event.user);
		}
		return { ok: true };
	}

	@Post("interactions")
	@HttpCode(200)
	async interactions(
		@Req() request: RawBodyRequest,
		@Body() body: { payload?: string },
		@Headers("x-slack-request-timestamp") timestamp?: string,
		@Headers("x-slack-signature") signature?: string,
	) {
		this.verify(request, timestamp, signature);
		if (!body.payload) {
			throw new BadRequestException("Missing Slack interaction payload");
		}
		const payload = JSON.parse(body.payload) as SlackInteractionPayload;
		const action = payload.actions?.[0];
		if (action?.action_id === "acknowledge_attention_item" && action.value) {
			const link = await this.links.findBySlackUser(
				payload.team.id,
				payload.user.id,
			);
			await this.attention.acknowledge({
				attentionItemId: action.value,
				githubUserLogin: link?.githubLogin,
			});
			return { text: "Acknowledged." };
		}
		return { response_action: "clear" };
	}

	private verify(
		request: RawBodyRequest,
		timestamp?: string,
		signature?: string,
	): void {
		if (!timestamp || !signature) {
			throw new BadRequestException("Missing Slack signature headers");
		}
		if (!request.rawBody) {
			throw new BadRequestException("Missing raw request body");
		}
		const valid = this.verifier.verify({
			rawBody: request.rawBody,
			timestamp,
			signature,
			signingSecret: this.configService.get("SLACK_SIGNING_SECRET"),
		});
		if (!valid) {
			throw new UnauthorizedException("Invalid Slack signature");
		}
	}
}
