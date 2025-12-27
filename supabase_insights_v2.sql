-- Add columns for smart caching based on data version
ALTER TABLE public.indicator_insights_daily
ADD COLUMN IF NOT EXISTS data_latest_date DATE;

ALTER TABLE public.indicator_insights_daily
ADD COLUMN IF NOT EXISTS data_fingerprint TEXT;

-- Index for finding the latest insight by data date
CREATE INDEX IF NOT EXISTS idx_insights_code_latest
ON public.indicator_insights_daily (code, data_latest_date DESC);

-- Prevent duplicates: only one DONE insight per indicator per latest observation date
-- This ensures we don't re-generate if we already have a finished insight for this data point.
CREATE UNIQUE INDEX IF NOT EXISTS uq_insights_done_code_data_latest_date
ON public.indicator_insights_daily (code, data_latest_date)
WHERE status = 'done' AND data_latest_date IS NOT NULL;
