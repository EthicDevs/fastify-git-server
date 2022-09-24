// std
import { PassThrough } from "node:stream";
// 3rd-party
import { default as encodeSideBandMessage } from "git-side-band-message";
// app
import { GIT_SIDEBAND_END_OPCODE, GIT_SIDEBAND_TYPE_ERR } from "../constants";

export class GitServerMessage {
  public stream: PassThrough;
  public accept: () => void;
  public deny: (reason: string) => void;

  constructor(
    stream: PassThrough,
    accept: () => void,
    deny: (reason: string) => void,
  ) {
    this.stream = stream;
    this.accept = accept;
    this.deny = deny;
  }

  public end(msg?: string) {
    // must be called at the end
    if (msg != null) {
      this.write(msg);
    }
    return this.stream.end(GIT_SIDEBAND_END_OPCODE);
  }

  public write(msg: string) {
    // \2 is a verbose message as defined in the git protocol
    return this.stream.write(encodeSideBandMessage(msg));
  }

  public error(msg: string) {
    // \3 is an error message as defined in the git protocol
    this.stream.write(
      encodeSideBandMessage(msg, Buffer.from(GIT_SIDEBAND_TYPE_ERR)),
    );
    return this.end;
  }
}
