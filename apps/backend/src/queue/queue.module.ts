import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/app-config";
import { GITHUB_QUEUE, SLACK_QUEUE } from "./queue.constants";

@Module({
	imports: [
		BullModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService<AppConfig, true>) => ({
				connection: {
					url: config.get("REDIS_URL"),
				},
			}),
		}),
		BullModule.registerQueue({ name: GITHUB_QUEUE }, { name: SLACK_QUEUE }),
	],
	exports: [BullModule],
})
export class QueueModule {}
