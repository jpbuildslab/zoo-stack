CREATE TABLE service_requests (
  id text PRIMARY KEY,
  workspace text NOT NULL,
  title text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('submitted', 'approved', 'cancelled')),
  scheduled_start timestamptz NOT NULL
);
INSERT INTO service_requests (id, workspace, title, revision, status, scheduled_start) VALUES
  ('cedar-submitted', 'cedar', 'Maple Room', 1, 'submitted', '2030-01-12T09:00:00Z'),
  ('cedar-approved', 'cedar', 'North Hall', 2, 'approved', '2030-01-12T10:00:00Z'),
  ('cedar-cancelled', 'cedar', 'Side Office', 2, 'cancelled', '2030-01-12T11:00:00Z'),
  ('birch-submitted', 'birch', 'Garden Room', 1, 'submitted', '2030-01-12T12:00:00Z'),
  ('birch-approved', 'birch', 'Workshop', 2, 'approved', '2030-01-12T13:00:00Z');
