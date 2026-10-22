/** Run manually in a trusted interactive production shell after verifying
 * ownership through an independent trusted channel. No password argv/env input.
 */
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import mysql from "mysql2/promise";
import { parseMySqlConnectionSettings } from "../api/lib/mysqlConfig";
import { getSigningSecret } from "../api/lib/userToken";
import { validNewPassword } from "../api/lib/passwordPolicy";
import { AccountRecoveryError, resetAccountPassword } from "../api/services/accountRecovery";

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 2) {
    throw new Error("Interactive terminal required; command-line arguments are refused.");
  }
  getSigningSecret();
  const configuration = parseMySqlConnectionSettings(process.env);
  if (!configuration) throw new Error("Persistent MySQL configuration required.");
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  }});
  const rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  const abort = new AbortController();
  rl.on("SIGINT", () => { abort.abort(); rl.close(); });
  const ask = (prompt: string) => rl.question(prompt, { signal: abort.signal });
  const hidden = async (prompt: string) => {
    process.stdout.write(prompt);
    muted = true;
    try { return await ask(""); }
    finally { muted = false; process.stdout.write("\n"); }
  };
  let pool: mysql.Pool | undefined;
  try {
    console.log("Verify account ownership through an independent trusted channel before continuing.");
    const idText = (await ask("Verified account ID: ")).trim();
    const userId = /^\d+$/.test(idText) ? Number(idText) : NaN;
    const email = (await ask("Verified account email: ")).trim().toLowerCase();
    if (await ask(`Type RESET ${userId} to confirm verified ownership: `) !== `RESET ${userId}`) {
      throw new Error("Confirmation not supplied.");
    }
    const password = await hidden("New password (hidden): ");
    const confirmation = await hidden("Repeat new password (hidden): ");
    if (!validNewPassword(password) || password !== confirmation) {
      throw new Error("New password is invalid or does not match.");
    }
    pool = mysql.createPool({ ...configuration, connectionLimit: 1, connectTimeout: 4000 });
    const result = await resetAccountPassword(pool, userId, email, password);
    console.log(`Reset committed for account ${result.userId}; ${result.sessionsRevoked} stored sessions revoked. Sign in with the new password.`);
  } finally {
    rl.close();
    if (pool) await pool.end();
  }
}

void main().catch(error => {
  // Configuration/DB errors can contain credentials. Only fixed codes escape.
  console.error(error instanceof AccountRecoveryError
    ? `Account recovery failed: ${error.code}`
    : "Account recovery stopped. Check terminal access, configuration and confirmed input; details withheld.");
  process.exitCode = 1;
});
