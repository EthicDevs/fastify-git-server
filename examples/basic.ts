/**
 * Run me using command:
 * $ yarn ts-node basic.ts # (dev) quick command to transpile/run
 *
 * Or transpile me into JS then launch me using:
 * $ node basic.ts # (prod) once you have configured *pack, run
 */

// std
import { join, resolve } from "node:path";
// 3rd-party
import fastify from "fastify";
// lib
import fastifyGitServer, { GitServer } from "..";

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT != null ? parseInt(process.env.PORT, 10) : 4200;

async function main() {
  const server = fastify();

  server.register(fastifyGitServer, {
    // a method to authorise the fact that the user can fetch/push, or not.
    async authorizationResolver(repoSlug, credentials) {
      if (repoSlug.toLowerCase() === "testorg/test-repo") {
        return (
          credentials.username === "test" && credentials.password === "test"
        );
      }
      return false;
    },
    // a method to resolve the repository directory on disk and its authorisation mode.
    async repositoryResolver(repoSlug) {
      if (repoSlug !== "testorg/test-repo") {
        throw new Error("Cannot find such repository.");
      }
      return {
        authMode: GitServer.AuthMode.ALWAYS, // or PUSH_ONLY, or NEVER.
        gitRepositoryDir: resolve(join(__dirname, "..")),
      };
    },
  });

  server.listen(PORT, HOST, (err, listeningOnUrl) => {
    if (err != null) {
      console.error(`❌ Could not start server. Error: ${err.message}`);
    } else {
      console.log(`🚀 Server is up and running at: ${listeningOnUrl}`);
    }
  });

  return server;
}

main();
