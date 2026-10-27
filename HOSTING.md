# Hosting

The production app is at `https://reseptit.pomeranssi.fi`. It runs on the
`pomeranssi` server, a Hetzner CAX11 (ARM, 2 vCPU, 4 GB RAM) with Debian 13.
This repo does not configure the server. It provides the image, and
[`README.md`](README.md#running) lists what the container needs.

## The server

- Every app runs as a container pulled from GHCR. The server builds nothing.
- Docker Compose runs the stack. Each app's version is pinned in the server's
  `.env`, never `latest`. A deploy pulls the pinned version and recreates the
  changed container. A rollback pins the old version again.
- A front Caddy container terminates TLS for ports 80 and 443 and proxies each
  hostname to its app container.
- A shared PostgreSQL 18 container serves the apps that need a database. Each
  app has its own role and database. PostgreSQL listens only on the Tailscale
  network, so a developer can reach it from the tailnet but not from the
  internet. The server has backup scripts for it.
- SSH to the server works only over Tailscale.
- UID 1000 owns the bind-mounted data directories, so the app containers run
  as UID 1000.
- The server runs no Valkey or Redis now, but it can add one if an app needs
  it.

## This app

The app needs a compose service, a Caddy block for `reseptit.pomeranssi.fi`, a
DNS record, a role and database in the shared PostgreSQL, and a host directory
for the recipe images. Inside the compose network, the app is at
`http://cookbook:3000`. The
[family dashboard](https://github.com/thaapasa/family-dashboard) reads the week
plan from there.

To deploy a release, pin its version in the `.env` of the server and run
`./deploy.sh`.

To add a user, run the CLI script in the container. You can also add a user by
running `npm run set-user` locally with `--sql`, and then running the printed
statement in the production database.
