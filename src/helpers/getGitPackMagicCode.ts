// lib
import { GIT_PACK_TYPE_RECEIVE, GIT_PACK_TYPE_UPLOAD } from "../constants";
import { GitServer } from "../types";

export function getGitPackMagicCode(type: GitServer.PackType): string {
  if (type === GitServer.PackType.UPLOAD) return GIT_PACK_TYPE_UPLOAD;
  return GIT_PACK_TYPE_RECEIVE;
}
