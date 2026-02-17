-- Drop legacy isGuest trigger and function if they still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_is_guest'
  ) THEN
    DROP TRIGGER set_is_guest ON "users";
  END IF;
END$$;

-- Drop the function used by the trigger
DROP FUNCTION IF EXISTS public.update_is_guest();
