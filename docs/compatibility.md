# Host compatibility

Zoo's portable workflow lives in [one skill directory](../skills/zoo/SKILL.md). The host determines what can be loaded, which tools can run, and which files and services those tools can reach.

The alpha suite has four optional companion directories. The historical table below
describes the core package; do not assume it covers the companions or a different installation.
Each package is independently self-contained. Before the alpha, fresh local CLI App Server rehearsals
observed all five packages individually through staging, collision, recovery and removal. A separate
source-only exercise read the API/UI methods. Explicit companion selection and repository guidance
determine composition; metadata availability alone is not a behavioral loading result. No new Desktop
picker, cross-host or provider observation is claimed for the suite.

| Path | Observed coverage |
| --- | --- |
| Local Codex CLI with direct file references | Scoped planning, routine edits and checks, an implemented rescheduling fixture, and fresh continuation. The application was checked separately in Docker with its own PostgreSQL and browser observer. |
| Local CLI App Server with project-local skills | Repository discovery, structured skill selection, and reads of the installed Zoo entrypoint. Earlier core checks covered installation, collisions, interrupted update, rollback and removal. |
| Codex Desktop direct file references | An earlier bootstrap entrypoint, linked reference and sample were read. A fresh chat read the sample from a checkpoint. That observed Desktop session reported unrestricted filesystem access. This does not establish full-suite Desktop behavior. |
| Codex Desktop picker | Pending explicit discovery and attachment evidence. |

Historical core CLI and App Server observations used Codex `0.167.0-alpha.3.2` on macOS. The new suite
catalog rehearsals used `0.167.0-alpha.4.1`. Run [the staging checks](local-skill.md) when the host or
package changes. Keep invocation, actual reads, permissions and installed-file identity in the record.

The checked-in [CI definition](../.github/workflows/check.yml) covers skill metadata, inline links and
small fixture checks. Its commands were verified locally. Open the
[Check Zoo workflow](https://github.com/jpbuildslab/zoo-stack/actions/workflows/check.yml) and select the
run for your commit to check hosted status;
a passing static workflow does not establish model or runtime behavior.
