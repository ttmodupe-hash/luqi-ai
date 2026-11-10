/** Shipped examples for review. The workbench never executes or applies them. */
export const DEVSECNET_EXAMPLES = [
  {
    id: "parameterized-query",
    title: "TypeScript: parameterized owner-scoped lookup",
    language: "typescript",
    note: "Illustration only. The owner ID must come from authenticated server state. Parameter binding does not create authorization, rate limits, storage or audit controls.",
    code: `type QueryClient = {
  execute(sql: string, values: readonly unknown[]): Promise<unknown>;
};

export async function findAsset(db: QueryClient, authenticatedOwnerId: number, serial: string) {
  if (!Number.isSafeInteger(authenticatedOwnerId) || authenticatedOwnerId < 1) {
    throw new Error('Authentication required');
  }
  if (!/^[A-Z0-9-]{4,40}$/.test(serial)) throw new Error('Invalid serial');
  return db.execute(
    'SELECT serial_number, status FROM assets WHERE owner_id = ? AND serial_number = ?',
    [authenticatedOwnerId, serial],
  );
}`,
  },
  {
    id: "membership",
    title: "TypeScript: preserve left order in a membership filter",
    language: "typescript",
    note: "Expected O(n + m) work and O(m) additional index space for string IDs. This is membership filtering, not a full join that multiplies matching rows.",
    code: `export function matchingIds(left: readonly string[], right: readonly string[]): string[] {
  const index = new Set(right);
  return left.filter(id => index.has(id));
}

// Left duplicates remain in order; right duplicates do not multiply results.
// matchingIds(['a', 'b', 'a'], ['a', 'a']) returns ['a', 'a'].`,
  },
  {
    id: "python-query",
    title: "Python: bind values through the SQLite driver",
    language: "python",
    note: "Standard-library example for an existing authorized connection and account. It does not establish that an account owns a supplied ID or provide a production service.",
    code: `import sqlite3

def find_asset(conn: sqlite3.Connection, authenticated_owner_id: int, serial: str):
    if type(authenticated_owner_id) is not int or authenticated_owner_id < 1:
        raise ValueError("Authenticated owner required")
    if not isinstance(serial, str) or not 4 <= len(serial) <= 40:
        raise ValueError("Invalid serial")
    return conn.execute(
        "SELECT serial_number, status FROM assets WHERE owner_id = ? AND serial_number = ?",
        (authenticated_owner_id, serial),
    ).fetchall()`,
  },
  {
    id: "network-review",
    title: "Cisco-style management and OSPF review checklist",
    language: "network",
    note: "Read-only examples for an authorized operator; command availability depends on model/software. Configuration output can contain private details: redact before sharing. No commands run from Luqi.",
    code: `show version
show ip ospf interface
show ip ospf neighbor
show access-lists
show running-config | section line vty

! Review device/software-specific authentication support and both neighbors.
! An "md5" command is not SHA-256 authentication.
! Review access paths, rollback and maintenance arrangements before changing rules.`,
  },
] as const;
export const DEVSECNET_DEMO = `// Synthetic example. No real account, identifier or credential.
const sql = "SELECT serial_number FROM assets WHERE serial_number = '" + userInput + "'";
const apiKey = "SYNTHETIC_EXAMPLE_NOT_A_REAL_SECRET";
panel.innerHTML = userInput;
for (const left of items) {
  for (const right of candidates) {
    comparePair(left, right);
  }
}`;
export const DEVSECNET_SOURCES = [
  {
    title: "Babel parser: syntax support and parse limits",
    url: "https://babeljs.io/docs/babel-parser",
  },
  {
    title: "OWASP: SQL injection prevention and parameter binding",
    url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
  },
  {
    title: "MDN: innerHTML security considerations",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML",
  },
  {
    title: "Cisco: OSPFv2 authentication and platform support",
    url: "https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_iro-ospfv2-crypto-authen.html",
  },
  {
    title: "Gemini API pricing: verify model and billable features",
    url: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    title: "OpenAI API pricing: verify model and billable features",
    url: "https://developers.openai.com/api/docs/pricing",
  },
] as const;
