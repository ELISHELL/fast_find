import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import figlet from "figlet";
import { fileSelector, ItemType } from "inquirer-file-selector";
import type { Argv, CommandBuilder } from "yargs";
import { loadIgnore, makeNameMatcher, walk } from "../core.js";
import { addHistory, clearHistory, readHistory } from "../history.js";
import { log } from "../log.js";
import { PluginVMClass } from "../plugin/runtime.js";

export const command = ['$0 [args..]']

export const builder: CommandBuilder = (yargs: Argv) => {
  return yargs.option('debug', {
    alias: 'D',
    type: 'boolean',
    description: 'Enable debug mode',
    default: false
  });
}

export const handler = async (argv: any) => {

  console.log(chalk.cyan(figlet.textSync("Fast Find", {
    // font: "doh",
    // font: "Slant",
    font: "Big",
    horizontalLayout: "fitted",
    verticalLayout: "default",
  })))

  // 顶层操作选择
  const action = await select({
    message: '请选择操作',
    choices: [
      { name: '新建搜索', value: 'new' },
      { name: '从历史选择', value: 'history' },
      { name: '清空历史', value: 'clear' }
    ]
  })

  let rootDir = ''
  let keyword = ''

  if (action === 'clear') {
    await clearHistory()
    console.log(chalk.yellow('历史记录已清空。'))
  }

  if (action === 'history') {
    const hist = await readHistory()
    if (hist.length === 0) {
      console.log(chalk.yellow('暂无历史记录，转到新建搜索。'))
    } else {
      const choice = await select({
        message: '选择一条历史记录',
        choices: hist.map((h, i) => ({
          name: `${i + 1}. ${h.path}  —  ${h.keyword ?? '(全部)'}  —  ${new Date(h.time).toLocaleString()}`,
          value: h
        }))
      })
      rootDir = choice.path
      keyword = choice.keyword ?? ''
    }
  }

  // 如果不是从历史拿到路径，则走新建搜索
  if (!rootDir) {
    const selections = await fileSelector({
      message: '选择起始目录:',
      type: ItemType.Directory,
      basePath: "/"
    })
    rootDir = selections.path
    const ans = await input({
      message: '输入文件名关键词或正则(形如 /pattern/i)，留空则列出全部:'
    })
    keyword = ans || ''
  }

  console.log(`\r\n`, chalk.cyan(`开始扫描目录：`), chalk.red(`${rootDir}`), chalk.cyan(` ，搜索关键词`), chalk.red(`${keyword || '(全部)'}`), `\r\n`);

  const t0 = Date.now()
  // 加载配置文件：从选定的 当前执行目录 开始向上查找 .file_ignore
  const ig = await loadIgnore(process.cwd())
  const results: any[] = []
  const vm = new PluginVMClass({
    ig,
    rootDir,
    log,
    debug: argv.debug,
  });

  let pluginNames = ["DebugPlugin", "CntPlugin", "TreePlugin", "ScopePlugin"]

  for await (const name of pluginNames) {
    vm.addByName(name, { isDebug: true });
  }


  await walk(rootDir, results, vm);

  const match = makeNameMatcher(keyword)
  const filtered = results.filter(item => match(item.fullPath))
  const dt = Date.now() - t0

  log("clear");

  console.log(chalk.cyan(`\n查找文件夹：${vm.ctx.dir || 0} 个，查找文件：${vm.ctx.file}\n`))
  console.log(chalk.cyan(`\n查找完成：${filtered.length} 个文件，耗时 ${dt} ms\n`))
  for (const f of filtered) {
    console.log(chalk.green(f.fullPath))
  }
  console.log(" ");

  // 写入历史
  await addHistory({ path: rootDir, keyword, time: Date.now() })
}

export default {
  command,
  builder,
  handler,
};