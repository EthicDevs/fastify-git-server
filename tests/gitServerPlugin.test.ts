// std
import type { IncomingMessage, Server, ServerResponse } from "http";
import { join, resolve } from "node:path";
// 3rd-party
import fastify, { FastifyInstance, FastifyLoggerInstance } from "fastify";
// lib
import { GitServer } from "../src/types";
import { makePlugin } from "../src/pluginFactory";

/*const setTimeoutBypassingFakes = global.setTimeout;

const sleep = (time: number = 100) =>
  new Promise((resolve) => {
    setTimeoutBypassingFakes(() => {
      resolve(undefined);
    }, time);
  });*/

describe("@ethicdevs/fastify-git-server", () => {
  let app: FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyLoggerInstance
  > = fastify();

  const fastifyGitServerPlugin = makePlugin();

  beforeEach(() => {
    app = fastify();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`should reply with 400 and return empty when the request pack type is set to null`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(repoSlug, cred) {
        console.log(
          `[git] authorize -> ${repoSlug}: ${JSON.stringify(cred, null, 2)}`,
        );
        return false;
      },
      async repositoryResolver(repoSlug) {
        console.log(`[git] repositoryResolver -> ${repoSlug}`);
        return {
          authMode: GitServer.AuthMode.NEVER,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request without the "?service=${GitServer.PackType}" query param is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/",
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 404 and return with a JSON containing error details when the request path did not match a valid .git pat`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(repoSlug, cred) {
        console.log(
          `[git] authorize -> ${repoSlug}: ${JSON.stringify(cred, null, 2)}`,
        );
        return false;
      },
      async repositoryResolver(repoSlug) {
        console.log(`[git] repositoryResolver -> ${repoSlug}`);
        return {
          authMode: GitServer.AuthMode.PUSH_ONLY,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request with invalid path is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo/info/refs?service=receive-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(404);
    expect(response.body).toMatchInlineSnapshot(
      `"{\\"message\\":\\"Route GET:/org/repo/info/refs?service=receive-pack not found\\",\\"error\\":\\"Not Found\\",\\"statusCode\\":404}"`,
    );
  });

  it(`should reply with 200 and return refs info when GET :org/:slug.git/info/refs is called properly`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(repoSlug, cred) {
        console.log(
          `[git] authorize -> ${repoSlug}: ${JSON.stringify(cred, null, 2)}`,
        );
        return false;
      },
      async repositoryResolver(repoSlug) {
        console.log(`[git] repositoryResolver -> ${repoSlug}`);
        return {
          authMode: GitServer.AuthMode.PUSH_ONLY,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request for receiving git info refs is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/info/refs?service=receive-pack",
      headers: {
        authorization: "Basic test-basic-cred",
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(200);
    expect(response.body).toMatchInlineSnapshot(`
"001f# service=git-receive-pack
000000b1510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/heads/main report-status report-status-v2 delete-refs side-band-64k quiet atomic ofs-delta object-format=sha1 agent=git/2.35.1
0000"
`);
  });
});
