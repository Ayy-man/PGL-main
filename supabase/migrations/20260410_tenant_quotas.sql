-- Add seat limits and plan columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 5;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';
