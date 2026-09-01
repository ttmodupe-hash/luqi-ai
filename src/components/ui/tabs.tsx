export function Tabs({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b border-slate-700">{children}</div>;
}
export function TabsTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="px-4 py-2 border-b-2 border-transparent hover:border-blue-600" {...props}>
      {children}
    </button>
  );
}
export function TabsContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

