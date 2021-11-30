const path = require("path");

const resolve = (p) => path.resolve(__dirname, "../", p);
// 该文件导出一个与rollup构建别名相关的配置对象，在./config.js中引入并使用它
module.exports = {
  vue: resolve("src/platforms/web/entry-runtime-with-compiler"),
  compiler: resolve("src/compiler"),
  core: resolve("src/core"), // core对应的真实路径时：path.resolve(__dirname,'../src/core')，即vue项目源码的src下的core目录
  shared: resolve("src/shared"),
  web: resolve("src/platforms/web"), // web对应的真实路径为：path.resolve(__dirname, '../src/platforms/web')
  weex: resolve("src/platforms/weex"),
  server: resolve("src/server"),
  sfc: resolve("src/sfc"),
};
