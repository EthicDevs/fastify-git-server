// std
import stream from "node:stream";
// 3rd-party - fastify std
import type { FastifyPluginAsync } from "fastify";
import makeFastifyPlugin from "fastify-plugin";
import debug from "debug";
// lib
import { GitServer } from "./types";
import {
  FASTIFY_VERSION_TARGET,
  GIT_INFO_REFS,
  GIT_PATH_REGEXP,
  GIT_POST_REQUEST_TYPES,
  SUPPORTED_GIT_REQUEST_TYPES,
} from "./constants";
import { getPackType } from "./helpers/getPackType";
import { sendInfoRefs } from "./helpers/sendInfoRefs";
import { sendStatelessRpc } from "./helpers/sendStatelessRpc";
import { spawnGit } from "./helpers/spawnGit";

const logInfo = debug("fastifyGitServer:info");
const logTrace = debug("fastifyGitServer:trace");
const logWarn = debug("fastifyGitServer:warn");
const logError = debug("fastifyGitServer:error");

const gitServerPluginAsync: FastifyPluginAsync<GitServer.PluginOptions> =
  async (server, opts) => {
    try {
      const spawnGitCommand: GitServer.SpawnGitCommandDecorator = (
        args,
        gitRepositoryDir,
      ) => {
        return spawnGit(opts, args, gitRepositoryDir);
      };

      server.decorateRequest("spawnGitCommand", spawnGitCommand);

      server.addHook("onRequest", async (request, reply) => {
        try {
          logInfo(`[git] handling request "${request.id}"...`);
          logTrace("request.url:", request.url);

          const { service } = request.query as { service?: string };
          const requestMethod = request.method.toUpperCase();
          let packType = getPackType(service);

          logTrace("service:", service);
          logTrace("packType:", packType);
          logTrace("requestMethod:", requestMethod);

          const pathname = request.url.split("?")[0];
          const pathMatches = GIT_PATH_REGEXP.exec(pathname);

          logTrace("pathname:", pathname);
          logTrace("pathMatches:", pathMatches);

          if (
            pathMatches == null ||
            Array.isArray(pathMatches) === false ||
            pathMatches.length < 4
          ) {
            logWarn(
              `[git] path did not match a valid .git path for request "${request.id}"...`,
            );
            return undefined;
          }

          let [_, org, repo, requestType] = pathMatches;
          requestType = requestType.toLowerCase();
          const repoSlug = `${org}/${repo}`;
          logTrace("requestType:", requestType);
          logTrace("repoSlug:", repoSlug);

          if (packType == null) {
            packType = getPackType(requestType);
          }

          if (packType == null) {
            logWarn(
              `[git] pack type is set to null for request "${request.id}"...`,
            );
            return reply.status(400).send();
          }

          if (SUPPORTED_GIT_REQUEST_TYPES.includes(requestType) === false) {
            logWarn(
              `[git] unsupported request type specified in request "${request.id}"...`,
            );
            return reply.status(400).send();
          }

          const repoResult = await opts.repositoryResolver(repoSlug);
          logTrace("repoResult:", repoResult);

          let authCredentials: null | GitServer.AuthCredentials = null;

          if (
            repoResult.authMode !== GitServer.AuthMode.NEVER &&
            (repoResult.authMode === GitServer.AuthMode.ALWAYS ||
              (packType === GitServer.PackType.RECEIVE &&
                repoResult.authMode === GitServer.AuthMode.PUSH_ONLY))
          ) {
            const authorization = request.headers["authorization"];
            logTrace("authorization:", authorization);

            if (authorization == null) {
              logWarn(
                `[git] missing authorization header for request "${request.id}"...`,
              );
              reply.header(
                "WWW-Authenticate",
                'Basic realm="Git", charset="UTF-8"',
              );
              return reply.status(401).send();
            }

            if (authorization.toLowerCase().startsWith("basic ") === false) {
              logWarn(
                `[git] bad authorization header for request "${request.id}"...`,
              );
              return reply.status(400).send();
            }

            const [username, password] = Buffer.from(
              authorization.replace(/^Basic /i, ""),
              "base64",
            )
              .toString("utf-8")
              .split(":");

            authCredentials = {
              username,
              password,
            };

            const authorizationResult = await opts.authorizationResolver(
              repoSlug,
              authCredentials,
            );

            if (authorizationResult !== true) {
              logWarn(`[git] bad authorization for request "${request.id}"...`);
              authCredentials = null;
              return reply.status(403).send();
            }
          }

          const gitStream = new stream.PassThrough();
          gitStream.pipe(reply.raw);

          if (requestMethod === "GET" && requestType === GIT_INFO_REFS) {
            logInfo(
              `[git] sending info refs response for request "${request.id}"...`,
            );
            reply.raw.writeHead(200, "OK", {
              "content-type": `application/x-git-${packType}-advertisement`,
            });
            await sendInfoRefs(
              opts,
              packType,
              repoResult.gitRepositoryDir,
              gitStream,
            );
          } else if (
            requestMethod === "POST" &&
            GIT_POST_REQUEST_TYPES.includes(requestType)
          ) {
            logInfo(
              `[git] sending stateless rpc response for request "${request.id}"...`,
            );
            reply.raw.writeHead(200, "OK", {
              "content-type": `application/x-git-${packType}-result`,
            });
            try {
              await sendStatelessRpc({
                cwd: repoResult.gitRepositoryDir,
                gitStream,
                opts,
                packType,
                repoSlug,
                request,
                requestMethod,
                requestType,
                username: authCredentials?.username || null,
              });
            } catch (err) {
              const error = err as Error;
              logWarn(
                `[git] onPush callback denied request "${request.id}" with error: ${error.message}.`,
              );
              return reply.status(400).send(error.message);
            }
          } else {
            logWarn(
              `[git] unknown method and/or request type specified in request "${request.id}".`,
            );
            return reply.status(400).send();
          }

          logInfo(`[git] request "${request.id}" was handled.`);
          return reply;
        } catch (err) {
          const error = err as Error;
          logWarn(
            `[git] something went wrong with request "${request.id}".`,
            err,
          );
          return reply.status(500).send(error.message);
        }
      });

      logInfo("Git Server plugin made!");
    } catch (err) {
      logError("Could not make the Git Server plugin.", err);
    }
  };

export function makePlugin() {
  return makeFastifyPlugin(gitServerPluginAsync, FASTIFY_VERSION_TARGET);
}
