import { resolveSessionUser, type AuthenticatedUser } from "./auth";

export type TrpcContext = {
  req: Request;
  user: AuthenticatedUser | null;
};

export async function createContext({ req }: { req: Request }): Promise<TrpcContext> {
  return { req, user: await resolveSessionUser(req) };
}
