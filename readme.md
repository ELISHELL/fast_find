# Fast Find

一个由 TypeScript 驱动的极速文件查找工具，支持可插拔的插件系统、类 .gitignore 的忽略规则、交互式与命令行两种使用方式。

> 仓库: https://github.com/ELISHELL/fast_find

## 特性

- 交互式 + 命令行双模式
  - 交互式：选择起始目录、输入关键词、自动记录历史
  - 命令行：`search` 子命令，快速脚本化调用
- 忽略规则：向上查找并合并所有 `.file_ignore` 文件，语法与 `.gitignore` 一致
- 插件系统：在遍历生命周期各阶段触发事件，可自由扩展统计、过滤、日志等能力
- 正则/关键词匹配：支持类似 `/pattern/i` 的正则，也支持文件名包含匹配
- 内置插件：
  - CntPlugin：统计遍历计数（skip/dir/file）
  - DebugPlugin：调试输出（跳过项、特殊目录提示等）
  - TreePlugin：逐目录项目数统计与总计
  - ScopePlugin：按项目/仓库类型动态追加忽略（git/svn/node/maven/cmake/go/python/esp 等）

## 安装

当前项目以源码形式提供，使用 pnpm 构建与运行。

Windows PowerShell 示例：

```powershell
# 克隆与安装依赖
pnpm install

# 编译 TypeScript -> dist/
pnpm build

# 运行 CLI（已编译）
node ./bin/fast_find.mjs -h

# 开发模式（直接运行 TS）
pnpm dev
```

说明：`bin/fast_find.mjs` 会加载 `dist/src/cli.js`，因此使用该入口前需要先执行一次 `pnpm build`。

## 快速开始

### 方式一：交互式启动

```powershell
pnpm dev
```

按提示选择：

- 新建搜索：选择起始目录并输入关键词/正则
- 从历史选择：快速复用之前的搜索
- 清空历史

交互式搜索默认会加载内置插件：DebugPlugin、CntPlugin、TreePlugin、ScopePlugin，并在控制台输出统计与结果列表。

### 方式二：命令行模式（search）

编译后运行（推荐）：

```powershell
node ./bin/fast_find.mjs search "log.ts" -r . -p TreePlugin -p !ScopePlugin
```

参数：

- matcher（必填）：文件名匹配器，可以是普通字符串（包含匹配，大小写不敏感），也可以是正则文本，形如 `/pattern/i`
- -r, --root：起始根目录（默认 `.`）；忽略规则会从该目录向上查找 `.file_ignore`
- -p, --plugin：多次传入以按顺序加载插件；以 `!` 前缀可排除某插件（如 `-p !ScopePlugin`）
- -D, --debug：调试开关（会默认包含 DebugPlugin）

更多帮助：

```powershell
node ./bin/fast_find.mjs search -h
```

示例：

```powershell
# 列出当前目录下所有 .ts 文件（使用正则）
node ./bin/fast_find.mjs search "/\.ts$/i" -r .

# 仅列出文件名包含 log.ts 的条目，并统计目录项（TreePlugin），排除 ScopePlugin
node ./bin/fast_find.mjs search "log.ts" -r . -p TreePlugin -p !ScopePlugin

# 开启调试输出（DebugPlugin），并统计数量（CntPlugin 默认会被包含）
node ./bin/fast_find.mjs search "" -r . -D
```

注意：`search` 子命令中内部会以 `-r/--root` 作为忽略规则加载的基准，而实际遍历入口为当前工作目录（process.cwd）。一般情况下设为 `-r .` 即可保持一致。

## 忽略规则：.file_ignore

- 放置位置：收集当前位置工作目录的 `.file_ignore` 和 用户目录下的 `.file_ignore`
- 合并顺序：user 目录下的 `.file_ignore` 最先加载，随后是 当前位置工作目录的 `.file_ignore`，后加载的规则优先级更高
- 语法格式：与 `.gitignore` 一致（由 `ignore` 库实现）

常用写法示例：

```
# 忽略 node 目录
node_modules

# 忽略编译产物
dist
target
build

# 忽略日志与缓存
*.log
__pycache__

# 可反选恢复
!keep.log
```

## 插件系统

遍历过程中会在多个生命周期触发事件，你可以按需订阅并扩展输出、过滤逻辑或统计能力。

生命周期事件：

- before/after：进入目录前后（一次目录扫描一进一出）
- beforeDir/afterDir：即将进入子目录、完成子目录处理
- beforeFile/afterFile：处理文件前后
- skip：命中忽略规则时触发
- Log：汇总输出时触发（通过 `vm.log()` 主动触发）

上下文（部分）：

- `vm.ctx.ig`：ignore 实例（会被 ScopePlugin/ignore 文件动态叠加）
- `vm.ctx.rootDir`：根目录
- `vm.ctx.log(level, ...args)`：日志输出函数（level: single/stable 等）
- 插件可自由在 `vm.ctx` 挂载状态用于跨事件共享

命令行加载插件：

```powershell
# 加载指定插件（多次 -p 按顺序）
node ./bin/fast_find.mjs search "" -r . -p CntPlugin -p TreePlugin

# 排除某个插件
node ./bin/fast_find.mjs search "" -r . -p !ScopePlugin
```

内置插件说明：

- CntPlugin：维护 `skip/dir/file` 计数，并在 Log 阶段打印统计
- DebugPlugin：在 `-D` 开启时打印跳过项、特殊目录（以 `.` 或 `_` 开头）等调试信息
- TreePlugin：统计每个目录包含的项目数，并在 Log 阶段输出总计
- ScopePlugin：根据目录特征自动追加忽略（如 .git/.svn、node_modules、target、build、\_deps、**pycache**、venv 等），并可在调试模式下提示发现的项目类型

自定义插件开发：最简单的插件结构如下（放到 `plugins/MyPlugin.ts` 并编译后使用 `-p MyPlugin`）：

```ts
import type { PluginVM } from "../src/plugin/runtime";

interface MyCtx { hits: number }

function MyPlugin(vm: PluginVM<MyCtx>, conf?: any) {
  Object.assign(vm.ctx, { hits: 0 });
  vm.beforeFile(({ ctx, path }) => {
    if (path.endsWith(".ts"))
      ctx.hits++;
  }, MyPlugin);
  vm.Log(({ ctx, log }) => {
    log("stable", `TS 文件数量：${ctx.hits}`);
  }, MyPlugin);
}

export default MyPlugin;
```

## 输出规则与匹配器

- 遍历记录包含目录与文件条目，最终按“文件名”进行过滤
- 匹配器：
  - 字符串：大小写不敏感的包含匹配（仅针对 basename）
  - 正则文本：形如 `/pattern/i`，会被解析为 JS RegExp 并应用于 basename
- 结果输出为绝对路径列表，并附带统计与耗时信息

## 开发与调试

```powershell
# 安装依赖
pnpm install

# 本地开发（直接运行 TS）
pnpm dev

# 构建
pnpm build

# 命令帮助
node ./bin/fast_find.mjs -h
node ./bin/fast_find.mjs search -h
```

测试：本仓库使用 vitest（包含忽略库用例示例 `test/ignore.test.ts`）。可用下述任一方式运行：

```powershell
# 如果未配置脚本，可直接使用 dlx
pnpm dlx vitest run
```

## 常见问题（FAQ）

1. 没有结果但应该有？

- 检查是否被 `.file_ignore` 或 ScopePlugin 动态忽略；尝试临时排除 ScopePlugin：`-p !ScopePlugin`
- 开启调试查看“跳过项”：加 `-D`
- 确认 `-r/--root` 与当前工作目录一致（建议 `-r .`）

2. 正则如何写？

- 使用文本形式 `/pattern/flags`，例如 `/\.ts$/i`，注意需双反斜杠转义

3. 插件加载失败？

- 插件名称需与 `plugins/` 下编译产物文件名一致（如 `TreePlugin.ts` -> `TreePlugin.js`）
- 先 `pnpm build` 再调用 `node ./bin/fast_find.mjs ...`

## 许可

ISC

## 致谢

- yargs、@inquirer/prompts、ignore、chalk 等优秀开源项目
