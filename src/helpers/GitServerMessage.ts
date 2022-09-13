// std
import { PassThrough } from "node:stream";
// 3rd-party
import { default as encodeSideBandMessage } from "git-side-band-message";

export class GitServerMessage {
  public stream: PassThrough;

  constructor(stream: PassThrough) {
    this.stream = stream;
  }

  public end(msg: string) {
    // must be called at the end
    if (msg) {
      this.write(msg);
    }
    return this.stream.end("00000000");
  }

  public write(msg: string) {
    // \2 is a verbose message as defined in the git protocol
    return this.stream.write(encodeSideBandMessage(msg, "\u0002"));
  }

  public error(msg: string) {
    // \3 is an error message as defined in the git protocol
    this.stream.write(encodeSideBandMessage(msg, "\u0003"));
    return this.end;
  }
}
