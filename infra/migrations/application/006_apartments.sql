ALTER TABLE room ADD COLUMN is_apartment boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX room_owner_apartment_unique ON room(owner_user_id) WHERE is_apartment;
