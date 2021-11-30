/* @flow */
/**
 * Runtime Only版本，执行的$mount是本文件定义的$mount
 */
import Vue from "core/index";
import config from "core/config";
import { extend, noop } from "shared/util";
import { mountComponent } from "core/instance/lifecycle";
import { devtools, inBrowser } from "core/util/index";

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement,
} from "web/util/index";

import { patch } from "./patch";
import platformDirectives from "./directives/index";
import platformComponents from "./components/index";

// install platform specific utils
Vue.config.mustUseProp = mustUseProp;
Vue.config.isReservedTag = isReservedTag;
Vue.config.isReservedAttr = isReservedAttr;
Vue.config.getTagNamespace = getTagNamespace;
Vue.config.isUnknownElement = isUnknownElement;

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives);
extend(Vue.options.components, platformComponents);

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;

// public mount method 公共的$mount方法
Vue.prototype.$mount = function (
  el?: string | Element, // el表示挂载的元素，可以是字符串，也可以是DOM对象；如果是字符串，在浏览器环境下，会调用query方法转为dom对象；
  hydrating?: boolean // 和服务端渲染有关，在浏览器环境下不会用它，该参数为false
): Component {
  // 如果存在el且是浏览器环境，那么调用 query 获得DOM对象，否则返回undefined
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating); // 调用mountComponent()会完成整个渲染操作，里面会调用两个核心方法：vm._render(生成VNode) 和vm._update(更新DOM)
};

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit("init", Vue);
      } else if (
        process.env.NODE_ENV !== "production" &&
        process.env.NODE_ENV !== "test"
      ) {
        console[console.info ? "info" : "log"](
          "Download the Vue Devtools extension for a better development experience:\n" +
            "https://github.com/vuejs/vue-devtools"
        );
      }
    }
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NODE_ENV !== "test" &&
      config.productionTip !== false &&
      typeof console !== "undefined"
    ) {
      console[console.info ? "info" : "log"](
        `You are running Vue in development mode.\n` +
          `Make sure to turn on production mode when deploying for production.\n` +
          `See more tips at https://vuejs.org/guide/deployment.html`
      );
    }
  }, 0);
}

export default Vue;
