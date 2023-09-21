var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vendor/modules/react/export.js
var export_exports = {};
__export(export_exports, {
  Children: () => le,
  Component: () => ae,
  Fragment: () => pe,
  Profiler: () => ye,
  PureComponent: () => de,
  StrictMode: () => _e,
  Suspense: () => me,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => he,
  cloneElement: () => ve,
  createContext: () => Se,
  createElement: () => Ee,
  createFactory: () => Re,
  createRef: () => Ce,
  forwardRef: () => ke,
  isValidElement: () => we,
  lazy: () => be,
  memo: () => $e,
  startTransition: () => xe,
  unstable_act: () => Oe,
  useCallback: () => je,
  useContext: () => Ie,
  useDebugValue: () => ge,
  useDeferredValue: () => Pe,
  useEffect: () => Te,
  useId: () => De,
  useImperativeHandle: () => Ve,
  useInsertionEffect: () => Le,
  useLayoutEffect: () => Ne,
  useMemo: () => Fe,
  useReducer: () => Ue,
  useRef: () => qe,
  useState: () => Ae,
  useSyncExternalStore: () => Me,
  useTransition: () => ze,
  version: () => Be
});
module.exports = __toCommonJS(export_exports);

// https://esm.sh/stable/react@18.2.0/denonext/react.mjs
var z = Object.create;
var E = Object.defineProperty;
var B = Object.getOwnPropertyDescriptor;
var H = Object.getOwnPropertyNames;
var W = Object.getPrototypeOf, Y = Object.prototype.hasOwnProperty;
var x = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), G = (e, t) => {
  for (var r in t)
    E(e, r, { get: t[r], enumerable: true });
}, S = (e, t, r, u) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of H(t))
      !Y.call(e, o) && o !== r && E(e, o, { get: () => t[o], enumerable: !(u = B(t, o)) || u.enumerable });
  return e;
}, y = (e, t, r) => (S(e, t, "default"), r && S(r, t, "default")), O = (e, t, r) => (r = e != null ? z(W(e)) : {}, S(t || !e || !e.__esModule ? E(r, "default", { value: e, enumerable: true }) : r, e));
var U = x((n) => {
  "use strict";
  var _ = Symbol.for("react.element"), J = Symbol.for("react.portal"), K = Symbol.for("react.fragment"), Q = Symbol.for("react.strict_mode"), X = Symbol.for("react.profiler"), Z = Symbol.for("react.provider"), ee = Symbol.for("react.context"), te = Symbol.for("react.forward_ref"), re = Symbol.for("react.suspense"), ne = Symbol.for("react.memo"), oe = Symbol.for("react.lazy"), j = Symbol.iterator;
  function ue(e) {
    return e === null || typeof e != "object" ? null : (e = j && e[j] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var P = { isMounted: function() {
    return false;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, T = Object.assign, D = {};
  function d(e, t, r) {
    this.props = e, this.context = t, this.refs = D, this.updater = r || P;
  }
  d.prototype.isReactComponent = {};
  d.prototype.setState = function(e, t) {
    if (typeof e != "object" && typeof e != "function" && e != null)
      throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, e, t, "setState");
  };
  d.prototype.forceUpdate = function(e) {
    this.updater.enqueueForceUpdate(this, e, "forceUpdate");
  };
  function V() {
  }
  V.prototype = d.prototype;
  function C(e, t, r) {
    this.props = e, this.context = t, this.refs = D, this.updater = r || P;
  }
  var k = C.prototype = new V();
  k.constructor = C;
  T(k, d.prototype);
  k.isPureReactComponent = true;
  var I = Array.isArray, L = Object.prototype.hasOwnProperty, w = { current: null }, N = { key: true, ref: true, __self: true, __source: true };
  function F(e, t, r) {
    var u, o = {}, c = null, f = null;
    if (t != null)
      for (u in t.ref !== void 0 && (f = t.ref), t.key !== void 0 && (c = "" + t.key), t)
        L.call(t, u) && !N.hasOwnProperty(u) && (o[u] = t[u]);
    var i = arguments.length - 2;
    if (i === 1)
      o.children = r;
    else if (1 < i) {
      for (var s = Array(i), a = 0; a < i; a++)
        s[a] = arguments[a + 2];
      o.children = s;
    }
    if (e && e.defaultProps)
      for (u in i = e.defaultProps, i)
        o[u] === void 0 && (o[u] = i[u]);
    return { $$typeof: _, type: e, key: c, ref: f, props: o, _owner: w.current };
  }
  function se(e, t) {
    return { $$typeof: _, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
  }
  function b(e) {
    return typeof e == "object" && e !== null && e.$$typeof === _;
  }
  function ce(e) {
    var t = { "=": "=0", ":": "=2" };
    return "$" + e.replace(/[=:]/g, function(r) {
      return t[r];
    });
  }
  var g = /\/+/g;
  function R(e, t) {
    return typeof e == "object" && e !== null && e.key != null ? ce("" + e.key) : t.toString(36);
  }
  function h(e, t, r, u, o) {
    var c = typeof e;
    (c === "undefined" || c === "boolean") && (e = null);
    var f = false;
    if (e === null)
      f = true;
    else
      switch (c) {
        case "string":
        case "number":
          f = true;
          break;
        case "object":
          switch (e.$$typeof) {
            case _:
            case J:
              f = true;
          }
      }
    if (f)
      return f = e, o = o(f), e = u === "" ? "." + R(f, 0) : u, I(o) ? (r = "", e != null && (r = e.replace(g, "$&/") + "/"), h(o, t, r, "", function(a) {
        return a;
      })) : o != null && (b(o) && (o = se(o, r + (!o.key || f && f.key === o.key ? "" : ("" + o.key).replace(g, "$&/") + "/") + e)), t.push(o)), 1;
    if (f = 0, u = u === "" ? "." : u + ":", I(e))
      for (var i = 0; i < e.length; i++) {
        c = e[i];
        var s = u + R(c, i);
        f += h(c, t, r, s, o);
      }
    else if (s = ue(e), typeof s == "function")
      for (e = s.call(e), i = 0; !(c = e.next()).done; )
        c = c.value, s = u + R(c, i++), f += h(c, t, r, s, o);
    else if (c === "object")
      throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
    return f;
  }
  function m(e, t, r) {
    if (e == null)
      return e;
    var u = [], o = 0;
    return h(e, u, "", "", function(c) {
      return t.call(r, c, o++);
    }), u;
  }
  function ie(e) {
    if (e._status === -1) {
      var t = e._result;
      t = t(), t.then(function(r) {
        (e._status === 0 || e._status === -1) && (e._status = 1, e._result = r);
      }, function(r) {
        (e._status === 0 || e._status === -1) && (e._status = 2, e._result = r);
      }), e._status === -1 && (e._status = 0, e._result = t);
    }
    if (e._status === 1)
      return e._result.default;
    throw e._result;
  }
  var l = { current: null }, v = { transition: null }, fe = { ReactCurrentDispatcher: l, ReactCurrentBatchConfig: v, ReactCurrentOwner: w };
  n.Children = { map: m, forEach: function(e, t, r) {
    m(e, function() {
      t.apply(this, arguments);
    }, r);
  }, count: function(e) {
    var t = 0;
    return m(e, function() {
      t++;
    }), t;
  }, toArray: function(e) {
    return m(e, function(t) {
      return t;
    }) || [];
  }, only: function(e) {
    if (!b(e))
      throw Error("React.Children.only expected to receive a single React element child.");
    return e;
  } };
  n.Component = d;
  n.Fragment = K;
  n.Profiler = X;
  n.PureComponent = C;
  n.StrictMode = Q;
  n.Suspense = re;
  n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = fe;
  n.cloneElement = function(e, t, r) {
    if (e == null)
      throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
    var u = T({}, e.props), o = e.key, c = e.ref, f = e._owner;
    if (t != null) {
      if (t.ref !== void 0 && (c = t.ref, f = w.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps)
        var i = e.type.defaultProps;
      for (s in t)
        L.call(t, s) && !N.hasOwnProperty(s) && (u[s] = t[s] === void 0 && i !== void 0 ? i[s] : t[s]);
    }
    var s = arguments.length - 2;
    if (s === 1)
      u.children = r;
    else if (1 < s) {
      i = Array(s);
      for (var a = 0; a < s; a++)
        i[a] = arguments[a + 2];
      u.children = i;
    }
    return { $$typeof: _, type: e.type, key: o, ref: c, props: u, _owner: f };
  };
  n.createContext = function(e) {
    return e = { $$typeof: ee, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Z, _context: e }, e.Consumer = e;
  };
  n.createElement = F;
  n.createFactory = function(e) {
    var t = F.bind(null, e);
    return t.type = e, t;
  };
  n.createRef = function() {
    return { current: null };
  };
  n.forwardRef = function(e) {
    return { $$typeof: te, render: e };
  };
  n.isValidElement = b;
  n.lazy = function(e) {
    return { $$typeof: oe, _payload: { _status: -1, _result: e }, _init: ie };
  };
  n.memo = function(e, t) {
    return { $$typeof: ne, type: e, compare: t === void 0 ? null : t };
  };
  n.startTransition = function(e) {
    var t = v.transition;
    v.transition = {};
    try {
      e();
    } finally {
      v.transition = t;
    }
  };
  n.unstable_act = function() {
    throw Error("act(...) is not supported in production builds of React.");
  };
  n.useCallback = function(e, t) {
    return l.current.useCallback(e, t);
  };
  n.useContext = function(e) {
    return l.current.useContext(e);
  };
  n.useDebugValue = function() {
  };
  n.useDeferredValue = function(e) {
    return l.current.useDeferredValue(e);
  };
  n.useEffect = function(e, t) {
    return l.current.useEffect(e, t);
  };
  n.useId = function() {
    return l.current.useId();
  };
  n.useImperativeHandle = function(e, t, r) {
    return l.current.useImperativeHandle(e, t, r);
  };
  n.useInsertionEffect = function(e, t) {
    return l.current.useInsertionEffect(e, t);
  };
  n.useLayoutEffect = function(e, t) {
    return l.current.useLayoutEffect(e, t);
  };
  n.useMemo = function(e, t) {
    return l.current.useMemo(e, t);
  };
  n.useReducer = function(e, t, r) {
    return l.current.useReducer(e, t, r);
  };
  n.useRef = function(e) {
    return l.current.useRef(e);
  };
  n.useState = function(e) {
    return l.current.useState(e);
  };
  n.useSyncExternalStore = function(e, t, r) {
    return l.current.useSyncExternalStore(e, t, r);
  };
  n.useTransition = function() {
    return l.current.useTransition();
  };
  n.version = "18.2.0";
});
var $ = x((Je, q) => {
  "use strict";
  q.exports = U();
});
var p = {};
G(p, { Children: () => le, Component: () => ae, Fragment: () => pe, Profiler: () => ye, PureComponent: () => de, StrictMode: () => _e, Suspense: () => me, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => he, cloneElement: () => ve, createContext: () => Se, createElement: () => Ee, createFactory: () => Re, createRef: () => Ce, default: () => We, forwardRef: () => ke, isValidElement: () => we, lazy: () => be, memo: () => $e, startTransition: () => xe, unstable_act: () => Oe, useCallback: () => je, useContext: () => Ie, useDebugValue: () => ge, useDeferredValue: () => Pe, useEffect: () => Te, useId: () => De, useImperativeHandle: () => Ve, useInsertionEffect: () => Le, useLayoutEffect: () => Ne, useMemo: () => Fe, useReducer: () => Ue, useRef: () => qe, useState: () => Ae, useSyncExternalStore: () => Me, useTransition: () => ze, version: () => Be });
var M = O($());
y(p, O($()));
var { Children: le, Component: ae, Fragment: pe, Profiler: ye, PureComponent: de, StrictMode: _e, Suspense: me, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: he, cloneElement: ve, createContext: Se, createElement: Ee, createFactory: Re, createRef: Ce, forwardRef: ke, isValidElement: we, lazy: be, memo: $e, startTransition: xe, unstable_act: Oe, useCallback: je, useContext: Ie, useDebugValue: ge, useDeferredValue: Pe, useEffect: Te, useId: De, useImperativeHandle: Ve, useInsertionEffect: Le, useLayoutEffect: Ne, useMemo: Fe, useReducer: Ue, useRef: qe, useState: Ae, useSyncExternalStore: Me, useTransition: ze, version: Be } = M, { default: A, ...He } = M, We = A !== void 0 ? A : He;
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
