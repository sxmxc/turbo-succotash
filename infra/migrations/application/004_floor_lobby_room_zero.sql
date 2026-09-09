ALTER TABLE room DROP CONSTRAINT room_room_number_check;

UPDATE room
SET room_number = room_number - 1;

ALTER TABLE room
  ADD CONSTRAINT room_room_number_check CHECK (room_number BETWEEN 0 AND 500),
  ADD CONSTRAINT room_zero_system_lobby CHECK (room_number <> 0 OR owner_user_id IS NULL);
