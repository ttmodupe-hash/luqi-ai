import { inferRouterContext } from "@trpc/server";
import type { AppRouter } from "./router";

export type TrpcContext = inferRouterContext<AppRouter>;

export async function createContext({ req }: { req: Request }) {
  return { req };
}
