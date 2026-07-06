import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

const SLACK_VERSION = "v0";
const DEFAULT_TOLERANCE_SECONDS = 60 * 5;

@Injectable()
export class SlackSignatureVerifier {
	verify(params: {
		rawBody: Buffer | string;
		timestamp: string;
		signature: string;
		signingSecret: string;
		now?: Date;
		toleranceSeconds?: number;
	}): boolean {
		const timestampSeconds = Number(params.timestamp);
		if (!Number.isFinite(timestampSeconds)) {
			return false;
		}

		const nowSeconds = Math.floor((params.now ?? new Date()).getTime() / 1000);
		const tolerance = params.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
		if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
			return false;
		}

		const body = Buffer.isBuffer(params.rawBody)
			? params.rawBody.toString("utf8")
			: params.rawBody;
		const base = `${SLACK_VERSION}:${params.timestamp}:${body}`;
		const expected = `${SLACK_VERSION}=${createHmac(
			"sha256",
			params.signingSecret,
		)
			.update(base)
			.digest("hex")}`;

		return safeEqual(expected, params.signature);
	}
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}
	return timingSafeEqual(leftBuffer, rightBuffer);
}
