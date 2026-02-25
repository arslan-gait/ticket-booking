# Ticket Booking Web App

Full-stack event ticket booking app with:
- Public booking flow (event list -> seat selection -> booking -> ticket QR)
- Admin panel (events, venues, bookings, QR scanner)
- Django REST API + Next.js frontend

## Tech Stack

- Backend: Django, Django REST Framework, SQLite
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- QR: HMAC-signed payload + single-use verification endpoint

## Project Structure

- `backend/` - Django API and data models
- `frontend/` - Next.js UI app

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8008
```

Backend runs at `http://127.0.0.1:8008`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

Set API URL (optional, default already points to local backend):

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8008/api
```

## Run Both With mprocs

Install `mprocs` first (choose one):

```bash
# macOS (Homebrew)
brew install mprocs
```

```bash
# Rust toolchain
cargo install mprocs
```

If you have `mprocs` installed, run both backend and frontend together:

```bash
cd /Users/arslan/work/tickets
mprocs
```

This uses the repo root `mprocs.yaml`:
- `backend`: activates `backend/.venv` and runs Django server
- `frontend`: runs Next.js dev server

## Key Endpoints

- `GET /api/events/` - list active events
- `GET /api/events/?include_inactive=1` - admin event list
- `GET /api/events/{id}/seats/` - event seats with derived status (`open|booked|paid`)
- `POST /api/bookings/create/` - create booking
- `POST /api/bookings/{id}/update-status/` - mark booking `paid` or `cancelled`
- `POST /api/tickets/verify/` - validate and consume QR

## Seat and QR Guarantees

- Seat uniqueness is enforced per event for active reservations.
- Booking cancellation frees seats immediately.
- Ticket QR is single-use:
  - first valid scan marks ticket as consumed
  - subsequent scans are rejected

## Admin Pages

- `/admin` - dashboard
- `/admin/events` - create/list/toggle event activity
- `/admin/venues` - create/update venues and seat layouts
- `/admin/bookings` - filter bookings and mark paid/cancelled
- `/admin/scan` - camera-based QR scanner
