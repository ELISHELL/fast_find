import type { Ignore } from "ignore";
import type { Dirent } from "node:fs";
import type { LogCtx } from "../log.js";
import { EventEmitter } from "node:events";
import chalk from "chalk";
import { log } from "../log.js";

declare type EventNamePrifex = "before" | "after";

declare type EventNameStuff = "Dir" | "File";

declare type CtxItemEventType = "skip" | `${EventNamePrifex}${EventNameStuff}`;

declare type CtxEventType = "Log" | EventNamePrifex;

declare type EventNameType = CtxEventType | CtxItemEventType;

declare type InnerEventProp = "ctx" | "name" | "vm" | "log";

declare type CtxEventProp = "ig" | "root" | "path" | "output";

declare type CtxItemEventProp = "dir" | "entry";

export interface PluginEvent<T> {
  ig: Ignore;
  root: string;
  path: string;
  output: any[];
  entries: Array<Dirent<string>>;
  // 只在 dir 和 file 事件中存在
  dir?: string;
  entry?: Dirent<string>;
  // 内部自省的变量
  log: (level: LogCtx, ...args: any[]) => void;
  ctx?: any & T;
  name?: EventNameType;
  vm: PluginVM<T>;
}

declare type CtxEvent<T> = Omit<PluginEvent<T>, InnerEventProp | CtxItemEventProp>;

declare type CtxItemEvent<T> = Omit<PluginEvent<T>, InnerEventProp>;

export type PluginRuntime<T> = {
  [P in CtxEventType]: (event: CtxEvent<T>) => void;
} & {
  [T in CtxItemEventType]: (event: CtxItemEvent<T>) => void;
};

export type PluginVM<PluginCtx> = {
  ctx: PluginCtx;
  run: PluginRuntime<PluginCtx>;
  bus: EventEmitter;
} & {
  [P in CtxEventType]: (cb: (event: Omit<PluginEvent<PluginCtx>, CtxItemEventProp>) => void, option?: any) => void;
} & {
  [T in CtxItemEventType]: (cb: (event: PluginEvent<PluginCtx>) => void, option?: any) => void;
};

export type PluginInst<PluginCtx> = (vm: PluginVM<PluginCtx>, option: any) => void;

export type PluginInstMixin = PluginInst<any> | {
  name?: string;
  install: PluginInst<any>;
};

class PluginRuntimeClass<T> implements PluginRuntime<T> {
  bus: EventEmitter;
  constructor(bus: EventEmitter) {
    this.bus = bus;
  }

  #emit(name: string, event: any) {
    this.bus.emit(name, event);
  }

  Log(event: CtxEvent<T>) {
    this.#emit("log", event);
  }

  before(event: CtxEvent<T>) {
    this.#emit("before", event);
  }

  after(event: CtxEvent<T>) {
    this.#emit("after", event);
  }

  skip(event: CtxItemEvent<T>) {
    this.#emit("skip", event);
  };

  beforeDir(event: CtxItemEvent<T>) {
    this.#emit("beforeDir", event);
  }

  afterDir(event: CtxItemEvent<T>) {
    this.#emit("afterDir", event);
  }

  beforeFile(event: CtxItemEvent<T>) {
    this.#emit("beforeFile", event);
  }

  afterFile(event: CtxItemEvent<T>) {
    this.#emit("afterFile", event);
  }
}

class LifedVM<T> implements Omit<PluginVM<T>, "ctx" | "run" | EventNameType> {
  bus: EventEmitter;
  constructor(bus?: EventEmitter) {
    this.bus = bus ?? new EventEmitter();
  }

  #on(name: string, cb: (event: PluginEvent<T>) => void) {
    const wraped = (ev: any) => {
      cb({
        ...ev,
        vm: this,
        name,
      });
    };
    this.bus.on(name, wraped);
  }
}

class UnPluginVM<T> implements PluginVM<T> {
  ctx: any & T;
  run: PluginRuntime<T>;
  bus: EventEmitter;
  constructor(ctx: object = {}) {
    this.ctx = ctx;
    this.bus = new EventEmitter();
    this.run = new PluginRuntimeClass(this.bus);
  }

  before(cb: (event: Omit<PluginEvent<T>, CtxItemEventProp>) => void, option?: any) {
    this.bus.off("before", cb);
  };

  after(cb: (event: Omit<PluginEvent<T>, CtxItemEventProp>) => void) {
    this.bus.off("after", cb);
  };

  skip(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("skip", cb);
  };

  beforeDir(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("beforeDir", cb);
  };

  afterDir(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("afterDir", cb);
  };

  beforeFile(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("beforeFile", cb);
  };

  afterFile(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("afterFile", cb);
  };

  Log(cb: (event: PluginEvent<T>) => void) {
    this.bus.off("log", cb);
  };
}

class PluginVMClass<T> implements PluginVM<T> {
  ctx: any & T;
  run: PluginRuntime<T>;
  bus: EventEmitter;
  plugins: Array<PluginInstMixin> = [];
  constructor(ctx: object = {}) {
    this.ctx = ctx;
    this.bus = new EventEmitter();
    this.run = new PluginRuntimeClass(this.bus);
  }

  #on(name: string, cb: (event: PluginEvent<T>) => void) {
    const wraped = (ev: any) => {
      cb({
        ...ev,
        name,
        vm: this,
        ctx: this.ctx,
        log: this.ctx.log || log,
      });
    };
    this.bus.on(name, wraped);
  }

  before(cb: (event: Omit<PluginEvent<T>, CtxItemEventProp>, option?: any) => void) {
    this.#on("before", cb);
  }

  after(cb: (event: Omit<PluginEvent<T>, CtxItemEventProp>, option?: any) => void) {
    this.#on("after", cb);
  }

  skip(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("skip", cb);
  }

  beforeDir(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("beforeDir", cb);
  }

  afterDir(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("afterDir", cb);
  }

  beforeFile(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("beforeFile", cb);
  }

  afterFile(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("afterFile", cb);
  }

  Log(cb: (event: PluginEvent<T>) => void, option?: any) {
    this.#on("log", cb);
  }

  log() {
    log("stable", chalk.green(` `));
    this.bus.emit("log", {
      root: this.ctx.rootDir,
      path: "",
      output: [],
      entries: [],
    });
  }

  add(pluginInst: PluginInstMixin, conf?: any) {
    if (this.plugins.includes(pluginInst)) {
      console.log(`${pluginInst?.name} 已经注册！`);
      return;
    }
    if (conf.excludePlugins && Array.isArray(conf.excludePlugins)) {
      if (conf.excludePlugins.includes((pluginInst as any)?.name)) {
        console.log(`${(pluginInst as any)?.name} 在排除列表中，跳过注册！`);
        return;
      }
    }
    if (typeof pluginInst == "function") {
      pluginInst(this, conf);
      this.plugins.push(pluginInst);
      return;
    }
    if (typeof pluginInst == "object" && typeof pluginInst.install === "function") {
      pluginInst.install(this, conf);
      this.plugins.push(pluginInst);
      return;
    }
    console.error(`${(pluginInst as any)?.name ?? "未知插件"} 不是一个Plugin`);
  }

  async addByName(name: string, conf?: any) {
    const pluginInst = await import(`../../plugins/${name}.js`);
    log("stable", chalk.green(`add plugin: ${name}`));
    this.add(pluginInst.default, conf);
  }
}

export { LifedVM, PluginRuntimeClass, PluginVMClass };
export default {
  PluginRuntimeClass,
  PluginVMClass,
  LifedVM,
};
