-- Durable schema foundation; gameplay records belong to later migrations.
CREATE TABLE bootstrap (id boolean PRIMARY KEY DEFAULT true CHECK (id), created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO bootstrap DEFAULT VALUES;
