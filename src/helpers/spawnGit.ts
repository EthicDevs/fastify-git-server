// std
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { PathLike } from "node:fs";
// lib
import { GIT_EXECUTABLE_DEFAULT } from "../constants";
import { GitServer } from "../types";

export function spawnGit(
  opts: GitServer.PluginOptions,
  args: string[],
  cwd: PathLike,
): ChildProcessWithoutNullStreams {
  const gitExecutable = `${opts.gitExecutablePath || GIT_EXECUTABLE_DEFAULT}`;
  return spawn(gitExecutable, [...args, cwd.toString()]);
}
