import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import type { AppConfig } from "./config/app-config";
import { hasApi, resolveProcessRole } from "./queue/process-role";

async function bootstrap() {
	const role = resolveProcessRole(process.env.PROCESS_ROLE);

	if (hasApi(role)) {
		const app = await NestFactory.create(AppModule, {
			bufferLogs: true,
			rawBody: true,
		});
		app.useLogger(app.get(Logger));

		const configService = app.get(ConfigService<AppConfig, true>);
		await app.listen(configService.get("PORT"));
		return;
	}

	const app = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true,
	});
	app.useLogger(app.get(Logger));
	app.get(Logger).log(`Review Radar ${role} process started`);

	await new Promise<void>((resolve) => {
		process.once("SIGINT", resolve);
		process.once("SIGTERM", resolve);
	});

	await app.close();
}

void bootstrap();
