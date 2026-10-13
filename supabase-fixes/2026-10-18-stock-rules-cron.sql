-- Runs the business plan's unsold-stock rules every day at 00:30 UTC (06:00
-- IST) with pg_cron: a 20% price cut at day 45 and a downgrade to C at day 75,
-- each once per item (apply_stock_rules is idempotent, see 20261018000001).
-- Safe to run twice: scheduling the same job name again updates it.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('reloop-stock-rules', '30 0 * * *', $$select public.apply_stock_rules()$$);

select jobname, schedule, command, active from cron.job where jobname = 'reloop-stock-rules';
