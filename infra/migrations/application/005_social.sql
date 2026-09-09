CREATE TABLE avatar_appearance (
  user_id text PRIMARY KEY,
  shirt_tint integer NOT NULL CHECK (shirt_tint IN (15718050, 11197380, 12825573)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE friendship (
  user_low_id text NOT NULL,
  user_high_id text NOT NULL,
  requested_by_user_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_low_id, user_high_id),
  CHECK (user_low_id < user_high_id),
  CHECK (requested_by_user_id IN (user_low_id, user_high_id))
);

CREATE TABLE user_presence (
  user_id text PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  room_id uuid NOT NULL REFERENCES room(id) ON DELETE CASCADE,
  room_address text NOT NULL,
  online boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
