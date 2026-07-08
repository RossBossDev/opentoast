#!/bin/sh
set -e

if [ -z "${INFISICAL_SECRETS_LOADED:-}" ]; then
	infisical_token="${INFISICAL_TOKEN:-}"

	if [ -z "$infisical_token" ] && [ -n "${INFISICAL_CLIENT_ID:-}" ] && [ -n "${INFISICAL_CLIENT_SECRET:-}" ]; then
		infisical_token="$(infisical login \
			--method=universal-auth \
			--client-id="$INFISICAL_CLIENT_ID" \
			--client-secret="$INFISICAL_CLIENT_SECRET" \
			--plain \
			--silent)"
	fi

	if [ -n "$infisical_token" ]; then
		export INFISICAL_SECRETS_LOADED="true"
		exec infisical run \
			--token="$infisical_token" \
			--projectId="$INFISICAL_PROJECT_ID" \
			--env="${INFISICAL_ENVIRONMENT:-${INFISICAL_ENV:-production}}" \
			--path="${INFISICAL_SECRET_PATH:-${INFISICAL_PATH:-/review-radar}}" \
			-- "$0" "$@"
	fi

	if [ "${INFISICAL_ENABLED:-false}" = "true" ]; then
		echo "INFISICAL_ENABLED=true, but Infisical credentials are not set." >&2
		exit 1
	fi
fi

should_run_migrations="${RUN_MIGRATIONS:-}"

if [ -z "$should_run_migrations" ]; then
	case "$*" in
		"node dist/src/main.js") should_run_migrations="true" ;;
		*) should_run_migrations="false" ;;
	esac
fi

if [ "$should_run_migrations" = "true" ]; then
	echo "Running database migrations..."
	./node_modules/.bin/kysely migrate:latest --config kysely.config.ts
fi

exec "$@"
