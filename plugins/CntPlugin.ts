import type { PluginVM } from "../src/plugin/runtime.ts";
import chalk from "chalk";

declare interface CntCtx {
  skip: number;
  dir: number;
  file: number;
  deep: number;
}

function CntPlugin(vm: PluginVM<CntCtx>, conf: any) {
  Object.assign(vm.ctx, {
    skip: 0,
    dir: 0,
    file: 0,
    deep: 0,
  });
  // vm.before((event: PluginEvent<CntCtx>) => { },CntPlugin)
  vm.skip(({
    ctx,
  }) => {
    ctx.skip++;
  }, CntPlugin);

  vm.beforeDir(({
    ctx,
  }) => {
    ctx.dir++;
    ctx.deep++;
  }, CntPlugin);
  vm.afterDir(({ ctx }) => {
    ctx.deep--;
  }, CntPlugin);
  vm.beforeFile(({
    ctx,
  }) => {
    ctx.file++;
  }, CntPlugin);
  vm.Log(({ ctx, log }) => {
    log("stable", chalk.cyan(`${CntPlugin.name} 扫描统计：跳过 ${ctx.skip} 个，文件夹 ${ctx.dir} 个，文件 ${ctx.file} 个。`));
  }, CntPlugin);
  // vm.after((event: PluginEvent<CntCtx>) => { },CntPlugin)
}

export default CntPlugin;
