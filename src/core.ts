import ignore from "ignore"
import path from "node:path"
import fs from "node:fs/promises"
import type { PluginVMClass } from "./plugin/runtime.js"

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

export async function loadIgnore(startDir: string) {
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

export function makeNameMatcher(query: string) {
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

export async function walk(dir: string, output: Array<any>, vm: PluginVMClass<any>) {
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