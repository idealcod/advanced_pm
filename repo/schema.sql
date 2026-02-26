CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    h3_index TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prayer_schedule (
    date DATE NOT NULL,
    h3_index TEXT NOT NULL,
    fajr TEXT NOT NULL,
    maghrib TEXT NOT NULL,
    PRIMARY KEY (date, h3_index)
);

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    h3_index TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_daily (
    date DATE NOT NULL,
    h3_index TEXT NOT NULL,
    habit_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (date, h3_index)
);

INSERT INTO prayer_schedule (date, h3_index, fajr, maghrib)
VALUES (CURRENT_DATE, '872830828fffffff', '05:10', '18:45')
ON CONFLICT (date, h3_index) DO UPDATE
SET fajr = EXCLUDED.fajr,
    maghrib = EXCLUDED.maghrib;
