// std
import { PathLike } from "node:fs";
// 3rd-party
import type { FastifyReply } from "fastify";
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
  reply: FastifyReply,
) {
  const safePackType = safeServiceToPackType(packType);
  const process = spawnGit(
    opts,
    [safePackType, GIT_STATELESS_RPC_FLAG, GIT_ADVERTISE_REFS_FLAG],
    cwd,
  );

  reply.header(
    "Content-Type",
    `application/x-git-${safePackType}-advertisement`,
  );

  reply.raw.write(
    getGitPackMagicCode(safePackType) +
      " service=git-" +
      safePackType +
      "\n0000",
  );

  process.stdout.on("data", (chunk) => reply.raw.write(chunk));
  process.stdout.on("close", () => reply.raw.end());
  process.stdout.on("error", (err) =>
    reply.status(500).send({
      message: err.message,
      error: "Cannot send info refs",
      statusCode: 500,
    }),
  );
  process.stderr.on("error", (err) =>
    reply.status(500).send({
      message: err.message,
      error: "Cannot send info refs",
      statusCode: 500,
    }),
  );
}
