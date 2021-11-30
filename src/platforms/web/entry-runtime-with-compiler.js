/* @flow */
// 从package.json的scripts脚本命令,如"dev"，看配置文件script/config.js的entry入口,找到当前的entry-runtime-with-compiler.js这个文件

/**
 * Runtime + Compiler 版本，执行的$mount是本文件定义的$mount
 * (且会使用到./runtime/index中定义的公共的mount)
 */

import config from "core/config";
import { warn, cached } from "core/util/index";
import { mark, measure } from "core/util/perf";
/**
 * vue-cli 去初始化我们的 Vue.js 项目,  可以选择Runtime Only 版本 或者 Runtime + Compiler 版本(又称它为完整版)进行初始化。
 * 如：我们使用的是完整版的vue,即 Runtime + Compiler 构建出来的 Vue.js;
 * `import Vue from 'vue'`的时候，就会从vue源码的`src/platforms/web/entry-runtime-with-compiler.js`这个入口执行代码来初始化 Vue。
 * entry-runtime-with-compiler文件中的vue来源于 runtime，runtime中的vue来源于core/index.js;
 * 而core中的vue来自 instance/index.js文件，至此找到了Vue的真正面目,是一个构造函数：
 * 见源码的 src/core/instance/index.js中 function Vue(options){...}
 */
import Vue from "./runtime/index";
import { query } from "./util/index";
import { compileToFunctions } from "./compiler/index";
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref,
} from "./util/compat";

const idToTemplate = cached((id) => {
  // 根据 id 获得 DOM 对象，并返回innerHTML
  const el = query(id);
  return el && el.innerHTML;
});

// 缓存公共的 $mount 方法
const mount = Vue.prototype.$mount;

// 重写$mount,会在重写的$mount中调用公共的mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 将 el 转换成 DOM 节点
  el = el && query(el);

  /*
    istanbul ignore if
    对el 做限制，Vue 不能挂载在 body、html 这样的根节点上
   */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== "production" &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      );
    return this;
  }

  const options = this.$options;
  // resolve template/el and convert to render function
  /**
   * 如果没有定义 render 方法，则会把 el 或者 template 字符串转换成 render 方法；
  在 Vue 2.0 版本中，所有 Vue 的组件的渲染最终都需要 render 方法，无论我们是用单文件 .vue 方式开发组件，
  还是写了 el 或者 template 属性，最终都会转换成 render 方法，这个过程是 Vue 的一个“在线编译”的过程，
  是调用 compileToFunctions 方法实现的。
   */
  // 不存在 render 则解析 template 并转换成 render函数
  if (!options.render) {
    let template = options.template;
    if (template) {
      if (typeof template === "string") {
        if (template.charAt(0) === "#") {
          // 如果值以 # 开始，则它将被用作id选择符，并使用匹配元素的innerHTML作为模板
          template = idToTemplate(template);
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== "production" && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            );
          }
        }
      } else if (template.nodeType) {
        // 若template 是一个 DOM，
        template = template.innerHTML;
      } else {
        if (process.env.NODE_ENV !== "production") {
          warn("invalid template option:" + template, this);
        }
        return this;
      }
    } else if (el) {
      // 当options中没有template时，调用getOuterHTML()方法，获取el的outerHTML，并将其作为template模板。
      template = getOuterHTML(el);
    }
    if (template) {
      /* istanbul ignore if   性能监控 */
      if (process.env.NODE_ENV !== "production" && config.performance && mark) {
        mark("compile");
      }
      // 没有render方法时，用compileToFunctions方法来生成render方法，并挂载到vm.$options
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: process.env.NODE_ENV !== "production",
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments,
        },
        this
      );
      options.render = render;
      options.staticRenderFns = staticRenderFns;

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== "production" && config.performance && mark) {
        mark("compile end");
        measure(`vue ${this._name} compile`, "compile", "compile end");
      }
    }
  }
  // 调用刚刚缓存起来的公共的$mount方法
  return mount.call(this, el, hydrating);
};

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
/**
 * @description 获取元素el及其后代的序列化HTML片段；
 * @param {*} el -  挂载的元素
 * 解决节点无outerHTML的情况， 如文本节点Text，无outerHTML
 * el.cloneNode(true) 深度克隆子节点
 */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML;
  } else {
    const container = document.createElement("div");
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}
/*
挂载全局API---compile;该API即Vue.compile(template:String),
用于将一个模板字符串编译成render函数。只在完整版(runtime+compile版本)时可用。
*/
Vue.compile = compileToFunctions;

export default Vue;
