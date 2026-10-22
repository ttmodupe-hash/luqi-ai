/** bcrypt consumes at most 72 UTF-8 bytes; never silently truncate a password. */
export function validNewPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 &&
    Buffer.byteLength(password, "utf8") <= 72;
}
