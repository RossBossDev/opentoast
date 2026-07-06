import { Module } from "@nestjs/common";
import { AttentionModule } from "../attention/attention.module";
import { DatabaseModule } from "../database/database.module";
import { SlackController } from "./slack.controller";
import { SlackCommandsService } from "./slack-commands.service";
import { SlackDeliveryService } from "./slack-delivery.service";
import { SlackHomeService } from "./slack-home.service";
import { SlackHttpClient } from "./slack-http-client";
import { SlackMessageBuilder } from "./slack-message-builder";
import { SlackSignatureVerifier } from "./slack-signature-verifier";
import { SlackUserLinkService } from "./slack-user-link.service";

@Module({
	imports: [DatabaseModule, AttentionModule],
	controllers: [SlackController],
	providers: [
		SlackSignatureVerifier,
		SlackUserLinkService,
		SlackMessageBuilder,
		SlackCommandsService,
		SlackDeliveryService,
		SlackHomeService,
		SlackHttpClient,
	],
	exports: [SlackDeliveryService, SlackUserLinkService],
})
export class SlackModule {}
