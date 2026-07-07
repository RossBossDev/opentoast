import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrapWorker() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true,
	});
	app.useLogger(app.get(Logger));
	app.get(Logger).log("Review Radar worker started");

	const keepAlive = setInterval(() => undefined, 60_000);
	await new Promise<void>((resolve) => {
		process.once("SIGINT", resolve);
		process.once("SIGTERM", resolve);
	});
	clearInterval(keepAlive);

	await app.close();
}

void bootstrapWorker();
