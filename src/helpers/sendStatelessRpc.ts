// std
import type { PathLike } from "node:fs";
import stream from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
import debug from "debug";
// lib
import {
  GIT_PACK_REGEXP,
  GIT_PACK_SEPARATOR,
  GIT_STATELESS_RPC_FLAG,
  ON_PUSH_TIMEOUT_MS,
} from "../constants";
import { GitServer } from "../types";
import { GitServerMessage } from "./GitServerMessage";
import { safeServiceToPackType } from "./safeServiceToPackType";
import { spawnGit } from "./spawnGit";

const logTrace = debug("fastifyGitServer:trace");

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
  const spawnGitCmd = (args: string[]) => spawnGit(opts, args, cwd);
  return new Promise((resolve, reject) => {
    const safePackType = safeServiceToPackType(packType);
    const process = spawnGitCmd([safePackType, GIT_STATELESS_RPC_FLAG]);

    let receiveBuffer = [] as string[];
    request.raw.on("data", (chunk) => receiveBuffer.push(chunk));
    request.raw.pipe(process.stdin, { end: false });

    process.stdout.on("data", (chunk) => gitStream.write(chunk));
    process.stdout.once("data", () => {
      if (opts.withSideBandMessages === true && opts.onPush != null) {
        let onPushPerfomedAction: boolean = false;
        let shouldAcceptRequest: boolean = false;
        let denyReason: null | string = null;

        const accept = () => {
          onPushPerfomedAction = true;
          shouldAcceptRequest = true;
          logTrace("accept was called.");
        };

        const deny = (reason: string) => {
          onPushPerfomedAction = true;
          shouldAcceptRequest = false;
          denyReason = reason;
          logTrace("deny was called. reason:", reason);
        };

        // protect against miss-implemented onPush by automatically denying the
        // request in case onPush hook does not reply after 30 seconds.
        let autoDenyTimeoutId: null | NodeJS.Timer = setTimeout(() => {
          if (autoDenyTimeoutId == null) {
            return undefined;
          }
          if (autoDenyTimeoutId != null) {
            clearTimeout(autoDenyTimeoutId);
            autoDenyTimeoutId = null;
          }
          return deny(
            `onPush did not respond within the allowed ${ON_PUSH_TIMEOUT_MS} seconds.`,
          );
        }, ON_PUSH_TIMEOUT_MS);

        const received = Buffer.from(receiveBuffer.join(""))
          .toString("utf-8")
          .split(GIT_PACK_SEPARATOR);

        const receivedMatches = received[0].match(GIT_PACK_REGEXP);
        let payload: GitServer.EventPayload | null = null;

        if (receivedMatches != null && Array.isArray(receivedMatches)) {
          payload = {
            commitId: receivedMatches[2],
            treeId: receivedMatches[1],
            refType: receivedMatches[3].replace(/s$/, "") as "head" | "tag",
            refName: receivedMatches[4],
            binary: Buffer.from(received[1], "utf-8"),
            metas: receivedMatches[5].split(" ").map((meta) => meta.split("=")),
          };
        }

        // ask client for resolution about what to do + possibility to write to
        // the side band messages stream.
        opts.onPush({
          type: GitServer.EventType.PUSH,
          message: new GitServerMessage(gitStream, accept, deny),
          data: {
            packType,
            payload,
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

        if (shouldAcceptRequest === false && denyReason != null) {
          process.kill();
          gitStream.end();
          return reject(new Error(denyReason));
        }

        // else just let the command complete
        return undefined;
      }

      // do nothing
      return undefined;
    });

    process.stdout.on("close", () => resolve(gitStream.end()));
  });
}
