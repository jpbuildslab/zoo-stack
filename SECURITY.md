# Reporting a security issue

Use [GitHub private vulnerability reporting](https://github.com/jpbuildslab/zoo-stack/security/advisories/new)
for a possible credential exposure, unexpected tool access or other sensitive failure. You can also
open the repository's Security tab, select Advisories, and choose Report a vulnerability.

Include the affected release or commit, host and permission settings, selected skill, expected boundary
and observed behavior. A small synthetic reproduction is more useful than a complete private transcript.
Do not send real credentials, customer data or unrelated private files.

Keep sensitive details out of public issues and pull requests. If the private form is unavailable,
open an issue asking for a private reporting route without describing the vulnerability or attaching data.

JP maintains this alpha and reviews reports as time permits. There is no guaranteed response time.
The process is to confirm the affected behavior, prepare a focused correction, verify it and coordinate
public disclosure. Older alpha versions do not have a separate maintenance commitment.

Zoo's instructions are not a sandbox. A skill can describe a boundary, but tool and filesystem access
are enforced by the host. Report whether a failure involved an instruction, an attempted action, an
allowed tool operation or an observed external effect so we can address the right layer.
