-- Make the offers pop-up's bullet points editable from admin (they were
-- previously hard-coded in src/config/event-popup.ts). Idempotent.
alter table marketing_popup
  add column if not exists details text[] not null default '{}';
