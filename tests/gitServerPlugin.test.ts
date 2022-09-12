// std
import type { IncomingMessage, Server, ServerResponse } from "http";
import { join, resolve } from "node:path";
// 3rd-party
import fastify, { FastifyInstance, FastifyLoggerInstance } from "fastify";
// lib
import { GitServer } from "../src/types";
import { makePlugin } from "../src/pluginFactory";

const setTimeoutBypassingFakes = global.setTimeout;

const sleep = (time: number = 100) =>
  new Promise((resolve) => {
    let timer = setTimeoutBypassingFakes(() => {
      clearTimeout(timer);
      timer.unref();
      resolve(undefined);
    }, time);
  });

jest.setTimeout(20000);

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
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
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
      url: "/org/repo.git/bad-request-type",
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 404 and return with a JSON containing error details when the request path did not match a valid .git path`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
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
      url: "/org/repo/info/refs?service=git-upload-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(404);
    expect(response.body).toMatchInlineSnapshot(
      `"{\\"message\\":\\"Route GET:/org/repo/info/refs?service=git-upload-pack not found\\",\\"error\\":\\"Not Found\\",\\"statusCode\\":404}"`,
    );
  });

  it(`should reply with 400 and return empty when a bad requestType is received`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.PUSH_ONLY,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request with a bad requestType is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/bad-request-type?service=receive-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 400 and return empty when a bad requestType is received and no "?service=" query param is passed`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.PUSH_ONLY,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request with a bad requestType is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/bad-request-type",
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 400 and return empty when a bad method is requested with a valid .git path`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.PUSH_ONLY,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request with a bad requestType is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "PUT",
      url: "/org/repo.git/info/refs?service=git-upload-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 500 and return empty when the "options.authorize" function throws`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        throw new Error("Test error");
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.ALWAYS,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request with a bad requestType is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/info/refs?service=git-upload-pack",
      headers: {
        authorization: "Basic dGVzdDp0ZXN0", // "test:test" base64-ized
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(500);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 500 and return empty when the "options.repositoryResolver" function throws`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        throw new Error("Test error");
      },
    });

    // When
    // a request with a bad requestType is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/info/refs?service=git-upload-pack",
      headers: {
        authorization: "Basic dGVzdDp0ZXN0", // "test:test" base64-ized
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(500);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 401 and a WWW-Authenticate header and return empty when GET /:org/:slug.git/info/refs?service=git-upload-pack is called and repositoryResolver returned with AuthMode.ALWAYS and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.ALWAYS,
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
      url: "/org/repo.git/info/refs?service=git-upload-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(401);
    expect(response.headers["www-authenticate"]).toBeDefined();
    expect(response.headers["www-authenticate"]).not.toBeNull();
    expect(response.headers["www-authenticate"]).toMatchInlineSnapshot(
      `"Basic realm=\\"Git\\", charset=\\"UTF-8\\""`,
    );
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 200 and return with the requested refs info when GET /:org/:slug.git/info/refs?service=git-upload-pack is called and repositoryResolver returned with AuthMode.NEVER or AuthMode.PUSH_ONLY and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
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
      url: "/org/repo.git/info/refs?service=git-upload-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(200);
    expect(response.body).toMatchInlineSnapshot(`
"001e# service=git-upload-pack
0000010b510e5f56d777c059c2eb1bc037347b6d4f8d14b1 HEAD multi_ack thin-pack side-band side-band-64k ofs-delta shallow deepen-since deepen-not deepen-relative no-progress include-tag multi_ack_detailed no-done symref=HEAD:refs/heads/main object-format=sha1 agent=git/2.35.1
003d510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/heads/main
0046510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/remotes/origin/HEAD
0046510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/remotes/origin/main
0000"
`);
  });

  it(`should reply with 200 and return empty when GET /:org/:slug.git/info/refs?service=git-receive-pack is called and repositoryResolver returned with AuthMode.ALWAYS and Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, cred) {
        return cred.username === "test" && cred.password === "test";
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.ALWAYS,
          gitRepositoryDir: resolve(
            join(__dirname, "__fixtures__", "test-git-repo-001"),
          ),
        };
      },
    });

    // When
    // a request for receiving git pack is made
    const response = await app.inject({
      remoteAddress: "localhost",
      method: "GET",
      url: "/org/repo.git/info/refs?service=git-receive-pack",
      headers: {
        authorization: "Basic dGVzdDp0ZXN0", // "test:test" base64-ized
      },
    });

    // give time for git repo to clone
    await sleep(10000);

    // Then
    expect(response.statusCode).toStrictEqual(200);
    expect(response.headers["www-authenticate"]).not.toBeDefined();
    expect(response.body).toMatchInlineSnapshot(`
"001f# service=git-receive-pack
000000b1510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/heads/main report-status report-status-v2 delete-refs side-band-64k quiet atomic ofs-delta object-format=sha1 agent=git/2.35.1
0046510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/remotes/origin/HEAD
0046510e5f56d777c059c2eb1bc037347b6d4f8d14b1 refs/remotes/origin/main
0000"
`);
  });

  it(`should reply with 200 and return empty when POST /:org/:slug.git/git-upload-pack is called and repositoryResolver returned with AuthMode.PUSH_ONLY and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, cred) {
        return cred.username === "test" && cred.password === "test";
      },
      async repositoryResolver(_repoSlug) {
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
      method: "POST",
      url: "/org/repo.git/git-upload-pack",
      headers: {
        authorization: "Basic dGVzdDp0ZXN0", // "test:test" base64-ized
      },
      payload: {
        buffer: Buffer.from(
          `0032want 0a53e9ddeaddad63ad106860237bbf53411d11a7
0032have 441b40d833fdfa93eb2908e52742248faf0ee993
0000`,
        ),
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(200);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 401 and a WWW-Authenticate header and return empty when POST /:org/:slug.git/git-upload-pack is called and repositoryResolver returned with AuthMode.PUSH_ONLY and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.ALWAYS,
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
      method: "POST",
      url: "/org/repo.git/git-upload-pack",
      payload: {
        buffer: Buffer.from(
          `0032want 0a53e9ddeaddad63ad106860237bbf53411d11a7
0032have 441b40d833fdfa93eb2908e52742248faf0ee993
0000`,
        ),
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(401);
    expect(response.headers["www-authenticate"]).toBeDefined();
    expect(response.headers["www-authenticate"]).not.toBeNull();
    expect(response.headers["www-authenticate"]).toMatchInlineSnapshot(
      `"Basic realm=\\"Git\\", charset=\\"UTF-8\\""`,
    );
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 401 and a WWW-Authenticate header and return empty when POST /:org/:slug.git/git-upload-pack is called and repositoryResolver returned with AuthMode.PUSH_ONLY and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
        return {
          authMode: GitServer.AuthMode.ALWAYS,
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
      method: "POST",
      url: "/org/repo.git/git-upload-pack",
      payload: {
        buffer: Buffer.from(
          `....0a53e9ddeaddad63ad106860237bbf53411d11a7 441b40d833fdfa93eb2908e52742248faf0ee993 refs/heads/maint\0 report-status
0000
PACK....`,
        ),
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(401);
    expect(response.headers["www-authenticate"]).toBeDefined();
    expect(response.headers["www-authenticate"]).not.toBeNull();
    expect(response.headers["www-authenticate"]).toMatchInlineSnapshot(
      `"Basic realm=\\"Git\\", charset=\\"UTF-8\\""`,
    );
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 401 and a WWW-Authenticate header and return empty when POST /:org/:slug.git/git-receive-pack is called and repositoryResolver returned with AuthMode.PUSH_ONLY and no Authorization header is present`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, _cred) {
        return false;
      },
      async repositoryResolver(_repoSlug) {
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
      method: "POST",
      url: "/org/repo.git/git-receive-pack",
    });

    // Then
    expect(response.statusCode).toStrictEqual(401);
    expect(response.headers["www-authenticate"]).toBeDefined();
    expect(response.headers["www-authenticate"]).not.toBeNull();
    expect(response.headers["www-authenticate"]).toMatchInlineSnapshot(
      `"Basic realm=\\"Git\\", charset=\\"UTF-8\\""`,
    );
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 400 and return empty when POST /org/repo.git/git-receive-pack is called and repositoryResolver returned with AuthMode.NEVER or AuthMode.PUSH_ONLY and Authorization header is present but not a valid "Basic" auth token`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, cred) {
        return cred.username === "test" && cred.password === "test";
      },
      async repositoryResolver(_repoSlug) {
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
      method: "POST",
      url: "/org/repo.git/git-receive-pack",
      headers: {
        authorization: "NotBasic dGVzdDp0ZXN0", // "test:test" base64-ized
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(400);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });

  it(`should reply with 403 and return empty when POST /org/repo.git/git-receive-pack is called and repositoryResolver returned with AuthMode.NEVER or AuthMode.PUSH_ONLY and Authorization header is present but auth token is invalid`, async () => {
    // Given
    // the fastifyGitServerPlugin has been registered
    app.register(fastifyGitServerPlugin, {
      async authorize(_repoSlug, cred) {
        return cred.username === "test" && cred.password === "test";
      },
      async repositoryResolver(_repoSlug) {
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
      method: "POST",
      url: "/org/repo.git/git-receive-pack",
      headers: {
        authorization: "Basic NotValidToken",
      },
    });

    // Then
    expect(response.statusCode).toStrictEqual(403);
    expect(response.body).toMatchInlineSnapshot(`""`);
  });
});
