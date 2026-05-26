# CFPS Deployment Security Checklist

## Network Architecture

Recommended production path:

```text
Internet
  -> Nginx HTTPS reverse proxy
  -> CFPS backend on 127.0.0.1:5000
  -> PostgreSQL on localhost only
```

The backend now defaults to `HOST=127.0.0.1`. Keep this default in production so Node.js is not directly exposed to the internet.

## Upload Storage

Use a production upload root outside the application web root:

```bash
UPLOAD_DIR=/var/cfps/uploads
```

Recommended permissions:

```bash
sudo chown -R cfps-backend:cfps-backend /var/cfps/uploads
sudo chmod -R 750 /var/cfps/uploads
```

Allowed upload extensions in the backend:

- `pdf`
- `jpg`
- `jpeg`
- `png`
- `docx`
- `xlsx`

The backend rejects oversized uploads, unsupported MIME types, executable extensions, and double-extension filenames.

## Nginx HTTPS Reverse Proxy

```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name cfps.example.gov.ng;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cfps.example.gov.ng;

    ssl_certificate /etc/letsencrypt/live/cfps/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cfps/privkey.pem;

    client_max_body_size 10M;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy no-referrer;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location /auth/login {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        autoindex off;

        location ~* \.(php|exe|sh|bat|cmd|js)$ {
            deny all;
        }

        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from YOUR_OFFICE_IP to any port 22
sudo ufw enable
```

Do not expose these ports publicly:

- `5432` PostgreSQL
- `5000` backend
- `5173` Vite development server
- `4173` Vite preview server

## PostgreSQL Binding

In `postgresql.conf`:

```conf
listen_addresses = '127.0.0.1'
```

In `pg_hba.conf`, allow local backend connections only. Avoid `0.0.0.0/0` unless the database is protected by a private network or VPN design.

## Rate Limits

Application layer limits currently enforced:

- Login: `5/min/IP`
- Export: `2/min/user`
- Upload: `10/min/user`
- Notification polling: controlled per authenticated user

Keep matching Nginx limits in front of the application for internet deployments.

## CORS and HTTPS

Production must set:

```text
NODE_ENV=production
ENFORCE_HTTPS=true
TRUST_PROXY=true
CORS_ORIGIN=https://cfps-theta.vercel.app
ALLOW_DEV_CORS_ORIGINS=false
```

`CORS_ORIGIN` must not contain `*`. HTTP origins are rejected in production unless `ALLOW_DEV_CORS_ORIGINS=true` is deliberately set for localhost-only testing.

## JWT Session Invalidation

JWTs include a per-user `token_version`. `POST /auth/logout`, password changes, role changes, branch changes, and account deactivation increment that value so older tokens are rejected by `authMiddleware`.

## SSL Renewal

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cfps.example.gov.ng
systemctl list-timers
sudo certbot renew --dry-run
```

Monitor certificate expiry proactively. Expired SSL breaks browser trust and desktop sync.

## Backup Security

Use a restricted backup location outside web roots and outside uploads:

```bash
sudo mkdir -p /opt/backups/cfps
sudo chmod -R 700 /opt/backups/cfps
```

Rules:

- Encrypt external backup archives.
- Maintain an offline copy.
- Test restore periodically.
- Do not email database dumps.
- Do not expose backup folders through Nginx.
- Do not store backups in public cloud links without access protection.
- Run `server/scripts/backup-db.sh` with `DATABASE_URL` and a restricted `BACKUP_DIR`.
- Run `server/scripts/restore-db.sh /path/to/db.backup` only after setting `CFPS_RESTORE_CONFIRM=YES`; the script refuses destructive restores without that confirmation.
