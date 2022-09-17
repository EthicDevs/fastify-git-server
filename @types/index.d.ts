import { GitServer } from "../src/types";

declare module "fastify" {
  export interface FastifyRequest {
    spawnGitCommand: GitServer.SpawnGitCommandDecorator;
  }
}
