import { stdout } from "single-line-log";


declare type logCtx = "stable" | "single" | "clear"

const LogFrame = {
    stable: [] as any[][],
    single: [] as any[][],
}

LogFrame.single.push([]);
LogFrame.single.push([]);
LogFrame.single.push([]);
LogFrame.single.push([]);
LogFrame.single.push([]);

export const log = (ctx: logCtx, ...args: any[]) => {
    let str = args.join(" ");
    if (ctx == "stable") {
        stdout("  \r");
        stdout.clear();
        process.stdout.write(str + "\n");
    }
    if (ctx == "single") {
        LogFrame.single.shift();
        LogFrame.single.push(args);
        let singleStr = LogFrame.single.map(args => args.join(" ")).join("\r\n");
        stdout("--- thread --- \r\n" + singleStr + "\r\n\r");
        stdout.clear();
    }
    if (ctx == "clear") {
        stdout("  \r");
        stdout.clear();
    }
}