CREATE TABLE room (
  id uuid PRIMARY KEY,
  floor_number integer NOT NULL CHECK (floor_number >= 0),
  room_number integer NOT NULL CHECK (room_number BETWEEN 1 AND 500),
  template_id text NOT NULL,
  owner_user_id text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  is_private boolean NOT NULL DEFAULT false,
  password_hash bytea,
  password_salt bytea,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_private AND password_hash IS NOT NULL AND password_salt IS NOT NULL) OR (NOT is_private AND password_hash IS NULL AND password_salt IS NULL)),
  UNIQUE (floor_number, room_number)
);

INSERT INTO room (id, floor_number, room_number, template_id, name, capacity)
VALUES ('00000000-0000-4000-8000-000000000001', 0, 1, 'floor_0_lobby', 'Floor 0 Lobby', 20);
