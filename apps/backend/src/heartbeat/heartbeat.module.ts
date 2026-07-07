import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SlackModule } from "../slack/slack.module";
import { HeartbeatService } from "./heartbeat.service";

@Module({
	imports: [ScheduleModule.forRoot(), SlackModule],
	providers: [HeartbeatService],
})
export class HeartbeatModule {}
