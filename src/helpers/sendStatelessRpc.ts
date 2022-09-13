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
import { GitServerMessage } from "./GitServerMessage";

export function sendStatelessRpc(
  opts: GitServer.PluginOptions,
  packType: GitServer.PackType,
  cwd: PathLike,
  request: FastifyRequest,
  gitStream: stream.PassThrough,
) {
  return new Promise((resolve) => {
    const safePackType = safeServiceToPackType(packType);
    const process = spawnGit(opts, [safePackType, GIT_STATELESS_RPC_FLAG], cwd);

    let gitServerMessage: GitServerMessage | null = null;

    request.raw.pipe(process.stdin, { end: false });

    if (opts.withSideBandMessages !== true) {
      process.stdout.on("data", (chunk) => gitStream.write(chunk));
    } else {
      gitServerMessage = new GitServerMessage(gitStream);
      process.stdout.on("data", (chunk) => {
        // end of transmission (git flush)
        if (chunk.length != 4) {
          gitStream.write(chunk);
        }
      });
    }

    if (gitServerMessage != null && opts.onPush != null) {
      opts.onPush(gitServerMessage);
    }

    process.stdout.on("close", () => resolve(gitStream.end()));
  });
}
