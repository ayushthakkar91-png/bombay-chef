-- Membership card: a stable member number + an opaque token per loyalty account.
-- The member_no is the human-facing card number (BBC-10000, BBC-10001, …); the
-- member_token backs the card's QR (a future /m/<token> staff-scan URL — identity
-- only for now). Both are additive + idempotent so this is safe to re-run.

-- Opaque token for the QR (never guessable; not the customer id).
alter table loyalty_accounts
  add column if not exists member_token uuid not null default gen_random_uuid();

create unique index if not exists loyalty_accounts_member_token_uidx
  on loyalty_accounts(member_token);

-- Friendly, sequential member number.
create sequence if not exists loyalty_member_no_seq start 10000;

alter table loyalty_accounts
  add column if not exists member_no text;

-- Backfill any rows that predate this column.
update loyalty_accounts
  set member_no = 'BBC-' || nextval('loyalty_member_no_seq')
  where member_no is null;

-- New rows get the next number automatically.
alter table loyalty_accounts
  alter column member_no set default 'BBC-' || nextval('loyalty_member_no_seq');

alter table loyalty_accounts
  alter column member_no set not null;

create unique index if not exists loyalty_accounts_member_no_uidx
  on loyalty_accounts(member_no);
