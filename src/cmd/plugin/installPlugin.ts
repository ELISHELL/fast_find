import type { Argv } from "yargs";

export const command = ['installPlugin <pluginName..>', 'i']
export const desc = 'Install a plugin by name';
export const builder = (yargs: Argv) => {
  return yargs.positional('pluginName', {
    describe: 'Name of the plugin to install',
    type: 'string',
    multiple: true,
    demandOption: true
  }).option('force', {
    alias: 'f',
    type: 'boolean',
    description: 'Force installation even if the plugin is already installed',
    default: false
  }).option('repo', {
    alias: 'r',
    type: 'string',
    description: 'Repository URL to install the plugin from',
    default: ''
  }).option('token', {
    alias: 't',
    type: 'string',
    description: 'Authentication token for private repositories',
    default: ''
  });
};
export const handler = async (argv: any) => {
  const pluginName = argv.pluginName;
  console.log(`Installing plugin: ${pluginName}`);
}
export const group = "plugin";

export default {
  group,
  command,
  desc,
  builder,
  handler
};