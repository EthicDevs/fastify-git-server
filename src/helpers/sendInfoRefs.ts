// std
import { PathLike } from "node:fs";
import stream from "node:stream";
// lib
import { GIT_ADVERTISE_REFS_FLAG, GIT_STATELESS_RPC_FLAG } from "../constants";
import { GitServer } from "../types";
import { getGitPackMagicCode } from "./getGitPackMagicCode";
import { safeServiceToPackType } from "./safeServiceToPackType";
import { spawnGit } from "./spawnGit";

export function sendInfoRefs(
  opts: GitServer.PluginOptions,
  packType: GitServer.PackType,
  cwd: PathLike,
  gitStream: stream.PassThrough,
) {
  const safePackType = safeServiceToPackType(packType);
  const process = spawnGit(
    opts,
    [safePackType, GIT_STATELESS_RPC_FLAG, GIT_ADVERTISE_REFS_FLAG],
    cwd,
  );

  gitStream.write(
    getGitPackMagicCode(safePackType) +
      " service=git-" +
      safePackType +
      "\n0000",
  );

  process.stdout.on("data", (chunk) => gitStream.write(chunk));
  process.stdout.on("close", () => gitStream.end());
}
