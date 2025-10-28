import chalk from "chalk";
import type { PluginVM } from "../src/plugin_runtime.js";
import { log as slog } from "../src/log.js";

declare interface TreeCtx {
    treeCnt: number
}

/**
 * 简易作用域统计插件：在 ctx 上维护 dir/file 计数与每层目录项数量。
 * 与 index.js 中对 vm.ctx.dir / vm.ctx.file 的读取保持一致。
 */
const TreePlugin = (vm: PluginVM<TreeCtx>, conf?: any) => {
    let stack: number[] = [];
    Object.assign(vm.ctx, {
        scopeCnt: 0
    })
    vm.before(({ ctx }) => {
        stack.push(ctx.scopeCnt);
        ctx.scopeCnt = 0;
    });
    vm.beforeDir(({ ctx }) => {
        ctx.scopeCnt++;
    })
    vm.beforeFile(({ ctx }) => {
        ctx.scopeCnt++;
    })
    vm.after(async ({ ctx, path }) => {
        if (conf?.isDebug) {
            slog("single", chalk.gray(`文件夹 ${path} 含有 ${ctx.scopeCnt} 项`));
        }
        let oldCnt = stack.pop();
        ctx.scopeCnt += oldCnt; // 将之前的合并
    });
};

export { TreePlugin };