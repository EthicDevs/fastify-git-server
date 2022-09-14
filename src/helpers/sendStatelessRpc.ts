// std
import type { PathLike } from "node:fs";
import stream from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
// lib
import { GIT_STATELESS_RPC_FLAG } from "../constants";
import { GitServer } from "../types";
import { GitServerMessage } from "./GitServerMessage";
import { safeServiceToPackType } from "./safeServiceToPackType";
import { spawnGit } from "./spawnGit";

export function sendStatelessRpc({
  cwd,
  gitStream,
  opts,
  packType,
  repoSlug,
  request,
  requestMethod,
  requestType,
  username,
}: {
  cwd: PathLike;
  gitStream: stream.PassThrough;
  opts: GitServer.PluginOptions;
  packType: GitServer.PackType;
  repoSlug: string;
  request: FastifyRequest;
  requestMethod: "POST";
  requestType: string;
  username: string | null;
}) {
  return new Promise((resolve) => {
    const spawnGitCmd = (args: string[]) => spawnGit(opts, args, cwd);
    const safePackType = safeServiceToPackType(packType);
    const process = spawnGitCmd([safePackType, GIT_STATELESS_RPC_FLAG]);

    let gitServerMessage: GitServerMessage | null =
      opts.withSideBandMessages === true
        ? new GitServerMessage(gitStream)
        : null;

    request.raw.pipe(process.stdin, { end: false });

    process.stdout.on("data", (chunk) => gitStream.write(chunk));

    process.stdout.once("data", () => {
      // trigger the onPush callback from options if needed
      if (gitServerMessage != null && opts.onPush != null) {
        opts.onPush({
          type: "push",
          message: gitServerMessage,
          data: {
            packType: safePackType,
            repoDiskPath: cwd,
            repoSlug,
            request,
            requestMethod,
            requestType,
            username,
          },
        });
      }
    });

    process.stdout.on("close", () => resolve(gitStream.end()));
  });
}
