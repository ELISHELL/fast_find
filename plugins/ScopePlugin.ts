import chalk from "chalk";
import ignore, { type Ignore } from "ignore";
import { join } from "node:path";
import type { PluginVM } from "../src/plugin_runtime.js";
import { log as slog } from "../src/log.js";

declare interface ScopeCtx {
  isDebug?: boolean,
  isSvn: boolean,
  isGit: boolean,
  isMaven: boolean,
  isNode: boolean,
  isGo: boolean,
  isEsp: boolean,
  isCmake: boolean,
  isPython: boolean,
  isPythonVenv: boolean,
  needClear: number,
  ig: Ignore,
}

const CTX_KEY = "scope_plugin_ctx";

declare interface ScopeCtxWrap {
  ig: Ignore,
  [CTX_KEY]: ScopeCtx
}

/**
 * 根据不同的文件夹类型加载对应的ignore
 * 例如：含有 `.git` 的文件夹就是 git resp
 * 含有 `pom.xml` 的文件夹就是 maven 项目
 * 含有 `package.json` 的文件夹就是 node 项目
 * 含有 `CMakeList.txt` 的文件夹就是 cmake 项目
 * 含有 `go.mod` 的文件夹就是 go 项目
 * 含有 `requestlibs.txt` 的文件夹就是 python 项目
 * @param vm 
 * @param conf 
 */
const ScopePlugin = (vm: PluginVM<ScopeCtxWrap>, conf?: any) => {
  let stack: ScopeCtx[] = [];
  Object.assign(vm.ctx, {
    [CTX_KEY]: {
      isDebug: false,
      isSvn: false,
      isGit: false,
      isMaven: false,
      isNode: false,
      isGo: false,
      isEsp: false,
      isCmake: false,
      isPython: false,
      isPythonVenv: false,
      ig: vm.ctx.ig,
      needClear: 0,
    },
  })
  vm.before(async ({ ctx, path, entries }) => {
    // 压栈
    let sup = ctx[CTX_KEY];
    stack.push(sup);
    // 生成当前上下文
    let temp: ScopeCtx = {
      isSvn: !!entries.find(file => file.isDirectory() && file.name == ".svn"),
      isGit: !!entries.find(file => file.isDirectory() && file.name == ".git"),
      isMaven: !!entries.find(file => file.isFile() && file.name == "pom.xml"),
      isNode: !!entries.find(file => file.isFile() && file.name == "package.json"),
      isEsp: !!entries.find(file => file.isFile() && file.name == "sdkconfig"),
      isCmake: !!entries.find(file => file.isFile() && file.name == "CMakeLists.txt"),
      isGo: !!entries.find(file => file.isFile() && file.name == "go.mod"),
      isPython: !!entries.find(file => file.isFile() && file.name == "requirements.txt"),
      isPythonVenv: !!entries.find(file => file.isFile() && file.name == "venvlauncher.exe"),
      ig: ignore(),
      isDebug: conf?.isDebug,
      needClear: 0,
    };
    if (temp?.isDebug) {
      let versionManger = "";
      let matched = false;
      if (temp.isGit) {
        versionManger = chalk.cyan("(git)")
      }
      if (temp.isSvn) {
        versionManger = chalk.cyan("(svn)")
      }
      if(path == process.cwd()) {
        versionManger += chalk.magenta(" ⭐⭐⭐ ");
      }
      if (!sup.isMaven && temp.isMaven) {
        slog("stable", chalk.yellow(`发现 maven  项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (!sup.isNode && temp.isNode) {
        slog("stable", chalk.yellow(`发现 node   项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (!sup.isEsp && temp.isEsp) {
        slog("stable", chalk.yellow(`发现 esp32  项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      } else if (!sup.isCmake && temp.isCmake) {
        slog("stable", chalk.yellow(`发现 cmake  项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (!sup.isGo && temp.isGo) {
        slog("stable", chalk.yellow(`发现 go     项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (temp.isPython) {
        slog("stable", chalk.yellow(`发现 python 项目:`), chalk.blue(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (temp.isPythonVenv) {
        slog("stable", chalk.yellow(`发现 python 环境:`), chalk.green(path), versionManger);
        temp.needClear++;
        matched = true;
      }
      if (!matched) {
        if (temp.isGit) {
          slog("stable", chalk.yellow(`发现 git    仓库:`), chalk.green(path), versionManger);
          temp.needClear++;
        }
        if (temp.isSvn) {
          slog("stable", chalk.yellow(`发现 svn    仓库:`), chalk.green(path), versionManger);
          temp.needClear++;
        }
      }
    }
    // 编写当前
    temp.ig.add(ctx.ig);
    if (sup.isSvn != temp.isSvn) {
      temp.ig.add([".svn"]);
    }
    if (sup.isGit != temp.isGit) {
      temp.ig.add([".git"]);
    }
    if (sup.isMaven != temp.isMaven) {
      temp.ig.add(["target", ".mvn"]);
    }
    if (sup.isEsp != temp.isEsp) {
      temp.ig.add(["build", "components", "managed_components"]);
    } else if (sup.isCmake != temp.isCmake) {
      temp.ig.add([join(path, "build"), "_deps"]);
    }
    if (sup.isNode != temp.isNode) {
      temp.ig.add(["dist", "node_modules"]);
    }
    if (sup.isGo != temp.isGo) {
      temp.ig.add([join(path, "dist"), join(path, "tmp")]);
    }
    if (sup.isPython != temp.isPython) {
      temp.ig.add([join(path, "**", "models"), "__pycache__", "site-packages"]);
    }
    if (sup.isPythonVenv != temp.isPythonVenv) {
      temp.ig.add(join(path, "**"));
    }
    // 切换上下文
    ctx.ig = temp.ig;
    ctx[CTX_KEY] = {
      ig: temp.ig,
      isDebug: conf?.isDebug,
      isSvn: sup.isSvn || temp.isSvn,
      isGit: sup.isGit || temp.isGit,
      isEsp: sup.isEsp || temp.isEsp,
      isMaven: sup.isMaven || temp.isMaven,
      isCmake: sup.isCmake || temp.isCmake,
      isNode: sup.isNode || temp.isNode,
      isGo: sup.isGo || temp.isGo,
      isPython: sup.isPython || temp.isPython,
      isPythonVenv: sup.isPythonVenv || temp.isPythonVenv,
    };
  });
  vm.beforeDir(({ ctx }) => {
    ctx.scopeCnt++;
  })
  vm.beforeFile(({ ctx }) => {
    ctx.scopeCnt++;
  })
  vm.after(({ ctx, path }) => {
    let sup = stack.pop();
    if (sup) {
      ctx.ig = sup.ig;
      ctx[CTX_KEY] = sup;
      // while (sup.needClear--) {
      //   stdout.clear();
      // }
    }
  });
};

export { ScopePlugin };
