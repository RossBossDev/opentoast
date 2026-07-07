import { EventEmitter } from "node:events";
import { Inject, Injectable } from "@nestjs/common";
import type {
	GithubIngestionResult,
	GithubNormalizedFact,
	GithubWebhookHeaders,
	GithubWebhookPayload,
} from "./github.types";
import { GithubEventStore } from "./github-event-store";
import { GithubJobsProducer } from "./github-jobs.producer";

export const GITHUB_FACTS_EVENT = "github.facts";

@Injectable()
export class GithubIngestionService {
	private readonly events = new EventEmitter();

	constructor(
		@Inject(GithubEventStore)
		private readonly eventStore: GithubEventStore,
		@Inject(GithubJobsProducer)
		private readonly jobs: GithubJobsProducer,
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

		await this.jobs.enqueueProcessWebhookEvent({
			eventId: stored.id,
			deliveryId: headers.deliveryId,
		});

		return { deliveryId: headers.deliveryId, duplicate: false, facts: [] };
	}

	onFacts(listener: (facts: GithubNormalizedFact[]) => void): () => void {
		this.events.on(GITHUB_FACTS_EVENT, listener);
		return () => this.events.off(GITHUB_FACTS_EVENT, listener);
	}
}
