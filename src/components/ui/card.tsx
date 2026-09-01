export function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="rounded border border-slate-700 bg-slate-800 p-4" {...props}>
      {children}
    </div>
  );
}

