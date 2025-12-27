-- Create table for storing daily AI insights per indicator
-- Ensure this is run in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.indicator_insights_daily (
    code TEXT NOT NULL,
    asof_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'error')),
    insight_md TEXT,
    signal_label TEXT, -- 'bullish', 'neutral', 'bearish'
    model TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (code, asof_date)
);

-- Index for fast lookup by date (likely pattern)
CREATE INDEX IF NOT EXISTS idx_indicator_insights_date ON public.indicator_insights_daily(asof_date);

-- Enable RLS (Optional but recommended, though API uses service key usually)
ALTER TABLE public.indicator_insights_daily ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or authenticated)
CREATE POLICY "Allow public read access" ON public.indicator_insights_daily
    FOR SELECT USING (true);

-- Allow service role full access (this is default, but explicit is fine)
-- No explicit policy needed for service role as it bypasses RLS
