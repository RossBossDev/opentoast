import "reflect-metadata";
import { plainToInstance, Transform } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUrl,
	Min,
	validateSync,
} from "class-validator";
import { PROCESS_ROLES, type ProcessRole } from "../queue/process-role";

export class AppConfig {
	@IsIn(["development", "test", "production"])
	NODE_ENV = "development";

	@Transform(({ value }) => Number(value ?? 3000))
	@IsInt()
	@Min(1)
	PORT = 3000;

	@IsString()
	@IsNotEmpty()
	DATABASE_URL!: string;

	@IsIn(PROCESS_ROLES)
	PROCESS_ROLE: ProcessRole = "all";

	@IsUrl({ protocols: ["redis", "rediss"], require_tld: false })
	REDIS_URL = "redis://localhost:6379";

	@IsUrl({ require_tld: false })
	APP_BASE_URL!: string;

	@IsString()
	@IsNotEmpty()
	GITHUB_APP_ID!: string;

	@IsString()
	@IsNotEmpty()
	GITHUB_WEBHOOK_SECRET!: string;

	@IsString()
	@IsNotEmpty()
	GITHUB_PRIVATE_KEY!: string;

	@IsString()
	@IsNotEmpty()
	SLACK_SIGNING_SECRET!: string;

	@IsString()
	@IsNotEmpty()
	SLACK_BOT_TOKEN!: string;

	@IsString()
	@IsNotEmpty()
	DIGEST_CRON!: string;

	@Transform(({ value }) => Number(value ?? 24))
	@IsInt()
	@Min(1)
	STALE_REVIEW_DURATION_HOURS = 24;

	@IsOptional()
	@IsString()
	LOG_LEVEL = "debug";
}

export function validate(config: Record<string, unknown>) {
	const validatedConfig = plainToInstance(AppConfig, config, {
		enableImplicitConversion: true,
	});
	const errors = validateSync(validatedConfig, {
		skipMissingProperties: false,
	});

	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return validatedConfig;
}
