import { describe, expect, it, vi } from "vitest";
import {
	AttentionCategory,
	AttentionStatus,
} from "../attention/attention.types";
import type { SlackCommandPayload } from "./slack.types";
import { SlackCommandsService } from "./slack-commands.service";
import { SlackMessageBuilder } from "./slack-message-builder";

const baseCommand: SlackCommandPayload = {
	team_id: "T123",
	team_domain: "acme",
	user_id: "U123",
	user_name: "ross",
	command: "/review-radar",
};

describe("SlackCommandsService", () => {
	it("links a Slack user to a GitHub login", async () => {
		const links = {
			link: vi
				.fn()
				.mockResolvedValue({ slackUserId: "U123", githubLogin: "octocat" }),
		};
		const service = new SlackCommandsService(
			links as never,
			{} as never,
			new SlackMessageBuilder(),
			{} as never,
		);

		const response = await service.handle({
			...baseCommand,
			text: "link OctoCat",
		});

		expect(links.link).toHaveBeenCalledWith(
			expect.objectContaining({ user_id: "U123" }),
			"OctoCat",
		);
		expect(response.text).toContain("octocat");
	});

	it("unlinks a Slack user", async () => {
		const links = { unlink: vi.fn().mockResolvedValue(true) };
		const service = new SlackCommandsService(
			links as never,
			{} as never,
			new SlackMessageBuilder(),
			{} as never,
		);

		const response = await service.handle({ ...baseCommand, text: "unlink" });

		expect(links.unlink).toHaveBeenCalledWith(
			expect.objectContaining({ team_id: "T123", user_id: "U123" }),
		);
		expect(response.text).toContain("removed");
	});

	it("shows linked user's inbox", async () => {
		const links = {
			findBySlackUser: vi.fn().mockResolvedValue({ githubLogin: "octocat" }),
		};
		const attention = {
			listActiveByGithubUser: vi.fn().mockResolvedValue([
				{
					id: "attention-1",
					pullRequestId: "pr-1",
					category: AttentionCategory.NeedsReview,
					status: AttentionStatus.Active,
					assigneeGithubUserId: null,
					assigneeLogin: "octocat",
					reason: "John requested your review",
					dedupeKey: "key",
					detectedAt: new Date(),
					lastRelevantActivityAt: new Date(),
					resolvedAt: null,
					updatedAt: new Date(),
				},
			]),
		};
		const service = new SlackCommandsService(
			links as never,
			attention as never,
			new SlackMessageBuilder(),
			{} as never,
		);

		const response = await service.handle({ ...baseCommand, text: "inbox" });

		expect(attention.listActiveByGithubUser).toHaveBeenCalledWith("octocat");
		expect(response.text).toContain("Review requested");
	});

	it("sends debug example messages to the invoking Slack user", async () => {
		const debugExamples = {
			sendExamplesToSlackUser: vi.fn().mockResolvedValue(3),
		};
		const service = new SlackCommandsService(
			{} as never,
			{} as never,
			new SlackMessageBuilder(),
			debugExamples as never,
		);

		const response = await service.handle({
			...baseCommand,
			text: "debug examples",
		});

		expect(debugExamples.sendExamplesToSlackUser).toHaveBeenCalledWith("U123");
		expect(response).toEqual({
			response_type: "ephemeral",
			text: "Sent 3 example Review Radar messages to you.",
		});
	});

	it("shows debug usage for unknown debug subcommands", async () => {
		const debugExamples = { sendExamplesToSlackUser: vi.fn() };
		const service = new SlackCommandsService(
			{} as never,
			{} as never,
			new SlackMessageBuilder(),
			debugExamples as never,
		);

		const response = await service.handle({
			...baseCommand,
			text: "debug nope",
		});

		expect(debugExamples.sendExamplesToSlackUser).not.toHaveBeenCalled();
		expect(response).toEqual({
			response_type: "ephemeral",
			text: "Usage: /review-radar debug examples",
		});
	});
});
