# Crazy Caramels Orders — setup

The ordering page is at `/orders/`. The computer dashboard is at `/orders/?view=dashboard`.

## 1. Create the shared order database
1. With a parent/guardian, create a Supabase project at https://supabase.com.
2. Open SQL Editor → New query, paste all of `setup.sql`, and run it.
3. In Project Settings → API, copy the Project URL and the anon/public key.

## 2. Connect the website
Open `index.html` in this folder and replace:
- `PASTE_SUPABASE_PROJECT_URL_HERE` with the Project URL.
- `PASTE_SUPABASE_ANON_KEY_HERE` with the anon/public key.

The anon key is designed for browser use. Never paste a service_role or secret key into this website.

## 3. Open both screens
- iPad customer ordering: `https://crazycaramels.online/orders/`
- Computer dashboard: `https://crazycaramels.online/orders/?view=dashboard`

Orders update live and the dashboard can mark them completed. No customer names or contact details are collected.

## Important
The SQL policies make order data readable and writable by anyone who knows the page/API. This is a simple fair-day kiosk setup with no customer personal details. Keep the dashboard link private and have a parent/guardian review the access settings before using it for real orders.
