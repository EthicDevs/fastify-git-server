// std
import type { PathLike } from "node:fs";

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

  export interface PluginOptions {
    gitExecutablePath?: PathLike;

    authorize(
      repoSlug: string,
      credentials: GitServer.AuthCredentials,
    ): PromiseLike<boolean>;

    repositoryResolver(
      repoSlug: string,
    ): PromiseLike<GitServer.RepositoryResolverResult>;
  }
}
