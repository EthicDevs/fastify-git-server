// std
import type { PathLike } from "node:fs";
import { PassThrough } from "node:stream";
// 3rd-party
import type { FastifyRequest } from "fastify";
import { default as encodeSideBandMessage } from "git-side-band-message";
// lib
import { GitServer } from "../types";

export class GitServerMessage {
  public gitRepositoryDir: PathLike;
  public packType: GitServer.PackType;
  public request: FastifyRequest;
  public stream: PassThrough;

  constructor({
    gitRepositoryDir,
    packType,
    request,
    stream,
  }: {
    gitRepositoryDir: PathLike;
    packType: GitServer.PackType;
    request: FastifyRequest;
    stream: PassThrough;
  }) {
    this.gitRepositoryDir = gitRepositoryDir;
    this.packType = packType;
    this.request = request;
    this.stream = stream;
  }

  public end(msg?: string) {
    // must be called at the end
    if (msg != null) {
      this.write(msg);
    }
    return this.stream.end("00000000");
  }

  public write(msg: string) {
    // \2 is a verbose message as defined in the git protocol
    return this.stream.write(encodeSideBandMessage(msg));
  }

  public error(msg: string) {
    // \3 is an error message as defined in the git protocol
    this.stream.write(encodeSideBandMessage(msg, Buffer.from("\u0003")));
    return this.end;
  }
}
