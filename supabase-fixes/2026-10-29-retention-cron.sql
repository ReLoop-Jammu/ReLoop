-- Runs every retention rule once a day at 22:00 UTC (03:30 IST), with
-- pg_cron: closed requests after 12 months, notifications after 90 days and
-- handled deletion requests after 12 months (migration 20261029000001).
-- Replaces the job from 2026-10-23-request-retention-cron.sql (same name).
-- Safe to run twice: scheduling the same job name again updates it.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('reloop-request-retention', '0 22 * * *', $$select public.purge_expired_personal_data()$$);

select jobname, schedule, command, active from cron.job where jobname = 'reloop-request-retention';
