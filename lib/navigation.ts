export { useRouter, usePathname, redirect } from "next/navigation";
export { default as Link } from "next/link";

export function getPathname({
  href,
}: {
  href: string | { pathname: string };
}): string {
  return typeof href === "string" ? href : href.pathname;
}
