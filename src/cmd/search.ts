import chalk from "chalk";
import type { Argv } from "yargs";
import { loadIgnore, walk, makeNameMatcher } from "../core.js";
import { PluginVMClass } from "../plugin/runtime.js";
import { log } from "../log.js";

export const command = ['run <matcher> [args]', 'search'];
export const desc = 'start searching from current directory with name matcher';
export const builder = (yargs: Argv) => {
  return yargs.positional('matcher', {
    describe: 'name matcher string or regex',
    type: 'string',
    required: true
  }).options({
    "root": {
      alias: "r",
      type: "string",
      description: "Specify the root directory to start searching from",
      default: '.'
    },
    'plugin': {
      alias: 'p',
      type: 'string',
      description: 'Specify a plugin file to load',
      default: [],
      demandOption: false,
      multiple: true
    },
    "debug": {
      alias: "D",
      type: "boolean",
      description: "Enable debug mode",
      default: false
    },
    'help': {
      alias: 'h',
      type: 'boolean',
      description: 'Show help'
    },
  })
};

export const handler = async (yargs: any) => {
  const ig = await loadIgnore(yargs.root)
  const results: any[] = []
  const vm = new PluginVMClass({
    ig,
    rootDir: yargs.root,
    debug: yargs.debug,
    log,
  });

  const pluginOptions = {
    isDebug: yargs.debug,
    excludePlugins: [] as string[],
    includePlugins: [] as string[],
  };

  for (const pluginName of yargs.plugin) {
    if (pluginName.trim().startsWith('!')) {
      pluginOptions.excludePlugins.push(pluginName.trim().slice(1));
    } else {
      pluginOptions.includePlugins.push(pluginName.trim());
    };
  }

  pluginOptions.includePlugins.unshift("CntPlugin");
  if (yargs.debug) {
    pluginOptions.includePlugins.unshift("DebugPlugin");
  }

  for await (const pluginName of pluginOptions.includePlugins) {
    vm.addByName(pluginName, pluginOptions);
  }

  const t0 = Date.now();
  await walk(process.cwd(), results, vm);
  const match = makeNameMatcher(yargs.matcher)
  const filtered = results.filter(item => match(item.fullPath))
  const t1 = Date.now();
  const dt = t1 - t0;
  log("clear");
  vm.log();
  console.log(chalk.cyan(`\n查找完成：${filtered.length} 个文件，耗时 ${dt} ms\n`))
  for (const f of filtered) {
    console.log(chalk.green(f.fullPath))
  }
  console.log(" ");
};

export default {
  command,
  desc,
  builder,
  handler,
};