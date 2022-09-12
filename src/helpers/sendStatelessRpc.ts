// std
import { PathLike } from "node:fs";
import stream from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
// lib
import { GIT_STATELESS_RPC_FLAG } from "../constants";
import { GitServer } from "../types";
import { safeServiceToPackType } from "./safeServiceToPackType";
import { spawnGit } from "./spawnGit";

export function sendStatelessRpc(
  opts: GitServer.PluginOptions,
  packType: GitServer.PackType,
  cwd: PathLike,
  request: FastifyRequest,
  gitStream: stream.PassThrough,
) {
  const safePackType = safeServiceToPackType(packType);
  const process = spawnGit(opts, [safePackType, GIT_STATELESS_RPC_FLAG], cwd);

  request.raw.pipe(process.stdin, { end: false });

  process.stdout.on("data", (chunk) => gitStream.write(chunk));
  process.stdout.on("close", () => gitStream.end());
}
