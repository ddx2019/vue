/**
 * ./instance/index文件执行完毕回溯到当前文件,当前文件主要是:
 * 1. 执行initGlobalAPI函数，
 * 2. 在Vue原型上添加了$isServer，$ssrContext两个用于区分环境的属性
 * 3. 在Vue自身上添加了两个属性，
 *
 */
import Vue from "./instance/index";
import { initGlobalAPI } from "./global-api/index";
import { isServerRendering } from "core/util/env";
import { FunctionalRenderContext } from "core/vdom/create-functional-component";

initGlobalAPI(Vue);

Object.defineProperty(Vue.prototype, "$isServer", {
  get: isServerRendering,
});

Object.defineProperty(Vue.prototype, "$ssrContext", {
  get() {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext;
  },
});

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, "FunctionalRenderContext", {
  value: FunctionalRenderContext,
});

/**
 * 存下当前 Vue 的版本号
 * 在配置文件scripts/config.js中定义了 __VERSION__ 常量，
 * 使用 rollup-plugin-replace 插件在构建的过程中将代码的常量 __VERSION__ 替换成 package.json中的version
 */
Vue.version = "__VERSION__";

export default Vue;
