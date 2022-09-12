# `fastify-git-server`

[![NPM](https://img.shields.io/npm/v/@ethicdevs/fastify-git-server?color=red)](https://www.npmjs.com/@ethicdevs/fastify-git-server)
[![MIT License](https://img.shields.io/github/license/ethicdevs/fastify-git-server.svg?color=blue)](https://github.com/ethicdevs/fastify-git-server/blob/master/LICENSE)
[![ci-main](https://github.com/EthicDevs/fastify-git-server/actions/workflows/ci-main.yml/badge.svg)](https://github.com/EthicDevs/fastify-git-server/actions/workflows/ci-main.yml)
[![Average issue resolution time](https://isitmaintained.com/badge/resolution/ethicdevs/fastify-git-server.svg?v1.0.0)](https://isitmaintained.com/project/ethicdevs/fastify-git-server)
[![Number of open issues](https://isitmaintained.com/badge/open/ethicdevs/fastify-git-server.svg?v1.0.0)](https://isitmaintained.com/project/ethicdevs/fastify-git-server)

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
// std
import { resolve } from "node:path";
// 3rd-party
import fastify from "fastify";
// app
import fastifyGitServer, { GitServer } from "@ethicdevs/fastify-git-server";

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT != null ? parseInt(process.env.PORT, 10) : 4200;

async function main() {
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

## Contributing

Contributions to this repository are welcome to everyone, please feel free to
send a pull request for further review/discussion/merging/resolution. 👌

### Run the tests

```sh
$ yarn test # run all tests
$ yarn test --coverage # get coverage in ./coverage/lcov-report/index.html
$ yarn test --coverage --watchAll # (dev) quick test iteration loop
```

### Build the lib

```sh
$ yarn build
$ yarn typecheck # same but does not write to ./dist folder (only check types)
```

## Credits

This library is a port of [git-express](https://github.com/MWGuy/git-express),
aimed at Fastify v3.x+. Original lib' has not received any update for more than
2 years now and has been released without any license...

It was a great source of inspiration for this library to be born, so thanks to
the author for that piece of code! 😅

## License

The [MIT](/LICENSE) license.
