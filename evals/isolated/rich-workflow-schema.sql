CREATE TABLE service_requests (
  id text PRIMARY KEY,
  workspace text NOT NULL,
  title text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('submitted', 'approved', 'cancelled')),
  scheduled_start timestamptz NOT NULL,
  purpose text NOT NULL,
  attendance integer NOT NULL CHECK (attendance > 0),
  UNIQUE (workspace, id)
);
CREATE INDEX service_requests_queue ON service_requests (workspace, scheduled_start, id);

CREATE TABLE approval_receipts (
  workspace text NOT NULL,
  actor_id text NOT NULL,
  operation_id uuid NOT NULL,
  request_id text NOT NULL,
  reviewed_revision integer NOT NULL CHECK (reviewed_revision > 0),
  http_status integer,
  response jsonb,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace, actor_id, operation_id),
  FOREIGN KEY (workspace, request_id) REFERENCES service_requests (workspace, id),
  CHECK ((http_status IS NULL AND response IS NULL) OR
         (http_status IN (200, 409) AND response IS NOT NULL))
);
CREATE UNIQUE INDEX approval_receipts_one_success
  ON approval_receipts (workspace, request_id) WHERE http_status = 200;
