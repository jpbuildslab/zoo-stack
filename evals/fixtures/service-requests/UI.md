# Request desk UI

## Task and behavior

A coordinator scans one workspace for a request and its scheduled UTC time. Keep the active
workspace visible. Let operators filter by request title, clear the filter, and recover from no
matches. Keep titles, status, and scheduled date, time and timezone easy to scan.

Keep the existing review, permissions, confirmation and recovery path. A viewer can read the
queue. A coordinator can only review submitted requests in their workspace. Preserve keyboard
navigation and visible focus. Check long titles, no matches, phone and desktop, and the
transition between them. After approval, the operator should be able to find the updated request.
If approval is uncertain, keep the original request context and the status-check action.

## Presentation

The existing desk, queue preview at `/?preview=queue`, and operations note at `/?preview=reading`
show the starting vocabulary. Both previews use sample data. An accepted direction must be
identified explicitly in the task packet. Typography, colors, row geometry, and dialog styling
can change within an approved direction.

For a reading task, preserve the note's title, headings and text in reading order. Carry over the
selected vocabulary where it supports reading. Choose a measure, hierarchy and spacing suited to
the note's purpose.
