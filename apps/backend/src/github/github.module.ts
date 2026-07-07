import { Module } from "@nestjs/common";
import { AttentionModule } from "../attention/attention.module";
import { DatabaseModule } from "../database/database.module";
import { hasWorkers, resolveProcessRole } from "../queue/process-role";
import { QueueModule } from "../queue/queue.module";
import { GithubController } from "./github.controller";
import { GithubEventStore } from "./github-event-store";
import { GithubIngestionService } from "./github-ingestion.service";
import { GithubJobsProcessor } from "./github-jobs.processor";
import { GithubJobsProducer } from "./github-jobs.producer";
import { GithubNormalizer } from "./github-normalizer";
import { GithubPrSnapshotService } from "./github-pr-snapshot.service";
import { GithubReconciliationService } from "./github-reconciliation.service";
import { GithubWebhookVerifier } from "./github-webhook-verifier";

const processRole = resolveProcessRole(process.env.PROCESS_ROLE);

@Module({
	imports: [DatabaseModule, AttentionModule, QueueModule],
	controllers: [GithubController],
	providers: [
		GithubWebhookVerifier,
		GithubEventStore,
		GithubPrSnapshotService,
		GithubNormalizer,
		GithubIngestionService,
		GithubJobsProducer,
		GithubReconciliationService,
		...(hasWorkers(processRole) ? [GithubJobsProcessor] : []),
	],
	exports: [
		GithubIngestionService,
		GithubJobsProducer,
		GithubReconciliationService,
	],
})
export class GithubModule {}
