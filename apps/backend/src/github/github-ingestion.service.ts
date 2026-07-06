import { EventEmitter } from "node:events";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { AttentionEngineService } from "../attention/attention-engine.service";
import type {
	GithubIngestionResult,
	GithubNormalizedFact,
	GithubWebhookHeaders,
	GithubWebhookPayload,
} from "./github.types";
import { GithubEventStore } from "./github-event-store";
import { GithubNormalizer } from "./github-normalizer";
import { GithubPrSnapshotService } from "./github-pr-snapshot.service";

export const GITHUB_FACTS_EVENT = "github.facts";

@Injectable()
export class GithubIngestionService {
	private readonly events = new EventEmitter();

	constructor(
		@Inject(GithubEventStore)
		private readonly eventStore: GithubEventStore,
		@Inject(GithubPrSnapshotService)
		private readonly snapshots: GithubPrSnapshotService,
		@Inject(GithubNormalizer)
		private readonly normalizer: GithubNormalizer,
		@Optional()
		@Inject(AttentionEngineService)
		private readonly attention?: AttentionEngineService,
	) {}

	async ingest(
		headers: Omit<GithubWebhookHeaders, "signature256">,
		payload: GithubWebhookPayload,
	): Promise<GithubIngestionResult> {
		const stored = await this.eventStore.persistRaw({
			deliveryId: headers.deliveryId,
			eventName: headers.eventName,
			payload,
		});

		if (stored.duplicate) {
			return { deliveryId: headers.deliveryId, duplicate: true, facts: [] };
		}

		const snapshot = await this.snapshots.upsertFromPayload(payload);
		const facts = this.normalizer.normalize({
			deliveryId: headers.deliveryId,
			eventName: headers.eventName,
			payload,
		});

		await this.eventStore.markProcessed({
			eventId: stored.id,
			installationId: snapshot.installationId,
			repositoryId: snapshot.repositoryId,
		});

		await this.attention?.processFacts(facts);
		this.publishFacts(facts);

		return { deliveryId: headers.deliveryId, duplicate: false, facts };
	}

	onFacts(listener: (facts: GithubNormalizedFact[]) => void): () => void {
		this.events.on(GITHUB_FACTS_EVENT, listener);
		return () => this.events.off(GITHUB_FACTS_EVENT, listener);
	}

	private publishFacts(facts: GithubNormalizedFact[]): void {
		if (facts.length > 0) {
			this.events.emit(GITHUB_FACTS_EVENT, facts);
		}
	}
}
