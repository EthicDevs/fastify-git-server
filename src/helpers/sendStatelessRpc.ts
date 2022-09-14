// std
import { PathLike } from "node:fs";
import stream from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
// lib
import { GIT_STATELESS_RPC_FLAG } from "../constants";
import { GitServer } from "../types";
import { GitServerMessage } from "./GitServerMessage";
import { safeServiceToPackType } from "./safeServiceToPackType";
import { spawnGit } from "./spawnGit";

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

    let gitServerMessage: GitServerMessage | null =
      opts.withSideBandMessages === true
        ? new GitServerMessage({
            gitRepositoryDir: cwd,
            packType: safePackType,
            request: request,
            stream: gitStream,
          })
        : null;

    request.raw.pipe(process.stdin, { end: false });

    process.stdout.on("data", (chunk) => gitStream.write(chunk));

    process.stdout.once("data", () => {
      // trigger the onPush callback from options if needed
      if (gitServerMessage != null && opts.onPush != null) {
        opts.onPush(gitServerMessage);
      }
    });

    process.stdout.on("close", () => resolve(gitStream.end()));
  });
}
