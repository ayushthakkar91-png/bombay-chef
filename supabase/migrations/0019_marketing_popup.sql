-- Offers / event pop-up content, editable from the admin panel.
-- Single-row table (id = 'default'). Public read; restaurant_manager+ writes,
-- mirroring the menu write policy from 0002. Additive — does not touch the menu.

create table if not exists marketing_popup (
  id             text primary key default 'default',
  enabled        boolean not null default true,
  label          text,
  title          text not null default '',
  message        text not null default '',
  offer_headline text,
  offer          text,
  image_url      text,
  cta_text       text not null default 'Reserve a Table',
  cta_href       text not null default '/reservations',
  secondary_text text not null default 'View Menu',
  secondary_href text not null default '/menu',
  note           text,
  updated_at     timestamptz not null default now()
);

alter table marketing_popup enable row level security;

drop policy if exists "public read marketing_popup" on marketing_popup;
create policy "public read marketing_popup" on marketing_popup for select using (true);

drop policy if exists "managers write marketing_popup" on marketing_popup;
create policy "managers write marketing_popup" on marketing_popup for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));

-- Seed the single row from the current config defaults.
insert into marketing_popup
  (id, enabled, label, title, message, offer_headline, offer,
   cta_text, cta_href, secondary_text, secondary_href, note)
values
  ('default', true, 'This week only', 'Live Football at Balham',
   'Watch England vs Panama with us over food, drinks and Bombay atmosphere.',
   'Get 25% Off', 'On Takeaway Orders',
   'Reserve a Table', '/reservations?location=balham',
   'View Menu', '/menu', 'Tables are limited')
on conflict (id) do nothing;
