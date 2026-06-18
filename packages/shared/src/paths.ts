import path from "node:path";

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export function isPathInside(parent: string, child: string): boolean {
  const parentResolved = path.resolve(parent);
  const childResolved = path.resolve(child);
  const rel = path.relative(parentResolved, childResolved);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}
