import { Module } from "@nestjs/common";
import { AttentionModule } from "../attention/attention.module";
import { DatabaseModule } from "../database/database.module";
import { DigestBuilder } from "../notifications/digest-builder";
import { hasWorkers, resolveProcessRole } from "../queue/process-role";
import { QueueModule } from "../queue/queue.module";
import { SlackController } from "./slack.controller";
import { SlackCommandsService } from "./slack-commands.service";
import { SlackDebugExamplesService } from "./slack-debug-examples.service";
import { SlackDeliveryService } from "./slack-delivery.service";
import { SlackHomeService } from "./slack-home.service";
import { SlackHttpClient } from "./slack-http-client";
import { SlackJobsProcessor } from "./slack-jobs.processor";
import { SlackJobsProducer } from "./slack-jobs.producer";
import { SlackMessageBuilder } from "./slack-message-builder";
import { SlackSignatureVerifier } from "./slack-signature-verifier";
import { SlackUserLinkService } from "./slack-user-link.service";

const processRole = resolveProcessRole(process.env.PROCESS_ROLE);

@Module({
	imports: [DatabaseModule, AttentionModule, QueueModule],
	controllers: [SlackController],
	providers: [
		SlackSignatureVerifier,
		SlackUserLinkService,
		SlackMessageBuilder,
		DigestBuilder,
		SlackCommandsService,
		SlackDebugExamplesService,
		SlackDeliveryService,
		SlackHomeService,
		SlackHttpClient,
		SlackJobsProducer,
		...(hasWorkers(processRole) ? [SlackJobsProcessor] : []),
	],
	exports: [
		DigestBuilder,
		SlackDeliveryService,
		SlackJobsProducer,
		SlackUserLinkService,
	],
})
export class SlackModule {}
