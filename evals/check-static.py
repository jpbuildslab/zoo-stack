"""Validate all skill packages and candidate inline Markdown links."""

from pathlib import Path
import subprocess
from package_checks import validate_skill, check_markdown


def main():
    root = Path(__file__).resolve().parents[1]
    skills = sorted(p for p in (root / "skills").iterdir() if p.is_dir() or p.is_symlink())
    if not skills:
        raise ValueError("no skill packages found")
    license_text = (root / "LICENSE").read_bytes()
    for skill in skills:
        validate_skill(skill)
        if (skill / "LICENSE").read_bytes() != license_text:
            raise ValueError(f"{skill.name}: package must carry the current license")
    # Include pending new files, so an unstaged new skill cannot escape the check.
    paths = subprocess.check_output(
        ["git", "-C", str(root), "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        text=True,
    ).split("\0")
    count = 0
    for relative in sorted(set(p for p in paths if p.endswith(".md"))):
        file = root / relative
        package = next((s for s in skills if file.is_relative_to(s)), root)
        count += check_markdown(file, package)
    print(f"{len(skills)} portable skills and {count} local Markdown links passed.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from error
