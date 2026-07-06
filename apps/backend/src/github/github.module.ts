import { Module } from "@nestjs/common";
import { AttentionModule } from "../attention/attention.module";
import { DatabaseModule } from "../database/database.module";
import { GithubController } from "./github.controller";
import { GithubEventStore } from "./github-event-store";
import { GithubIngestionService } from "./github-ingestion.service";
import { GithubNormalizer } from "./github-normalizer";
import { GithubPrSnapshotService } from "./github-pr-snapshot.service";
import { GithubReconciliationService } from "./github-reconciliation.service";
import { GithubWebhookVerifier } from "./github-webhook-verifier";

@Module({
	imports: [DatabaseModule, AttentionModule],
	controllers: [GithubController],
	providers: [
		GithubWebhookVerifier,
		GithubEventStore,
		GithubPrSnapshotService,
		GithubNormalizer,
		GithubIngestionService,
		GithubReconciliationService,
	],
	exports: [GithubIngestionService, GithubReconciliationService],
})
export class GithubModule {}
