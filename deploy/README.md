# Deploy (draft, not used yet)

Draft for hosting the frontend and the intent API behind one HTTPS origin on the
VPS (Caddy + Docker Compose). Parked until the model work is done; not tested.

    cp .env.example .env    # set SAYPAY_DOMAIN, e.g. 203-0-113-7.sslip.io
    docker compose up -d --build

The frontend should call the API at the relative path `/api/intent`.
`placeholder/` is where a simple test page will go until the frontend build exists.
