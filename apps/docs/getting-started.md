# Getting started

This page tracks the hands-on onboarding flow for connecting a running Review Radar instance to a Slack workspace and GitHub organization.

::: warning Early setup
Review Radar does not yet have hosted signup. The steps below assume you are running the backend yourself, either locally behind a public tunnel or on a deployed HTTPS URL.
:::

## Setup checklist

1. Run the backend with a public HTTPS base URL.
2. Create and install a GitHub App for the target organization.
3. Create and install a Slack App for the target workspace.
4. Link Slack users to GitHub logins with `/review-radar link <github-login>`.
5. Trigger pull request activity and verify attention items appear in Slack.

## 1. Run the backend

Review Radar needs a URL that GitHub and Slack can call. For local setup, start the API on port `3000` and expose it with a tunnel such as ngrok or Cloudflare Tunnel. For a deployed setup, use the deployed API URL, for example `https://review-radar.rossboss.dev`.

Use these callback URLs, replacing `<base-url>` with your public HTTPS URL:

| Integration area | URL |
| --- | --- |
| GitHub webhook | `<base-url>/webhooks/github` |
| Slack slash command | `<base-url>/slack/commands` |
| Slack events | `<base-url>/slack/events` |
| Slack interactivity | `<base-url>/slack/interactions` |
| Readiness check | `<base-url>/health/ready` |

Set `APP_BASE_URL=<base-url>` in `apps/backend/.env` or in your deployment environment.

Local bootstrap commands:

```bash
cp apps/backend/.env.example apps/backend/.env
corepack enable
pnpm install
POSTGRES_PORT=5433 docker compose up -d postgres # use 5432 if it is free
pnpm db:migrate
pnpm dev
```

If you use a non-default Postgres port, update `DATABASE_URL` in `apps/backend/.env` to match it, for example `postgres://postgres:postgres@localhost:5433/review-radar`.

### Run the worker

The API and worker use the same build artifact and Docker image. Run one web process for the API and one worker process with the same environment variables and database connection.

API command:

```bash
node dist/src/main.js
```

Worker command:

```bash
node dist/src/worker.js
```

For Docker-based deployments, use the same image and override the worker command:

```bash
docker run --env-file apps/backend/.env review-radar node dist/src/worker.js
```

Run only one worker replica until Review Radar has distributed job locking. Prefer running migrations as a separate release step; if your API service already runs migrations, set `RUN_MIGRATIONS=false` on the worker to avoid duplicate migration attempts during deploys.

## 2. Connect GitHub

Create a GitHub App in the organization account that owns the repositories Review Radar should watch.

Minimum current configuration:

- Webhook URL: `<base-url>/webhooks/github`
- Webhook secret: a strong random value saved as `GITHUB_WEBHOOK_SECRET`
- Repository permissions:
  - Pull requests: read
  - Issues: read
  - Checks: read
  - Metadata: read (required by GitHub)
- Subscribe to events:
  - Pull request
  - Pull request review
  - Pull request review comment
  - Issue comment
  - Check run
  - Check suite

After creating the app, save these values in `apps/backend/.env`:

- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY` from the generated private key file
- `GITHUB_WEBHOOK_SECRET`

Install the app on the organization repositories you want Review Radar to monitor.

## 3. Connect Slack

Create a Slack App for the workspace where Review Radar should send personal inbox responses and reminders.

Minimum current configuration:

- Slash command: `/review-radar`
  - Request URL: `<base-url>/slack/commands`
- Event subscriptions:
  - Request URL: `<base-url>/slack/events`
  - Bot event: `app_home_opened`
- Interactivity:
  - Request URL: `<base-url>/slack/interactions`
- Bot token scopes:
  - `chat:write`
  - `commands`

After installing the Slack App, save these values in `apps/backend/.env`:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`

## 4. Link users

Each Slack user needs to link their Slack account to their GitHub login before personal inbox commands or direct-message delivery can target them:

```text
/review-radar link <github-login>
```

Useful commands:

```text
/review-radar inbox
/review-radar unlink
/review-radar help
```

## 5. Verify the first signal

Open or update a pull request in an installed repository, then create an event Review Radar understands, such as requesting a review, mentioning a GitHub user in a PR body or comment, submitting a review, or completing checks.

Then verify:

1. GitHub reports successful webhook deliveries to `/webhooks/github`.
2. The backend logs show the delivery was accepted.
3. The linked Slack user can run `/review-radar inbox` and see active attention items.

## Need developer setup?

Developer commands, environment variables, migrations, local Docker usage, tests, and build checks live in the [repository README](https://github.com/RossBossDev/review-radar#readme).
