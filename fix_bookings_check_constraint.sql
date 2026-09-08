-- Fix: Allow same-day bookings (e.g. Day Tour and Cottages where check_in = check_out)
-- Run this query in your Supabase Dashboard -> SQL Editor

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_check;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_check CHECK (check_out >= check_in);
