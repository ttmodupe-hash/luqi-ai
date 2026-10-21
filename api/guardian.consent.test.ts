import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mock = vi.hoisted(() => ({ getAuthDb: vi.fn() }));
vi.mock("./queries/connection", () => ({ getAuthDb: mock.getAuthDb }));
import { guardianRouter } from "./guardian";

type Link = { id: number; guardianUserId: number; studentUserId: number; relationship: string };
const caller = (id: number) => guardianRouter.createCaller({
  req: new Request("https://luqi-ai.com/api/trpc"),
  user: { id, email: `user${id}@example.com`, name: null, role: "user" },
});

function makeDatabase() {
  const links: Link[] = [];
  const SQL = new MySqlDialect();
  const getName = (table: any) => String(table?.[Symbol.for("drizzle:Name")] ?? table?.name);
  const match = (link: Link, params: unknown[]) =>
    params.includes(link.id) || params.includes(link.guardianUserId) || params.includes(link.studentUserId);

  const select = () => {
    let tableName = "";
    let params: unknown[] = [];
    const query = {
      from: (table: unknown) => { tableName = getName(table); return query; },
      where: (condition: unknown) => {
        params = SQL.sqlToQuery(condition as any).params; return query;
      },
      orderBy: (..._args: unknown[]) => query,
      limit: async (_n: number) => getRows(),
      then: (resolve: (value: any) => any) => Promise.resolve(getRows()).then(resolve),
    };
    function getRows() {
      if (tableName === "users") return params.includes(22) ? [{ id: 22 }] : [];
      if (tableName === "guardian_links") {
        return links.filter(l => {
          if (!match(l, params)) return false;
          if (params.includes("consented:parent") || params.includes("consented:teacher")) {
            return params.includes(l.relationship) && params.includes(l.guardianUserId);
          }
          return params.includes(l.guardianUserId) &&
            (params.includes(l.studentUserId) || params.includes(l.id));
        });
      }
      if (tableName === "adaptive_history") return [{ count: 0 }];
      return [];
    }
    return query;
  };

  const db = {
    links,
    select,
    insert: (table: any) => ({
      values: async (data: Record<string, any>) => {
        if (getName(table) === "guardian_links") {
          links.push({ id: links.length + 1, guardianUserId: data.guardianUserId,
            studentUserId: data.studentUserId, relationship: data.relationship });
        }
        return [{ insertId: links.length }];
      },
    }),
    update: (_table: any) => ({
      set: (update: any) => ({
        where: async (condition: any) => {
          const params = SQL.sqlToQuery(condition).params;
          const link = links.find(l => params.includes(l.id) && params.includes(l.guardianUserId));
          if (link) link.relationship = update.relationship;
        },
      }),
    }),
    delete: (_table: any) => ({
      where: async (condition: any) => {
        const params = SQL.sqlToQuery(condition).params;
        const index = links.findIndex(l => params.includes(l.id) &&
          (params.includes(l.guardianUserId) || params.includes(l.studentUserId)));
        if (index >= 0) links.splice(index, 1);
      },
    }),
  };
  return db;
}

describe("mutual student-guardian approval", () => {
  let db: ReturnType<typeof makeDatabase>;
  beforeEach(() => {
    db = makeDatabase();
    mock.getAuthDb.mockResolvedValue(db);
  });

  it("prevents forging another student's invitation", async () => {
    await expect(caller(11).link({ guardianUserId: 22, studentUserId: 99, relationship: "parent" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.links).toHaveLength(0);
  });

  it("requires the student to invite and guardian to accept before records are visible", async () => {
    const result = await caller(11).link({ guardianUserId: 22, relationship: "parent" });
    expect(result).toMatchObject({ linked: false, pending: true });
    expect(db.links[0].relationship).toBe("pending:parent");
    expect(await caller(22).getStudents({ guardianUserId: 22 })).toEqual([]);

    await expect(caller(33).accept({ linkId: db.links[0].id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller(22).accept({ linkId: db.links[0].id });
    expect(db.links[0].relationship).toBe("consented:parent");

    const students = await caller(22).getStudents({ guardianUserId: 22 });
    expect(students).toHaveLength(1);
    expect(students[0].studentId).toBe(11);
    expect(students[0].relationship).toBe("parent");

    await caller(11).revoke({ linkId: db.links[0].id });
    expect(await caller(22).getStudents({ guardianUserId: 22 })).toEqual([]);
  });

  it("never treats historical public links as consent", async () => {
    db.links.push({ id: 100, guardianUserId: 22, studentUserId: 11, relationship: "parent" });
    expect(await caller(22).getStudents({ guardianUserId: 22 })).toEqual([]);
    await expect(caller(22).accept({ linkId: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects self-appointed guardians and unapproved alerts", async () => {
    await expect(caller(11).link({ guardianUserId: 11, relationship: "parent" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(22).createAlert({
      guardianId: 22, studentId: 11, alertType: "progress", message: "Notice",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
