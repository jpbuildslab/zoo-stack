"""Check pinned Zoo staging and recovery in a disposable CLI catalog."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from threading import Timer
from package_checks import check_markdown


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prior", help="Full commit for the original package")
    parser.add_argument("candidate", help="Full commit for the candidate package")
    parser.add_argument("--skill", default="zoo", help="Package directory/name under skills (default: zoo)")
    args = parser.parse_args()
    if not all(re.fullmatch(r"[0-9a-f]{40}", rev) for rev in (args.prior, args.candidate)):
        parser.error("provide full commit IDs")
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", args.skill):
        parser.error("provide a skill directory name, not a path")
    repository = Path(__file__).resolve().parents[1]

    def git(*values):
        return subprocess.check_output(["git", "-C", str(repository), *values])

    with tempfile.TemporaryDirectory(prefix="zoo-local-skill-") as directory:
        owned = Path(directory).resolve()
        project = owned / "project"
        project.mkdir()
        subprocess.run(["git", "init", "-q", str(project)], check=True)
        home = owned / "client-home"
        home.mkdir()
        target = project / ".agents/skills" / args.skill
        target.parent.mkdir(parents=True)
        stage = owned / "stage"
        stage.mkdir()
        observations = {}

        def stage_package(revision, destination):
            assert git("cat-file", "-t", revision) == b"commit\n"
            prefix = Path("skills") / args.skill
            manifest = {}
            for entry in filter(None, git("ls-tree", "-rz", revision, "--", str(prefix)).split(b"\0")):
                metadata, name = entry.split(b"\t", 1)
                mode, kind, oid = metadata.decode().split()
                relative = Path(name.decode()).relative_to(prefix)
                if kind != "blob" or mode not in {"100644", "100755"} or ".." in relative.parts:
                    raise RuntimeError("unexpected file in the skill package")
                file = destination / relative
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(git("cat-file", "blob", oid))
                file.chmod(int(mode, 8) & 0o777)
                manifest[relative.as_posix()] = digest(file)
            assert (destination / "SKILL.md").is_file()
            for text in destination.rglob("*.md"):
                check_markdown(text, destination)
            return manifest

        def discover(cwd=project):
            requests = [
                {"id": 1, "method": "initialize", "params": {"clientInfo": {"name": "zoo-catalog-check", "version": "1.0.0"}}},
                {"method": "initialized"},
                {"id": 2, "method": "skills/list", "params": {"cwds": [str(cwd)], "forceReload": True}},
            ]
            command = ["codex", "app-server", "--listen", "stdio://",
                       "--disable", "plugins", "--disable", "memories"]
            process = subprocess.Popen(command, env={**os.environ, "CODEX_HOME": str(home)},
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                       stderr=subprocess.DEVNULL, text=True)
            deadline = Timer(15, process.kill)
            deadline.daemon = True
            deadline.start()
            try:
                for request in requests:
                    process.stdin.write(json.dumps(request) + "\n")
                process.stdin.flush()
                for line in process.stdout:
                    response = json.loads(line)
                    if response.get("id") == 2:
                        skills = response["result"]["data"][0]["skills"]
                        return sorted((str(Path(skill["path"]).relative_to(project)), digest(Path(skill["path"])))
                                      for skill in skills if skill["name"] == args.skill
                                      and skill["scope"] == "repo" and skill["enabled"])
                raise RuntimeError("the CLI catalog did not return")
            finally:
                deadline.cancel()
                if process.poll() is None:
                    process.terminate()
                process.communicate(timeout=8)

        def activate(directory):
            if target.exists() or target.is_symlink():
                raise FileExistsError(target)
            directory.rename(target)

        def assert_contents(expected):
            actual = {file.relative_to(target).as_posix(): digest(file)
                      for file in target.rglob("*") if file.is_file()}
            assert actual == expected

        prior = stage_package(args.prior, stage / "prior")
        candidate = stage_package(args.candidate, stage / "candidate")
        assert not discover()
        activate(stage / "prior")
        previous = discover()
        entry_path = f".agents/skills/{args.skill}/SKILL.md"
        assert previous == [(entry_path, prior["SKILL.md"])]
        assert_contents(prior)
        observations["initial"] = previous
        try:
            activate(stage / "candidate")
            raise RuntimeError("activation overwrote an existing target")
        except FileExistsError:
            assert discover() == previous
            assert_contents(prior)
        observations["existing_target"] = "unchanged"
        nested = project / "feature"
        stage_package(args.candidate, nested / ".agents/skills" / args.skill)
        duplicate = discover(nested)
        assert duplicate == sorted([(entry_path, prior["SKILL.md"]),
                                    (f"feature/{entry_path}", candidate["SKILL.md"])])
        observations["catalog_collision"] = duplicate
        shutil.rmtree(nested)

        backup = stage / "backup"
        target.rename(backup)
        assert not discover()
        activate(backup)
        assert discover() == previous
        assert_contents(prior)
        observations["interrupted_update"] = "original restored"
        target.rename(backup)
        activate(stage / "candidate")
        updated = discover()
        assert updated == [(entry_path, candidate["SKILL.md"])]
        assert {file.relative_to(target).as_posix(): digest(file) for file in target.rglob("*") if file.is_file()} == candidate
        observations["update"] = updated
        target.rename(stage / "saved-new")
        activate(backup)
        assert discover() == previous
        assert_contents(prior)
        observations["rollback"] = "original restored"
        target.rename(stage / "removed")
        assert not discover()
        observations["removal"] = "repo-local entry absent"
        print(json.dumps({"host": "CLI App Server catalog", "skill": args.skill,
                          "different_package_bytes": prior != candidate, "prior": args.prior,
                          "candidate": args.candidate, "package": candidate, "observations": observations}, indent=2))


if __name__ == "__main__":
    main()
