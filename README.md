# Ramadan ARC

## 1. Project Title

Ramadan ARC

## 2. Topic Area
 Islamic productivity, education, and personal habit tracking.

## 3. Problem Statement

Ramadan is the holiest month for Muslims, but many users may miss important worship times, forget daily good deeds, or lose consistency in their spiritual routine.

Users often need one simple place for prayer times, suhur and iftar reminders, duas, hadiths, dhikr, Arabic learning, and habit analytics.

This problem matters because an application that helps users remember salah, worship, and beneficial habits can provide real daily value during Ramadan and beyond.

## 4. Proposed Solution

Ramadan ARC is a full-stack digital assistant that helps Muslims organize and improve their Ramadan routine.

The application provides prayer-time support, suhur and iftar countdowns, a 5-prayer tracker, digital tasbih, Qibla direction, duas, hadiths, reminders, Arabic lessons, and habit analytics. The backend manages authentication, user data, events, analytics, and Islamic content APIs, while the frontend presents a responsive dashboard for laptop and desktop users.

## 5. Target Users

The target users are Muslims who want to:

- follow prayer times more carefully
- track daily worship habits
- receive useful Ramadan reminders
- read authentic duas and hadiths
- practice Arabic basics
- stay consistent during Ramadan

## 6. Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Go
- Database: PostgreSQL
- Cache and events: Redis, Server-Sent Events
- Authentication: JWT access token and refresh token
- DevOps: Docker, Docker Compose
- APIs and integrations: browser geolocation, device orientation for Qibla compass, YouTube video lesson
- Other tools: Go tests, TypeScript checking

## 7. Key Features

- Login with JWT authentication and refresh support
- Dashboard with suhur, iftar, and daily progress cards
- Prayer times for Fajr, Dhuhr, Asr, Maghrib, and Isha
- 5-prayer tracker with on-time, late, missed, and pending states
- Prayer marking only during the allowed prayer window
- Reminder button for notification permission before prayer time
- Digital tasbih for Subhanallah, Alhamdulillah, and Allahu Akbar
- Qibla compass using user location and device orientation
- Habit tracking with daily analytics and streak data
- Real duas and hadiths displayed in the frontend
- Arabic learning section with basic phrases and practice content
- Video lesson showing how to perform salah
- Server-Sent Events support for live updates
- Health check endpoint for monitoring
- Docker Compose setup for local development

## 8. Team Members

- Daulet Ibatolla - 230103056@sdu.edu.kz
- Yerassyl Orazgali - 230103272@sdu.edu.kz

## 9. Expected Outcome

The expected outcome is a working full-stack prototype of Ramadan ARC.

At the end of the capstone, the project delivers:

- a responsive web dashboard
- a Go backend API
- PostgreSQL data storage
- Redis-based event support
- authentication with JWT
- prayer and habit tracking features
- Islamic content sections
- Docker-based local deployment
- basic backend and frontend verification commands

## 10. Git Repo Link

URL: https://github.com/idealcod/advanced_pm.git

## How to Run

Create a local `.env` file from `.env.example`, then start the project with Docker:

```powershell
docker compose up --build
```

After the containers start:

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health check: http://localhost:8080/health

If port `5432` is already used by a local PostgreSQL installation, stop the local PostgreSQL service or change the exposed database port in `docker-compose.yml`.

## Free Deployment

This project is split into:

- Backend: Go API in `src/`, deployed to Render with `Dockerfile.backend`
- Frontend: Next.js app in `ramadan-arc-frontend/`, deployed to Vercel

The frontend must call the backend through the public Render API URL. Do not use `localhost` in Vercel.

### Backend Deployment on Render

The repository includes `render.yaml`, so the backend can be created as a Render Blueprint. The backend uses Docker, listens on `0.0.0.0`, and reads the port from `PORT` with `8080` as the default.

Create a PostgreSQL database first. A free external PostgreSQL provider such as Neon or Supabase works well. Render Postgres also works if it is available in your Render account. Copy its connection string and use it as `DATABASE_URL`.

Render Dashboard steps:

1. Push this repository to GitHub.
2. Open Render Dashboard.
3. Click New > Blueprint.
4. Connect this repository.
5. Render will read `render.yaml` and create the `ramadan-arc-api` Docker web service.
6. Add the required secret environment variables when Render asks for them.
7. Deploy the service.

The backend will be available at:

```text
https://your-render-backend.onrender.com
```

Check the deployed backend:

```powershell
curl https://your-render-backend.onrender.com/health
```

Backend environment variables:

```text
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/ramadan_arc?sslmode=require
JWT_SECRET=change_me_to_a_real_32_plus_character_secret
JWT_TTL_HOURS=24
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
PORT=8080
APP_ENV=production
LOG_FORMAT=text
LOG_LEVEL=info
```

Optional backend variables:

```text
REDIS_URL=redis://...
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-haiku-4-5
```

If `REDIS_URL` is not set, the backend uses an in-process event bus.

### Frontend Deployment on Vercel

Import the GitHub repository in Vercel and set the frontend root directory to:

```text
ramadan-arc-frontend
```

In Vercel, add this environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

Then deploy from the Vercel dashboard, or with the CLI:

```powershell
cd ramadan-arc-frontend
vercel
vercel --prod
```

After Vercel gives you the frontend URL, update the Render backend environment variable:

```text
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
```

Then redeploy the Render backend.

### How Frontend Connects to Backend

The Next.js frontend reads the public backend URL from:

```text
NEXT_PUBLIC_API_URL
```

API calls are made from `ramadan-arc-frontend/src/lib/api.ts`, and Server-Sent Events use the same variable in `ramadan-arc-frontend/src/hooks/useRamadanEvents.ts`.

## Local Development

Backend:

```powershell
go test ./...
```

Frontend:

```powershell
cd ramadan-arc-frontend
npm install
npx tsc --noEmit
npm run dev
```

## Project Structure

```text
.
+-- src/
|   +-- cmd/                 Go application entry point
|   +-- db/                  PostgreSQL schema
|   +-- internal/            Backend handlers, auth, database, events, and middleware
+-- ramadan-arc-frontend/    Next.js frontend application
|   +-- src/app/             App routes and global styles
|   +-- src/components/      Dashboard UI sections
|   +-- src/hooks/           Frontend hooks
|   +-- src/lib/             API client and prayer utilities
+-- docs/                    Capstone documentation
+-- Dockerfile.backend       Backend Dockerfile
+-- docker-compose.yml       Full local stack
+-- README.md
```
