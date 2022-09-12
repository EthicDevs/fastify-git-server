import fastify from "fastify";
import { join, resolve } from "node:path";
import fastifyGitServer, { GitServer } from "..";

async function main() {
  const server = fastify();

  server.register(fastifyGitServer, {
    // can be set to a path to git, else will directly call "git" from $PATH.
    gitExecutablePath: undefined,
    // a method to authorise the fact that the user can fetch/push, or not.
    async authorize(repoSlug, credentials) {
      console.log(
        `[authorize] repoSlug: ${repoSlug}, username: ${credentials.username}, password: ${credentials.password}`,
      );
      if (repoSlug.toLowerCase() === "testorg/testrepo") {
        return (
          credentials.username === "test" && credentials.password === "test"
        );
      }
      return false;
    },
    // a method to resolve the repository directory on disk and its authorisation mode.
    async repositoryResolver(repoSlug) {
      console.log(`[repositoryResolver] repoSlug: ${repoSlug}`);
      if (repoSlug !== "testorg/testrepo") {
        throw new Error("Cannot find such repository.");
      }
      return {
        authMode: GitServer.AuthMode.ALWAYS, // or PUSH_ONLY, or NEVER.
        gitRepositoryDir: resolve(join(__dirname, "..")),
      };
    },
  });

  server.listen(4200, "localhost", (err, address) => {
    if (err != null) {
      console.error(`Could not start server. Error: ${err.message}`);
    } else {
      console.log(`Server is up and running at ${address}`);
    }
  });

  return server;
}

main();
