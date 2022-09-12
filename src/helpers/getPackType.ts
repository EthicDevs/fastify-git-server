// lib
import { GitServer } from "../types";
import { safeServiceToPackType } from "./safeServiceToPackType";

const HTTP_STR_TO_GIT_SERVER_PACK_TYPE = {
  [GitServer.PackType.UPLOAD]: GitServer.PackType.UPLOAD,
  [GitServer.PackType.RECEIVE]: GitServer.PackType.RECEIVE,
};

const SERVICE_KEYS = Object.keys(HTTP_STR_TO_GIT_SERVER_PACK_TYPE);

export function getPackType(service?: string): GitServer.PackType | null {
  if (service == null) return null;
  const safeService = safeServiceToPackType(service);

  if (
    SERVICE_KEYS.includes(safeService) === false ||
    safeService in HTTP_STR_TO_GIT_SERVER_PACK_TYPE === false ||
    HTTP_STR_TO_GIT_SERVER_PACK_TYPE[safeService] == null
  ) {
    return null;
  }

  return HTTP_STR_TO_GIT_SERVER_PACK_TYPE[safeService];
}
