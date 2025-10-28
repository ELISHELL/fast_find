import { input, select } from '@inquirer/prompts'
import chalk from 'chalk'
import ignore from 'ignore'
import { fileSelector, ItemType } from 'inquirer-file-selector'
import fs from 'node:fs/promises'
import path from 'node:path'
import { CntPlugin } from '../plugins/CntPlugin.js'
import { DebugPlugin } from '../plugins/DebugPlugin.js'
import { TreePlugin } from '../plugins/TreePlugin.js'
import { addHistory, clearHistory, readHistory } from './history.js'
import { PluginVMClass } from './plugin_runtime.js'
import { ScopePlugin } from '../plugins/ScopePlugin.js'
import { log } from './log.js'


async function fileExists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function findIgnoreFiles(startDir: string, fileName = '.file_ignore') {
  const files = []
  let dir = path.resolve(startDir)
  const root = path.parse(dir).root

  while (true) {
    const candidate = path.join(dir, fileName)
    if (await fileExists(candidate)) files.push(candidate)
    if (dir === root) break
    dir = path.dirname(dir)
  }
  return files
}

async function loadIgnore(startDir: string) {
  const ig = ignore()
  const files = await findIgnoreFiles(startDir)

  for (const f of files.reverse()) {
    // 越接近起始目录，优先级越高；先加载高层，后加载底层
    const content = await fs.readFile(f, 'utf8')
    // ignore 包支持 .gitignore 风格，含注释与空行
    ig.add(content.split(/\r?\n/))
  }
  return ig
}

function toPosix(p: string) {
  return p.split(path.sep).join('/')
}

async function walk(dir: string, output: Array<any>, vm: PluginVMClass<any>) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const { ig: orgIg, rootDir: orgRootDir } = vm.ctx;
  await vm?.run?.before({
    output,
    entries,
    path: dir,
    ig: orgIg,
    root: orgRootDir,
  })
  for (const entry of entries) {
    const { ig, rootDir } = vm.ctx;
    const fullPath = path.join(dir, entry.name)
    const rel = toPosix(path.relative(rootDir, fullPath))
    const relDirHint = entry.isDirectory() ? rel + '/' : rel

    // 命中忽略规则则跳过
    let igr = ig.ignores(relDirHint);
    if (igr) {
      vm?.run?.skip({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry: entry
      })
      continue;
    }
    if (entry.isDirectory()) {
      await vm?.run?.beforeDir({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry: entry
      })
      output.push({ fullPath, dir, type: 'dir' })
      await walk(fullPath, output, vm);
      await vm?.run?.afterDir({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry: entry
      })
    } else if (entry.isFile()) {
      await vm?.run?.beforeFile({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry: entry
      })
      output.push({ fullPath, dir, type: 'file' })
      await vm?.run?.afterFile({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry: entry
      })
    }
  }
  await vm?.run?.after({
    output,
    entries,
    path: dir,
    ig: orgIg,
    root: orgRootDir,
  })
}

function makeNameMatcher(query: string) {
  if (!query) return () => true
  query = query.trim()
  // 支持正则：形如 /pattern/i
  if (query.startsWith('/') && query.lastIndexOf('/') > 0) {
    const last = query.lastIndexOf('/')
    const pattern = query.slice(1, last)
    const flags = query.slice(last + 1)
    const re = new RegExp(pattern, flags)
    return (filePath: string) => re.test(path.basename(filePath))
  }
  const q = query.toLowerCase()
  return (filePath: string) => path.basename(filePath).toLowerCase().includes(q)
}

const main = async () => {
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

  const t0 = Date.now()
  // 加载配置文件：从选定的 当前执行目录 开始向上查找 .file_ignore
  const ig = await loadIgnore(process.cwd())
  const results: any[] = []
  const vm = new PluginVMClass({
    ig,
    rootDir,
  });

  vm.add(DebugPlugin);
  vm.add(CntPlugin);
  vm.add(TreePlugin, {
    isDebug: true
  });
  vm.add(ScopePlugin, {
    isDebug: true
  });

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

  // 写入历史
  await addHistory({ path: rootDir, keyword, time: Date.now() })
}

main().catch((err) => {
  console.error(chalk.red('执行失败：'), err)
})