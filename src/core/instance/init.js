/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * @description 定义 Vue.prototype._init 函数
 * @param {*} Vue Vue 构造函数
 */
export function initMixin(Vue: Class<Component>) {
  // Vue 的初始化函数
  Vue.prototype._init = function (options?: Object) {
    // ue 实例
    const vm: Component = this
    // a uid
    // 保证每个 vue 实例都是唯一的，依次递增
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    // 处理组件的 option 配置项
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 给子组件做性能优化，减少原型链的动态查找，提高效率
      // todo 为什么能提高效率，不提高效率可以怎么写？
      initInternalComponent(vm, options)
    } else {
      // 根组件执行这步，把全局配置合并到根组件的局部配置
      vm.$options = mergeOptions(
        // 解析构造函数中的配置对象，合并基类
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* 
      istanbul 是一个代码覆盖率工具，这里用作性能测量
      https://www.ruanyifeng.com/blog/2015/06/istanbul.html 
    */
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
/**
 * @description 性能优化，减少原型链的动态查找，提高执行效率
 * @param {*} vm 
 * @param {*} options 
 */
export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
  // 根据构造函数上的配置对象创建 vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  // 性能优化
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
/**
 * @description 从构造函数中解析配置对象，合并基类配置项
 * @param {*} Ctor 
 * @returns 
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
  // 获取实例构造函数的选项
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 基类构造函数配置项已更改，需要设置一个新的配置项
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 检查是否有任何后期修改/附加的选项(#4976)
      // 找到修改的选项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        // 合并 extend 选项 和 被修改或增加的选项
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 合并基类配置项，并将结果赋值为 Ctor.options
      // todo mergeOptions 方法的具体实现还没了解
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

/**
 * @description 解析构造函数选项中后续被修改或者增加的选项
 * @param {*} Ctor 
 * @returns modified
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified
  // 构造函数的选项
  const latest = Ctor.options
  // 密封的构造函数选项
  const sealed = Ctor.sealedOptions
  // 对比配置项，找出这两个配置项中不一样的属性，并返回配置项
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
