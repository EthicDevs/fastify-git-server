export const FASTIFY_VERSION_TARGET = "3.x";

// hooks
export const ON_PUSH_TIMEOUT_MS = 30 * 1000; // 30s before auto-denying timeout

// git commands/flags related
export const GIT_EXECUTABLE_DEFAULT = "git";
export const GIT_STATELESS_RPC_FLAG = "--stateless-rpc";
export const GIT_ADVERTISE_REFS_FLAG = "--advertise-refs";
export const GIT_PATH_REGEXP = new RegExp(
  /([A-Za-z-]+)\/([A-Za-z-]+)\.git\/(.+)/i,
);

// supported git features
export const GIT_INFO_REFS = "info/refs";
export const GIT_UPLOAD_PACK = "git-upload-pack";
export const GIT_RECEIVE_PACK = "git-receive-pack";
export const SUPPORTED_GIT_REQUEST_TYPES = [
  GIT_INFO_REFS,
  GIT_UPLOAD_PACK,
  GIT_RECEIVE_PACK,
];
export const GIT_GET_REQUEST_TYPES = [GIT_INFO_REFS];
export const GIT_POST_REQUEST_TYPES = [GIT_UPLOAD_PACK, GIT_RECEIVE_PACK];
