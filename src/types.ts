// std
import type { PathLike } from "node:fs";
// 3rd-party
import { FastifyRequest, HTTPMethods } from "fastify";
// lib
import { GitServerMessage } from "./helpers/GitServerMessage";

export namespace GitServer {
  export enum PackType {
    UPLOAD = "upload-pack",
    RECEIVE = "receive-pack",
  }

  export enum AuthMode {
    ALWAYS = "always",
    NEVER = "never",
    PUSH_ONLY = "push-only",
  }

  export interface AuthCredentials {
    username: string;
    password: string;
  }

  export interface RepositoryResolverResult {
    authMode: GitServer.AuthMode;
    gitRepositoryDir: PathLike;
  }

  export interface Event {
    type: "fetch" | "push";
    message: GitServerMessage;
    data: {
      packType: GitServer.PackType;
      repoDiskPath: PathLike;
      repoSlug: string;
      request: FastifyRequest;
      requestMethod: HTTPMethods;
      requestType: string;
      username: string | null;
    };
  }

  export interface PluginOptions {
    /**
     * A method that allow to provide custom business logic to resolve
     * authorisation.
     */
    authorizationResolver(
      repoSlug: string,
      credentials: GitServer.AuthCredentials,
    ): PromiseLike<boolean>;
    /**
     * A method that allow to provide custom business logic to resolve
     * repository's metas.
     */
    repositoryResolver(
      repoSlug: string,
    ): PromiseLike<GitServer.RepositoryResolverResult>;

    /* optional config properties */

    /**
     * A path to the desired git binary file. If unset, will directly call `git`
     * from the `$PATH`.
     * @default: undefined
     */
    gitExecutablePath?: PathLike;
    /**
     * Whether or not to enable support for `git-side-band-message` to allow
     * writing to the output stream while the client is performing fetch/push.
     * @default: false
     */
    withSideBandMessages?: boolean;

    /* optional config callbacks */

    /**
     * A callback that will be called whenever a client is performing a push
     * operation.
     */
    onPush?: (event: GitServer.Event) => void;
    /**
     * A callback that will be called whenever a client is performing a fetch
     * operation.
     * @note this callback does not gets called yet (as opposed to onPush).
     */
    onFetch?: (event: GitServer.Event) => void;
  }
}
