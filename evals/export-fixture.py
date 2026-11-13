"""Export only a nominated Zoo fixture from an exact commit."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("commit", help="Full Git commit ID")
    parser.add_argument("fixture", choices=("first-tasks", "service-requests", "preferences-cli"))
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]

    def git(*values):
        return subprocess.check_output(["git", "-C", str(root), *values])

    if not re.fullmatch("[0-9a-f]{40}", args.commit) or git("cat-file", "-t", args.commit) != b"commit\n":
        parser.error("commit must be the full ID of a commit in this repository")
    destination = args.destination.resolve()
    if destination.is_relative_to(root):
        parser.error("destination must be outside the source repository")

    prefix = PurePosixPath("evals", "fixtures", args.fixture)
    listing = git("ls-tree", "-rz", args.commit, "--", str(prefix)).split(b"\0")
    files = []
    for entry in filter(None, listing):
        metadata, name = entry.split(b"\t", 1)
        mode, kind, object_id = metadata.decode("ascii").split()
        relative = PurePosixPath(name.decode("utf-8")).relative_to(prefix)
        if kind != "blob" or mode not in ("100644", "100755") or {".git", ".."} & set(relative.parts):
            parser.error(f"unexpected fixture entry {relative}")
        files.append((relative, int(mode[-3:], 8), object_id))
    if not files:
        parser.error("fixture contains no files at this commit")

    destination.mkdir(mode=0o700)
    manifest = {}
    try:
        for relative, mode, object_id in files:
            data = git("cat-file", "blob", object_id)
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as handle:
                handle.write(data)
            target.chmod(mode)
            manifest[str(relative)] = hashlib.sha256(data).hexdigest()
    except BaseException:
        shutil.rmtree(destination)
        raise
    print(json.dumps({"commit": args.commit, "fixture": args.fixture, "files": manifest}, indent=2))


if __name__ == "__main__":
    main()
