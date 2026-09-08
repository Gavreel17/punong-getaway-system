-- Migration: Allow same-day bookings for day-use cottages and day tours
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_check CHECK (check_out >= check_in);
