/* not type checking this file because flow doesn't play well with Proxy */

import config from "core/config";
import { warn, makeMap, isNative } from "../util/index";

let initProxy;

if (process.env.NODE_ENV !== "production") {
  const allowedGlobals = makeMap(
    "Infinity,undefined,NaN,isFinite,isNaN," +
      "parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent," +
      "Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt," +
      "require" // for Webpack/Browserify
  );

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
        "referenced during render. Make sure that this property is reactive, " +
        "either in the data option, or for class-based components, by " +
        "initializing the property. " +
        "See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.",
      target
    );
  };

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
        'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
        "prevent conflicts with Vue internals. " +
        "See: https://vuejs.org/v2/api/#data",
      target
    );
  };
  // 判断浏览器是否支持Proxy,浏览器若支持Proxy,则typeof Proxy 的值为'function'
  const hasProxy = typeof Proxy !== "undefined" && isNative(Proxy);

  if (hasProxy) {
    const isBuiltInModifier = makeMap(
      "stop,prevent,self,ctrl,shift,alt,meta,exact"
    );
    config.keyCodes = new Proxy(config.keyCodes, {
      set(target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(
            `Avoid overwriting built-in modifier in config.keyCodes: .${key}`
          );
          return false;
        } else {
          target[key] = value;
          return true;
        }
      },
    });
  }

  // todo write
  const hasHandler = {
    has(target, key) {
      const has = key in target;
      const isAllowed =
        allowedGlobals(key) ||
        (typeof key === "string" &&
          key.charAt(0) === "_" &&
          !(key in target.$data));
      if (!has && !isAllowed) {
        if (key in target.$data) warnReservedPrefix(target, key);
        else warnNonPresent(target, key);
      }
      return has || !isAllowed;
    },
  };

  const getHandler = {
    get(target, key) {
      if (typeof key === "string" && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key);
        else warnNonPresent(target, key);
      }
      return target[key];
    },
  };

  /**
   *  @description 如果浏览器支持Proxy,就创建一个Proxy对象赋给vm._renderProxy；如果不支持，就设置vm._renderProxy为vm本身
   * 当使用类似webpack这样的打包工具时，通常会使用vue-loader插件进行模板的编译，
   * 这个时候options.render是存在的，并且_withStripped的属性也会设置为true，故会取hasHandler；
   */
  initProxy = function initProxy(vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      const options = vm.$options;
      const handlers =
        options.render && options.render._withStripped
          ? getHandler
          : hasHandler;
      vm._renderProxy = new Proxy(vm, handlers); //参数2，handlers是负责定义代理行为的对象，一般取值为hasHandler
    } else {
      vm._renderProxy = vm;
    }
  };
}

export { initProxy };
