import chalk from "chalk";
import figlet from "figlet";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function main() {
  const parser = await yargs()
    .scriptName("fast_find")
    .usage(`${chalk.cyan(figlet.textSync("Fast Find", {
      // font: "doh",
      // font: "Slant",
      font: "Big",
      horizontalLayout: "fitted",
      verticalLayout: "default",
    }))}$0 [args..]`)
    .commandDir("./cmd", {
      extensions: ["mjs", "mts", "js", "ts"],
      recurse: true,
    })
    .demandCommand()
    .help()
    .alias("help", "h")
    .version("1.0.0")
    .alias("version", "v")
    .wrap(120)
    .parse(hideBin(process.argv));
}

main().catch((err) => {
  console.error("Error executing command:", err);
  process.exit(1);
});
