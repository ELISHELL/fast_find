import type { PluginVM } from "../src/plugin/runtime.js";
import chalk from "chalk";

declare interface TreeCtx {
  treeCnt: number;
}

/**
 * 简易作用域统计插件：在 ctx 上维护 dir/file 计数与每层目录项数量。
 * 与 index.js 中对 vm.ctx.dir / vm.ctx.file 的读取保持一致。
 */
function TreePlugin(vm: PluginVM<TreeCtx>, conf?: any) {
  const stack: number[] = [];
  Object.assign(vm.ctx, {
    treeCnt: 0,
  });
  vm.before(({ ctx }) => {
    stack.push(ctx.treeCnt);
    ctx.treeCnt = 0;
  }, TreePlugin);
  vm.beforeDir(({ ctx }) => {
    ctx.treeCnt++;
  }, TreePlugin);
  vm.beforeFile(({ ctx }) => {
    ctx.treeCnt++;
  }, TreePlugin);
  vm.after(async ({ ctx, path, log }) => {
    if (conf?.isDebug) {
      log("single", chalk.gray(`文件夹 ${path} 含有 ${ctx.treeCnt} 项`));
    }
    const oldCnt = stack.pop() || 0;
    ctx.treeCnt += oldCnt; // 将之前的合并
  }, TreePlugin);
  vm.Log(({ ctx, log }) => {
    log("stable", chalk.cyan(`${TreePlugin.name} 总计扫描文件夹：${ctx.treeCnt} 个`));
  }, TreePlugin);
}

export default TreePlugin;
