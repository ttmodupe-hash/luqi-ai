export interface TrpcContext { req: Request }
export async function createContext({ req }: { req: Request }): Promise<TrpcContext> {
  return { req };
}
