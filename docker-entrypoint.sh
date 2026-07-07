#!/bin/sh
set -e

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
