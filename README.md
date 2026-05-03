# Ramadan ARC

Ramadan ARC is a capstone prototype for helping Muslims spend Ramadan with more structure, awareness, and consistency. The project focuses on prayer-time support, habit tracking, Islamic reminders, duas, hadith content, and future AI-powered Arabic lessons.

## Problem

Ramadan is the holiest month for Muslims, but many people may miss its full benefit because they:

- lose track of important daily times such as suhur, iftar, and prayer times
- forget good deeds and daily worship habits
- lack easy access to duas, hadiths, and reminders
- need support building iman and consistent Ramadan routines

## Proposed Solution

Ramadan ARC helps users plan and follow meaningful Ramadan routines. The application is designed to remind users about worship times, encourage good deeds, provide Islamic content, and support Arabic learning with AI features.

## Key Features

- Alarm before suhur
- Iftar time alarm
- Prayer time reminders
- Dhikr reminders
- Habit tracking for good deeds
- Dua list
- Hadith list
- AI-assisted Arabic language lessons
- Basic analytics for tracked habits

## Target Users

Muslims who want to use Ramadan more intentionally and build better spiritual habits.

## Technology Stack

- Frontend: Next.js
- Backend: Go
- Database: PostgreSQL
- Planned AI support: Arabic learning assistant

## Current Prototype

This repository currently contains the Go backend prototype with endpoints for:

- user login
- prayer time lookup by location index
- habit creation
- habit analytics
- content publishing placeholder

## Project Structure

```text
src/
  cmd/              Go application entry point
  internal/         Backend handlers, database, models, and middleware
  db/               PostgreSQL schema
docs/               Project documentation
tests/              Test placeholders
assets/             Project assets
```

## Team Members

- Daulet Ibatolla - 230103056@sdu.edu.kz
- Yerassyl Orazgali - 230103272@sdu.edu.kz

## Repository

https://github.com/idealcod/advanced_pm.git
