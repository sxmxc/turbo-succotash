CREATE TABLE direct_message (
  id uuid PRIMARY KEY,
  client_request_id text NOT NULL CHECK (char_length(client_request_id) BETWEEN 1 AND 80),
  sender_user_id text NOT NULL,
  sender_display_name text NOT NULL CHECK (char_length(sender_display_name) BETWEEN 1 AND 40),
  recipient_user_id text NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  UNIQUE (sender_user_id, client_request_id),
  CHECK (sender_user_id <> recipient_user_id),
  CHECK (read_at IS NULL OR delivered_at IS NOT NULL)
);

CREATE INDEX direct_message_sender_created_idx
  ON direct_message (sender_user_id, created_at DESC);
CREATE INDEX direct_message_recipient_created_idx
  ON direct_message (recipient_user_id, created_at DESC);

CREATE TABLE direct_message_reaction (
  message_id uuid NOT NULL REFERENCES direct_message(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
