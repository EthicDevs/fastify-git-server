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
  GIT_RECEIVE_PACK,
  SUPPORTED_GIT_REQUEST_TYPES,
} from "./constants";
import { getPackType } from "./helpers/getPackType";
import { sendInfoRefs } from "./helpers/sendInfoRefs";
import { sendStatelessRpc } from "./helpers/sendStatelessRpc";

const logInfo = debug("fastifyGitServer:info");
const logTrace = debug("fastifyGitServer:trace");
const logWarn = debug("fastifyGitServer:warn");
const logError = debug("fastifyGitServer:error");

const gitServerPluginAsync: FastifyPluginAsync<GitServer.PluginOptions> =
  async (server, opts) => {
    try {
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

          if (
            repoResult.authMode !== GitServer.AuthMode.NEVER &&
            (repoResult.authMode === GitServer.AuthMode.ALWAYS ||
              (requestType === GIT_RECEIVE_PACK &&
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

            const authorizationResult = await opts.authorize(repoSlug, {
              username,
              password,
            });

            if (authorizationResult !== true) {
              logWarn(`[git] bad authorization for request "${request.id}"...`);
              return reply.status(403).send();
            }
          }

          if (requestMethod === "GET" && requestType === GIT_INFO_REFS) {
            logInfo(
              `[git] sending info refs response for request "${request.id}"...`,
            );
            sendInfoRefs(opts, packType, repoResult.gitRepositoryDir, reply);
          } else if (
            requestMethod === "POST" &&
            GIT_POST_REQUEST_TYPES.includes(requestType)
          ) {
            logInfo(
              `[git] sending stateless rpc response for request "${request.id}"...`,
            );
            sendStatelessRpc(
              opts,
              packType,
              repoResult.gitRepositoryDir,
              request,
              reply,
            );
          } else {
            logWarn(
              `[git] unknown method and/or request type specified in request "${request.id}".`,
            );
            return reply.status(400).send();
          }

          logInfo(`[git] request "${request.id}" was handled.`);
          return reply;
        } catch (err) {
          logWarn(
            `[git] something went wrong with request "${request.id}".`,
            err,
          );
          return reply.status(500).send();
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
