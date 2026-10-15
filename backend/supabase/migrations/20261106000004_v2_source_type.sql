-- Business Plan v2: parts listed by partner shops on the Jammu Parts Exchange.
-- Its own migration because a new enum value can't be used in the same transaction.
alter type public.source_type add value if not exists 'partner_listing';
