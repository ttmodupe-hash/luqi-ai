"""Exercise the built recovery CLI with disposable inputs, never a real DB."""
import errno
import os
import pty
import select
import subprocess
import time

command = ["node", "dist/reset-account-password.js"]
env = dict(os.environ, JWT_SECRET="ci-recovery-terminal-only-secret-32-characters",
           DATABASE_URL="mysql://fixture:fixture@127.0.0.1:1/unused_fixture")

# Piped/argument-driven password resets must be refused before DB access.
for args in [[], ["--password", "fixture-argument-secret"]]:
    result = subprocess.run(command + args, input="fixture-piped-secret\n", text=True,
                            capture_output=True, env=env, timeout=10)
    assert result.returncode == 1
    assert "fixture-argument-secret" not in result.stdout + result.stderr
    assert "fixture-piped-secret" not in result.stdout + result.stderr

master, slave = pty.openpty()
process = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, env=env)
os.close(slave)
output = bytearray()
deadline = time.monotonic() + 15

def read_until(marker):
    while marker not in output:
        if time.monotonic() > deadline:
            raise AssertionError("CLI did not reach expected prompt")
        if select.select([master], [], [], 0.2)[0]:
            data = os.read(master, 4096)
            if not data:
                raise AssertionError("CLI exited before expected prompt")
            output.extend(data)

try:
    for prompt, answer in [
        (b"Verified account ID:", b"7"),
        (b"Verified account email:", b"fixture@example.invalid"),
        (b"Type RESET 7", b"RESET 7"),
        (b"New password (hidden):", b"Fixture-Hidden-Password-Only!"),
        # Deliberately mismatch: verifies hidden input without reaching MySQL.
        (b"Repeat new password (hidden):", b"Fixture-Other-Hidden-Password!"),
    ]:
        read_until(prompt)
        os.write(master, answer + b"\n")
    while process.poll() is None:
        if time.monotonic() > deadline:
            raise AssertionError("CLI failed to stop")
        if select.select([master], [], [], 0.2)[0]:
            try:
                data = os.read(master, 4096)
                if data:
                    output.extend(data)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
    assert process.wait(timeout=2) == 1
    assert b"Fixture-Hidden" not in output
    assert b"Fixture-Other" not in output
    assert b"Account recovery stopped" in output
    print("PASS: recovery requires a terminal and does not echo passwords.")
finally:
    if process.poll() is None:
        process.kill()
        process.wait()
    os.close(master)
