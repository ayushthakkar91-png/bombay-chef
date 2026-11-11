-- 0031_campaign_image.sql — an image and a call-to-action on email campaigns.
--
-- Campaigns were subject + plain text. A restaurant's news is a photograph of
-- food as much as it is words, and "see the menu" needs somewhere to go.
--
-- All three are optional: a campaign with none of them renders exactly as it
-- did before.

alter table campaigns add column if not exists image_url text;
alter table campaigns add column if not exists cta_url   text;
alter table campaigns add column if not exists cta_label text;
