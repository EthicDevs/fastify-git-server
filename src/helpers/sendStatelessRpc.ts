// std
import type { PathLike } from "node:fs";
import stream from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
// lib
import { GIT_STATELESS_RPC_FLAG, ON_PUSH_TIMEOUT_MS } from "../constants";
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
  return new Promise((resolve, reject) => {
    const spawnGitCmd = (args: string[]) => spawnGit(opts, args, cwd);
    const safePackType = safeServiceToPackType(packType);
    const process = spawnGitCmd([safePackType, GIT_STATELESS_RPC_FLAG]);

    request.raw.pipe(process.stdin, { end: false });

    process.stdout.on("data", (chunk) => gitStream.write(chunk));
    process.stdout.on("close", async () => {
      // trigger the onPush callback from options if needed
      if (opts.withSideBandMessages === true && opts.onPush != null) {
        let onPushPerfomedAction: boolean = false;

        const accept = () => {
          onPushPerfomedAction = true;
          resolve(undefined);
          return undefined;
        };

        const deny = (reason: string) => {
          onPushPerfomedAction = true;
          reject(new Error(reason));
          return undefined;
        };

        // protect against miss-implemented onPush by automatically denying the
        // request in case onPush hook does not reply after 30 seconds.
        let autoDenyTimeoutId: null | NodeJS.Timer = setTimeout(() => {
          if (autoDenyTimeoutId != null) {
            clearTimeout(autoDenyTimeoutId);
            autoDenyTimeoutId = null;
          }
          deny(
            `onPush did not respond within the allowed ${ON_PUSH_TIMEOUT_MS} seconds.`,
          );
        }, ON_PUSH_TIMEOUT_MS);

        await opts.onPush({
          type: "push",
          message: new GitServerMessage(gitStream, accept, deny),
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

        clearTimeout(autoDenyTimeoutId);
        autoDenyTimeoutId = null;

        if (onPushPerfomedAction === false) {
          accept();
        }
      } else {
        resolve(undefined);
      }
    });
  });
}
