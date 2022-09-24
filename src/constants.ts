export const FASTIFY_VERSION_TARGET = "3.x";

// hooks
export const ON_PUSH_TIMEOUT_MS = 30 * 1000; // 30s before auto-denying timeout

// git special codes
export const GIT_PACK_SEPARATOR = "0000PACK";
export const GIT_PACK_TYPE_UPLOAD = "001e#";
export const GIT_PACK_TYPE_RECEIVE = "001f#";
export const GIT_SIDEBAND_TYPE_ERR = "\u0003";
export const GIT_SIDEBAND_END_OPCODE = "00000000";

// git commands/flags related
export const GIT_EXECUTABLE_DEFAULT = "git";
export const GIT_STATELESS_RPC_FLAG = "--stateless-rpc";
export const GIT_ADVERTISE_REFS_FLAG = "--advertise-refs";
export const GIT_INFO_REFS = "info/refs";
export const GIT_UPLOAD_PACK = "git-upload-pack";
export const GIT_RECEIVE_PACK = "git-receive-pack";

// git regular expressions
export const GIT_PATH_REGEXP =
  /([0-9A-Za-z-_\.]+)\/([0-9A-Za-z-_\.]+)\.git\/(.+)/i;
export const GIT_PACK_REGEXP =
  /([0-9a-z]+) ([0-9a-z]+) refs\/(heads|tags)\/([0-9a-z-_\/]+)\x00 ([0-9a-z- =\/\.]+)/i;

// supported git features
export const SUPPORTED_GIT_REQUEST_TYPES = [
  GIT_INFO_REFS,
  GIT_UPLOAD_PACK,
  GIT_RECEIVE_PACK,
];
export const GIT_GET_REQUEST_TYPES = [GIT_INFO_REFS];
export const GIT_POST_REQUEST_TYPES = [GIT_UPLOAD_PACK, GIT_RECEIVE_PACK];
