-- Table: go_reminders
-- Stores scheduled push reminders for gigs
CREATE TABLE IF NOT EXISTS go_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES go_gigs(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the cron query: find unsent reminders that are due
CREATE INDEX IF NOT EXISTS idx_go_reminders_due 
  ON go_reminders(remind_at) 
  WHERE sent = FALSE;

-- Index for gig cleanup
CREATE INDEX IF NOT EXISTS idx_go_reminders_gig 
  ON go_reminders(gig_id);

-- RLS: only admins can manage reminders
ALTER TABLE go_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their reminders" ON go_reminders
  FOR ALL
  USING (
    gig_id IN (
      SELECT id FROM go_gigs WHERE admin_id = auth.uid()
    )
  );

-- Add reminder_minutes column to go_gigs (stores which presets were selected)
-- Values: array of minutes like [10080, 2880, 1440, 720, 180, 60]
ALTER TABLE go_gigs ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER[] DEFAULT '{}';
