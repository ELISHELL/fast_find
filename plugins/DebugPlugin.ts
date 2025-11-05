import type { PluginVM } from "../src/plugin/runtime.ts";
import chalk from "chalk";

declare interface DebugCtx {

};

function DebugPlugin(process: PluginVM<DebugCtx>, conf: any) {
  // process.before((event: PluginEvent<DebugCtx>) => { },DebugPlugin)
  if (conf?.isDebug) {
    process.skip(({ path, log }) => {
      log("single", chalk.yellow(`跳过:`), chalk.blue(path));
    }, DebugPlugin);
    process.beforeDir(({
      entry,
      path,
      log,
    }) => {
      if (entry && (entry.name.startsWith(".") || entry.name.startsWith("_"))) {
        log("stable", chalk.red(`发现特殊文件夹:`), chalk.cyan(entry.name), "at", chalk.cyan(path));
      }
    }, DebugPlugin);
  }
  // process.beforeFile((event: PluginEvent<DebugCtx>) => { },DebugPlugin)
  // process.after((event: PluginEvent<DebugCtx>) => { },DebugPlugin)
}

export default DebugPlugin;
