import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFullName(profile: { first_name?: string | null, last_name?: string | null } | null): string {
  if (!profile) return 'Unnamed User';
  const { first_name, last_name } = profile;
  if (first_name && last_name) return `${first_name} ${last_name}`;
  if (first_name) return first_name;
  if (last_name) return last_name;
  return 'Unnamed User';
}