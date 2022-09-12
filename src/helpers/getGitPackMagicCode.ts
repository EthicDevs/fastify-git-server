// lib
import { GitServer } from "../types";

export function getGitPackMagicCode(type: GitServer.PackType): string {
  if (type === GitServer.PackType.UPLOAD) return "001e#";
  return "001f#";
}
