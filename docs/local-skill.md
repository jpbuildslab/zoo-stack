# Stage a pinned Zoo skill locally

Use a disposable Git project and an exact commit of the Zoo repository. Codex's project-local catalog reads `.agents/skills/`. Each whole directory under `skills/` is a separate package, including its references, metadata and license. Copy the whole directory so its license stays with it. Install only the selected methods. [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills#where-to-save-skills)

1. Export `skills/<selected-name>` from the selected commit with `git archive`. Extract it to staging outside the project's catalog. Verify its file list, matching discovery name, metadata and contained references. Keep a digest and the source commit. For the general entrypoint, the selected name is `zoo`.
2. Check `.agents/skills/<selected-name>` and the catalog from the intended working directory. If the destination exists or the name is already offered elsewhere, resolve ownership before activation. Do not overwrite a product's existing companion skill just because the names match.
3. Move the validated directory into `.agents/skills/`. Use a fresh catalog view to confirm the offered path. For a behavioral loading check, record explicit selection and the observed entrypoint read in that host. Companion metadata disables implicit invocation; explicitly name each selected method or follow the repository's explicit routing.

For multiple packages, validate every destination before activating any and keep an installation
receipt outside the catalog. Do not leave a partial installation presented as a complete suite.
The receiving repository keeps its own product definitions; see [the guidance interface](repository-guidance.md).

## Update or recover

Stage and verify the new copy. Let any task using the installed skill finish, or pause it and retain its handoff, before moving the installed directory. During the switch, keep the previous copy outside the catalog and record where it went. Activate the staged directory at the same path and verify the path and digest in a fresh task or catalog. Resume paused work in a fresh task so it loads the selected package.

If interrupted before activation, restore the known prior directory to the empty destination. To roll back an activated update, finish or pause any task using that version before restoring the saved copy. After either recovery, verify the restored path and digest in a fresh task or catalog. Keep only one intended copy of each selected skill visible from the project. Remove the exact owned project-local directory to uninstall, then check that a fresh catalog no longer lists it there.

The local CLI checks cover catalog mechanics. Swapping the package inside an active task remains unverified. Model loading and Desktop picker attachment each require their own observation.

The [disposable catalog check](../evals/check-local-skill.py) exercises one selected package:

```sh
python3 evals/check-local-skill.py <prior-full-commit> <candidate-full-commit> --skill zoo-ui-craft
```

It records paths, the complete manifest and whether package bytes differ. For a new package with no
prior version, the same commit may be used twice to rehearse replacement/recovery mechanics. That is
not evidence of a different-version upgrade. Run the actual prior-to-candidate check when both exist.
