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

CREATE INDEX IF NOT EXISTS idx_prayer_schedule_h3_date
ON prayer_schedule (h3_index, date);

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    h3_index TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_h3_timestamp
ON habits (h3_index, timestamp);

CREATE INDEX IF NOT EXISTS idx_habits_h3_type
ON habits (h3_index, type);

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

CREATE TABLE IF NOT EXISTS duas (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    arabic TEXT NOT NULL,
    meaning TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hadiths (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    time_value TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_outbox (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP NULL
);

INSERT INTO prayer_schedule (date, h3_index, fajr, maghrib)
VALUES (CURRENT_DATE, '872830828fffffff', '05:10', '18:45')
ON CONFLICT (date, h3_index) DO UPDATE
SET fajr = EXCLUDED.fajr,
    maghrib = EXCLUDED.maghrib;

INSERT INTO prayer_schedule (date, h3_index, fajr, maghrib)
SELECT
    (CURRENT_DATE + day_offset)::date,
    '872830828fffffff',
    TO_CHAR(TIME '05:10' - (day_offset || ' minutes')::interval, 'HH24:MI'),
    TO_CHAR(TIME '18:45' + (day_offset || ' minutes')::interval, 'HH24:MI')
FROM generate_series(0, 29) AS day_offset
ON CONFLICT (date, h3_index) DO NOTHING;

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Breaking fast', 'Allahumma inni laka sumtu wa bika amantu', 'O Allah, I fasted for You and I believe in You.', 'iftar'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Breaking fast');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Breaking fast - thirst is gone', 'Dhahaba az-zamau wabtallatil-urooqu wa thabatal-ajru in sha Allah', 'The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.', 'iftar'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Breaking fast - thirst is gone');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Seeking forgiveness', 'Astaghfirullah', 'I seek forgiveness from Allah.', 'dhikr'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Seeking forgiveness');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Sayyid al-Istighfar', 'Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana abduka', 'O Allah, You are my Lord; none has the right to be worshipped except You. You created me and I am Your servant.', 'forgiveness'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Sayyid al-Istighfar');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Laylat al-Qadr', 'Allahumma innaka afuwwun tuhibbul-afwa fafu anni', 'O Allah, You are Most Forgiving and love forgiveness, so forgive me.', 'ramadan'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Laylat al-Qadr');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Between the two prostrations', 'Rabbighfir li, warhamni, wajburni, warfani, warzuqni, wahdini', 'My Lord, forgive me, have mercy on me, strengthen me, raise me, provide for me, and guide me.', 'salah'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Between the two prostrations');

INSERT INTO duas (title, arabic, meaning, category)
SELECT 'Good in both worlds', 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar', 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', 'daily'
WHERE NOT EXISTS (SELECT 1 FROM duas WHERE title = 'Good in both worlds');

INSERT INTO hadiths (title, text, source)
SELECT 'Fasting reward', 'Whoever fasts Ramadan out of faith and hope for reward will be forgiven his previous sins.', 'Sahih al-Bukhari'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Fasting reward');

INSERT INTO hadiths (title, text, source)
SELECT 'Good character', 'The best among you are those who have the best manners and character.', 'Sahih al-Bukhari'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Good character');

INSERT INTO hadiths (title, text, source)
SELECT 'Actions by intentions', 'Actions are judged by intentions, and each person will have what they intended.', 'Sahih al-Bukhari 1; Sahih Muslim 1907'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Actions by intentions');

INSERT INTO hadiths (title, text, source)
SELECT 'Beloved deeds', 'The most beloved deeds to Allah are those done consistently, even if they are few.', 'Sahih al-Bukhari; Sahih Muslim'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Beloved deeds');

INSERT INTO hadiths (title, text, source)
SELECT 'Guarding the tongue while fasting', 'Whoever does not give up false speech and acting upon it, Allah has no need of him leaving his food and drink.', 'Sahih al-Bukhari'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Guarding the tongue while fasting');

INSERT INTO hadiths (title, text, source)
SELECT 'Charity in Ramadan', 'The Messenger of Allah was the most generous of people, and he was most generous in Ramadan.', 'Sahih al-Bukhari; Sahih Muslim'
WHERE NOT EXISTS (SELECT 1 FROM hadiths WHERE title = 'Charity in Ramadan');
