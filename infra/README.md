# Production Infra Configs

This folder contains production config templates for:

- Nginx
- Django backend service (Gunicorn)
- Next.js frontend service

## Files

- `infra/nginx/sennetyurti.linkpc.net.conf`
- `infra/systemd/ticket-booking-backend.service`
- `infra/systemd/ticket-booking-frontend.service`

## Apply On VM

Copy files into system paths:

```bash
sudo cp /home/debian/code/ticket-booking/infra/nginx/sennetyurti.linkpc.net.conf /etc/nginx/sites-available/sennetyurti.linkpc.net
sudo ln -sf /etc/nginx/sites-available/sennetyurti.linkpc.net /etc/nginx/sites-enabled/sennetyurti.linkpc.net

sudo cp /home/debian/code/ticket-booking/infra/systemd/ticket-booking-backend.service /etc/systemd/system/
sudo cp /home/debian/code/ticket-booking/infra/systemd/ticket-booking-frontend.service /etc/systemd/system/
```

Reload and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ticket-booking-backend ticket-booking-frontend
sudo systemctl restart ticket-booking-backend ticket-booking-frontend
sudo systemctl status ticket-booking-backend ticket-booking-frontend
```

Validate and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Build Frontend Before Starting Frontend Service

```bash
cd /home/debian/code/ticket-booking/frontend
npm ci
npm run build
```

## Prepare Backend Before Starting Backend Service

```bash
cd /home/debian/code/ticket-booking/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
python manage.py migrate
python manage.py collectstatic --noinput
```

## PostgreSQL Prerequisites (Fresh Init, No SQLite Migration)

The server is pre-production, so initialize a fresh PostgreSQL database instead of transferring SQLite data.

1. Create PostgreSQL database and user (example names match app defaults):

```bash
sudo -u postgres psql -c "CREATE USER tickets WITH PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE tickets OWNER tickets;"
sudo -u postgres psql -c "ALTER ROLE tickets SET client_encoding TO 'UTF8';"
sudo -u postgres psql -c "ALTER ROLE tickets SET timezone TO 'UTC';"
```

2. Configure backend service environment with:

- `DB_ENGINE=postgres`
- `DB_NAME=tickets`
- `DB_USER=tickets`
- `DB_PASSWORD=<secure-password>`
- `DB_HOST=127.0.0.1` (or DB host)
- `DB_PORT=5432`

3. Run migrations on PostgreSQL:

```bash
cd /home/debian/code/ticket-booking/backend
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
```

4. Restart backend and verify:

```bash
sudo systemctl restart ticket-booking-backend
sudo systemctl status ticket-booking-backend
```
