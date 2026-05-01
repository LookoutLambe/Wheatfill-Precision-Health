-- Run once if `provider_profiles` already exists with approved_by as uuid.
-- Safe to re-run: casting uuid → text is idempotent on already-text columns only if you skip errors;
-- prefer checking information_schema if automating.

ALTER TABLE public.provider_profiles
  ALTER COLUMN approved_by TYPE text USING approved_by::text;
