-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "isGuest" SET DEFAULT true;

CREATE OR REPLACE FUNCTION update_is_guest()
RETURNS TRIGGER AS $$
BEGIN
  NEW."isGuest" := (NEW."phoneNumber" IS NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_is_guest
BEFORE INSERT OR UPDATE OF "phoneNumber"
ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_is_guest();
