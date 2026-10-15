-- Saved items (v1.0.0 batch 15). A signed-in buyer saves items from the
-- shop; their account lists them with the current price and whether they're
-- still on sale, and the database notifies them when a saved item's price
-- drops, or it is reserved or sold. Each person sees only their own list.
-- Saved items go when the person removes them or deletes their account.

create table if not exists public.saved_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  price_when_saved_paise bigint,
  saved_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists saved_items_item_idx on public.saved_items (item_id);

alter table public.saved_items enable row level security;
revoke all on public.saved_items from anon, authenticated;
grant select on public.saved_items to authenticated;
drop policy if exists "Users read their own saved items" on public.saved_items;
create policy "Users read their own saved items" on public.saved_items for select to authenticated
  using (user_id = (select auth.uid()));

-- Save an item that's on sale (or reserved). Saving it again changes nothing.
create or replace function public.save_item(p_item text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i record;
begin
  if auth.uid() is null then
    raise exception 'Log in to save items';
  end if;
  select * into i from public.items where id = p_item;
  if not found or i.hidden or i.status::text not in ('listed', 'reserved') then
    raise exception 'This item is not on sale';
  end if;
  if exists (select 1 from public.saved_items where user_id = auth.uid() and item_id = p_item) then
    return;
  end if;
  -- One save at a time per person, so the limit holds.
  perform pg_advisory_xact_lock(hashtextextended('saved_items:' || auth.uid()::text, 0));
  if (select count(*) from public.saved_items where user_id = auth.uid()) >= 100 then
    raise exception 'You can save up to 100 items. Remove some first.';
  end if;
  insert into public.saved_items (user_id, item_id, price_when_saved_paise)
  values (auth.uid(), p_item, i.current_paise)
  on conflict (user_id, item_id) do nothing;
end;
$$;
revoke execute on function public.save_item(text) from public, anon;
grant execute on function public.save_item(text) to authenticated;

create or replace function public.unsave_item(p_item text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.saved_items where user_id = auth.uid() and item_id = p_item;
$$;
revoke execute on function public.unsave_item(text) from public, anon;
grant execute on function public.unsave_item(text) to authenticated;

-- Whether this person reserved the item themselves (a reservation they sent
-- while logged in that wasn't cancelled): they're told about their own
-- reservation by its request, not as a saver.
create or replace function public.reserved_by(p_item text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.submissions r
     where r.kind = 'reservation' and r.item_id = p_item and r.buyer_id = p_user
       and r.status::text in ('new', 'contacted', 'sold'));
$$;
revoke execute on function public.reserved_by(text, uuid) from public, anon, authenticated;

-- The caller's saved items with what a visitor may know about each: title,
-- grade, current price and where it stands (on sale, reserved, sold or no
-- longer available; reserved for them or bought by them when it was their own
-- reservation). Never buy prices, sources or notes.
create or replace function public.my_saved_items()
returns table (
  item_id text,
  title text,
  grade text,
  category text,
  price_paise bigint,
  price_when_saved_paise bigint,
  state text,
  saved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.item_id, nullif(trim(concat_ws(' ', i.brand, i.model)), ''), i.grade::text, i.category::text,
         case when i.status::text in ('listed', 'reserved') and not i.hidden then i.current_paise end,
         s.price_when_saved_paise,
         case when i.hidden then 'unavailable'
              when i.status::text = 'listed' then 'on_sale'
              when i.status::text = 'reserved' and public.reserved_by(i.id, s.user_id) then 'reserved_for_you'
              when i.status::text = 'reserved' then 'reserved'
              when i.status::text = 'sold' and public.reserved_by(i.id, s.user_id) then 'bought'
              when i.status::text = 'sold' then 'sold'
              else 'unavailable' end,
         s.saved_at
    from public.saved_items s
    join public.items i on i.id = s.item_id
   where auth.uid() is not null and s.user_id = auth.uid()
   order by s.saved_at desc;
$$;
revoke execute on function public.my_saved_items() from public, anon;
grant execute on function public.my_saved_items() to authenticated;

-- Tell everyone who saved an item when its price drops, it's reserved, it
-- comes back on sale, or it sells. Hidden items stay quiet; an item coming
-- out of hiding counts as coming back from "not in the shop". The person who
-- reserved or bought it hears about that from their request instead.
create or replace function public.notify_saved_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  title text := coalesce(nullif(trim(concat_ws(' ', new.brand, new.model)), ''), new.id);
  -- What savers could see before: nothing while it was hidden.
  v_was text := case when old.hidden then null else old.status::text end;
  v_now text := new.status::text;
  s record;
begin
  if new.hidden then
    return null;
  end if;
  for s in select user_id from public.saved_items where item_id = new.id loop
    if v_now = 'listed' and v_was = 'listed' and new.current_paise < old.current_paise then
      perform public.notify(s.user_id, 'saved_price_drop', 'Price dropped: ' || title,
        '₹' || to_char(round(old.current_paise / 100.0), 'FM99,99,99,999') || ' → ₹'
          || to_char(round(new.current_paise / 100.0), 'FM99,99,99,999'),
        '/shop/' || new.id);
    elsif v_now = 'listed' and v_was is distinct from 'listed' then
      perform public.notify(s.user_id, 'saved_back_on_sale', 'Back on sale: ' || title,
        'It is in the shop again.', '/shop/' || new.id);
    elsif v_now = 'reserved' and v_was is distinct from 'reserved'
          and not public.reserved_by(new.id, s.user_id) then
      perform public.notify(s.user_id, 'saved_reserved', 'Reserved by someone: ' || title,
        'It may come back on sale if the reservation falls through.', '/account/saved');
    elsif v_now = 'sold' and v_was is distinct from 'sold'
          and not public.reserved_by(new.id, s.user_id) then
      perform public.notify(s.user_id, 'saved_sold', 'Sold: ' || title,
        'It found a new owner. Similar items are in the shop.', '/shop?category=' || new.category::text);
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public.notify_saved_item() from public, anon, authenticated;
drop trigger if exists items_notify_saved on public.items;
create trigger items_notify_saved after update of current_paise, status, hidden on public.items
  for each row execute function public.notify_saved_item();
