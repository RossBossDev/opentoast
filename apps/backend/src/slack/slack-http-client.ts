import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/app-config";
import type { SlackClient, SlackPostMessageRequest } from "./slack.types";

interface SlackApiResponse {
	ok: boolean;
	error?: string;
	channel?: string;
	ts?: string;
}

@Injectable()
export class SlackHttpClient implements SlackClient {
	constructor(
		@Inject(ConfigService)
		private readonly configService: ConfigService<AppConfig, true>,
	) {}

	async postMessage(message: SlackPostMessageRequest) {
		const response = await this.call("chat.postMessage", message);
		return { channel: response.channel, ts: response.ts };
	}

	async publishHomeView(userId: string, view: unknown): Promise<void> {
		await this.call("views.publish", { user_id: userId, view });
	}

	private async call(method: string, body: unknown): Promise<SlackApiResponse> {
		const response = await fetch(`https://slack.com/api/${method}`, {
			method: "POST",
			headers: {
				authorization: `Bearer ${this.configService.get("SLACK_BOT_TOKEN")}`,
				"content-type": "application/json; charset=utf-8",
			},
			body: JSON.stringify(body),
		});
		const json = (await response.json()) as SlackApiResponse;
		if (!response.ok || !json.ok) {
			throw new Error(json.error ?? `Slack API ${method} failed`);
		}
		return json;
	}
}
