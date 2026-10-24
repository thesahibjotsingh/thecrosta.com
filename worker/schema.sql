-- Run this once in your Cloudflare D1 database (Console tab). One row per anonymous action.
CREATE TABLE IF NOT EXISTS events (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  ts   INTEGER NOT NULL,      -- when (milliseconds)
  day  TEXT    NOT NULL,      -- Indian date, e.g. 2026-10-24
  hr   INTEGER NOT NULL,      -- Indian hour 0-23
  e    TEXT    NOT NULL,      -- what happened, e.g. add_item, order_sent
  vid  TEXT,                  -- anonymous random id kept on the visitor's phone (not a person)
  dev  TEXT,                  -- phone / tablet / desktop
  src  TEXT,                  -- where they came from: direct, instagram, google.com ...
  open INTEGER,               -- 1 if the shop was open at that moment, 0 if closed
  p    TEXT                   -- a few harmless details as JSON, e.g. {"item":"Farm House Pizza"} or {"total":298}
);
CREATE INDEX IF NOT EXISTS events_day ON events(day, e);
