-- Custom OpenAI-compatible providers need their own endpoint, stored next to the key.
alter table app_settings add column if not exists ai_base_url text;

-- The provider whitelist has to know about the custom option too.
alter table app_settings drop constraint if exists app_settings_provider_check;
alter table app_settings
  add constraint app_settings_provider_check
  check (ai_provider is null or ai_provider in ('openai', 'anthropic', 'custom'));
