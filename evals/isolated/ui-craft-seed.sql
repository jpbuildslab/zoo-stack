INSERT INTO service_requests (id, workspace, title, revision, status, scheduled_start)
SELECT 'cedar-craft-' || ordinality, 'cedar', title, 1,
       CASE ordinality % 3 WHEN 0 THEN 'cancelled' WHEN 1 THEN 'submitted' ELSE 'approved' END,
       '2030-01-13T09:00:00Z'::timestamptz + ordinality * interval '1 hour'
FROM unnest(ARRAY[
  'Long gallery adjoining the north entrance and reception desk',
  'Field service bay', 'Studio A', 'Materials room', 'Front desk', 'West entrance',
  'Meeting Room 4', 'Dispatch office', 'Equipment counter'
]) WITH ORDINALITY AS item(title, ordinality);
