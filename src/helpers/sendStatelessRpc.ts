// std
import { PathLike } from "node:fs";
// 3rd-party
import type { FastifyReply, FastifyRequest } from "fastify";
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
  reply: FastifyReply,
) {
  const safePackType = safeServiceToPackType(packType);
  const process = spawnGit(opts, [safePackType, GIT_STATELESS_RPC_FLAG], cwd);

  reply.header("Content-Type", `application/x-git-${safePackType}-result`);

  request.raw.pipe(process.stdin, { end: false });

  process.stdout.on("data", (chunk) => reply.raw.write(chunk));
  process.stdout.on("close", () => reply.raw.end());
}
