-- Custom OpenAI-compatible providers need their own endpoint, stored next to the key.
alter table app_settings add column if not exists ai_base_url text;
