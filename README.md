# Ramadan ARC

## 1. Project Title

Ramadan ARC

## 2. Topic Area

AI Systems, Islamic productivity, education, and personal habit tracking.

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
