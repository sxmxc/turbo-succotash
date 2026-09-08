CREATE TABLE registration_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  beta_gate_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO registration_settings DEFAULT VALUES;

CREATE TABLE beta_key (
  id text PRIMARY KEY,
  key_hash bytea NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by text REFERENCES "user" (id),
  CHECK ((redeemed_at IS NULL) = (redeemed_by IS NULL))
);

CREATE INDEX beta_key_available_idx ON beta_key (key_hash)
  WHERE revoked_at IS NULL AND redeemed_at IS NULL;
