# USOF — Unified Forum (API + Client)

---

## Quick summary
- Backend: Node.js + Express + MySQL (REST API)
- Frontend: React (Create React App) client in `client/`

## Prerequisites
- Node.js (v16+ recommended)
- npm (v7+ recommended)
- MySQL (v8+)

## Environment (.env)
Create a `.env` file in the repository root (copy `.env.example` if present). Minimal required vars:

```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=usof_db
JWT_SECRET=your_jwt_secret

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=you@example.com
EMAIL_PASS=app-password
BASE_URL=http://localhost:4000


EMAIL_NOTIFICATIONS=true   
SEND_NOTIFICATION_EMAILS=true
```

Client-specific environment (in `client/.env` or when running client):

```
REACT_APP_API_BASE=http://localhost:4000/api
REACT_APP_UPLOAD_DIR=/uploads
```

---

## Quick start (Windows PowerShell)

```powershell
# 1) Install server deps
cd C:\Users\user\Desktop\USOF
npm install

# 2) Initialize DB (MySQL must be running)
mysql -u root -p < init.sql

# 3) Run server (dev)
npm run dev

Run server [http://localhost:4000](http://localhost:4000)

# 4) Run client (in separate window)
cd client
npm install
npm start

# 5) Production: build client then start prod server (from repo root)
cd client
npm run build
cd ..
npm run start:prod
```

## Important notes
- For Gmail, create an App Password (with 2FA) and set it as `EMAIL_PASS`.
- To test emails safely use Mailtrap/Ethereal SMTP credentials instead of Gmail.
- After changing `.env`, restart the server so environment variables load.

## Short API reference

- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/password-reset`
- Posts: `GET /api/posts`, `GET /api/posts/:id`, `POST /api/posts`, `PATCH /api/posts/:id`, `DELETE /api/posts/:id`
- Comments: `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments`
- Subscriptions: `POST /api/subscriptions/:postId`, `DELETE /api/subscriptions/:postId`, `GET /api/subscriptions/notifications`

See `routes/` for a complete list and parameters.

## Notifications behavior

- When a subscribed post receives a new comment or is updated the server creates a `notifications` DB record for subscribers.
- If `EMAIL_NOTIFICATIONS=true`, the server will also attempt to send emails to subscribers (check server logs for `Notification email sent to ...`).

## Troubleshooting

- Server start errors: check `.env`, ensure MySQL is running, inspect server logs.
- Email not sent: confirm `EMAIL_NOTIFICATIONS=true` and valid SMTP credentials; check server logs for nodemailer errors.
- DB issues: run `mysql -u root -p < init.sql` to create schema and seeds.

## Test accounts (seeded)

- Admin: `admin` / `password`
- Users: `user1`, `user2`, etc. (default password `password`)

---

If you want, I can:
- configure Mailtrap in `.env` for safe email testing, or
- add `post_deleted` notifications so subscribers are notified when a post is removed, or
- implement optimistic subscribe UI on the client.

<img width="1892" height="740" alt="image" src="https://github.com/user-attachments/assets/4d1a0c59-09e3-4b9a-814f-01ac635a850e" /> 

