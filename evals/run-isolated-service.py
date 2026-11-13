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
    args = parser.parse_args()
    project = args.project.resolve(strict=True)
    evidence = args.evidence.resolve()
    root = Path(__file__).resolve().parents[1]
    fixture = root / "evals/fixtures/service-requests"
    runner = root / "evals/isolated"
    if project.is_relative_to(root) or evidence.is_relative_to(project) or project.is_relative_to(evidence):
        parser.error("the export and evidence must be separate and outside the source checkout")
    if not re.fullmatch("sha256:[0-9a-f]{64}", args.image):
        parser.error("use an exact local tool image ID")
    if args.authority and (args.baseline or not re.fullmatch(r"[a-z_]+\.[a-z_]+", args.authority)):
        parser.error("supply a trusted table.column binding only for the rescheduling fixture")
    if (args.baseline and (args.pre_submit_retry or args.interrupted_rescheduling)) or (
        args.interrupted_rescheduling and (args.authority or args.pre_submit_retry)
    ):
        parser.error("select compatible rescheduling variants")
    manifest = {}
    for path in sorted(project.rglob("*")):
        relative = path.relative_to(project)
        if path.is_symlink() or {".git", "node_modules", "dist"} & set(relative.parts):
            parser.error(f"unexpected export entry: {relative}")
        if path.is_file():
            manifest[str(relative)] = sha256(path.read_bytes()).hexdigest()
        elif not path.is_dir():
            parser.error(f"unexpected non-file input: {relative}")
    for name in ("package.json", "package-lock.json"):
        if manifest.get(name) != sha256((fixture / name).read_bytes()).hexdigest():
            parser.error(f"locked dependency input changed: {name}")

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

    observer_script = "interrupted-observer.mjs" if args.interrupted_rescheduling else "service-observer.mjs"
    mounted_scripts = [runner / "start-candidate.mjs", runner / observer_script]
    if not args.interrupted_rescheduling:
        mounted_scripts.append(runner / "race-outcome.mjs")
    schema_file = fixture / "runner/schema.sql"
    revision, checker = pinned_checker(root, [Path(__file__).resolve(), schema_file, *mounted_scripts])
    images = {
        "tools": json.loads(docker("image", "inspect", args.image, "--format",
                                   '{"id":{{json .Id}},"os":{{json .Os}},"arch":{{json .Architecture}}}').stdout),
        "postgres": json.loads(docker("image", "inspect", POSTGRES, "--format",
                                      '{"id":{{json .Id}},"os":{{json .Os}},"arch":{{json .Architecture}}}').stdout),
    }
    if images["tools"]["id"] != args.image:
        raise RuntimeError("Docker returned a different tool image")
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
    db_name, app_name, observer_name = (f"{run}-{suffix}" for suffix in ("db", "app", "observer"))
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
    observer_timeout = 480 if args.interrupted_rescheduling else 100
    metadata = json_bytes({
        "run": run, "files": manifest, "candidate_sha256": sha256(json_bytes(manifest)).hexdigest(),
        "runner_commit": revision,
        "checker_sha256": {path: sha256(data).hexdigest() for path, data in checker.items()},
        "mounted_scripts": {file.name: f"/checks/{file.name}" for file in mounted_scripts},
        "variants": {"baseline": args.baseline, "authority": args.authority,
                     "pre_submit_retry": args.pre_submit_retry,
                     "interrupted_rescheduling": args.interrupted_rescheduling},
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
        shared = ["--network", f"container:{db}"]
        probe = """const fs=require('node:fs'), net=require('node:net'), os=require('node:os');
const interfaces=Object.keys(os.networkInterfaces());
if(interfaces.some(x=>x!=='lo')||fs.existsSync('/var/run/docker.sock')||fs.existsSync('/observer.mjs')) process.exit(2);
const s=net.createConnection({host:'127.0.0.1',port:5432},()=>{console.log('owned loopback only');s.end()});
s.on('error',()=>process.exit(3));"""
        result = docker("run", "--rm", *worker, *shared, args.image, "node", "-e", probe, timeout=15)
        (evidence / "namespace.txt").write_text(result.stdout)
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
        phase = "observer"
        mounts = ["--mount", f"type=bind,src={sealed_checker},dst=/checks,readonly"]
        if args.interrupted_rescheduling:
            mounts += ["--mount", f"type=bind,src={exchange},dst=/continuation"]
        observe = docker("run", "--rm", "--name", observer_name, *worker, *shared,
                         *mounts,
                         "--env", "ZOO_OBSERVER_PASSWORD", "--env", f"ZOO_CLUSTER={run}",
                         "--env", f"ZOO_BASELINE={'yes' if args.baseline else 'no'}",
                         "--env", f"ZOO_AUTHORITY={args.authority or ''}",
                         "--env", f"ZOO_PRE_SUBMIT_RETRY={'yes' if args.pre_submit_retry else 'no'}",
                         args.image, "node", f"/checks/{observer_script}",
                         timeout=observer_timeout, check=False,
                         extra={"ZOO_OBSERVER_PASSWORD": passwords["observer"]})
        observer_exit = observe.returncode
        (evidence / "observer.txt").write_text(redact(observe.stdout + observe.stderr))
        logs = docker("logs", app, check=False)
        (evidence / "application.txt").write_text(redact(logs.stdout + logs.stderr))
        print(redact(observe.stdout))
        if observe.returncode:
            raise RuntimeError("isolated observer failed; see observer.txt and application.txt")
    except BaseException as error:
        failure = {"phase": phase, "message": redact(str(error))}
        raise
    finally:
        cleanup = []
        for name in (observer_name, app_name, db_name):
            try:
                identity = owned(name)
                if identity:
                    docker("container", "rm", "--force", "--volumes", identity)
                    if owned(name):
                        cleanup.append(name)
            except (RuntimeError, subprocess.SubprocessError):
                cleanup.append(name)
        shutil.rmtree(staged)
        (evidence / "result.json").write_bytes(json_bytes({
            "run": run, "manifest_sha256": sha256(metadata).hexdigest(),
            "status": "PASS" if not failure and not cleanup else "FAIL",
            "observer_exit": observer_exit, "failure": failure, "cleanup_pending": cleanup,
        }))
        if cleanup:
            (evidence / "cleanup.txt").write_text("Cleanup needs reconciliation: " + ", ".join(cleanup) + "\n")
            raise RuntimeError("one or more owned containers need cleanup reconciliation")
        (evidence / "cleanup.txt").write_text("Owned app, observer, and database containers removed.\n")


if __name__ == "__main__":
    main()
