import { describe, expect, it } from "vitest";
import {
	hasApi,
	hasHeartbeat,
	hasWorkers,
	resolveProcessRole,
} from "./process-role";

describe("process role helpers", () => {
	it("defaults to all", () => {
		expect(resolveProcessRole(undefined)).toBe("all");
	});

	it("maps capabilities by role", () => {
		expect(hasApi("all")).toBe(true);
		expect(hasWorkers("all")).toBe(true);
		expect(hasHeartbeat("all")).toBe(true);

		expect(hasApi("api")).toBe(true);
		expect(hasWorkers("api")).toBe(false);
		expect(hasHeartbeat("api")).toBe(false);

		expect(hasApi("worker")).toBe(false);
		expect(hasWorkers("worker")).toBe(true);
		expect(hasHeartbeat("worker")).toBe(false);
	});

	it("rejects invalid roles", () => {
		expect(() => resolveProcessRole("nope")).toThrow(/Invalid PROCESS_ROLE/);
	});
});
