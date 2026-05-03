# Ramadan ARC — Frontend

Next.js 15 + TypeScript + Tailwind CSS фронтенд для Go-бэкенда Ramadan ARC.

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Настроить окружение
cp .env.example .env.local
# Открой .env.local и укажи адрес бэкенда:
# NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Запустить бэкенд (в другом терминале)
cd ../advanced_pm
go run ./src/cmd/main.go

# 4. Запустить фронтенд
npm run dev
# → http://localhost:3000
```

## CORS на бэкенде

Чтобы браузер мог обращаться к Go-серверу, добавь CORS middleware в `src/cmd/main.go`:

```go
import "net/http"

func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Role")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// В main():
log.Fatal(http.ListenAndServe(":8080", corsMiddleware(mux)))
```

## Структура

```
src/
  app/
    page.tsx          ← Главная страница (всё собрано здесь)
    layout.tsx        ← HTML layout, шрифты
    globals.css       ← Tailwind + CSS переменные + анимации
  components/
    Stars.tsx         ← Мерцающие звёзды (canvas effect)
    PrayerStrip.tsx   ← Полоска намазов (GET /prayer-times)
    CountdownRow.tsx  ← Таймеры до сухура/ифтара (real-time)
    HabitsSection.tsx ← Карточки привычек (POST /habit)
    DuasSection.tsx   ← Дуа (GET /duas)
    HadithsSection.tsx← Хадисы (GET /hadiths)
    ArabicSection.tsx ← Урок арабского (POST /arabic-lesson)
    RemindersSection.tsx ← Напоминания (GET+POST /reminders)
  hooks/
    useRamadanApp.ts  ← Главный хук: весь стейт + API вызовы
    useCountdown.ts   ← Живой таймер (тикает каждую секунду)
  lib/
    api.ts            ← Типизированный HTTP-клиент для бэкенда
```

## API маппинг

| Компонент | Метод | Endpoint |
|-----------|-------|----------|
| Авто-логин | POST | `/login` |
| PrayerStrip | GET | `/prayer-times?h3=...` |
| CountdownRow | GET | `/alarms?h3=...&before_suhur=45` |
| HabitsSection | POST | `/habit` |
| HabitsSection (счётчик) | GET | `/analytics?h3=...` |
| DuasSection | GET | `/duas` |
| HadithsSection | GET | `/hadiths` |
| ArabicSection | POST | `/arabic-lesson` |
| RemindersSection | GET | `/reminders?user_id=...` |

## Демо-режим

Если бэкенд недоступен — приложение автоматически переходит в демо-режим с локальными данными. Всё UI работает, включая карточки привычек и таймеры.
