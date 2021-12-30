/* @flow */
// 生命周期相关，
import config from "../config";
import Watcher from "../observer/watcher";
import { mark, measure } from "../util/perf";
import { createEmptyVNode } from "../vdom/vnode";
import { updateComponentListeners } from "./events";
import { resolveSlots } from "./render-helpers/resolve-slots";
import { toggleObserving } from "../observer/index";
import { pushTarget, popTarget } from "../observer/dep";

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling,
} from "../util/index";

export let activeInstance: any = null;
export let isUpdatingChildComponent: boolean = false;

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance;
  activeInstance = vm;
  return () => {
    activeInstance = prevActiveInstance;
  };
}
/**
 * @description 初始化生命周期
 * @param {Component} vm - 实例对象
 */
export function initLifecycle(vm: Component) {
  /**
   *  从实例的$options属性上 找到最上层非抽象父组件 （组件是对象形式，且有一个abstract属性，值为true，则为抽象组件）
   * <keep-alive> 是一个抽象组件：它自身不会渲染一个 DOM 元素，也不会出现在组件的父组件链中。
   */
  const options = vm.$options;
  // locate first non-abstract parent
  let parent = options.parent;
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;

  /**
   * 初始化$children和$refs属性
   * vm.$children是子组件的数组
   * vm.$refs是指定引用名称的组件对象
   */
  vm.$children = [];
  vm.$refs = {};

  /**
   * 初始化一些标志，用于判断是否已经执行完某种钩子
   * _inactive和_directInactive是判断激活状态的属性；
   * activated(组件被激活时会被调用) 和 deactivated(切换到其他组件的时候被调用)
   * 这两个特殊钩子是在使用 keep-alive 组件的时候才有效。
   */

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}
/**
 * @description 在Vue.prototype上 添加 _update()， $forceUpdate() 和 $destroy 方法
 * @param {*} Vue
 */
export function lifecycleMixin(Vue: Class<Component>) {
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this;
    const prevEl = vm.$el;
    const prevVnode = vm._vnode;
    const restoreActiveInstance = setActiveInstance(vm);
    vm._vnode = vnode;
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance();
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null;
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm;
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el;
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  };

  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function () {
    const vm: Component = this;
    if (vm._isBeingDestroyed) {
      return;
    }
    callHook(vm, "beforeDestroy");
    vm._isBeingDestroyed = true;
    // remove self from parent
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    let i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--;
    }
    // call the last hook...
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, "destroyed");
    // turn off all instance listeners.
    vm.$off();
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null;
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null;
    }
  };
}

/**
 * @description
 * 1. callHook(vm, 'beforeMount'),调用生命周期钩子beforeMount
 * 2. 声明了updateComponent函数
 * 3. 用new Watcher()实例化了Watcher类，实例化的过程中调用了作为参数传入的updateComponent函数，这个函数中执行了vm._update(vm._render(), hydrating)函数。
 *     _update中执行了 vm.$el = vm.__patch__render中返回VNode，
 * 4. callHook(vm, 'mounted')，调用生命周期钩子mounted
 *  _render()定义在 src/core/insatnce/render.js文件中
 */
export function mountComponent(
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el;
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode; //如果没有render,就将createEmptyVNode赋给render
    if (process.env.NODE_ENV !== "production") {
      /* istanbul ignore if */
      if (
        (vm.$options.template && vm.$options.template.charAt(0) !== "#") ||
        vm.$options.el ||
        el
      ) {
        warn(
          "You are using the runtime-only build of Vue where the template " +
            "compiler is not available. Either pre-compile the templates into " +
            "render functions, or use the compiler-included build.",
          vm
        );
      } else {
        warn(
          "Failed to mount component: template or render function not defined.",
          vm
        );
      }
    }
  }
  callHook(vm, "beforeMount");

  let updateComponent;
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production" && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name;
      const id = vm._uid;
      const startTag = `vue-perf-start:${id}`;
      const endTag = `vue-perf-end:${id}`;

      mark(startTag);
      const vnode = vm._render();
      mark(endTag);
      measure(`vue ${name} render`, startTag, endTag);

      mark(startTag);
      vm._update(vnode, hydrating);
      mark(endTag);
      measure(`vue ${name} patch`, startTag, endTag);
    };
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating); //
    };
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 实例化一个渲染Watcher,在它的回调函数中调用 upComponent方法，在该方法内部，调用vm._render 方法生成虚拟Node,最终调用vm._update更新DOM
  // 初始化会执行回调函数，vm实例中检测到数据变化，也会执行回调函数。
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      before() {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, "beforeUpdate");
        }
      },
    },
    true /* isRenderWatcher */
  );
  hydrating = false;

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  /*
  函数最后判断为根节点的时候设置 vm._isMounted 为 true，表示这个实例已经挂载了，同时执行 mounted 钩子函数。
  这里注意 vm.$vnode 表示 Vue 实例的父虚拟 Node，所以它为 Null 则表示当前vm是Vue根实例。
  */
  if (vm.$vnode == null) {
    vm._isMounted = true;
    callHook(vm, "mounted");
  }
  return vm;
}

export function updateChildComponent(
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== "production") {
    isUpdatingChildComponent = true;
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots;
  const oldScopedSlots = vm.$scopedSlots;
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  );

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    hasDynamicScopedSlot
  );

  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render

  if (vm._vnode) {
    // update child tree's parent
    vm._vnode.parent = parentVnode;
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false);
    const props = vm._props;
    const propKeys = vm.$options._propKeys || [];
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i];
      const propOptions: any = vm.$options.props; // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
    toggleObserving(true);
    // keep a copy of raw propsData
    vm.$options.propsData = propsData;
  }

  // update listeners
  listeners = listeners || emptyObject;
  const oldListeners = vm.$options._parentListeners;
  vm.$options._parentListeners = listeners;
  updateComponentListeners(vm, listeners, oldListeners);

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  if (process.env.NODE_ENV !== "production") {
    isUpdatingChildComponent = false;
  }
}

function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true;
  }
  return false;
}

export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false;
    if (isInInactiveTree(vm)) {
      return;
    }
  } else if (vm._directInactive) {
    return;
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false;
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i]);
    }
    callHook(vm, "activated");
  }
}

export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true;
    if (isInInactiveTree(vm)) {
      return;
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i]);
    }
    callHook(vm, "deactivated");
  }
}
/**
 * @description 触发函数钩子，调用某个生命周期钩子注册的所有回调函数
 * @param {*} vm - vue实例
 * @param {*} hook - 钩子函数名,key
 * vm.$options[hook] 值，取到的是一个回调函数数组,
 */
export function callHook(vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget(); //调用生命周期钩子时禁用dep集合，注意这里没传参，
  const handlers = vm.$options[hook]; //根据钩子函数名拿到钩子函数集(callback数组)
  const info = `${hook} hook`;
  if (handlers) {
    // 遍历callback数组并通过invokeWithErrorHandling触发回调函数(执行钩子函数)
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info);
    }
  }
  /**
   * 事件相关 instance/events.js中,设置vm._hasHookEvent
   * initEvents()初始化事件函数中赋值为 false
   * eventsMixin()中定义的$on中，会据条件设置为true
   * 当_hasHookEvent属性为真，组件会触发对应的生命周期钩子函数，
   * 利用这个功能可以：监听子组件生命周期和监听组件自身生命周期
   * 在template模板中，我们可以使用@hook:xxx的形式来监听子组件对应的生命周期：
   * 如父组件A.vue内容如下，则子组件一旦挂载完(子组件触发自己的mounted钩子函数),就会执行我们提供的doSomething这个回调函数，
   * 即我们此时在父组件监听到了子组件的mounted这个生命周期。
   * <template>
   *  <div class="father">
   *   <my-child @hook:mounted="doSomething"></my-child>
   *  </div>
   * </template>
   * <script>
   * export default {
   *  methods:{
   *    doSomething(){
   *      console.log(666)
   *    }
   *  }
   * }
   * </script>
   *
   */

  if (vm._hasHookEvent) {
    vm.$emit("hook:" + hook); //触发 @hook:xxx 形式绑定的函数
  }
  popTarget();
}
