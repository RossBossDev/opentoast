export type ProcessRole = "all" | "api" | "worker" | "heartbeat";

export const PROCESS_ROLES: ProcessRole[] = [
	"all",
	"api",
	"worker",
	"heartbeat",
];

export function resolveProcessRole(value?: string | null): ProcessRole {
	if (!value) {
		return "all";
	}
	if (PROCESS_ROLES.includes(value as ProcessRole)) {
		return value as ProcessRole;
	}
	throw new Error(`Invalid PROCESS_ROLE: ${value}`);
}

export function hasApi(role: ProcessRole): boolean {
	return role === "all" || role === "api";
}

export function hasWorkers(role: ProcessRole): boolean {
	return role === "all" || role === "worker";
}

export function hasHeartbeat(role: ProcessRole): boolean {
	return role === "all" || role === "heartbeat";
}
