-- Deletes closed public requests 12 months after they were closed, every day
-- at 22:00 UTC (03:30 IST), with pg_cron. See migration 20261023000001.
-- Safe to run twice: scheduling the same job name again updates it.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('reloop-request-retention', '0 22 * * *', $$select public.purge_closed_requests()$$);

select jobname, schedule, command, active from cron.job where jobname = 'reloop-request-retention';
