# Visual Acceptance

Choose evidence for the requested decision. Compare the target with the relevant accepted reference
at widths and states where layout, content, or actions change. Include desktop and narrow layouts
for responsive work and intermediate widths where behavior changes. Compare hierarchy, density,
geometry, action prominence, state treatment, and whether users can still find the same information
and actions. Use pixel diffs to investigate specific drift when helpful.

When building a code example or preview, use the product's production components where available,
with synthetic state fixtures. Identify where fixtures stand in for live behavior. Experimental
mocks can illustrate a direction or a state. An explicit acceptance decision can establish a mock as
a presentation reference.

Use source, state fixtures, and focused tests to substantiate contracts and reproduce states. When
the environment and scope allow, verify the rendered UI through the repository's normal preview or
browser workflow. Exercise the relevant keyboard and focus paths, overflow and layout changes, and
action, result, or recovery states. A code or test result supports only the properties it verifies.

Show representative reference and target views when they help the owner judge the result. Describe
material deviations, which states and widths were exercised, and any gaps in available evidence.
Report whether acceptance is established or the work remains a candidate. Owner acceptance
establishes qualitative fit. Automated checks and screenshots provide evidence for that judgment.
