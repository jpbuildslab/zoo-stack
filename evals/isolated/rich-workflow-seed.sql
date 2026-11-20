INSERT INTO service_requests (id, workspace, title, revision, status, scheduled_start, purpose, attendance)
SELECT 'cedar-' || lpad(n::text, 2, '0'), 'cedar',
  CASE n WHEN 20 THEN 'Workshop: gallery access and arrival planning'
         WHEN 21 THEN 'Workshop: materials and safety briefing'
         ELSE 'Workshop: ' || (ARRAY['Community planning', 'Volunteer training', 'Room orientation', 'Equipment briefing', 'Facilitator practice', 'Visitor induction'])[1 + (n - 1) % 6] || ' ' || lpad(n::text, 2, '0') END,
  CASE WHEN n <= 25 THEN 1 ELSE 2 END,
  CASE WHEN n <= 25 THEN 'submitted' WHEN n <= 40 THEN 'approved' ELSE 'cancelled' END,
  CASE n WHEN 21 THEN '2030-01-12T19:00:00Z'::timestamptz
         ELSE '2030-01-12T00:00:00Z'::timestamptz + (n - 1) * interval '1 hour' END,
  CASE n WHEN 20 THEN 'Review wheelchair access, mark an unobstructed route from reception, and brief volunteers before the public workshop.'
         WHEN 21 THEN 'Lay out training materials and review the equipment checklist with the volunteer leads.'
         ELSE (ARRAY['Prepare the room and review the agenda with the coordinators.',
                     'Practice the welcome and check the seating layout before guests arrive.',
                     'Review the arrival schedule and coordinate equipment with the venue team.'])[1 + (n - 1) % 3] END,
  CASE n WHEN 20 THEN 24 ELSE 8 + n % 31 END
FROM generate_series(1, 48) n;

INSERT INTO service_requests (id, workspace, title, revision, status, scheduled_start, purpose, attendance)
SELECT 'birch-' || lpad(n::text, 2, '0'), 'birch',
  CASE n WHEN 1 THEN 'Workshop: gallery access and arrival planning' ELSE 'Workshop: Birch room orientation ' || n END,
  1, 'submitted', '2030-01-12T09:00:00Z'::timestamptz + n * interval '1 hour',
  'Confirm access with the Birch venue team.', 12
FROM generate_series(1, 8) n;
