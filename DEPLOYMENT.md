# Deployment

This repository deploys to the Hetzner server through GitHub Actions whenever code is pushed to `main`.

## Required GitHub Secrets

Add these in GitHub under repository **Settings -> Secrets and variables -> Actions -> New repository secret**:

- `HETZNER_HOST`: server IP address
- `HETZNER_PORT`: SSH port, usually `22`
- `HETZNER_USER`: SSH username, for example `root`
- `HETZNER_PASSWORD`: SSH password
- `HETZNER_APP_DIR`: server path for the app, for example `/opt/carcierge`
- `APP_SECRET_KEY`: long random secret used to sign auth tokens
- `DEFAULT_ADMIN_EMAIL`: initial admin email
- `DEFAULT_ADMIN_PASSWORD`: initial admin password
- `ACCESS_TOKEN_EXPIRE_MINUTES`: optional token lifetime, defaults to `10080`

## Server Requirements

The server must have Docker and Docker Compose installed. The configured SSH user must be able to run Docker commands.

The workflow uploads the checked-out repository archive to `HETZNER_APP_DIR`, writes a server-side `.env`, then runs:

```bash
docker compose up --build -d
```

No production secrets should be committed to this repository.
