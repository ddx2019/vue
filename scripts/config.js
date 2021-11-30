const path = require("path");
const buble = require("rollup-plugin-buble"); //一个使用 Bublé 编译器转换 ES2015+ 代码的 Rollup 插件。
const alias = require("rollup-plugin-alias"); //用于在捆绑包时定义别名的 Rollup 插件
const cjs = require("rollup-plugin-commonjs"); //将 CommonJS 模块转换为 ES6 的 Rollup 插件，因此它们可以包含在 Rollup 包中
const replace = require("rollup-plugin-replace"); //一个 Rollup 插件，它在捆绑时替换文件中的目标字符串。
const node = require("rollup-plugin-node-resolve"); //一个使用节点解析算法定位模块的 Rollup 插件，用于在node_modules
const flow = require("rollup-plugin-flow-no-whitespace"); //汇总插件以删除流类型，不留空格
const version = process.env.VERSION || require("../package.json").version;
const weexVersion =
  process.env.WEEX_VERSION ||
  require("../packages/weex-vue-framework/package.json").version;
const featureFlags = require("./feature-flags");

const banner =
  "/*!\n" +
  ` * Vue.js v${version}\n` +
  ` * (c) 2014-${new Date().getFullYear()} Evan You\n` +
  " * Released under the MIT License.\n" +
  " */";

const weexFactoryPlugin = {
  intro() {
    return "module.exports = function weexFactory (exports, document) {";
  },
  outro() {
    return "}";
  },
};
// 引入别名配置
const aliases = require("./alias");
// resolve需考虑别名情况，
const resolve = (p) => {
  // 以第一个为例子，这里的参数p是 web/entry-runtime.js
  const base = p.split("/")[0]; // base就等于web ;但base 并不是实际的路径，它的真实路径可能借助了别名的配置
  if (aliases[base]) {
    //有别名
    // 找到了 vue源码的web目录，即：../src/platforms/web
    return path.resolve(aliases[base], p.slice(base.length + 1)); // 找到的路径时：../src/platforms/web/entry-runtime.js
  } else {
    // 无别名的情况，就直接取到该地址
    return path.resolve(__dirname, "../", p);
  }
};

/**
 * package.json中：` "dev": "rollup -w -c scripts/config.js --environment TARGET:web-full-dev" `,
 *  1. -c：为--config 的缩写，表示设置 rollup 打包的配置。
 *  2. -w：为--watch 的缩写，在本地开发环境添加-w 参数可以监控源文件的变化，自动重新打包。
 *  3. --environment ，环境变量，通过'process.ENV.名'访问，如 process.ENV.TARGET
 *  构建配置，如运行'npm run dev'命令，会使用scripts/config.js作为配置文件，配置文件中 根据传入的环境变量TARGET(为web-full-dev)，
 *  process.ENV.TARGET 取到 builds对象的 web-full-dev配置
 */
const builds = {
  // Runtime only (CommonJS). Used by bundlers e.g. Webpack & Browserify
  "web-runtime-cjs-dev": {
    entry: resolve("web/entry-runtime.js"), // 构建的入口js文件地址
    dest: resolve("dist/vue.runtime.common.dev.js"), // 构建后的 JS 文件地址
    format: "cjs", // 构建的格式为cjs(cjs表示构建出来的文件遵循CommonJS规范)
    env: "development",
    banner,
  },
  "web-runtime-cjs-prod": {
    entry: resolve("web/entry-runtime.js"),
    dest: resolve("dist/vue.runtime.common.prod.js"),
    format: "cjs",
    env: "production",
    banner,
  },
  // Runtime+compiler CommonJS build (CommonJS)
  "web-full-cjs-dev": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.common.dev.js"),
    format: "cjs",
    env: "development",
    alias: { he: "./entity-decoder" },
    banner,
  },
  "web-full-cjs-prod": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.common.prod.js"),
    format: "cjs",
    env: "production",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // Runtime only ES modules build (for bundlers)
  "web-runtime-esm": {
    entry: resolve("web/entry-runtime.js"),
    dest: resolve("dist/vue.runtime.esm.js"),
    format: "es",
    banner,
  },
  // Runtime+compiler ES modules build (for bundlers)
  "web-full-esm": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.esm.js"),
    format: "es",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // Runtime+compiler ES modules build (for direct import in browser)
  "web-full-esm-browser-dev": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.esm.browser.js"),
    format: "es",
    transpile: false,
    env: "development",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // Runtime+compiler ES modules build (for direct import in browser)
  "web-full-esm-browser-prod": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.esm.browser.min.js"),
    format: "es",
    transpile: false,
    env: "production",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // runtime-only build (Browser)
  "web-runtime-dev": {
    entry: resolve("web/entry-runtime.js"),
    dest: resolve("dist/vue.runtime.js"),
    format: "umd",
    env: "development",
    banner,
  },
  // runtime-only production build (Browser)
  "web-runtime-prod": {
    entry: resolve("web/entry-runtime.js"),
    dest: resolve("dist/vue.runtime.min.js"),
    format: "umd",
    env: "production",
    banner,
  },
  // Runtime+compiler development build (Browser)
  "web-full-dev": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.js"),
    format: "umd",
    env: "development",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // Runtime+compiler production build  (Browser)
  "web-full-prod": {
    entry: resolve("web/entry-runtime-with-compiler.js"),
    dest: resolve("dist/vue.min.js"),
    format: "umd",
    env: "production",
    alias: { he: "./entity-decoder" },
    banner,
  },
  // Web compiler (CommonJS).
  "web-compiler": {
    entry: resolve("web/entry-compiler.js"),
    dest: resolve("packages/vue-template-compiler/build.js"),
    format: "cjs",
    external: Object.keys(
      require("../packages/vue-template-compiler/package.json").dependencies
    ),
  },
  // Web compiler (UMD for in-browser use).
  "web-compiler-browser": {
    entry: resolve("web/entry-compiler.js"),
    dest: resolve("packages/vue-template-compiler/browser.js"),
    format: "umd",
    env: "development",
    moduleName: "VueTemplateCompiler",
    plugins: [node(), cjs()],
  },
  // Web server renderer (CommonJS).
  "web-server-renderer-dev": {
    entry: resolve("web/entry-server-renderer.js"),
    dest: resolve("packages/vue-server-renderer/build.dev.js"),
    format: "cjs",
    env: "development",
    external: Object.keys(
      require("../packages/vue-server-renderer/package.json").dependencies
    ),
  },
  "web-server-renderer-prod": {
    entry: resolve("web/entry-server-renderer.js"),
    dest: resolve("packages/vue-server-renderer/build.prod.js"),
    format: "cjs",
    env: "production",
    external: Object.keys(
      require("../packages/vue-server-renderer/package.json").dependencies
    ),
  },
  "web-server-renderer-basic": {
    entry: resolve("web/entry-server-basic-renderer.js"),
    dest: resolve("packages/vue-server-renderer/basic.js"),
    format: "umd",
    env: "development",
    moduleName: "renderVueComponentToString",
    plugins: [node(), cjs()],
  },
  "web-server-renderer-webpack-server-plugin": {
    entry: resolve("server/webpack-plugin/server.js"),
    dest: resolve("packages/vue-server-renderer/server-plugin.js"),
    format: "cjs",
    external: Object.keys(
      require("../packages/vue-server-renderer/package.json").dependencies
    ),
  },
  "web-server-renderer-webpack-client-plugin": {
    entry: resolve("server/webpack-plugin/client.js"),
    dest: resolve("packages/vue-server-renderer/client-plugin.js"),
    format: "cjs",
    external: Object.keys(
      require("../packages/vue-server-renderer/package.json").dependencies
    ),
  },
  // Weex runtime factory
  "weex-factory": {
    weex: true,
    entry: resolve("weex/entry-runtime-factory.js"),
    dest: resolve("packages/weex-vue-framework/factory.js"),
    format: "cjs",
    plugins: [weexFactoryPlugin],
  },
  // Weex runtime framework (CommonJS).
  "weex-framework": {
    weex: true,
    entry: resolve("weex/entry-framework.js"),
    dest: resolve("packages/weex-vue-framework/index.js"),
    format: "cjs",
  },
  // Weex compiler (CommonJS). Used by Weex's Webpack loader.
  "weex-compiler": {
    weex: true,
    entry: resolve("weex/entry-compiler.js"),
    dest: resolve("packages/weex-template-compiler/build.js"),
    format: "cjs",
    external: Object.keys(
      require("../packages/weex-template-compiler/package.json").dependencies
    ),
  },
};

/**
 * @description 用于生成rollup的配置文件
 * @param {*} name - environment
 * @returns - {...}
 */
function genConfig(name) {
  const opts = builds[name]; //具体的构建配置，如包含入口，出口等属性配置
  const config = {
    input: opts.entry,
    external: opts.external,
    plugins: [flow(), alias(Object.assign({}, aliases, opts.alias))].concat(
      opts.plugins || []
    ),
    output: {
      file: opts.dest,
      format: opts.format,
      banner: opts.banner,
      name: opts.moduleName || "Vue",
    },
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
  };

  // built-in vars
  const vars = {
    __WEEX__: !!opts.weex,
    __WEEX_VERSION__: weexVersion,
    __VERSION__: version,
  };
  // feature flags
  Object.keys(featureFlags).forEach((key) => {
    vars[`process.env.${key}`] = featureFlags[key];
  });
  // build-specific env
  if (opts.env) {
    // 添加特定的构建的环境变量，以后在代码中，可通过 process.env.NODE_ENV访问环境变量（开发|生产)
    vars["process.env.NODE_ENV"] = JSON.stringify(opts.env);
  }
  config.plugins.push(replace(vars));

  // opts.transpile不为false时， 用Bublé 编译器转换 ES2015+ 代码
  if (opts.transpile !== false) {
    config.plugins.push(buble());
  }

  // 给config定义不可枚举属性_name,在'npm run build'命令下，使用scripts/build.js会用到
  Object.defineProperty(config, "_name", {
    enumerable: false,
    value: name,
  });

  return config;
}

/**
 * genConfig --- 根据传入TARGET变量,从builds中获取对应的键值，并生成rollup的所需的配置
 * getBuild --- 将getConfig导出
 * getAllBuilds --- 将builds对象转换成rollup工具所需要的配置,getAllBuilds的调用结果是装满builds配置对象的数组[{entry:'...',...},{...}]
 * package.json中的scripts字段定义的脚本命令中：
 * dev===>  npm run dev 命令 走if
 * build===> npm run build 命令  走else
 */
if (process.env.TARGET) {
  module.exports = genConfig(process.env.TARGET);
} else {
  exports.getBuild = genConfig;
  // Object.keys(builds).map(key=>genConfig(key))
  exports.getAllBuilds = () => Object.keys(builds).map(genConfig);
}
