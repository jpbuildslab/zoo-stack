"""Preflight a scoped local Codex command profile, or run one nominated demo."""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile


def toml_map(values):
    return "{" + ",".join(f"{json.dumps(key)}={json.dumps(value)}" for key, value in values.items()) + "}"


def command_profile(project, skill, writes, node):
    paths = {":minimal": "read", str(project): "read"}
    if skill:
        paths[str(skill)] = "read"
    if node:
        # The installed Homebrew Node loads its pinned binary and library kegs.
        paths.update({"/opt/homebrew/Cellar": "read", "/opt/homebrew/opt": "read"})
    paths.update({str(project / name): "write" for name in writes})
    if "." in writes:
        for name in ("AGENTS.md", "package.json", "package-lock.json"):
            if (project / name).is_file():
                paths[str(project / name)] = "read"
    return [
        "-c", 'default_permissions="zoo_local"',
        "-c", "permissions.zoo_local.filesystem=" + toml_map(paths),
        "-c", "permissions.zoo_local.network.enabled=false",
    ]


def preflight(codex, profile, project, skill, writes, node, notice_test, allow_red):
    with tempfile.TemporaryDirectory(prefix="zoo-sb-") as directory:
        sandbox_home = Path(directory).resolve()
        outside = sandbox_home / "outside-scope"
        outside.write_text("Synthetic evaluator canary.\n")
        env = {**os.environ, "CODEX_HOME": str(sandbox_home), "OPENSSL_CONF": "/dev/null"}
        base = [codex, "sandbox", *profile, "--permission-profile", "zoo_local",
                "--include-managed-config", "-C", str(project), "--"]
        results = {}

        def expect(label, allowed, *command):
            result = subprocess.run(base + list(command), env=env, capture_output=True, timeout=15)
            results[label] = result.returncode
            if (result.returncode == 0) != allowed:
                raise RuntimeError(f"{label} did not match the local profile: {result.stderr.decode()}")

        expect("fixture_read", True, "/bin/cat", str(project / "AGENTS.md"))
        for name in writes:
            if name == ".":
                test_path = project / ".zoo-write-preflight"
                expect("fixture_write", True, "/bin/sh", "-c", ': > "$1"; /bin/rm "$1"', "zoo", str(test_path))
            else:
                # Open an existing file for append without changing its contents.
                expect(f"write_{name}", True, "/bin/sh", "-c", ': >> "$1"', "zoo", str(project / name))
        if skill:
            expect("skill_read", True, "/bin/cat", str(skill / "SKILL.md"))
            expect("skill_write_denied", False, "/bin/sh", "-c", ': >> "$1"', "zoo", str(skill / "SKILL.md"))
        expect("guidance_write_denied", False, "/bin/sh", "-c", ': >> "$1"', "zoo", str(project / "AGENTS.md"))
        expect("outside_read_denied", False, "/bin/cat", str(outside))
        expect("outside_write_denied", False, "/bin/sh", "-c", ': >> "$1"', "zoo", str(outside))
        link = project / f".zoo-scope-{os.getpid()}"
        link.symlink_to(outside)
        try:
            expect("outside_symlink_denied", False, "/bin/cat", str(link))
        finally:
            link.unlink()
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            port = str(listener.getsockname()[1])
            expect("unowned_loopback_denied", False, "/usr/bin/nc", "-z", "-G", "1", "127.0.0.1", port)
        with socket.socket(socket.AF_UNIX) as listener:
            endpoint = sandbox_home / "s"
            listener.bind(str(endpoint))
            listener.listen()
            expect("unowned_unix_socket_denied", False, "/usr/bin/nc", "-z", "-U", str(endpoint))
        process = subprocess.Popen(["/bin/sleep", "30"])
        try:
            expect("unowned_signal_denied", False, "/bin/kill", "-TERM", str(process.pid))
        finally:
            if process.poll() is None:
                process.terminate()
            process.wait(timeout=5)
        if node:
            expect("node_runtime", True, str(node), "--version")
        if notice_test:
            expect("node_fixture_test", not allow_red, str(node), "--test", "notices.test.ts")
        return results


def isolate_catalog(codex, project, flags):
    home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    for name in ("AGENTS.override.md", "AGENTS.md"):
        file = home / name
        if file.is_file() and file.stat().st_size:
            raise RuntimeError("a nonempty global guidance file would enter the comparison")

    def catalog(extra):
        result = subprocess.run(
            [codex, "debug", "prompt-input", *flags, *extra, "Synthetic catalog preflight"],
            cwd=project, capture_output=True, text=True, timeout=20, check=True,
        )
        contents = (part.get("text", "") for item in json.loads(result.stdout)
                    for part in item.get("content", []))
        return sorted({match.group(1) for text in contents if "available skills" in text.lower()
                       for match in re.finditer(r"^- ([\w-]+):.*SKILL\.md.*$", text, re.M)})

    names = catalog([])
    rules = "[" + ",".join(toml_map({"name": name})[:-1] + ",enabled=false}" for name in names) + "]"
    extra = ["-c", "skills.config=" + rules]
    if catalog(extra):
        raise RuntimeError("ambient skills remain in the rendered prompt")
    return extra, len(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("evidence", type=Path)
    parser.add_argument("--skill", type=Path)
    parser.add_argument("--write", action="append", default=[])
    parser.add_argument("--node-test", action="store_true")
    parser.add_argument("--node-runtime", action="store_true")
    parser.add_argument("--allow-red-test", action="store_true")
    parser.add_argument("--matched-catalog", action="store_true")
    parser.add_argument("--prompt", type=Path, help="Submit one invocation; without this flag only preflight")
    args = parser.parse_args()
    project = args.project.resolve(strict=True)
    evidence = args.evidence.resolve()
    skill = args.skill.resolve(strict=True) if args.skill else None
    if project.is_relative_to(Path(__file__).resolve().parents[1]):
        parser.error("run the demo in a disposable export outside the source checkout")
    if evidence.is_relative_to(project) or (skill and skill.is_relative_to(project)):
        parser.error("evidence and the skill must be outside the fixture")
    for name in args.write:
        path = Path(name)
        if path.is_absolute() or ".." in path.parts or (project / path).resolve() != project / path:
            parser.error(f"unsafe writable path: {name}")
        if not (project / path).exists():
            parser.error(f"writable path must exist: {name}")
    if args.allow_red_test and not args.node_test:
        parser.error("--allow-red-test requires --node-test")

    codex = shutil.which("codex")
    if not codex:
        parser.error("Codex CLI is unavailable")
    binary = shutil.which("node") if args.node_test or args.node_runtime else None
    if (args.node_test or args.node_runtime) and not binary:
        parser.error("the pinned local Node runtime is unavailable")
    node = Path(binary).resolve() if binary else None
    profile = command_profile(project, skill, args.write, node)
    evidence.mkdir(mode=0o700)
    receipt = preflight(codex, profile, project, skill, args.write, node, args.node_test, args.allow_red_test)
    (evidence / "preflight.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt), flush=True)
    if not args.prompt:
        return

    path = f"{node.parent}:/usr/bin:/bin" if node else "/usr/bin:/bin"
    settings = [
        "-c", 'approval_policy="never"',
        "-c", 'model_reasoning_effort="xhigh"',
        "-c", 'web_search="disabled"',
        "-c", "agents.enabled=false",
        "-c", "apps._default.enabled=false",
        "-c", "mcp_servers={}",
        "-c", "project_doc_max_bytes=0",
        "-c", 'shell_environment_policy.inherit="none"',
        "-c", "shell_environment_policy.set=" + toml_map({"PATH": path, "OPENSSL_CONF": "/dev/null"}),
    ]
    disabled = [
        "memories", "hooks", "plugins", "multi_agent", "multi_agent_v2",
        "browser_use", "browser_use_external", "in_app_browser", "browser_use_full_cdp_access",
        "apps", "enable_mcp_apps", "skill_mcp_dependency_install", "skill_search",
    ]
    features = [argument for name in disabled for argument in ("--disable", name)]
    if args.matched_catalog:
        catalog, count = isolate_catalog(codex, project, settings + features)
        (evidence / "catalog-preflight.json").write_text(json.dumps(
            {"ambient_skills_disabled": count, "visible_skill_entries": 0,
             "nonempty_global_guidance": False}, indent=2) + "\n")
    else:
        catalog = ["--enable", "skip_host_skill_discovery"]
    env = {key: value for key, value in os.environ.items() if key not in {"OPENAI_API_KEY", "OPENAI_BASE_URL"}}
    command = [codex, "exec", "--ignore-user-config", "--ignore-rules", "--ephemeral", "--json",
               "--skip-git-repo-check", "-C", str(project), "-m", "gpt-6.1-sol",
               *profile, *settings, *features, *catalog, "-"]
    (evidence / "invocation.json").write_text(json.dumps(command, indent=2) + "\n")
    with (evidence / "events.jsonl").open("xb") as events, (evidence / "diagnostics.txt").open("xb") as diagnostics:
        result = subprocess.run(command, input=args.prompt.read_bytes(), stdout=events, stderr=diagnostics,
                                env=env)
    (evidence / "exit-status.txt").write_text(f"{result.returncode}\n")
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
