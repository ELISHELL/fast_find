import chalk from "chalk";
import type { PluginEvent, PluginInst, PluginVM } from "../src/plugin_runtime.ts";

declare interface DebugCtx {

};

const DebugPlugin = (process: PluginVM<DebugCtx>, conf: any) => {
  // process.before((event: PluginEvent<DebugCtx>) => { })
  if (conf?.isDebug) {
    process.skip(({ path }) => {
      console.log(chalk.yellow(`跳过:`), chalk.blue(path));
    })
    process.beforeDir(({
      entry,
      path,
    }) => {
      if (entry && (entry.name.startsWith(".") || entry.name.startsWith("_"))) {
        console.log(chalk.red(`发现特殊文件夹:`), chalk.cyan(entry.name), "at", chalk.cyan(path));
      }
    })
  }
  // process.beforeFile((event: PluginEvent<DebugCtx>) => { })
  // process.after((event: PluginEvent<DebugCtx>) => { })
}

export {
  DebugPlugin
}