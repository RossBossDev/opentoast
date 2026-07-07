# Self-hosting

Self-hosting is an advanced future path for teams that want to run Review Radar themselves.

::: warning Outline in progress
This page is a product-facing outline. Detailed developer commands, local environment setup, migrations, checks, and Docker instructions currently live in the [repository README](https://github.com/RossBossDev/review-radar#readme).
:::

## Who self-hosting is for

Self-hosting may fit teams that need direct control over infrastructure, GitHub App configuration, Slack App configuration, secrets, deployment, and data retention.

TODO: Define the supported self-hosting model once deployment expectations are clearer.

## What you will need

TODO: Document the production requirements for a self-hosted Review Radar deployment.

Expected areas include:

- A GitHub App with the required repository and pull request permissions.
- A Slack App with the required workspace permissions.
- A Postgres database.
- A deployment target for the Review Radar API and worker.
- Secret management for GitHub, Slack, and application configuration.
- Monitoring for delivery failures and background work.

## Operating Review Radar

TODO: Add operational guidance once the production shape is stable.

Future documentation should cover migrations, scheduled or background work, delivery retries, health checks, and upgrade steps.

## Developer setup

If you are trying to run or contribute to Review Radar locally today, start with the [repository README](https://github.com/RossBossDev/review-radar#readme) instead of this page.
