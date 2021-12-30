/* @flow */
// 此部分代码逻辑包含了Vue从创建实例到实例挂载阶段的所有主要逻辑。
import config from "../config";
import { initProxy } from "./proxy";
import { initState } from "./state";
import { initRender } from "./render";
import { initEvents } from "./events";
import { mark, measure } from "../util/perf";
import { initLifecycle, callHook } from "./lifecycle";
import { initProvide, initInjections } from "./inject";
import { extend, mergeOptions, formatComponentName } from "../util/index";

let uid = 0;

/**
 * @description 定义_init函数，_init通过调用初始化函数的模式,完成具体模块的初始化。
 * 1. 合并配置
 * 2. 初始化 Lifecycle，Events，Render，并首次调用生命钩子beforeCreate，再 初始化Injections，State，Provide，并首次调用created生命周期函数，
 * 3. 最后执行vm.$mount()：实际上是执行了mountComponent(this, el, hydrating)函数
 * 4. 实例化时，即 new Vue()的时候，会调用_init方法会被调用（源码core/instance/index.js中）
 */
export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    // vm：当前vue实例，也就是构造函数被调用后的this指向。
    const vm: Component = this;
    // a uid
    vm._uid = uid++;

    let startTag, endTag;
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`;
      endTag = `vue-perf-end:${vm._uid}`;
      mark(startTag);
    }

    // a flag to avoid this being observed
    vm._isVue = true;
    // merge options 合并配置
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options);
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    /*
    通过ES6的Proxy给vm实例设置一层代理(做一层拦截)，主要作用是为vue在模板渲染时进行一层数据筛选,
    给开发环境下一些不合理的配置做出一些自定义的警告.
    在开发环境下调用initProxy方法，并将vm作为参数传入
    在生产环境下，vm._renderProxy则是vm本身；
    */
    if (process.env.NODE_ENV !== "production") {
      initProxy(vm);
    } else {
      vm._renderProxy = vm;
    }
    // expose real self 初始化生命周期，初始化事件中心，初始化渲染，初始化data、props、computed、watch，methods等属性，初始化provide，inject
    vm._self = vm;
    initLifecycle(vm); //初始化生命周期
    initEvents(vm); //初始化事件中心
    initRender(vm); //初始化渲染
    callHook(vm, "beforeCreate"); //触发beforeCreate钩子函数
    initInjections(vm); // resolve injections before data/props  在data/props之前初始化inject
    initState(vm); // 初始化data、props、computed、methods、watch
    initProvide(vm); // resolve provide after data/props 在data/props之前初始化provide
    callHook(vm, "created"); //触发created钩子函数

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }
    // 如果有el属性，则调用$vm.mount方法挂载vm,挂载的目标就是把模板渲染成最终的DOM
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options;
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super);
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  const latest = Ctor.options;
  const sealed = Ctor.sealedOptions;
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
