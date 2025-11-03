import { log } from "../log.js";


export interface InstallArgs {
    pluginName: string,
    registry?: string,
    token?: string,
}

export const installPlugin = async (args: InstallArgs) => {
    const { pluginName, registry, token } = args;
    log("stable", `Installing plugin: ${pluginName}`);
    // Here you would add the logic to install the plugin, e.g., using npm or yarn
    // For example:
}