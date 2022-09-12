import { GitServer } from "lib/types";

export function safeServiceToPackType(service: string): GitServer.PackType {
  return service.replace(/^git-/i, "") as any;
}
