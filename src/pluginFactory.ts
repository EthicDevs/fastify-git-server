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

const logTrace = debug("fastifyGitServer:trace");
const logError = debug("fastifyGitServer:error");

const gitServerPluginAsync: FastifyPluginAsync<GitServer.PluginOptions> =
  async (server, opts) => {
    try {
      server;
      opts;

      server.addHook("preHandler", async (request, reply) => {
        const { service } = request.query as { service?: string };
        const packType = getPackType(service);
        const requestMethod = request.method.toUpperCase();

        if (packType == null) {
          return reply.status(400).send();
        }

        const { pathname } = new URL(request.url);
        const pathMatches = GIT_PATH_REGEXP.exec(pathname);

        if (
          pathMatches == null ||
          Array.isArray(pathMatches) === false ||
          pathMatches.length < 4
        ) {
          return undefined;
        }

        let [_, org, repo, requestType] = pathMatches;
        requestType = requestType.toLowerCase();
        const repoSlug = `${org}/${repo}`;

        if (SUPPORTED_GIT_REQUEST_TYPES.includes(requestType) === false) {
          return reply.status(400).send();
        }

        const repoResult = await opts.repositoryResolver(repoSlug);

        if (
          repoResult.authMode !== GitServer.AuthMode.NEVER &&
          (repoResult.authMode === GitServer.AuthMode.ALWAYS ||
            (requestType === GIT_RECEIVE_PACK &&
              repoResult.authMode === GitServer.AuthMode.PUSH_ONLY))
        ) {
          const authorization = request.headers["authorization"];

          if (authorization == null) {
            reply.header(
              "WWW-Authenticate",
              'Basic realm="Git", charset="UTF-8"',
            );
            return reply.status(401).send();
          }

          if (authorization.toLowerCase().startsWith("basic ") === false) {
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
            return reply.status(403).send();
          }
        }

        if (requestMethod === "GET" && requestType === GIT_INFO_REFS) {
          sendInfoRefs(opts, packType, repoResult.gitRepositoryDir, reply);
        } else if (
          requestMethod === "POST" &&
          GIT_POST_REQUEST_TYPES.includes(requestType)
        ) {
          sendStatelessRpc(
            opts,
            packType,
            repoResult.gitRepositoryDir,
            request,
            reply,
          );
        } else {
          return reply.status(400).send();
        }

        return undefined;
      });

      logTrace("Git Gerver plugin made!");
    } catch (err) {
      logError("Could not make the Git Server plugin.", err);
    }
  };

export function makePlugin() {
  return makeFastifyPlugin(gitServerPluginAsync, FASTIFY_VERSION_TARGET);
}
