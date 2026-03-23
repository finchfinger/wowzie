-- Enable realtime for the attendance table so hosts on multiple devices stay in sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
