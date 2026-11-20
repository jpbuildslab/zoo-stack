# Visual Acceptance

Choose evidence for the requested decision. Compare the target with the relevant accepted reference
at widths and states where layout, content, or actions change. Include desktop and narrow layouts
for responsive work and intermediate widths where behavior changes. Compare hierarchy, density,
geometry, action prominence, state treatment, and whether users can still find the same information
and actions. Inspect normal viewport images for the first screen of work and full-page views where
content or overflow warrants them. Use pixel diffs to investigate specific drift when helpful.

When color or emphasis changes, compare the idle, selected, keyboard-focused, and exception
states together. Check what each treatment tells the user. Distinguish selection from focus and
use the strongest emphasis for the action or exception that needs attention. Keep state and
actions understandable from their labels even without color. Preserve a visible focus indicator
when reducing visual noise.

Compare adjacent rows with and without actions, and compare the same row before and after a
state change. Check that adding a control does not set an unintended row height or move a field
the user scans. Compare rendered text at the same viewport and scale before tuning type or spacing.

When building a code example or preview, use the product's production components where available,
with synthetic state fixtures. Identify where fixtures stand in for live behavior. Experimental
mocks can illustrate a direction or a state. An explicit acceptance decision can establish a mock as
a presentation reference.

Use source, state fixtures, and focused tests to substantiate contracts and reproduce states. When
the environment and scope allow, verify the rendered UI through the repository's normal preview or
browser workflow. Exercise the relevant keyboard and focus paths, overflow and layout changes, and
action, result, or recovery states. For a changed composition, inspect the transitions as well as
the endpoints. Follow a distant selection, the change in scroll ownership at narrower widths,
and the return or next action when they apply.

Inspect controls in the opened and edited states users encounter. Choose native or authored
controls against the product's requirements and available primitives. Include the popup and
its keyboard and dismissal behavior in the check when it matters to the task.

The person making visual decisions should inspect the rendered reference and target images. Record
the state, viewport, and a concrete observation that informed a decision. When another process
renders the UI, give the implementer the actual images and their identities. If images cannot be
inspected, leave visual judgment pending. A test result or a screenshot path alone provides no
visual verdict.

Show representative views for the owner's decision. Record the scope of acceptance, material
deviations and gaps alongside the behavioral checks. Distinguish developing a direction from
implementing an accepted reference. Evidence of independent design judgment requires a task where
the intended composition was left open.
