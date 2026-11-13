"""Shared dependency-free checks for portable skill boundaries and inline links."""

from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

PRIVATE_HOME = re.compile(r"/(?:Users|home)/[^\s/]+|[A-Za-z]:\\Users\\")


def validate_skill(skill):
    if skill.is_symlink():
        raise ValueError(f"{skill.name}: package must not be a symlink")
    entry = skill / "SKILL.md"
    if entry.is_symlink():
        raise ValueError(f"{skill.name}: entrypoint must not be a symlink")
    text = entry.read_text()
    pieces = text.split("---\n", 2)
    if len(pieces) != 3 or pieces[0] or not pieces[2].strip():
        raise ValueError(f"{skill.name}: missing frontmatter or body")
    name = re.search(r"^name:[ \t]*(.+)$", pieces[1], re.M)
    if not name or name[1].strip().strip("\"'") != skill.name:
        raise ValueError(f"{skill.name}: discovery name must match package directory")
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", skill.name):
        raise ValueError(f"{skill.name}: invalid skill name")
    description = re.search(r"^description:[ \t]*(.+)$", pieces[1], re.M)
    if not description or not 1 <= len(description[1].strip().strip("\"'")) <= 1024:
        raise ValueError(f"{skill.name}: missing or oversized discovery description")
    for file in skill.rglob("*"):
        if file.is_symlink():
            raise ValueError(f"{skill.name}: package contains a symlink: {file.name}")
        if file.is_file() and file.suffix in {".md", ".yaml", ".yml", ".json", ".toml"}:
            if PRIVATE_HOME.search(file.read_text()):
                raise ValueError(f"{skill.name}: contains a machine-specific home path")

    explicit = {"zoo-production-loop", "zoo-api-craft", "zoo-ui-craft", "zoo-runtime-acceptance"}
    if skill.name in explicit:
        metadata = (skill / "agents/openai.yaml").read_text()
        policies = re.findall(r"^policy:\s*\n((?:[ \t]+[^\n]*\n|\n)*)", metadata, re.M)
        if len(policies) != 1 or re.findall(r"^  allow_implicit_invocation:[ \t]*(\S+)[ \t]*$", policies[0], re.M) != ["false"]:
            raise ValueError(f"{skill.name}: expected explicit invocation metadata")


def check_markdown(file, allowed):
    count = 0
    for match in re.finditer(r"\]\(([^)]+)\)", file.read_text()):
        raw = match[1].strip("<>")
        link = urlsplit(raw)
        if link.scheme in {"http", "https", "mailto"}:
            continue
        if link.scheme or link.netloc:
            raise ValueError(f"{file.name}: unsupported local link: {raw}")
        if not link.path:
            continue
        path = Path(unquote(link.path))
        target = (file.parent / path).resolve()
        if path.is_absolute() or not target.is_relative_to(allowed.resolve()) or not target.is_file():
            raise ValueError(f"{file.name}: unresolved or escaping local link: {raw}")
        count += 1
    return count
