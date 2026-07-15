import type { ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`page-container ${className}`}>{children}</main>;
}
