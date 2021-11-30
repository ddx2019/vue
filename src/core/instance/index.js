/**
 *
 * 1. new Vue()===> 实例化的过程会调用 `this._init()` 初始化所有模块，该_init方法定义在instance/init.js文件的initMixin方法中。
 * 2. this._init()===> 中会调用 `vm.$mount()` 方法实现的。
 * 4. vm.$mount()===> 中，会调用 `mountComponent()` 方法，完成整个渲染操作。该方法定义在 core/instance/lifecycle.js文件的initMixin方法中。
 * 5. mountComponent()===> 中调用两个核心方法：vm._render(生成VNode) 和vm._update(更新DOM)
 *
 * 注意：因 $mount() 的实现与平台和构建方式都相关,mount后有compile参与。
 *    1) Runtime Only 版本，执行的是 ：该$mount方法定义在 platforms/web/runtime/index.js中的$mount() (公共的$mount)
 *    2) Runtime+Compiler 版本 执行的是： 在platforms/web/entry-runtime-with-compiler.js 中的$mount() (重写的$mount)
 *    3) 重写的$mount中会调用公共的$mount,且会调用一个compileToFunctions() 方法实现一个"在线编译"(最终都转换成render方法)的过程
 */
import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";
import { warn } from "../util/index";
/**
 * @description Vue是一个构造函数，将来会用来去创建一个实例，只能通过new操作符来创建一个Vue的实例，即实例化一个对象，从访问Vue。
 * 实例化时，即 new Vue()的时候，会调用this._init()方法，并传入options。该_init方法定义在Vue的原型上,在initMixin方法中实现，。
 */
function Vue(options) {
  if (process.env.NODE_ENV !== "production" && !(this instanceof Vue)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }
  this._init(options); // 调用该方法进行初始化操作
}

//  这些 xxxMixin都是给Vue的prototype上扩展一些方法；
initMixin(Vue); // 定义_init()方法,并在_init中完成具体模块的初始化，如初始化了生命周期以及事件等等。
stateMixin(Vue); // 定义了$data，$props,$set(),$delete(),$watch()等方法和属性
eventsMixin(Vue); // 定义事件相关的方法，$on()，$emit(),$once(),$off()等
lifecycleMixin(Vue); //定义 _update()和$forceUpdate()等方法
renderMixin(Vue); //定义 $nextTick()和 _render() 方法

export default Vue;
