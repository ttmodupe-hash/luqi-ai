export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white" {...props}>
      {children}
    </button>
  );
}

