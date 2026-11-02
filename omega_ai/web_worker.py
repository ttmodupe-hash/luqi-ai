"""Explicit one-task worker bridge. No daemon, polling, DDL or provider clients.

The operator authenticates via a restricted DB credential, not an owner argument.
The delegated execution policy requires an active account and an existing task
in the fixed read-only web contract. Every new claim rechecks that DB authority.
"""
from contextlib import suppress
import json
import os
import re
import sys
from urllib.parse import unquote, urlsplit

import pymysql

from .mysql_workflow import LeaseLost, MySQLWorkflowEngine, StorageUnavailable
from .workflow_engine import TaskNotRunnable
from .web_tasks import HANDLERS, VERSION, register_web_handlers, validate_payload


class WebTaskDenied(PermissionError):
    pass


def _identity(connection_factory, task_id):
    connection = None
    try:
        connection = connection_factory()
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""SELECT t.owner_id,t.handler,t.handler_version,t.side_effects,t.document,
                t.idempotency_key,u.id AS user_id FROM omega_tasks_v1 t JOIN users u
                ON t.owner_id=CAST(CONCAT('luqi-user:',u.id) AS BINARY)
                WHERE t.id=%s AND u.is_active=1""", (task_id,))
            row = cursor.fetchone()
        if row is None:
            raise WebTaskDenied("OMEGA_TASK_UNAVAILABLE")
        text = lambda value: value.decode("utf-8") if isinstance(value, bytes) else value
        owner, handler = text(row["owner_id"]), text(row["handler"])
        doc = json.loads(row["document"])
        if (type(row["user_id"]) is not int or not 1 <= row["user_id"] <= 2 ** 53 - 1 or
                owner != f"luqi-user:{row['user_id']}" or handler not in HANDLERS or
                text(row["handler_version"]) != VERSION or row["side_effects"] != 0 or
                doc["max_attempts"] != 3 or type(doc["max_attempts"]) is not int or
                doc["approved_by"] is not None or not isinstance(text(row["idempotency_key"]), str) or
                not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", text(row["idempotency_key"]))):
            raise WebTaskDenied("OMEGA_TASK_UNAVAILABLE")
        validate_payload(handler, doc["payload"])
        return owner
    except pymysql.MySQLError:
        raise StorageUnavailable("Workflow storage unavailable") from None
    except (KeyError, TypeError, ValueError, UnicodeError):
        raise WebTaskDenied("OMEGA_TASK_UNAVAILABLE") from None
    finally:
        if connection is not None:
            with suppress(Exception):
                connection.close()


def run_web_task(connection_factory, task_id: str, *, enabled: bool = False):
    if enabled is not True:
        raise WebTaskDenied("OMEGA_WORKER_DISABLED")
    if not isinstance(task_id, str) or not re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", task_id):
        raise WebTaskDenied("OMEGA_TASK_UNAVAILABLE")
    owner = _identity(connection_factory, task_id)
    def authorize(actor, action):
        return action == "run" and actor == owner and _identity(connection_factory, task_id) == owner
    engine = MySQLWorkflowEngine(connection_factory, authorizer=authorize)
    register_web_handlers(engine)
    return engine.run(task_id, actor=owner)


def connection_factory_from_env(environment):
    """Dedicated worker credential. Never fall back to general app credentials.

    Public DB endpoints require a configured CA and certificate/hostname
    verification. Clear transport is limited to loopback or Railway private DNS.
    """
    try:
        target = urlsplit(environment.get("LUQI_OMEGA_DATABASE_URL", ""))
        if (target.scheme != "mysql" or not target.hostname or not target.username or
                not target.password or not target.path.strip("/") or target.query or target.fragment):
            raise ValueError()
        host = target.hostname
        ca = environment.get("LUQI_OMEGA_MYSQL_CA")
        if not ca and host not in ("127.0.0.1", "localhost", "::1") and not host.endswith(".railway.internal"):
            raise ValueError()
        settings = dict(host=host, port=target.port or 3306, user=unquote(target.username),
                        password=unquote(target.password), database=unquote(target.path[1:]), charset="utf8mb4",
                        autocommit=False, connect_timeout=5, read_timeout=10, write_timeout=10,
                        local_infile=False)
        if ca:
            settings.update(ssl_ca=ca, ssl_verify_cert=True, ssl_verify_identity=True)
    except (ValueError, TypeError):
        raise WebTaskDenied("OMEGA_WORKER_CONFIG_UNAVAILABLE") from None
    return lambda: pymysql.connect(**settings)


def main(argv=None):
    arguments = sys.argv[1:] if argv is None else argv
    try:
        if os.getenv("LUQI_OMEGA_WORKER_ENABLED") != "true":
            raise WebTaskDenied("OMEGA_WORKER_DISABLED")
        if len(arguments) != 2 or arguments[0] != "--task-id":
            raise WebTaskDenied("OMEGA_WORKER_ARGUMENTS_INVALID")
        task = run_web_task(connection_factory_from_env(os.environ), arguments[1], enabled=True)
        # No task inputs/results, account IDs, DB settings or exception details in logs.
        print(json.dumps({"id": task.id, "state": task.state.value, "error": task.error}))
        return 0
    except WebTaskDenied as error:
        code = str(error)
    except TaskNotRunnable:
        code = "OMEGA_TASK_NOT_RUNNABLE"
    except LeaseLost:
        code = "OMEGA_CLAIM_LOST"
    except (StorageUnavailable, PermissionError):
        code = "OMEGA_WORKER_UNAVAILABLE"
    except Exception:
        code = "OMEGA_WORKER_UNAVAILABLE"
    print(json.dumps({"code": code}))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
