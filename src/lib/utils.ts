import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Join conditional classes and resolve Tailwind style conflicts. */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
