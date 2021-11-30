/* @flow */

import config from "../config";
import { initUse } from "./use";
import { initMixin } from "./mixin";
import { initExtend } from "./extend";
import { initAssetRegisters } from "./assets";
import { set, del } from "../observer/index";
import { ASSET_TYPES } from "shared/constants";
import builtInComponents from "../components/index";
import { observe } from "core/observer/index";

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive,
} from "../util/index";

/**
 * @description 在Vue构造函数上挂载各种全局API函数,给Vue对象本身，扩展一些全局的静态方法；
 * 1. 为Vue定义config属性(全局配置项)，且为不可枚举属性。Object.defineProperty 定义对象Vue的config属性的值configDef：该值默认是不可写的、不可枚举的、不可配置的;
 * 2. 为Vue挂载util,set,delete,nextTick，observable，options等属性或方法
 * 3. 初始化options里的components，初始化Use，Mixin，Extend，以及AssetRegisters
 * @param {*} Vue
 */
export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {};
  configDef.get = () => config;
  if (process.env.NODE_ENV !== "production") {
    //开发环境下，提醒用户不要替换 Vue.config 对象，可为这个对象设置单个字段
    configDef.set = () => {
      warn(
        "Do not replace the Vue.config object, set individual fields instead."
      );
    };
  }
  Object.defineProperty(Vue, "config", configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive,
  };

  Vue.set = set;
  Vue.delete = del;
  Vue.nextTick = nextTick;

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj);
    return obj;
  };

  {
    /* const ASSET_TYPES = ['component','directive','filter']
    Vue构造函数自身有四个默认配置选项:component，directive， filter ,_base(返回自身构造器,针对weex的) */
  }

  Vue.options = Object.create(null); //原型上创建了一个指向为空对象的options属性
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + "s"] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue;

  extend(Vue.options.components, builtInComponents);

  initUse(Vue); //use
  initMixin(Vue); //mixin
  initExtend(Vue); // extend
  initAssetRegisters(Vue); // component,directive,filter
}
