import chalk from "chalk";
import type { PluginEvent, PluginInst, PluginVM } from "../src/plugin_runtime.ts";

declare interface CntCtx {
    skip: number,
    dir: number,
    file: number,
    deep: number,
}

const CntPlugin = (vm: PluginVM<CntCtx>, conf: any) => {
    Object.assign(vm.ctx, {
        skip: 0,
        dir: 0,
        file: 0,
        deep: 0,
    })
    // vm.before((event: PluginEvent<CntCtx>) => { })
    vm.skip(({
        ctx
    }) => {
        ctx.skip++;
    })
    vm.beforeDir(({
        ctx
    }) => {
        ctx.dir++;
        ctx.deep++;
    })
    vm.afterDir(({ ctx }) => {
        ctx.deep--;
    })
    vm.beforeFile(({
        ctx
    }) => {
        ctx.file++;
    })
    // vm.after((event: PluginEvent<CntCtx>) => { })
}

export {
    CntPlugin
}