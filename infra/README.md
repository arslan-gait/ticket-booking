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
