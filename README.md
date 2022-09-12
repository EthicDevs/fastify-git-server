# `fastify-git-server`

[![NPM](https://img.shields.io/npm/v/@ethicdevs/fastify-git-server?color=red)](https://www.npmjs.com/@ethicdevs/fastify-git-server)
[![MIT License](https://img.shields.io/github/license/ethicdevs/fastify-git-server.svg?color=blue)](https://github.com/ethicdevs/fastify-git-server/blob/master/LICENSE)
[![Average issue resolution time](https://isitmaintained.com/badge/resolution/ethicdevs/fastify-git-server.svg)](https://isitmaintained.com/project/ethicdevs/fastify-git-server)
[![Number of open issues](https://isitmaintained.com/badge/open/ethicdevs/fastify-git-server.svg)](https://isitmaintained.com/project/ethicdevs/fastify-git-server)

A Fastify plugin to easily make one/many Git repositories available for clone/fetch/push.

## Installation

```shell
$ yarn add @ethicdevs/fastify-git-server
# or
$ npm i @ethicdevs/fastify-git-server
```

## Usage

```ts
// server.ts
import fastify from "fastify";
import { resolve } from "node:path";
import fastifyGitServer, { GitServer } from "..";

(function main() {
  const server = fastify();

  server.register(fastifyGitServer, {
    // can be set to a path to git, else will directly call "git" from $PATH.
    gitExecutablePath: undefined,
    // a method to authorise the fact that the user can fetch/push, or not.
    async authorize(repoSlug, credentials) {
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
        gitRepositoryDir: resolve(
          "/home/git-server-user/repos/testorg/test-repo",
        ),
      };
    },
  });

  server.listen("localhost", "4200", () => {
    console.log(`Server is up and running at http://localhost:4200`);
  });
})();
```

Run the server like so (or build/bundle it first), and enjoy!

```sh
$ ts-node server.ts
# Server is up and running at http://localhost:4200
```

Now you can easily git clone/fetch/push to the repository assuming you pass the
right credentials set for the right repository.

```sh
$ git clone http://localhost:4200/testorg/test-repo.git
$ cd test-repo/
$ git fetch
$ git pull --rebase
$ echo "Today is: $(date)" >> ReadMe.md
$ git commit -am 'docs(readme): add the date of today'
$ git push
```

## License

The [MIT](/LICENSE) license.
