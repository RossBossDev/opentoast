import { Module } from "@nestjs/common";
import { AttentionModule } from "./attention/attention.module";
import { CommonModule } from "./common/common.module";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { GithubModule } from "./github/github.module";
import { HealthModule } from "./health/health.module";
import { HeartbeatModule } from "./heartbeat/heartbeat.module";
import { LoggerModule } from "./logger/logger.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { hasApi, hasHeartbeat, resolveProcessRole } from "./queue/process-role";
import { SlackModule } from "./slack/slack.module";

const processRole = resolveProcessRole(process.env.PROCESS_ROLE);

@Module({
	imports: [
		AppConfigModule,
		LoggerModule,
		DatabaseModule,
		...(hasApi(processRole) ? [HealthModule] : []),
		GithubModule,
		AttentionModule,
		SlackModule,
		NotificationsModule,
		...(hasHeartbeat(processRole) ? [HeartbeatModule] : []),
		CommonModule,
	],
})
export class AppModule {}
