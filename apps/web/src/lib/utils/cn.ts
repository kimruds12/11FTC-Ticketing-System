/**
 * Tiny className combiner. Joins truthy class fragments with a single space. Pure and
 * dependency-free (foundation-layer util — no framework, no domain). If class-conflict
 * resolution is ever needed, swap in clsx + tailwind-merge behind this same signature.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
