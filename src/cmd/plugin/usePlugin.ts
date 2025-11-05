import type { Argv } from "yargs";

export const command = ["usePlugin <pluginName..>", "use"];
export const desc = "use a plugin by name";
export function builder(yargs: Argv) {
  return yargs.positional("pluginName", {
    describe: "Name of the plugin to install",
    type: "string",
    multiple: true,
    demandOption: true,
  }).option("force", {
    alias: "f",
    type: "boolean",
    description: "Force installation even if the plugin is already installed",
    default: false,
  }).option("global", {
    alias: "g",
    type: "boolean",
    description: "Install the plugin globally",
    default: false,
  }).option("repo", {
    alias: "r",
    type: "string",
    description: "Repository URL to install the plugin from",
    default: "",
  }).option("token", {
    alias: "t",
    type: "string",
    description: "Authentication token for private repositories",
    default: "",
  });
}
export async function handler(argv: any) {
  console.log(`Use plugin: ${argv.pluginName}, global = ${argv.g}`);
}
export const group = "plugin";

export default {
  group,
  command,
  desc,
  builder,
  handler,
};
