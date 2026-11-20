"""Run one sealed service fixture with a separate observer on an owned loopback."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import time

POSTGRES = "postgres@sha256:97ff59a4e30e08d1c11bdcd9455e7832368c0572b576c9092cde2df4ae5552a3"
APP_START = (
    "cp -R /input/. /app && cd /app && ln -s /opt/zoo/node_modules node_modules && "
    "node /opt/zoo/node_modules/typescript/bin/tsc --noEmit && "
    "node /opt/zoo/node_modules/vite/bin/vite.js build && exec node /checks/start-candidate.mjs"
)
APP_SCRATCH = "/app:rw,exec,nosuid,nodev,size=256m,uid=1000,gid=1000"


def json_bytes(value):
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()


def diagnostic_output(error, redact):
    def decode(value):
        return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value or ""
    return redact(decode(error.stdout) + decode(error.stderr))


def pinned_checker(root, files):
    def git(*args):
        return subprocess.check_output(["git", "-C", str(root), *args], timeout=10)

    revision = git("rev-parse", "HEAD").decode().strip()
    contents = {}
    for file in files:
        relative = file.relative_to(root).as_posix()
        pinned = git("show", f"{revision}:{relative}")
        if file.read_bytes() != pinned:
            raise RuntimeError(f"commit the exact checker input before running: {relative}")
        contents[relative] = pinned
    return revision, contents


def check_dependency_inputs(manifest, expected):
    for name, contents in expected.items():
        if manifest.get(name) != sha256(contents).hexdigest():
            raise ValueError(f"locked dependency input changed: {name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("evidence", type=Path)
    parser.add_argument("--image", required=True, help="Exact local tool image ID")
    parser.add_argument("--docker-context", required=True)
    parser.add_argument("--docker-endpoint", required=True)
    parser.add_argument("--baseline", action="store_true")
    parser.add_argument("--authority", help="Fixture scheduling-authority table and boolean column")
    parser.add_argument("--pre-submit-retry", action="store_true")
    parser.add_argument("--interrupted-rescheduling", action="store_true")
    parser.add_argument("--cedar-calendar", action="store_true",
                        help="Use the pinned Cedar calendar dependencies for a composed workflow")
    parser.add_argument("--cedar-filter-return", action="store_true",
                        help="Check return from a selected request after applying dates")
    parser.add_argument("--cedar-review-layout", action="store_true",
                        help="Check the compact date panel and short and long review layouts")
    parser.add_argument("--cedar-distant-navigation", action="store_true",
                        help="Check distant request opening and row restoration at scroll boundaries")
    parser.add_argument("--ui-craft", choices=("reference", "queue", "reading", "queue-recovery", "queue-direction", "queue-finish", "queue-workflow", "queue-workflow-transfer", "queue-workflow-composed", "queue-workflow-composed-transfer"))
    args = parser.parse_args()
    project = args.project.resolve(strict=True)
    evidence = args.evidence.resolve()
    root = Path(__file__).resolve().parents[1]
    fixture = root / "evals/fixtures/service-requests"
    runner = root / "evals/isolated"
    composed_workflow = args.ui_craft in {"queue-workflow-composed", "queue-workflow-composed-transfer"}
    if args.cedar_calendar and not composed_workflow:
        parser.error("--cedar-calendar requires a composed Cedar workflow")
    if args.cedar_filter_return and (not args.cedar_calendar or args.ui_craft != "queue-workflow-composed"):
        parser.error("--cedar-filter-return requires the composed workflow with --cedar-calendar")
    if args.cedar_review_layout and not args.cedar_filter_return:
        parser.error("--cedar-review-layout requires --cedar-filter-return")
    if args.cedar_distant_navigation and not args.cedar_review_layout:
        parser.error("--cedar-distant-navigation requires --cedar-review-layout")
    if (project.is_relative_to(root) or evidence.is_relative_to(root)
            or evidence.is_relative_to(project) or project.is_relative_to(evidence)):
        parser.error("the export and evidence must be separate and outside the source checkout")
    if not re.fullmatch("sha256:[0-9a-f]{64}", args.image):
        parser.error("use an exact local tool image ID")
    if args.authority and (args.baseline or not re.fullmatch(r"[a-z_]+\.[a-z_]+", args.authority)):
        parser.error("supply a trusted table.column binding only for the rescheduling fixture")
    if (args.baseline and (args.pre_submit_retry or args.interrupted_rescheduling)) or (
        args.interrupted_rescheduling and (args.authority or args.pre_submit_retry)
    ):
        parser.error("select compatible rescheduling variants")
    if args.ui_craft and not args.baseline:
        parser.error("--ui-craft requires the approval baseline lane")
    manifest = {}
    for path in sorted(project.rglob("*")):
        relative = path.relative_to(project)
        if path.is_symlink() or {".git", "node_modules", "dist"} & set(relative.parts):
            parser.error(f"unexpected export entry: {relative}")
        if path.is_file():
            manifest[str(relative)] = sha256(path.read_bytes()).hexdigest()
        elif not path.is_dir():
            parser.error(f"unexpected non-file input: {relative}")
    dependency_root = runner / "cedar-calendar" if args.cedar_calendar else fixture
    dependency_names = ("package.json", "package-lock.json")
    expected_dependencies = {name: (dependency_root / name).read_bytes() for name in dependency_names}
    try:
        check_dependency_inputs(manifest, expected_dependencies)
    except ValueError as error:
        parser.error(str(error))

    env = {k: v for k, v in os.environ.items()
           if k not in {"DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"}}
    context = args.docker_context
    endpoint = subprocess.check_output(
        ["docker", "context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"],
        env=env, text=True, timeout=10,
    ).strip()
    if endpoint != args.docker_endpoint or not endpoint.startswith("unix:///"):
        parser.error("Docker context does not match the nominated local endpoint")

    def docker(*values, content=None, extra=None, timeout=45, check=True):
        return subprocess.run(["docker", "--context", context, *values],
                              input=content, env={**env, **(extra or {})}, text=True,
                              capture_output=True, timeout=timeout, check=check)

    rich_workflow = args.ui_craft in {"queue-workflow", "queue-workflow-transfer"} or composed_workflow
    observer_script = "service-observer.mjs"
    if args.interrupted_rescheduling:
        observer_script = "interrupted-observer.mjs"
    if args.ui_craft:
        observer_script = "ui-craft-observer.mjs"
    if rich_workflow:
        observer_script = "rich-workflow-observer.mjs"
    mounted_scripts = [runner / "start-candidate.mjs", runner / observer_script]
    if observer_script == "service-observer.mjs":
        mounted_scripts.append(runner / "race-outcome.mjs")
    schema_file = fixture / "runner/schema.sql"
    if rich_workflow:
        schema_file = runner / "rich-workflow-schema.sql"
    checker_inputs = [Path(__file__).resolve(), schema_file, *mounted_scripts]
    if args.cedar_calendar:
        checker_inputs.extend([runner / "Dockerfile", *(dependency_root / name for name in dependency_names)])
    if args.ui_craft:
        seed_file = runner / ("rich-workflow-seed.sql" if rich_workflow else "ui-craft-seed.sql")
        checker_inputs.append(seed_file)
    if composed_workflow:
        content_file = runner / "composed-workflow-content.sql"
        checker_inputs.append(content_file)
    revision, checker = pinned_checker(root, checker_inputs)
    if rich_workflow:
        for source, target in ((schema_file, "runner/schema.sql"), (seed_file, "runner/seed-rich.sql")):
            if manifest.get(target) != sha256(checker[source.relative_to(root).as_posix()]).hexdigest():
                parser.error(f"workflow schema and seed must match pinned evaluator inputs: {target}")
    if composed_workflow:
        content = checker[content_file.relative_to(root).as_posix()]
        if manifest.get("runner/composed-content.sql") != sha256(content).hexdigest():
            parser.error("composed fixture content must match the pinned evaluator input")
    images = {
        "tools": json.loads(docker("image", "inspect", args.image, "--format",
                                   '{"id":{{json .Id}},"os":{{json .Os}},"arch":{{json .Architecture}}}').stdout),
        "postgres": json.loads(docker("image", "inspect", POSTGRES, "--format",
                                      '{"id":{{json .Id}},"os":{{json .Os}},"arch":{{json .Architecture}}}').stdout),
    }
    if images["tools"]["id"] != args.image:
        raise RuntimeError("Docker returned a different tool image")
    if args.cedar_calendar:
        # Validate the actual image inputs before starting the application or database.
        digest_command = (
            "const {readFileSync}=require('node:fs');const {createHash}=require('node:crypto');"
            "for(const name of ['package.json','package-lock.json'])"
            "console.log(createHash('sha256').update(readFileSync('/opt/zoo/'+name)).digest('hex'));"
        )
        observed = docker("run", "--rm", "--pull=never", "--network", "none", "--read-only",
                          "--cap-drop", "ALL", "--user", "1000:1000", args.image,
                          "node", "-e", digest_command, timeout=15).stdout.splitlines()
        if observed != [sha256(expected_dependencies[name]).hexdigest() for name in dependency_names]:
            parser.error("tools image does not contain the pinned Cedar dependency inputs")
    server = json.loads(docker("version", "--format", "{{json .Server}}").stdout)
    evidence.mkdir(mode=0o700)
    staged = evidence / "sealed-input"
    staged.mkdir(mode=0o755)
    for relative, digest in manifest.items():
        contents = (project / relative).read_bytes()
        if sha256(contents).hexdigest() != digest:
            raise RuntimeError(f"candidate changed while staging: {relative}")
        target = staged / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(contents)
    run = "zoo-isolated-" + secrets.token_hex(8)
    db_name, probe_name, app_name, observer_name = (
        f"{run}-{suffix}" for suffix in ("db", "probe", "app", "observer")
    )
    owner = "io.zoo.isolated.run"
    label = f"{owner}={run}"
    passwords = {role: secrets.token_hex(24) for role in ("admin", "app", "observer")}
    sealed_checker = evidence / "checker"
    sealed_checker.mkdir(mode=0o755)
    for file in mounted_scripts:
        target = sealed_checker / file.name
        target.write_bytes(checker[file.relative_to(root).as_posix()])
        target.chmod(0o444)
    exchange = evidence / "continuation-exchange"
    if args.interrupted_rescheduling:
        exchange.mkdir()
        exchange.chmod(0o777)

    captures = evidence / "captures"
    if args.ui_craft:
        captures.mkdir()
        captures.chmod(0o777)

    def redact(value):
        for password in passwords.values():
            value = value.replace(password, "<fixture-password>")
        return value

    def owned(name):
        result = docker("container", "inspect", name, "--format",
                        '{{.Id}} {{index .Config.Labels "' + owner + '"}} {{.Name}}', check=False)
        if result.returncode:
            if "No such container:" in result.stderr or "No such object:" in result.stderr:
                return None
            raise RuntimeError(f"Could not reconcile Docker identity for {name}")
        identity, tag, actual = result.stdout.split()
        if tag != run or actual != "/" + name:
            raise RuntimeError(f"Docker identity did not match {name}")
        return identity

    def psql(db, sql):
        return docker("exec", "-i", db, "psql", "-U", "postgres", "-d", "zoo_fixture",
                      "-v", "ON_ERROR_STOP=1", "-Atq", content=sql).stdout.strip()

    worker = ["--pull=never", "--label", label, "--user", "1000:1000", "--cap-drop", "ALL",
              "--security-opt", "no-new-privileges", "--read-only", "--init",
              "--pids-limit", "256", "--tmpfs", "/tmp:rw,nosuid,nodev,size=256m", "--shm-size", "256m",
              "--env", "HOME=/tmp"]
    database_options = ["--pull=never", "--label", label, "--network", "none",
                        "--tmpfs", "/var/lib/postgresql/data", "--env", "POSTGRES_DB=zoo_fixture",
                        "--env", "POSTGRES_PASSWORD"]
    observer_timeout = 480 if args.interrupted_rescheduling else 220 if composed_workflow else 180 if rich_workflow else 100
    metadata = json_bytes({
        "run": run, "files": manifest, "candidate_sha256": sha256(json_bytes(manifest)).hexdigest(),
        "runner_commit": revision,
        "checker_sha256": {path: sha256(data).hexdigest() for path, data in checker.items()},
        "mounted_scripts": {file.name: f"/checks/{file.name}" for file in mounted_scripts},
        "variants": {"baseline": args.baseline, "authority": args.authority,
                     "pre_submit_retry": args.pre_submit_retry,
                     "interrupted_rescheduling": args.interrupted_rescheduling, "ui_craft": args.ui_craft,
                     **({"dependency_lane": "cedar-calendar"} if args.cedar_calendar else {}),
                     **({"cedar_filter_return": True} if args.cedar_filter_return else {}),
                     **({"cedar_review_layout": True} if args.cedar_review_layout else {}),
                     **({"cedar_distant_navigation": True} if args.cedar_distant_navigation else {})},
        "runtime": {"docker_context": context, "docker_endpoint": endpoint,
                    "docker_server": {key: server.get(key) for key in ("Version", "Os", "Arch", "ApiVersion")},
                    "images": images, "postgres_ref": POSTGRES, "worker_options": worker,
                    "database_options": database_options, "database_command": ["postgres", "-c", f"cluster_name={run}"],
                    "worker_network": "owned database namespace", "application_start": APP_START,
                    "application_scratch": APP_SCRATCH, "observer_entrypoint": observer_script,
                    "observer_timeout_seconds": observer_timeout},
    })
    (evidence / "manifest.json").write_bytes(metadata)
    phase = "database"
    last_completed_stage = None
    failure = None
    observer_exit = None
    try:
        docker("run", "-d", "--name", db_name, *database_options,
               images["postgres"]["id"], "postgres", "-c", f"cluster_name={run}",
               extra={"POSTGRES_PASSWORD": passwords["admin"]})
        db = owned(db_name)
        assert db
        deadline = time.monotonic() + 35
        while docker("exec", db, "pg_isready", "-q", "-h", "127.0.0.1", check=False).returncode:
            if time.monotonic() >= deadline:
                raise RuntimeError("owned PostgreSQL did not become ready")
            time.sleep(0.2)
        if psql(db, "SELECT current_setting('cluster_name');") != run:
            raise RuntimeError("PostgreSQL cluster does not match the owned run")
        if docker("container", "inspect", db, "--format", "{{.HostConfig.NetworkMode}}").stdout.strip() != "none":
            raise RuntimeError("the database namespace has an unexpected network")
        schema = checker[schema_file.relative_to(root).as_posix()].decode()
        if args.ui_craft:
            schema += checker[seed_file.relative_to(root).as_posix()].decode()
        if composed_workflow:
            schema += content.decode()
        psql(db, f"""BEGIN;
{schema}
CREATE ROLE zoo_app LOGIN PASSWORD '{passwords["app"]}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE zoo_observer LOGIN PASSWORD '{passwords["observer"]}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE, CREATE ON SCHEMA public TO zoo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zoo_app;
GRANT USAGE ON SCHEMA public TO zoo_observer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO zoo_observer;
GRANT UPDATE (revision) ON service_requests TO zoo_observer;
GRANT pg_read_all_stats TO zoo_observer;
ALTER DEFAULT PRIVILEGES FOR ROLE zoo_app IN SCHEMA public GRANT SELECT ON TABLES TO zoo_observer;
COMMIT;
""")
        last_completed_stage = phase
        phase = "namespace"
        shared = ["--network", f"container:{db}"]
        probe = """const fs=require('node:fs'), net=require('node:net'), os=require('node:os');
const interfaces=Object.keys(os.networkInterfaces());
if(interfaces.some(x=>x!=='lo')||fs.existsSync('/var/run/docker.sock')||fs.existsSync('/observer.mjs')) process.exit(2);
const s=net.createConnection({host:'127.0.0.1',port:5432},()=>{console.log('owned loopback only');s.end()});
s.on('error',()=>process.exit(3));"""
        result = docker("run", "--rm", "--name", probe_name, *worker, *shared, args.image, "node", "-e", probe, timeout=15)
        (evidence / "namespace.txt").write_text(result.stdout)
        last_completed_stage = phase
        phase = "application"
        docker("run", "-d", "--name", app_name, *worker, *shared,
               "--tmpfs", APP_SCRATCH,
               "--mount", f"type=bind,src={staged},dst=/input,readonly",
               "--mount", f"type=bind,src={sealed_checker / 'start-candidate.mjs'},dst=/checks/start-candidate.mjs,readonly",
               "--env", f"ZOO_CLUSTER={run}", "--env", "ZOO_APP_PASSWORD",
               "--env", f"ZOO_BASELINE={'yes' if args.baseline else 'no'}", args.image,
               "/bin/sh", "-ec", APP_START,
               extra={"ZOO_APP_PASSWORD": passwords["app"]})
        app = owned(app_name)
        assert app
        if args.interrupted_rescheduling:
            deadline = time.monotonic() + 35
            while True:
                logs = docker("logs", app, check=False)
                if "Zoo fixture listening" in logs.stdout:
                    break
                running = docker("container", "inspect", app, "--format", "{{.State.Running}}").stdout.strip()
                if running != "true" or time.monotonic() >= deadline:
                    (evidence / "application.txt").write_text(redact(logs.stdout + logs.stderr))
                    raise RuntimeError("the owned application did not finish startup before the interruption observer")
                time.sleep(0.2)
        if args.authority:
            table, column = args.authority.split(".")
            deadline = time.monotonic() + 35
            while psql(db, f"SELECT to_regclass('public.{table}') IS NOT NULL;") != "t":
                running = docker("container", "inspect", app, "--format", "{{.State.Running}}").stdout.strip()
                if running != "true" or time.monotonic() >= deadline:
                    logs = docker("logs", app, check=False)
                    (evidence / "application.txt").write_text(redact(logs.stdout + logs.stderr))
                    raise RuntimeError("the selected candidate authority table did not become ready")
                time.sleep(0.2)
            psql(db, f"GRANT UPDATE ({column}) ON public.{table} TO zoo_observer;")
        last_completed_stage = phase
        phase = "observer"
        mounts = ["--mount", f"type=bind,src={sealed_checker},dst=/checks,readonly"]
        if args.interrupted_rescheduling:
            mounts += ["--mount", f"type=bind,src={exchange},dst=/continuation"]
        if args.ui_craft:
            mounts += ["--mount", f"type=bind,src={captures},dst=/captures"]
        observe = docker("run", "--rm", "--name", observer_name, *worker, *shared,
                         *mounts,
                         "--env", "ZOO_OBSERVER_PASSWORD", "--env", f"ZOO_CLUSTER={run}",
                         "--env", f"ZOO_BASELINE={'yes' if args.baseline else 'no'}",
                         "--env", f"ZOO_CRAFT_MODE={args.ui_craft or ''}",
                         "--env", f"ZOO_CEDAR_CALENDAR={'yes' if args.cedar_calendar else 'no'}",
                         "--env", f"ZOO_CEDAR_FILTER_RETURN={'yes' if args.cedar_filter_return else 'no'}",
                         "--env", f"ZOO_CEDAR_REVIEW_LAYOUT={'yes' if args.cedar_review_layout else 'no'}",
                         "--env", f"ZOO_CEDAR_DISTANT_NAVIGATION={'yes' if args.cedar_distant_navigation else 'no'}",
                         "--env", f"ZOO_AUTHORITY={args.authority or ''}",
                         "--env", f"ZOO_PRE_SUBMIT_RETRY={'yes' if args.pre_submit_retry else 'no'}",
                         args.image, "node", f"/checks/{observer_script}",
                         timeout=observer_timeout, check=False,
                         extra={"ZOO_OBSERVER_PASSWORD": passwords["observer"]})
        observer_exit = observe.returncode
        (evidence / "observer.txt").write_text(redact(observe.stdout + observe.stderr))
        print(redact(observe.stdout))
        if observe.returncode:
            raise RuntimeError("isolated observer failed; see observer.txt and application.txt")
        last_completed_stage = phase
    except BaseException as error:
        if isinstance(error, (subprocess.TimeoutExpired, subprocess.CalledProcessError)):
            diagnostic = diagnostic_output(error, redact)
            receipt = {"observer": "observer.txt", "namespace": "namespace.txt"}.get(
                phase, f"{phase}-partial.txt"
            )
            if not (evidence / receipt).exists():
                (evidence / receipt).write_text(diagnostic)
        if isinstance(error, subprocess.TimeoutExpired):
            failure = {"phase": phase, "kind": "timeout", "message": f"Timed out after {error.timeout} seconds"}
            raise RuntimeError(f"{phase} timed out after {error.timeout} seconds") from None
        failure = {"phase": phase, "kind": "observer_failure" if observer_exit else "setup_failure",
                   "message": redact(str(error))}
        raise RuntimeError(failure["message"]) from None
    finally:
        cleanup = []
        if not (evidence / "application.txt").exists():
            try:
                identity = owned(app_name)
                if identity:
                    logs = docker("logs", identity, check=False, timeout=10)
                    (evidence / "application.txt").write_text(redact(logs.stdout + logs.stderr))
            except subprocess.TimeoutExpired as error:
                (evidence / "application.txt").write_text(diagnostic_output(error, redact))
            except (RuntimeError, subprocess.SubprocessError) as error:
                (evidence / "application.txt").write_text(redact(str(error)))
        for name in (observer_name, app_name, probe_name, db_name):
            try:
                identity = owned(name)
                if identity:
                    docker("container", "rm", "--force", "--volumes", identity)
                    if owned(name):
                        cleanup.append(name)
            except (RuntimeError, subprocess.SubprocessError):
                cleanup.append(name)
        shutil.rmtree(staged)
        if args.ui_craft:
            captures.chmod(0o700)
        (evidence / "result.json").write_bytes(json_bytes({
            "run": run, "manifest_sha256": sha256(metadata).hexdigest(),
            "status": "PASS" if not failure and not cleanup else "FAIL",
            "observer_exit": observer_exit, "failure": failure, "cleanup_pending": cleanup,
            "last_completed_stage": last_completed_stage,
        }))
        if cleanup:
            (evidence / "cleanup.txt").write_text("Cleanup needs reconciliation: " + ", ".join(cleanup) + "\n")
            raise RuntimeError("one or more owned containers need cleanup reconciliation")
        (evidence / "cleanup.txt").write_text("Owned observer, app, namespace probe, and database containers removed.\n")


if __name__ == "__main__":
    main()
