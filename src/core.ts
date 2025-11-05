import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { APP_CONFIG_DIR } from "./common.js";
import { PluginVMClass } from "./plugin/runtime.js";

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  }
  catch {
    return false;
  }
}

async function findIgnoreFiles(startDir: string, fileName = ".file_ignore") {
  const dir = path.resolve(startDir);
  console.log("Finding ignore files from:", dir);

  const files: Array<string> = [];

  // 用户空间的配置文件
  const userIgf = path.join(process.env.HOME || process.env.USERPROFILE || "", APP_CONFIG_DIR, fileName);
  if (await fileExists(userIgf)) {
    files.push(userIgf);
  }

  // 当前运行环境的配置文件
  const cwdIgf = path.join(startDir, fileName);
  if (await fileExists(cwdIgf)) {
    files.push(cwdIgf);
  }

  return files;
}

export async function loadIgnore(startDir: string) {
  const ig = ignore();
  const files = await findIgnoreFiles(startDir);

  for (const f of files.reverse()) {
    // 越接近起始目录，优先级越高；先加载高层，后加载底层
    const content = await fs.readFile(f, "utf8");
    // ignore 包支持 .gitignore 风格，含注释与空行
    ig.add(content.split(/\r?\n/));
  }
  return ig;
}

function toPosix(p: string) {
  return p.split(path.sep).join("/");
}

export function makeNameMatcher(query: string) {
  if (!query)
    return () => true;
  query = query.trim();
  // 支持正则：形如 /pattern/i
  if (query.startsWith("/") && query.lastIndexOf("/") > 0) {
    const last = query.lastIndexOf("/");
    const pattern = query.slice(1, last);
    const flags = query.slice(last + 1);
    const re = new RegExp(pattern, flags);
    return (filePath: string) => re.test(path.basename(filePath));
  }
  const q = query.toLowerCase();
  return (filePath: string) => path.basename(filePath).toLowerCase().includes(q);
}

export async function walk(dir: string, output: Array<any>, vm: PluginVMClass<any>) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const { ig: orgIg, rootDir: orgRootDir } = vm.ctx;
  await vm?.run?.before({
    output,
    entries,
    path: dir,
    ig: orgIg,
    root: orgRootDir,
  });
  for (const entry of entries) {
    const { ig, rootDir } = vm.ctx;
    const fullPath = path.join(dir, entry.name);
    const rel = toPosix(path.relative(rootDir, fullPath));
    const relDirHint = entry.isDirectory() ? `${rel}/` : rel;

    // 命中忽略规则则跳过
    const igr = ig.ignores(relDirHint);
    if (igr) {
      vm?.run?.skip({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry,
      });
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
        entry,
      });
      output.push({ fullPath, dir, type: "dir" });
      await walk(fullPath, output, vm);
      await vm?.run?.afterDir({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry,
      });
    }
    else if (entry.isFile()) {
      await vm?.run?.beforeFile({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry,
      });
      output.push({ fullPath, dir, type: "file" });
      await vm?.run?.afterFile({
        ig,
        output,
        entries,
        dir,
        path: fullPath,
        root: rootDir,
        entry,
      });
    }
  }
  await vm?.run?.after({
    output,
    entries,
    path: dir,
    ig: orgIg,
    root: orgRootDir,
  });
}

export async function findFiles(matcher: string, startDir?: string, root?: string, plugins?: Array<string>) {
  if (!matcher)
    throw new Error("matcher is required");
  if (!startDir)
    startDir = process.cwd();
  if (!root)
    root = startDir;
  if (!plugins)
    plugins = [];
  const output: Array<any> = [];
  const ig = await loadIgnore(startDir);
  const vm = new PluginVMClass<any>({
    ig,
    rootDir: path.resolve(root),
  });
  for (const plugin of plugins) {
    vm.addByName(plugin);
  }
  await walk(startDir, output, vm);
  const nameMatcher = makeNameMatcher(matcher);
  const filtered = output.filter((item) => {
    return nameMatcher(item.fullPath);
  });
  return filtered;
}
