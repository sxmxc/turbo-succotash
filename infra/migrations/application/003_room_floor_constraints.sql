ALTER TABLE room
  ADD CONSTRAINT room_floor_number_max CHECK (floor_number <= 999),
  ADD CONSTRAINT room_floor_zero_official CHECK (floor_number <> 0 OR owner_user_id IS NULL);
