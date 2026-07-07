import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AttentionModule } from "../attention/attention.module";
import { hasWorkers, resolveProcessRole } from "../queue/process-role";
import { SlackModule } from "../slack/slack.module";
import { DigestSchedulerService } from "./digest-scheduler.service";
import { ReminderSchedulerService } from "./reminder-scheduler.service";
import { StaleAttentionService } from "./stale-attention.service";

const processRole = resolveProcessRole(process.env.PROCESS_ROLE);

@Module({
	imports: [ScheduleModule.forRoot(), AttentionModule, SlackModule],
	providers: [
		StaleAttentionService,
		...(hasWorkers(processRole)
			? [DigestSchedulerService, ReminderSchedulerService]
			: []),
	],
	exports: [StaleAttentionService],
})
export class NotificationsModule {}
