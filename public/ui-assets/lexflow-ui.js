var Lu = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function _T(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var gh = { exports: {} }, Yo = {};
var f1;
function K_() {
  if (f1) return Yo;
  f1 = 1;
  var t = /* @__PURE__ */ Symbol.for("react.transitional.element"), n = /* @__PURE__ */ Symbol.for("react.fragment");
  function s(r, o, u) {
    var c = null;
    if (u !== void 0 && (c = "" + u), o.key !== void 0 && (c = "" + o.key), "key" in o) {
      u = {};
      for (var d in o)
        d !== "key" && (u[d] = o[d]);
    } else u = o;
    return o = u.ref, {
      $$typeof: t,
      type: r,
      key: c,
      ref: o !== void 0 ? o : null,
      props: u
    };
  }
  return Yo.Fragment = n, Yo.jsx = s, Yo.jsxs = s, Yo;
}
var d1;
function Z_() {
  return d1 || (d1 = 1, gh.exports = K_()), gh.exports;
}
var v = Z_(), yh = { exports: {} }, Rt = {};
var h1;
function Q_() {
  if (h1) return Rt;
  h1 = 1;
  var t = /* @__PURE__ */ Symbol.for("react.transitional.element"), n = /* @__PURE__ */ Symbol.for("react.portal"), s = /* @__PURE__ */ Symbol.for("react.fragment"), r = /* @__PURE__ */ Symbol.for("react.strict_mode"), o = /* @__PURE__ */ Symbol.for("react.profiler"), u = /* @__PURE__ */ Symbol.for("react.consumer"), c = /* @__PURE__ */ Symbol.for("react.context"), d = /* @__PURE__ */ Symbol.for("react.forward_ref"), p = /* @__PURE__ */ Symbol.for("react.suspense"), h = /* @__PURE__ */ Symbol.for("react.memo"), g = /* @__PURE__ */ Symbol.for("react.lazy"), y = /* @__PURE__ */ Symbol.for("react.activity"), x = Symbol.iterator;
  function T(_) {
    return _ === null || typeof _ != "object" ? null : (_ = x && _[x] || _["@@iterator"], typeof _ == "function" ? _ : null);
  }
  var S = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, A = Object.assign, C = {};
  function N(_, V, nt) {
    this.props = _, this.context = V, this.refs = C, this.updater = nt || S;
  }
  N.prototype.isReactComponent = {}, N.prototype.setState = function(_, V) {
    if (typeof _ != "object" && typeof _ != "function" && _ != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, _, V, "setState");
  }, N.prototype.forceUpdate = function(_) {
    this.updater.enqueueForceUpdate(this, _, "forceUpdate");
  };
  function R() {
  }
  R.prototype = N.prototype;
  function O(_, V, nt) {
    this.props = _, this.context = V, this.refs = C, this.updater = nt || S;
  }
  var k = O.prototype = new R();
  k.constructor = O, A(k, N.prototype), k.isPureReactComponent = !0;
  var H = Array.isArray;
  function G() {
  }
  var X = { H: null, A: null, T: null, S: null }, Y = Object.prototype.hasOwnProperty;
  function Z(_, V, nt) {
    var at = nt.ref;
    return {
      $$typeof: t,
      type: _,
      key: V,
      ref: at !== void 0 ? at : null,
      props: nt
    };
  }
  function J(_, V) {
    return Z(_.type, V, _.props);
  }
  function W(_) {
    return typeof _ == "object" && _ !== null && _.$$typeof === t;
  }
  function ut(_) {
    var V = { "=": "=0", ":": "=2" };
    return "$" + _.replace(/[=:]/g, function(nt) {
      return V[nt];
    });
  }
  var lt = /\/+/g;
  function dt(_, V) {
    return typeof _ == "object" && _ !== null && _.key != null ? ut("" + _.key) : V.toString(36);
  }
  function ot(_) {
    switch (_.status) {
      case "fulfilled":
        return _.value;
      case "rejected":
        throw _.reason;
      default:
        switch (typeof _.status == "string" ? _.then(G, G) : (_.status = "pending", _.then(
          function(V) {
            _.status === "pending" && (_.status = "fulfilled", _.value = V);
          },
          function(V) {
            _.status === "pending" && (_.status = "rejected", _.reason = V);
          }
        )), _.status) {
          case "fulfilled":
            return _.value;
          case "rejected":
            throw _.reason;
        }
    }
    throw _;
  }
  function D(_, V, nt, at, rt) {
    var st = typeof _;
    (st === "undefined" || st === "boolean") && (_ = null);
    var ft = !1;
    if (_ === null) ft = !0;
    else
      switch (st) {
        case "bigint":
        case "string":
        case "number":
          ft = !0;
          break;
        case "object":
          switch (_.$$typeof) {
            case t:
            case n:
              ft = !0;
              break;
            case g:
              return ft = _._init, D(
                ft(_._payload),
                V,
                nt,
                at,
                rt
              );
          }
      }
    if (ft)
      return rt = rt(_), ft = at === "" ? "." + dt(_, 0) : at, H(rt) ? (nt = "", ft != null && (nt = ft.replace(lt, "$&/") + "/"), D(rt, V, nt, "", function(ct) {
        return ct;
      })) : rt != null && (W(rt) && (rt = J(
        rt,
        nt + (rt.key == null || _ && _.key === rt.key ? "" : ("" + rt.key).replace(
          lt,
          "$&/"
        ) + "/") + ft
      )), V.push(rt)), 1;
    ft = 0;
    var Tt = at === "" ? "." : at + ":";
    if (H(_))
      for (var P = 0; P < _.length; P++)
        at = _[P], st = Tt + dt(at, P), ft += D(
          at,
          V,
          nt,
          st,
          rt
        );
    else if (P = T(_), typeof P == "function")
      for (_ = P.call(_), P = 0; !(at = _.next()).done; )
        at = at.value, st = Tt + dt(at, P++), ft += D(
          at,
          V,
          nt,
          st,
          rt
        );
    else if (st === "object") {
      if (typeof _.then == "function")
        return D(
          ot(_),
          V,
          nt,
          at,
          rt
        );
      throw V = String(_), Error(
        "Objects are not valid as a React child (found: " + (V === "[object Object]" ? "object with keys {" + Object.keys(_).join(", ") + "}" : V) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ft;
  }
  function q(_, V, nt) {
    if (_ == null) return _;
    var at = [], rt = 0;
    return D(_, at, "", "", function(st) {
      return V.call(nt, st, rt++);
    }), at;
  }
  function w(_) {
    if (_._status === -1) {
      var V = _._result;
      V = V(), V.then(
        function(nt) {
          (_._status === 0 || _._status === -1) && (_._status = 1, _._result = nt);
        },
        function(nt) {
          (_._status === 0 || _._status === -1) && (_._status = 2, _._result = nt);
        }
      ), _._status === -1 && (_._status = 0, _._result = V);
    }
    if (_._status === 1) return _._result.default;
    throw _._result;
  }
  var L = typeof reportError == "function" ? reportError : function(_) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var V = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof _ == "object" && _ !== null && typeof _.message == "string" ? String(_.message) : String(_),
        error: _
      });
      if (!window.dispatchEvent(V)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", _);
      return;
    }
    console.error(_);
  }, U = {
    map: q,
    forEach: function(_, V, nt) {
      q(
        _,
        function() {
          V.apply(this, arguments);
        },
        nt
      );
    },
    count: function(_) {
      var V = 0;
      return q(_, function() {
        V++;
      }), V;
    },
    toArray: function(_) {
      return q(_, function(V) {
        return V;
      }) || [];
    },
    only: function(_) {
      if (!W(_))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return _;
    }
  };
  return Rt.Activity = y, Rt.Children = U, Rt.Component = N, Rt.Fragment = s, Rt.Profiler = o, Rt.PureComponent = O, Rt.StrictMode = r, Rt.Suspense = p, Rt.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = X, Rt.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(_) {
      return X.H.useMemoCache(_);
    }
  }, Rt.cache = function(_) {
    return function() {
      return _.apply(null, arguments);
    };
  }, Rt.cacheSignal = function() {
    return null;
  }, Rt.cloneElement = function(_, V, nt) {
    if (_ == null)
      throw Error(
        "The argument must be a React element, but you passed " + _ + "."
      );
    var at = A({}, _.props), rt = _.key;
    if (V != null)
      for (st in V.key !== void 0 && (rt = "" + V.key), V)
        !Y.call(V, st) || st === "key" || st === "__self" || st === "__source" || st === "ref" && V.ref === void 0 || (at[st] = V[st]);
    var st = arguments.length - 2;
    if (st === 1) at.children = nt;
    else if (1 < st) {
      for (var ft = Array(st), Tt = 0; Tt < st; Tt++)
        ft[Tt] = arguments[Tt + 2];
      at.children = ft;
    }
    return Z(_.type, rt, at);
  }, Rt.createContext = function(_) {
    return _ = {
      $$typeof: c,
      _currentValue: _,
      _currentValue2: _,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, _.Provider = _, _.Consumer = {
      $$typeof: u,
      _context: _
    }, _;
  }, Rt.createElement = function(_, V, nt) {
    var at, rt = {}, st = null;
    if (V != null)
      for (at in V.key !== void 0 && (st = "" + V.key), V)
        Y.call(V, at) && at !== "key" && at !== "__self" && at !== "__source" && (rt[at] = V[at]);
    var ft = arguments.length - 2;
    if (ft === 1) rt.children = nt;
    else if (1 < ft) {
      for (var Tt = Array(ft), P = 0; P < ft; P++)
        Tt[P] = arguments[P + 2];
      rt.children = Tt;
    }
    if (_ && _.defaultProps)
      for (at in ft = _.defaultProps, ft)
        rt[at] === void 0 && (rt[at] = ft[at]);
    return Z(_, st, rt);
  }, Rt.createRef = function() {
    return { current: null };
  }, Rt.forwardRef = function(_) {
    return { $$typeof: d, render: _ };
  }, Rt.isValidElement = W, Rt.lazy = function(_) {
    return {
      $$typeof: g,
      _payload: { _status: -1, _result: _ },
      _init: w
    };
  }, Rt.memo = function(_, V) {
    return {
      $$typeof: h,
      type: _,
      compare: V === void 0 ? null : V
    };
  }, Rt.startTransition = function(_) {
    var V = X.T, nt = {};
    X.T = nt;
    try {
      var at = _(), rt = X.S;
      rt !== null && rt(nt, at), typeof at == "object" && at !== null && typeof at.then == "function" && at.then(G, L);
    } catch (st) {
      L(st);
    } finally {
      V !== null && nt.types !== null && (V.types = nt.types), X.T = V;
    }
  }, Rt.unstable_useCacheRefresh = function() {
    return X.H.useCacheRefresh();
  }, Rt.use = function(_) {
    return X.H.use(_);
  }, Rt.useActionState = function(_, V, nt) {
    return X.H.useActionState(_, V, nt);
  }, Rt.useCallback = function(_, V) {
    return X.H.useCallback(_, V);
  }, Rt.useContext = function(_) {
    return X.H.useContext(_);
  }, Rt.useDebugValue = function() {
  }, Rt.useDeferredValue = function(_, V) {
    return X.H.useDeferredValue(_, V);
  }, Rt.useEffect = function(_, V) {
    return X.H.useEffect(_, V);
  }, Rt.useEffectEvent = function(_) {
    return X.H.useEffectEvent(_);
  }, Rt.useId = function() {
    return X.H.useId();
  }, Rt.useImperativeHandle = function(_, V, nt) {
    return X.H.useImperativeHandle(_, V, nt);
  }, Rt.useInsertionEffect = function(_, V) {
    return X.H.useInsertionEffect(_, V);
  }, Rt.useLayoutEffect = function(_, V) {
    return X.H.useLayoutEffect(_, V);
  }, Rt.useMemo = function(_, V) {
    return X.H.useMemo(_, V);
  }, Rt.useOptimistic = function(_, V) {
    return X.H.useOptimistic(_, V);
  }, Rt.useReducer = function(_, V, nt) {
    return X.H.useReducer(_, V, nt);
  }, Rt.useRef = function(_) {
    return X.H.useRef(_);
  }, Rt.useState = function(_) {
    return X.H.useState(_);
  }, Rt.useSyncExternalStore = function(_, V, nt) {
    return X.H.useSyncExternalStore(
      _,
      V,
      nt
    );
  }, Rt.useTransition = function() {
    return X.H.useTransition();
  }, Rt.version = "19.2.8", Rt;
}
var m1;
function yp() {
  return m1 || (m1 = 1, yh.exports = Q_()), yh.exports;
}
var E = yp(), vh = { exports: {} }, Go = {}, xh = { exports: {} }, bh = {};
var p1;
function J_() {
  return p1 || (p1 = 1, (function(t) {
    function n(D, q) {
      var w = D.length;
      D.push(q);
      t: for (; 0 < w; ) {
        var L = w - 1 >>> 1, U = D[L];
        if (0 < o(U, q))
          D[L] = q, D[w] = U, w = L;
        else break t;
      }
    }
    function s(D) {
      return D.length === 0 ? null : D[0];
    }
    function r(D) {
      if (D.length === 0) return null;
      var q = D[0], w = D.pop();
      if (w !== q) {
        D[0] = w;
        t: for (var L = 0, U = D.length, _ = U >>> 1; L < _; ) {
          var V = 2 * (L + 1) - 1, nt = D[V], at = V + 1, rt = D[at];
          if (0 > o(nt, w))
            at < U && 0 > o(rt, nt) ? (D[L] = rt, D[at] = w, L = at) : (D[L] = nt, D[V] = w, L = V);
          else if (at < U && 0 > o(rt, w))
            D[L] = rt, D[at] = w, L = at;
          else break t;
        }
      }
      return q;
    }
    function o(D, q) {
      var w = D.sortIndex - q.sortIndex;
      return w !== 0 ? w : D.id - q.id;
    }
    if (t.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var u = performance;
      t.unstable_now = function() {
        return u.now();
      };
    } else {
      var c = Date, d = c.now();
      t.unstable_now = function() {
        return c.now() - d;
      };
    }
    var p = [], h = [], g = 1, y = null, x = 3, T = !1, S = !1, A = !1, C = !1, N = typeof setTimeout == "function" ? setTimeout : null, R = typeof clearTimeout == "function" ? clearTimeout : null, O = typeof setImmediate < "u" ? setImmediate : null;
    function k(D) {
      for (var q = s(h); q !== null; ) {
        if (q.callback === null) r(h);
        else if (q.startTime <= D)
          r(h), q.sortIndex = q.expirationTime, n(p, q);
        else break;
        q = s(h);
      }
    }
    function H(D) {
      if (A = !1, k(D), !S)
        if (s(p) !== null)
          S = !0, G || (G = !0, ut());
        else {
          var q = s(h);
          q !== null && ot(H, q.startTime - D);
        }
    }
    var G = !1, X = -1, Y = 5, Z = -1;
    function J() {
      return C ? !0 : !(t.unstable_now() - Z < Y);
    }
    function W() {
      if (C = !1, G) {
        var D = t.unstable_now();
        Z = D;
        var q = !0;
        try {
          t: {
            S = !1, A && (A = !1, R(X), X = -1), T = !0;
            var w = x;
            try {
              e: {
                for (k(D), y = s(p); y !== null && !(y.expirationTime > D && J()); ) {
                  var L = y.callback;
                  if (typeof L == "function") {
                    y.callback = null, x = y.priorityLevel;
                    var U = L(
                      y.expirationTime <= D
                    );
                    if (D = t.unstable_now(), typeof U == "function") {
                      y.callback = U, k(D), q = !0;
                      break e;
                    }
                    y === s(p) && r(p), k(D);
                  } else r(p);
                  y = s(p);
                }
                if (y !== null) q = !0;
                else {
                  var _ = s(h);
                  _ !== null && ot(
                    H,
                    _.startTime - D
                  ), q = !1;
                }
              }
              break t;
            } finally {
              y = null, x = w, T = !1;
            }
            q = void 0;
          }
        } finally {
          q ? ut() : G = !1;
        }
      }
    }
    var ut;
    if (typeof O == "function")
      ut = function() {
        O(W);
      };
    else if (typeof MessageChannel < "u") {
      var lt = new MessageChannel(), dt = lt.port2;
      lt.port1.onmessage = W, ut = function() {
        dt.postMessage(null);
      };
    } else
      ut = function() {
        N(W, 0);
      };
    function ot(D, q) {
      X = N(function() {
        D(t.unstable_now());
      }, q);
    }
    t.unstable_IdlePriority = 5, t.unstable_ImmediatePriority = 1, t.unstable_LowPriority = 4, t.unstable_NormalPriority = 3, t.unstable_Profiling = null, t.unstable_UserBlockingPriority = 2, t.unstable_cancelCallback = function(D) {
      D.callback = null;
    }, t.unstable_forceFrameRate = function(D) {
      0 > D || 125 < D ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : Y = 0 < D ? Math.floor(1e3 / D) : 5;
    }, t.unstable_getCurrentPriorityLevel = function() {
      return x;
    }, t.unstable_next = function(D) {
      switch (x) {
        case 1:
        case 2:
        case 3:
          var q = 3;
          break;
        default:
          q = x;
      }
      var w = x;
      x = q;
      try {
        return D();
      } finally {
        x = w;
      }
    }, t.unstable_requestPaint = function() {
      C = !0;
    }, t.unstable_runWithPriority = function(D, q) {
      switch (D) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          D = 3;
      }
      var w = x;
      x = D;
      try {
        return q();
      } finally {
        x = w;
      }
    }, t.unstable_scheduleCallback = function(D, q, w) {
      var L = t.unstable_now();
      switch (typeof w == "object" && w !== null ? (w = w.delay, w = typeof w == "number" && 0 < w ? L + w : L) : w = L, D) {
        case 1:
          var U = -1;
          break;
        case 2:
          U = 250;
          break;
        case 5:
          U = 1073741823;
          break;
        case 4:
          U = 1e4;
          break;
        default:
          U = 5e3;
      }
      return U = w + U, D = {
        id: g++,
        callback: q,
        priorityLevel: D,
        startTime: w,
        expirationTime: U,
        sortIndex: -1
      }, w > L ? (D.sortIndex = w, n(h, D), s(p) === null && D === s(h) && (A ? (R(X), X = -1) : A = !0, ot(H, w - L))) : (D.sortIndex = U, n(p, D), S || T || (S = !0, G || (G = !0, ut()))), D;
    }, t.unstable_shouldYield = J, t.unstable_wrapCallback = function(D) {
      var q = x;
      return function() {
        var w = x;
        x = q;
        try {
          return D.apply(this, arguments);
        } finally {
          x = w;
        }
      };
    };
  })(bh)), bh;
}
var g1;
function W_() {
  return g1 || (g1 = 1, xh.exports = J_()), xh.exports;
}
var Th = { exports: {} }, ln = {};
var y1;
function tE() {
  if (y1) return ln;
  y1 = 1;
  var t = yp();
  function n(p) {
    var h = "https://react.dev/errors/" + p;
    if (1 < arguments.length) {
      h += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var g = 2; g < arguments.length; g++)
        h += "&args[]=" + encodeURIComponent(arguments[g]);
    }
    return "Minified React error #" + p + "; visit " + h + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function s() {
  }
  var r = {
    d: {
      f: s,
      r: function() {
        throw Error(n(522));
      },
      D: s,
      C: s,
      L: s,
      m: s,
      X: s,
      S: s,
      M: s
    },
    p: 0,
    findDOMNode: null
  }, o = /* @__PURE__ */ Symbol.for("react.portal");
  function u(p, h, g) {
    var y = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: o,
      key: y == null ? null : "" + y,
      children: p,
      containerInfo: h,
      implementation: g
    };
  }
  var c = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function d(p, h) {
    if (p === "font") return "";
    if (typeof h == "string")
      return h === "use-credentials" ? h : "";
  }
  return ln.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, ln.createPortal = function(p, h) {
    var g = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!h || h.nodeType !== 1 && h.nodeType !== 9 && h.nodeType !== 11)
      throw Error(n(299));
    return u(p, h, null, g);
  }, ln.flushSync = function(p) {
    var h = c.T, g = r.p;
    try {
      if (c.T = null, r.p = 2, p) return p();
    } finally {
      c.T = h, r.p = g, r.d.f();
    }
  }, ln.preconnect = function(p, h) {
    typeof p == "string" && (h ? (h = h.crossOrigin, h = typeof h == "string" ? h === "use-credentials" ? h : "" : void 0) : h = null, r.d.C(p, h));
  }, ln.prefetchDNS = function(p) {
    typeof p == "string" && r.d.D(p);
  }, ln.preinit = function(p, h) {
    if (typeof p == "string" && h && typeof h.as == "string") {
      var g = h.as, y = d(g, h.crossOrigin), x = typeof h.integrity == "string" ? h.integrity : void 0, T = typeof h.fetchPriority == "string" ? h.fetchPriority : void 0;
      g === "style" ? r.d.S(
        p,
        typeof h.precedence == "string" ? h.precedence : void 0,
        {
          crossOrigin: y,
          integrity: x,
          fetchPriority: T
        }
      ) : g === "script" && r.d.X(p, {
        crossOrigin: y,
        integrity: x,
        fetchPriority: T,
        nonce: typeof h.nonce == "string" ? h.nonce : void 0
      });
    }
  }, ln.preinitModule = function(p, h) {
    if (typeof p == "string")
      if (typeof h == "object" && h !== null) {
        if (h.as == null || h.as === "script") {
          var g = d(
            h.as,
            h.crossOrigin
          );
          r.d.M(p, {
            crossOrigin: g,
            integrity: typeof h.integrity == "string" ? h.integrity : void 0,
            nonce: typeof h.nonce == "string" ? h.nonce : void 0
          });
        }
      } else h == null && r.d.M(p);
  }, ln.preload = function(p, h) {
    if (typeof p == "string" && typeof h == "object" && h !== null && typeof h.as == "string") {
      var g = h.as, y = d(g, h.crossOrigin);
      r.d.L(p, g, {
        crossOrigin: y,
        integrity: typeof h.integrity == "string" ? h.integrity : void 0,
        nonce: typeof h.nonce == "string" ? h.nonce : void 0,
        type: typeof h.type == "string" ? h.type : void 0,
        fetchPriority: typeof h.fetchPriority == "string" ? h.fetchPriority : void 0,
        referrerPolicy: typeof h.referrerPolicy == "string" ? h.referrerPolicy : void 0,
        imageSrcSet: typeof h.imageSrcSet == "string" ? h.imageSrcSet : void 0,
        imageSizes: typeof h.imageSizes == "string" ? h.imageSizes : void 0,
        media: typeof h.media == "string" ? h.media : void 0
      });
    }
  }, ln.preloadModule = function(p, h) {
    if (typeof p == "string")
      if (h) {
        var g = d(h.as, h.crossOrigin);
        r.d.m(p, {
          as: typeof h.as == "string" && h.as !== "script" ? h.as : void 0,
          crossOrigin: g,
          integrity: typeof h.integrity == "string" ? h.integrity : void 0
        });
      } else r.d.m(p);
  }, ln.requestFormReset = function(p) {
    r.d.r(p);
  }, ln.unstable_batchedUpdates = function(p, h) {
    return p(h);
  }, ln.useFormState = function(p, h, g) {
    return c.H.useFormState(p, h, g);
  }, ln.useFormStatus = function() {
    return c.H.useHostTransitionStatus();
  }, ln.version = "19.2.8", ln;
}
var v1;
function ET() {
  if (v1) return Th.exports;
  v1 = 1;
  function t() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(t);
      } catch (n) {
        console.error(n);
      }
  }
  return t(), Th.exports = tE(), Th.exports;
}
var x1;
function eE() {
  if (x1) return Go;
  x1 = 1;
  var t = W_(), n = yp(), s = ET();
  function r(e) {
    var i = "https://react.dev/errors/" + e;
    if (1 < arguments.length) {
      i += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        i += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + e + "; visit " + i + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function o(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function u(e) {
    var i = e, a = e;
    if (e.alternate) for (; i.return; ) i = i.return;
    else {
      e = i;
      do
        i = e, (i.flags & 4098) !== 0 && (a = i.return), e = i.return;
      while (e);
    }
    return i.tag === 3 ? a : null;
  }
  function c(e) {
    if (e.tag === 13) {
      var i = e.memoizedState;
      if (i === null && (e = e.alternate, e !== null && (i = e.memoizedState)), i !== null) return i.dehydrated;
    }
    return null;
  }
  function d(e) {
    if (e.tag === 31) {
      var i = e.memoizedState;
      if (i === null && (e = e.alternate, e !== null && (i = e.memoizedState)), i !== null) return i.dehydrated;
    }
    return null;
  }
  function p(e) {
    if (u(e) !== e)
      throw Error(r(188));
  }
  function h(e) {
    var i = e.alternate;
    if (!i) {
      if (i = u(e), i === null) throw Error(r(188));
      return i !== e ? null : e;
    }
    for (var a = e, l = i; ; ) {
      var f = a.return;
      if (f === null) break;
      var m = f.alternate;
      if (m === null) {
        if (l = f.return, l !== null) {
          a = l;
          continue;
        }
        break;
      }
      if (f.child === m.child) {
        for (m = f.child; m; ) {
          if (m === a) return p(f), e;
          if (m === l) return p(f), i;
          m = m.sibling;
        }
        throw Error(r(188));
      }
      if (a.return !== l.return) a = f, l = m;
      else {
        for (var b = !1, M = f.child; M; ) {
          if (M === a) {
            b = !0, a = f, l = m;
            break;
          }
          if (M === l) {
            b = !0, l = f, a = m;
            break;
          }
          M = M.sibling;
        }
        if (!b) {
          for (M = m.child; M; ) {
            if (M === a) {
              b = !0, a = m, l = f;
              break;
            }
            if (M === l) {
              b = !0, l = m, a = f;
              break;
            }
            M = M.sibling;
          }
          if (!b) throw Error(r(189));
        }
      }
      if (a.alternate !== l) throw Error(r(190));
    }
    if (a.tag !== 3) throw Error(r(188));
    return a.stateNode.current === a ? e : i;
  }
  function g(e) {
    var i = e.tag;
    if (i === 5 || i === 26 || i === 27 || i === 6) return e;
    for (e = e.child; e !== null; ) {
      if (i = g(e), i !== null) return i;
      e = e.sibling;
    }
    return null;
  }
  var y = Object.assign, x = /* @__PURE__ */ Symbol.for("react.element"), T = /* @__PURE__ */ Symbol.for("react.transitional.element"), S = /* @__PURE__ */ Symbol.for("react.portal"), A = /* @__PURE__ */ Symbol.for("react.fragment"), C = /* @__PURE__ */ Symbol.for("react.strict_mode"), N = /* @__PURE__ */ Symbol.for("react.profiler"), R = /* @__PURE__ */ Symbol.for("react.consumer"), O = /* @__PURE__ */ Symbol.for("react.context"), k = /* @__PURE__ */ Symbol.for("react.forward_ref"), H = /* @__PURE__ */ Symbol.for("react.suspense"), G = /* @__PURE__ */ Symbol.for("react.suspense_list"), X = /* @__PURE__ */ Symbol.for("react.memo"), Y = /* @__PURE__ */ Symbol.for("react.lazy"), Z = /* @__PURE__ */ Symbol.for("react.activity"), J = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), W = Symbol.iterator;
  function ut(e) {
    return e === null || typeof e != "object" ? null : (e = W && e[W] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var lt = /* @__PURE__ */ Symbol.for("react.client.reference");
  function dt(e) {
    if (e == null) return null;
    if (typeof e == "function")
      return e.$$typeof === lt ? null : e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case A:
        return "Fragment";
      case N:
        return "Profiler";
      case C:
        return "StrictMode";
      case H:
        return "Suspense";
      case G:
        return "SuspenseList";
      case Z:
        return "Activity";
    }
    if (typeof e == "object")
      switch (e.$$typeof) {
        case S:
          return "Portal";
        case O:
          return e.displayName || "Context";
        case R:
          return (e._context.displayName || "Context") + ".Consumer";
        case k:
          var i = e.render;
          return e = e.displayName, e || (e = i.displayName || i.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
        case X:
          return i = e.displayName || null, i !== null ? i : dt(e.type) || "Memo";
        case Y:
          i = e._payload, e = e._init;
          try {
            return dt(e(i));
          } catch {
          }
      }
    return null;
  }
  var ot = Array.isArray, D = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, q = s.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, w = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, L = [], U = -1;
  function _(e) {
    return { current: e };
  }
  function V(e) {
    0 > U || (e.current = L[U], L[U] = null, U--);
  }
  function nt(e, i) {
    U++, L[U] = e.current, e.current = i;
  }
  var at = _(null), rt = _(null), st = _(null), ft = _(null);
  function Tt(e, i) {
    switch (nt(st, i), nt(rt, e), nt(at, null), i.nodeType) {
      case 9:
      case 11:
        e = (e = i.documentElement) && (e = e.namespaceURI) ? zv(e) : 0;
        break;
      default:
        if (e = i.tagName, i = i.namespaceURI)
          i = zv(i), e = kv(i, e);
        else
          switch (e) {
            case "svg":
              e = 1;
              break;
            case "math":
              e = 2;
              break;
            default:
              e = 0;
          }
    }
    V(at), nt(at, e);
  }
  function P() {
    V(at), V(rt), V(st);
  }
  function ct(e) {
    e.memoizedState !== null && nt(ft, e);
    var i = at.current, a = kv(i, e.type);
    i !== a && (nt(rt, e), nt(at, a));
  }
  function ht(e) {
    rt.current === e && (V(at), V(rt)), ft.current === e && (V(ft), Uo._currentValue = w);
  }
  var I, gt;
  function mt(e) {
    if (I === void 0)
      try {
        throw Error();
      } catch (a) {
        var i = a.stack.trim().match(/\n( *(at )?)/);
        I = i && i[1] || "", gt = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + I + e + gt;
  }
  var Et = !1;
  function St(e, i) {
    if (!e || Et) return "";
    Et = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var l = {
        DetermineComponentFrameRoot: function() {
          try {
            if (i) {
              var it = function() {
                throw Error();
              };
              if (Object.defineProperty(it.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(it, []);
                } catch (Q) {
                  var K = Q;
                }
                Reflect.construct(e, [], it);
              } else {
                try {
                  it.call();
                } catch (Q) {
                  K = Q;
                }
                e.call(it.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (Q) {
                K = Q;
              }
              (it = e()) && typeof it.catch == "function" && it.catch(function() {
              });
            }
          } catch (Q) {
            if (Q && K && typeof Q.stack == "string")
              return [Q.stack, K.stack];
          }
          return [null, null];
        }
      };
      l.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var f = Object.getOwnPropertyDescriptor(
        l.DetermineComponentFrameRoot,
        "name"
      );
      f && f.configurable && Object.defineProperty(
        l.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var m = l.DetermineComponentFrameRoot(), b = m[0], M = m[1];
      if (b && M) {
        var j = b.split(`
`), $ = M.split(`
`);
        for (f = l = 0; l < j.length && !j[l].includes("DetermineComponentFrameRoot"); )
          l++;
        for (; f < $.length && !$[f].includes(
          "DetermineComponentFrameRoot"
        ); )
          f++;
        if (l === j.length || f === $.length)
          for (l = j.length - 1, f = $.length - 1; 1 <= l && 0 <= f && j[l] !== $[f]; )
            f--;
        for (; 1 <= l && 0 <= f; l--, f--)
          if (j[l] !== $[f]) {
            if (l !== 1 || f !== 1)
              do
                if (l--, f--, 0 > f || j[l] !== $[f]) {
                  var tt = `
` + j[l].replace(" at new ", " at ");
                  return e.displayName && tt.includes("<anonymous>") && (tt = tt.replace("<anonymous>", e.displayName)), tt;
                }
              while (1 <= l && 0 <= f);
            break;
          }
      }
    } finally {
      Et = !1, Error.prepareStackTrace = a;
    }
    return (a = e ? e.displayName || e.name : "") ? mt(a) : "";
  }
  function wt(e, i) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return mt(e.type);
      case 16:
        return mt("Lazy");
      case 13:
        return e.child !== i && i !== null ? mt("Suspense Fallback") : mt("Suspense");
      case 19:
        return mt("SuspenseList");
      case 0:
      case 15:
        return St(e.type, !1);
      case 11:
        return St(e.type.render, !1);
      case 1:
        return St(e.type, !0);
      case 31:
        return mt("Activity");
      default:
        return "";
    }
  }
  function Kt(e) {
    try {
      var i = "", a = null;
      do
        i += wt(e, a), a = e, e = e.return;
      while (e);
      return i;
    } catch (l) {
      return `
Error generating stack: ` + l.message + `
` + l.stack;
    }
  }
  var Ct = Object.prototype.hasOwnProperty, Qt = t.unstable_scheduleCallback, Jt = t.unstable_cancelCallback, ge = t.unstable_shouldYield, Dt = t.unstable_requestPaint, jt = t.unstable_now, Ht = t.unstable_getCurrentPriorityLevel, Gt = t.unstable_ImmediatePriority, zt = t.unstable_UserBlockingPriority, ye = t.unstable_NormalPriority, me = t.unstable_LowPriority, yn = t.unstable_IdlePriority, rn = t.log, _n = t.unstable_setDisableYieldValue, on = null, Me = null;
  function Ke(e) {
    if (typeof rn == "function" && _n(e), Me && typeof Me.setStrictMode == "function")
      try {
        Me.setStrictMode(on, e);
      } catch {
      }
  }
  var Ye = Math.clz32 ? Math.clz32 : ts, Da = Math.log, Gs = Math.LN2;
  function ts(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (Da(e) / Gs | 0) | 0;
  }
  var es = 256, je = 262144, fi = 4194304;
  function fn(e) {
    var i = e & 42;
    if (i !== 0) return i;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return e & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function ns(e, i, a) {
    var l = e.pendingLanes;
    if (l === 0) return 0;
    var f = 0, m = e.suspendedLanes, b = e.pingedLanes;
    e = e.warmLanes;
    var M = l & 134217727;
    return M !== 0 ? (l = M & ~m, l !== 0 ? f = fn(l) : (b &= M, b !== 0 ? f = fn(b) : a || (a = M & ~e, a !== 0 && (f = fn(a))))) : (M = l & ~m, M !== 0 ? f = fn(M) : b !== 0 ? f = fn(b) : a || (a = l & ~e, a !== 0 && (f = fn(a)))), f === 0 ? 0 : i !== 0 && i !== f && (i & m) === 0 && (m = f & -f, a = i & -i, m >= a || m === 32 && (a & 4194048) !== 0) ? i : f;
  }
  function kn(e, i) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & i) === 0;
  }
  function Nt(e, i) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return i + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return i + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Yt() {
    var e = fi;
    return fi <<= 1, (fi & 62914560) === 0 && (fi = 4194304), e;
  }
  function Ot(e) {
    for (var i = [], a = 0; 31 > a; a++) i.push(e);
    return i;
  }
  function oe(e, i) {
    e.pendingLanes |= i, i !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
  }
  function Vt(e, i, a, l, f, m) {
    var b = e.pendingLanes;
    e.pendingLanes = a, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= a, e.entangledLanes &= a, e.errorRecoveryDisabledLanes &= a, e.shellSuspendCounter = 0;
    var M = e.entanglements, j = e.expirationTimes, $ = e.hiddenUpdates;
    for (a = b & ~a; 0 < a; ) {
      var tt = 31 - Ye(a), it = 1 << tt;
      M[tt] = 0, j[tt] = -1;
      var K = $[tt];
      if (K !== null)
        for ($[tt] = null, tt = 0; tt < K.length; tt++) {
          var Q = K[tt];
          Q !== null && (Q.lane &= -536870913);
        }
      a &= ~it;
    }
    l !== 0 && Ge(e, l, 0), m !== 0 && f === 0 && e.tag !== 0 && (e.suspendedLanes |= m & ~(b & ~i));
  }
  function Ge(e, i, a) {
    e.pendingLanes |= i, e.suspendedLanes &= ~i;
    var l = 31 - Ye(i);
    e.entangledLanes |= i, e.entanglements[l] = e.entanglements[l] | 1073741824 | a & 261930;
  }
  function sf(e, i) {
    var a = e.entangledLanes |= i;
    for (e = e.entanglements; a; ) {
      var l = 31 - Ye(a), f = 1 << l;
      f & i | e[l] & i && (e[l] |= i), a &= ~f;
    }
  }
  function Zr(e, i) {
    var a = i & -i;
    return a = (a & 42) !== 0 ? 1 : af(a), (a & (e.suspendedLanes | i)) !== 0 ? 0 : a;
  }
  function af(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function rf(e) {
    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function x0() {
    var e = q.p;
    return e !== 0 ? e : (e = window.event, e === void 0 ? 32 : s1(e.type));
  }
  function b0(e, i) {
    var a = q.p;
    try {
      return q.p = e, i();
    } finally {
      q.p = a;
    }
  }
  var is = Math.random().toString(36).slice(2), Ze = "__reactFiber$" + is, vn = "__reactProps$" + is, ja = "__reactContainer$" + is, of = "__reactEvents$" + is, VA = "__reactListeners$" + is, BA = "__reactHandles$" + is, T0 = "__reactResources$" + is, Qr = "__reactMarker$" + is;
  function lf(e) {
    delete e[Ze], delete e[vn], delete e[of], delete e[VA], delete e[BA];
  }
  function Na(e) {
    var i = e[Ze];
    if (i) return i;
    for (var a = e.parentNode; a; ) {
      if (i = a[ja] || a[Ze]) {
        if (a = i.alternate, i.child !== null || a !== null && a.child !== null)
          for (e = Gv(e); e !== null; ) {
            if (a = e[Ze]) return a;
            e = Gv(e);
          }
        return i;
      }
      e = a, a = e.parentNode;
    }
    return null;
  }
  function Ra(e) {
    if (e = e[Ze] || e[ja]) {
      var i = e.tag;
      if (i === 5 || i === 6 || i === 13 || i === 31 || i === 26 || i === 27 || i === 3)
        return e;
    }
    return null;
  }
  function Jr(e) {
    var i = e.tag;
    if (i === 5 || i === 26 || i === 27 || i === 6) return e.stateNode;
    throw Error(r(33));
  }
  function Oa(e) {
    var i = e[T0];
    return i || (i = e[T0] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), i;
  }
  function qe(e) {
    e[Qr] = !0;
  }
  var S0 = /* @__PURE__ */ new Set(), M0 = {};
  function qs(e, i) {
    za(e, i), za(e + "Capture", i);
  }
  function za(e, i) {
    for (M0[e] = i, e = 0; e < i.length; e++)
      S0.add(i[e]);
  }
  var HA = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), A0 = {}, C0 = {};
  function YA(e) {
    return Ct.call(C0, e) ? !0 : Ct.call(A0, e) ? !1 : HA.test(e) ? C0[e] = !0 : (A0[e] = !0, !1);
  }
  function Al(e, i, a) {
    if (YA(i))
      if (a === null) e.removeAttribute(i);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            e.removeAttribute(i);
            return;
          case "boolean":
            var l = i.toLowerCase().slice(0, 5);
            if (l !== "data-" && l !== "aria-") {
              e.removeAttribute(i);
              return;
            }
        }
        e.setAttribute(i, "" + a);
      }
  }
  function Cl(e, i, a) {
    if (a === null) e.removeAttribute(i);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(i);
          return;
      }
      e.setAttribute(i, "" + a);
    }
  }
  function Ci(e, i, a, l) {
    if (l === null) e.removeAttribute(a);
    else {
      switch (typeof l) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(a);
          return;
      }
      e.setAttributeNS(i, a, "" + l);
    }
  }
  function Ln(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function _0(e) {
    var i = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (i === "checkbox" || i === "radio");
  }
  function GA(e, i, a) {
    var l = Object.getOwnPropertyDescriptor(
      e.constructor.prototype,
      i
    );
    if (!e.hasOwnProperty(i) && typeof l < "u" && typeof l.get == "function" && typeof l.set == "function") {
      var f = l.get, m = l.set;
      return Object.defineProperty(e, i, {
        configurable: !0,
        get: function() {
          return f.call(this);
        },
        set: function(b) {
          a = "" + b, m.call(this, b);
        }
      }), Object.defineProperty(e, i, {
        enumerable: l.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(b) {
          a = "" + b;
        },
        stopTracking: function() {
          e._valueTracker = null, delete e[i];
        }
      };
    }
  }
  function uf(e) {
    if (!e._valueTracker) {
      var i = _0(e) ? "checked" : "value";
      e._valueTracker = GA(
        e,
        i,
        "" + e[i]
      );
    }
  }
  function E0(e) {
    if (!e) return !1;
    var i = e._valueTracker;
    if (!i) return !0;
    var a = i.getValue(), l = "";
    return e && (l = _0(e) ? e.checked ? "true" : "false" : e.value), e = l, e !== a ? (i.setValue(e), !0) : !1;
  }
  function _l(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var qA = /[\n"\\]/g;
  function Un(e) {
    return e.replace(
      qA,
      function(i) {
        return "\\" + i.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function cf(e, i, a, l, f, m, b, M) {
    e.name = "", b != null && typeof b != "function" && typeof b != "symbol" && typeof b != "boolean" ? e.type = b : e.removeAttribute("type"), i != null ? b === "number" ? (i === 0 && e.value === "" || e.value != i) && (e.value = "" + Ln(i)) : e.value !== "" + Ln(i) && (e.value = "" + Ln(i)) : b !== "submit" && b !== "reset" || e.removeAttribute("value"), i != null ? ff(e, b, Ln(i)) : a != null ? ff(e, b, Ln(a)) : l != null && e.removeAttribute("value"), f == null && m != null && (e.defaultChecked = !!m), f != null && (e.checked = f && typeof f != "function" && typeof f != "symbol"), M != null && typeof M != "function" && typeof M != "symbol" && typeof M != "boolean" ? e.name = "" + Ln(M) : e.removeAttribute("name");
  }
  function w0(e, i, a, l, f, m, b, M) {
    if (m != null && typeof m != "function" && typeof m != "symbol" && typeof m != "boolean" && (e.type = m), i != null || a != null) {
      if (!(m !== "submit" && m !== "reset" || i != null)) {
        uf(e);
        return;
      }
      a = a != null ? "" + Ln(a) : "", i = i != null ? "" + Ln(i) : a, M || i === e.value || (e.value = i), e.defaultValue = i;
    }
    l = l ?? f, l = typeof l != "function" && typeof l != "symbol" && !!l, e.checked = M ? e.checked : !!l, e.defaultChecked = !!l, b != null && typeof b != "function" && typeof b != "symbol" && typeof b != "boolean" && (e.name = b), uf(e);
  }
  function ff(e, i, a) {
    i === "number" && _l(e.ownerDocument) === e || e.defaultValue === "" + a || (e.defaultValue = "" + a);
  }
  function ka(e, i, a, l) {
    if (e = e.options, i) {
      i = {};
      for (var f = 0; f < a.length; f++)
        i["$" + a[f]] = !0;
      for (a = 0; a < e.length; a++)
        f = i.hasOwnProperty("$" + e[a].value), e[a].selected !== f && (e[a].selected = f), f && l && (e[a].defaultSelected = !0);
    } else {
      for (a = "" + Ln(a), i = null, f = 0; f < e.length; f++) {
        if (e[f].value === a) {
          e[f].selected = !0, l && (e[f].defaultSelected = !0);
          return;
        }
        i !== null || e[f].disabled || (i = e[f]);
      }
      i !== null && (i.selected = !0);
    }
  }
  function D0(e, i, a) {
    if (i != null && (i = "" + Ln(i), i !== e.value && (e.value = i), a == null)) {
      e.defaultValue !== i && (e.defaultValue = i);
      return;
    }
    e.defaultValue = a != null ? "" + Ln(a) : "";
  }
  function j0(e, i, a, l) {
    if (i == null) {
      if (l != null) {
        if (a != null) throw Error(r(92));
        if (ot(l)) {
          if (1 < l.length) throw Error(r(93));
          l = l[0];
        }
        a = l;
      }
      a == null && (a = ""), i = a;
    }
    a = Ln(i), e.defaultValue = a, l = e.textContent, l === a && l !== "" && l !== null && (e.value = l), uf(e);
  }
  function La(e, i) {
    if (i) {
      var a = e.firstChild;
      if (a && a === e.lastChild && a.nodeType === 3) {
        a.nodeValue = i;
        return;
      }
    }
    e.textContent = i;
  }
  var XA = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function N0(e, i, a) {
    var l = i.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? l ? e.setProperty(i, "") : i === "float" ? e.cssFloat = "" : e[i] = "" : l ? e.setProperty(i, a) : typeof a != "number" || a === 0 || XA.has(i) ? i === "float" ? e.cssFloat = a : e[i] = ("" + a).trim() : e[i] = a + "px";
  }
  function R0(e, i, a) {
    if (i != null && typeof i != "object")
      throw Error(r(62));
    if (e = e.style, a != null) {
      for (var l in a)
        !a.hasOwnProperty(l) || i != null && i.hasOwnProperty(l) || (l.indexOf("--") === 0 ? e.setProperty(l, "") : l === "float" ? e.cssFloat = "" : e[l] = "");
      for (var f in i)
        l = i[f], i.hasOwnProperty(f) && a[f] !== l && N0(e, f, l);
    } else
      for (var m in i)
        i.hasOwnProperty(m) && N0(e, m, i[m]);
  }
  function df(e) {
    if (e.indexOf("-") === -1) return !1;
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var PA = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), IA = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function El(e) {
    return IA.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
  }
  function _i() {
  }
  var hf = null;
  function mf(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Ua = null, Va = null;
  function O0(e) {
    var i = Ra(e);
    if (i && (e = i.stateNode)) {
      var a = e[vn] || null;
      t: switch (e = i.stateNode, i.type) {
        case "input":
          if (cf(
            e,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), i = a.name, a.type === "radio" && i != null) {
            for (a = e; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + Un(
                "" + i
              ) + '"][type="radio"]'
            ), i = 0; i < a.length; i++) {
              var l = a[i];
              if (l !== e && l.form === e.form) {
                var f = l[vn] || null;
                if (!f) throw Error(r(90));
                cf(
                  l,
                  f.value,
                  f.defaultValue,
                  f.defaultValue,
                  f.checked,
                  f.defaultChecked,
                  f.type,
                  f.name
                );
              }
            }
            for (i = 0; i < a.length; i++)
              l = a[i], l.form === e.form && E0(l);
          }
          break t;
        case "textarea":
          D0(e, a.value, a.defaultValue);
          break t;
        case "select":
          i = a.value, i != null && ka(e, !!a.multiple, i, !1);
      }
    }
  }
  var pf = !1;
  function z0(e, i, a) {
    if (pf) return e(i, a);
    pf = !0;
    try {
      var l = e(i);
      return l;
    } finally {
      if (pf = !1, (Ua !== null || Va !== null) && (mu(), Ua && (i = Ua, e = Va, Va = Ua = null, O0(i), e)))
        for (i = 0; i < e.length; i++) O0(e[i]);
    }
  }
  function Wr(e, i) {
    var a = e.stateNode;
    if (a === null) return null;
    var l = a[vn] || null;
    if (l === null) return null;
    a = l[i];
    t: switch (i) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (l = !l.disabled) || (e = e.type, l = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !l;
        break t;
      default:
        e = !1;
    }
    if (e) return null;
    if (a && typeof a != "function")
      throw Error(
        r(231, i, typeof a)
      );
    return a;
  }
  var Ei = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), gf = !1;
  if (Ei)
    try {
      var to = {};
      Object.defineProperty(to, "passive", {
        get: function() {
          gf = !0;
        }
      }), window.addEventListener("test", to, to), window.removeEventListener("test", to, to);
    } catch {
      gf = !1;
    }
  var ss = null, yf = null, wl = null;
  function k0() {
    if (wl) return wl;
    var e, i = yf, a = i.length, l, f = "value" in ss ? ss.value : ss.textContent, m = f.length;
    for (e = 0; e < a && i[e] === f[e]; e++) ;
    var b = a - e;
    for (l = 1; l <= b && i[a - l] === f[m - l]; l++) ;
    return wl = f.slice(e, 1 < l ? 1 - l : void 0);
  }
  function Dl(e) {
    var i = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && i === 13 && (e = 13)) : e = i, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function jl() {
    return !0;
  }
  function L0() {
    return !1;
  }
  function xn(e) {
    function i(a, l, f, m, b) {
      this._reactName = a, this._targetInst = f, this.type = l, this.nativeEvent = m, this.target = b, this.currentTarget = null;
      for (var M in e)
        e.hasOwnProperty(M) && (a = e[M], this[M] = a ? a(m) : m[M]);
      return this.isDefaultPrevented = (m.defaultPrevented != null ? m.defaultPrevented : m.returnValue === !1) ? jl : L0, this.isPropagationStopped = L0, this;
    }
    return y(i.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = jl);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = jl);
      },
      persist: function() {
      },
      isPersistent: jl
    }), i;
  }
  var Xs = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Nl = xn(Xs), eo = y({}, Xs, { view: 0, detail: 0 }), FA = xn(eo), vf, xf, no, Rl = y({}, eo, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Tf,
    button: 0,
    buttons: 0,
    relatedTarget: function(e) {
      return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
    },
    movementX: function(e) {
      return "movementX" in e ? e.movementX : (e !== no && (no && e.type === "mousemove" ? (vf = e.screenX - no.screenX, xf = e.screenY - no.screenY) : xf = vf = 0, no = e), vf);
    },
    movementY: function(e) {
      return "movementY" in e ? e.movementY : xf;
    }
  }), U0 = xn(Rl), $A = y({}, Rl, { dataTransfer: 0 }), KA = xn($A), ZA = y({}, eo, { relatedTarget: 0 }), bf = xn(ZA), QA = y({}, Xs, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), JA = xn(QA), WA = y({}, Xs, {
    clipboardData: function(e) {
      return "clipboardData" in e ? e.clipboardData : window.clipboardData;
    }
  }), tC = xn(WA), eC = y({}, Xs, { data: 0 }), V0 = xn(eC), nC = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, iC = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, sC = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function aC(e) {
    var i = this.nativeEvent;
    return i.getModifierState ? i.getModifierState(e) : (e = sC[e]) ? !!i[e] : !1;
  }
  function Tf() {
    return aC;
  }
  var rC = y({}, eo, {
    key: function(e) {
      if (e.key) {
        var i = nC[e.key] || e.key;
        if (i !== "Unidentified") return i;
      }
      return e.type === "keypress" ? (e = Dl(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? iC[e.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Tf,
    charCode: function(e) {
      return e.type === "keypress" ? Dl(e) : 0;
    },
    keyCode: function(e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function(e) {
      return e.type === "keypress" ? Dl(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    }
  }), oC = xn(rC), lC = y({}, Rl, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), B0 = xn(lC), uC = y({}, eo, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Tf
  }), cC = xn(uC), fC = y({}, Xs, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), dC = xn(fC), hC = y({}, Rl, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), mC = xn(hC), pC = y({}, Xs, {
    newState: 0,
    oldState: 0
  }), gC = xn(pC), yC = [9, 13, 27, 32], Sf = Ei && "CompositionEvent" in window, io = null;
  Ei && "documentMode" in document && (io = document.documentMode);
  var vC = Ei && "TextEvent" in window && !io, H0 = Ei && (!Sf || io && 8 < io && 11 >= io), Y0 = " ", G0 = !1;
  function q0(e, i) {
    switch (e) {
      case "keyup":
        return yC.indexOf(i.keyCode) !== -1;
      case "keydown":
        return i.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function X0(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var Ba = !1;
  function xC(e, i) {
    switch (e) {
      case "compositionend":
        return X0(i);
      case "keypress":
        return i.which !== 32 ? null : (G0 = !0, Y0);
      case "textInput":
        return e = i.data, e === Y0 && G0 ? null : e;
      default:
        return null;
    }
  }
  function bC(e, i) {
    if (Ba)
      return e === "compositionend" || !Sf && q0(e, i) ? (e = k0(), wl = yf = ss = null, Ba = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(i.ctrlKey || i.altKey || i.metaKey) || i.ctrlKey && i.altKey) {
          if (i.char && 1 < i.char.length)
            return i.char;
          if (i.which) return String.fromCharCode(i.which);
        }
        return null;
      case "compositionend":
        return H0 && i.locale !== "ko" ? null : i.data;
      default:
        return null;
    }
  }
  var TC = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function P0(e) {
    var i = e && e.nodeName && e.nodeName.toLowerCase();
    return i === "input" ? !!TC[e.type] : i === "textarea";
  }
  function I0(e, i, a, l) {
    Ua ? Va ? Va.push(l) : Va = [l] : Ua = l, i = Tu(i, "onChange"), 0 < i.length && (a = new Nl(
      "onChange",
      "change",
      null,
      a,
      l
    ), e.push({ event: a, listeners: i }));
  }
  var so = null, ao = null;
  function SC(e) {
    wv(e, 0);
  }
  function Ol(e) {
    var i = Jr(e);
    if (E0(i)) return e;
  }
  function F0(e, i) {
    if (e === "change") return i;
  }
  var $0 = !1;
  if (Ei) {
    var Mf;
    if (Ei) {
      var Af = "oninput" in document;
      if (!Af) {
        var K0 = document.createElement("div");
        K0.setAttribute("oninput", "return;"), Af = typeof K0.oninput == "function";
      }
      Mf = Af;
    } else Mf = !1;
    $0 = Mf && (!document.documentMode || 9 < document.documentMode);
  }
  function Z0() {
    so && (so.detachEvent("onpropertychange", Q0), ao = so = null);
  }
  function Q0(e) {
    if (e.propertyName === "value" && Ol(ao)) {
      var i = [];
      I0(
        i,
        ao,
        e,
        mf(e)
      ), z0(SC, i);
    }
  }
  function MC(e, i, a) {
    e === "focusin" ? (Z0(), so = i, ao = a, so.attachEvent("onpropertychange", Q0)) : e === "focusout" && Z0();
  }
  function AC(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown")
      return Ol(ao);
  }
  function CC(e, i) {
    if (e === "click") return Ol(i);
  }
  function _C(e, i) {
    if (e === "input" || e === "change")
      return Ol(i);
  }
  function EC(e, i) {
    return e === i && (e !== 0 || 1 / e === 1 / i) || e !== e && i !== i;
  }
  var En = typeof Object.is == "function" ? Object.is : EC;
  function ro(e, i) {
    if (En(e, i)) return !0;
    if (typeof e != "object" || e === null || typeof i != "object" || i === null)
      return !1;
    var a = Object.keys(e), l = Object.keys(i);
    if (a.length !== l.length) return !1;
    for (l = 0; l < a.length; l++) {
      var f = a[l];
      if (!Ct.call(i, f) || !En(e[f], i[f]))
        return !1;
    }
    return !0;
  }
  function J0(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function W0(e, i) {
    var a = J0(e);
    e = 0;
    for (var l; a; ) {
      if (a.nodeType === 3) {
        if (l = e + a.textContent.length, e <= i && l >= i)
          return { node: a, offset: i - e };
        e = l;
      }
      t: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break t;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = J0(a);
    }
  }
  function tg(e, i) {
    return e && i ? e === i ? !0 : e && e.nodeType === 3 ? !1 : i && i.nodeType === 3 ? tg(e, i.parentNode) : "contains" in e ? e.contains(i) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(i) & 16) : !1 : !1;
  }
  function eg(e) {
    e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
    for (var i = _l(e.document); i instanceof e.HTMLIFrameElement; ) {
      try {
        var a = typeof i.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) e = i.contentWindow;
      else break;
      i = _l(e.document);
    }
    return i;
  }
  function Cf(e) {
    var i = e && e.nodeName && e.nodeName.toLowerCase();
    return i && (i === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || i === "textarea" || e.contentEditable === "true");
  }
  var wC = Ei && "documentMode" in document && 11 >= document.documentMode, Ha = null, _f = null, oo = null, Ef = !1;
  function ng(e, i, a) {
    var l = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Ef || Ha == null || Ha !== _l(l) || (l = Ha, "selectionStart" in l && Cf(l) ? l = { start: l.selectionStart, end: l.selectionEnd } : (l = (l.ownerDocument && l.ownerDocument.defaultView || window).getSelection(), l = {
      anchorNode: l.anchorNode,
      anchorOffset: l.anchorOffset,
      focusNode: l.focusNode,
      focusOffset: l.focusOffset
    }), oo && ro(oo, l) || (oo = l, l = Tu(_f, "onSelect"), 0 < l.length && (i = new Nl(
      "onSelect",
      "select",
      null,
      i,
      a
    ), e.push({ event: i, listeners: l }), i.target = Ha)));
  }
  function Ps(e, i) {
    var a = {};
    return a[e.toLowerCase()] = i.toLowerCase(), a["Webkit" + e] = "webkit" + i, a["Moz" + e] = "moz" + i, a;
  }
  var Ya = {
    animationend: Ps("Animation", "AnimationEnd"),
    animationiteration: Ps("Animation", "AnimationIteration"),
    animationstart: Ps("Animation", "AnimationStart"),
    transitionrun: Ps("Transition", "TransitionRun"),
    transitionstart: Ps("Transition", "TransitionStart"),
    transitioncancel: Ps("Transition", "TransitionCancel"),
    transitionend: Ps("Transition", "TransitionEnd")
  }, wf = {}, ig = {};
  Ei && (ig = document.createElement("div").style, "AnimationEvent" in window || (delete Ya.animationend.animation, delete Ya.animationiteration.animation, delete Ya.animationstart.animation), "TransitionEvent" in window || delete Ya.transitionend.transition);
  function Is(e) {
    if (wf[e]) return wf[e];
    if (!Ya[e]) return e;
    var i = Ya[e], a;
    for (a in i)
      if (i.hasOwnProperty(a) && a in ig)
        return wf[e] = i[a];
    return e;
  }
  var sg = Is("animationend"), ag = Is("animationiteration"), rg = Is("animationstart"), DC = Is("transitionrun"), jC = Is("transitionstart"), NC = Is("transitioncancel"), og = Is("transitionend"), lg = /* @__PURE__ */ new Map(), Df = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Df.push("scrollEnd");
  function ti(e, i) {
    lg.set(e, i), qs(i, [e]);
  }
  var zl = typeof reportError == "function" ? reportError : function(e) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var i = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
        error: e
      });
      if (!window.dispatchEvent(i)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", e);
      return;
    }
    console.error(e);
  }, Vn = [], Ga = 0, jf = 0;
  function kl() {
    for (var e = Ga, i = jf = Ga = 0; i < e; ) {
      var a = Vn[i];
      Vn[i++] = null;
      var l = Vn[i];
      Vn[i++] = null;
      var f = Vn[i];
      Vn[i++] = null;
      var m = Vn[i];
      if (Vn[i++] = null, l !== null && f !== null) {
        var b = l.pending;
        b === null ? f.next = f : (f.next = b.next, b.next = f), l.pending = f;
      }
      m !== 0 && ug(a, f, m);
    }
  }
  function Ll(e, i, a, l) {
    Vn[Ga++] = e, Vn[Ga++] = i, Vn[Ga++] = a, Vn[Ga++] = l, jf |= l, e.lanes |= l, e = e.alternate, e !== null && (e.lanes |= l);
  }
  function Nf(e, i, a, l) {
    return Ll(e, i, a, l), Ul(e);
  }
  function Fs(e, i) {
    return Ll(e, null, null, i), Ul(e);
  }
  function ug(e, i, a) {
    e.lanes |= a;
    var l = e.alternate;
    l !== null && (l.lanes |= a);
    for (var f = !1, m = e.return; m !== null; )
      m.childLanes |= a, l = m.alternate, l !== null && (l.childLanes |= a), m.tag === 22 && (e = m.stateNode, e === null || e._visibility & 1 || (f = !0)), e = m, m = m.return;
    return e.tag === 3 ? (m = e.stateNode, f && i !== null && (f = 31 - Ye(a), e = m.hiddenUpdates, l = e[f], l === null ? e[f] = [i] : l.push(i), i.lane = a | 536870912), m) : null;
  }
  function Ul(e) {
    if (50 < jo)
      throw jo = 0, Hd = null, Error(r(185));
    for (var i = e.return; i !== null; )
      e = i, i = e.return;
    return e.tag === 3 ? e.stateNode : null;
  }
  var qa = {};
  function RC(e, i, a, l) {
    this.tag = e, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = i, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = l, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function wn(e, i, a, l) {
    return new RC(e, i, a, l);
  }
  function Rf(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function wi(e, i) {
    var a = e.alternate;
    return a === null ? (a = wn(
      e.tag,
      i,
      e.key,
      e.mode
    ), a.elementType = e.elementType, a.type = e.type, a.stateNode = e.stateNode, a.alternate = e, e.alternate = a) : (a.pendingProps = i, a.type = e.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = e.flags & 65011712, a.childLanes = e.childLanes, a.lanes = e.lanes, a.child = e.child, a.memoizedProps = e.memoizedProps, a.memoizedState = e.memoizedState, a.updateQueue = e.updateQueue, i = e.dependencies, a.dependencies = i === null ? null : { lanes: i.lanes, firstContext: i.firstContext }, a.sibling = e.sibling, a.index = e.index, a.ref = e.ref, a.refCleanup = e.refCleanup, a;
  }
  function cg(e, i) {
    e.flags &= 65011714;
    var a = e.alternate;
    return a === null ? (e.childLanes = 0, e.lanes = i, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = a.childLanes, e.lanes = a.lanes, e.child = a.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = a.memoizedProps, e.memoizedState = a.memoizedState, e.updateQueue = a.updateQueue, e.type = a.type, i = a.dependencies, e.dependencies = i === null ? null : {
      lanes: i.lanes,
      firstContext: i.firstContext
    }), e;
  }
  function Vl(e, i, a, l, f, m) {
    var b = 0;
    if (l = e, typeof e == "function") Rf(e) && (b = 1);
    else if (typeof e == "string")
      b = U_(
        e,
        a,
        at.current
      ) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
    else
      t: switch (e) {
        case Z:
          return e = wn(31, a, i, f), e.elementType = Z, e.lanes = m, e;
        case A:
          return $s(a.children, f, m, i);
        case C:
          b = 8, f |= 24;
          break;
        case N:
          return e = wn(12, a, i, f | 2), e.elementType = N, e.lanes = m, e;
        case H:
          return e = wn(13, a, i, f), e.elementType = H, e.lanes = m, e;
        case G:
          return e = wn(19, a, i, f), e.elementType = G, e.lanes = m, e;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case O:
                b = 10;
                break t;
              case R:
                b = 9;
                break t;
              case k:
                b = 11;
                break t;
              case X:
                b = 14;
                break t;
              case Y:
                b = 16, l = null;
                break t;
            }
          b = 29, a = Error(
            r(130, e === null ? "null" : typeof e, "")
          ), l = null;
      }
    return i = wn(b, a, i, f), i.elementType = e, i.type = l, i.lanes = m, i;
  }
  function $s(e, i, a, l) {
    return e = wn(7, e, l, i), e.lanes = a, e;
  }
  function Of(e, i, a) {
    return e = wn(6, e, null, i), e.lanes = a, e;
  }
  function fg(e) {
    var i = wn(18, null, null, 0);
    return i.stateNode = e, i;
  }
  function zf(e, i, a) {
    return i = wn(
      4,
      e.children !== null ? e.children : [],
      e.key,
      i
    ), i.lanes = a, i.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation
    }, i;
  }
  var dg = /* @__PURE__ */ new WeakMap();
  function Bn(e, i) {
    if (typeof e == "object" && e !== null) {
      var a = dg.get(e);
      return a !== void 0 ? a : (i = {
        value: e,
        source: i,
        stack: Kt(i)
      }, dg.set(e, i), i);
    }
    return {
      value: e,
      source: i,
      stack: Kt(i)
    };
  }
  var Xa = [], Pa = 0, Bl = null, lo = 0, Hn = [], Yn = 0, as = null, di = 1, hi = "";
  function Di(e, i) {
    Xa[Pa++] = lo, Xa[Pa++] = Bl, Bl = e, lo = i;
  }
  function hg(e, i, a) {
    Hn[Yn++] = di, Hn[Yn++] = hi, Hn[Yn++] = as, as = e;
    var l = di;
    e = hi;
    var f = 32 - Ye(l) - 1;
    l &= ~(1 << f), a += 1;
    var m = 32 - Ye(i) + f;
    if (30 < m) {
      var b = f - f % 5;
      m = (l & (1 << b) - 1).toString(32), l >>= b, f -= b, di = 1 << 32 - Ye(i) + f | a << f | l, hi = m + e;
    } else
      di = 1 << m | a << f | l, hi = e;
  }
  function kf(e) {
    e.return !== null && (Di(e, 1), hg(e, 1, 0));
  }
  function Lf(e) {
    for (; e === Bl; )
      Bl = Xa[--Pa], Xa[Pa] = null, lo = Xa[--Pa], Xa[Pa] = null;
    for (; e === as; )
      as = Hn[--Yn], Hn[Yn] = null, hi = Hn[--Yn], Hn[Yn] = null, di = Hn[--Yn], Hn[Yn] = null;
  }
  function mg(e, i) {
    Hn[Yn++] = di, Hn[Yn++] = hi, Hn[Yn++] = as, di = i.id, hi = i.overflow, as = e;
  }
  var Qe = null, ve = null, $t = !1, rs = null, Gn = !1, Uf = Error(r(519));
  function os(e) {
    var i = Error(
      r(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw uo(Bn(i, e)), Uf;
  }
  function pg(e) {
    var i = e.stateNode, a = e.type, l = e.memoizedProps;
    switch (i[Ze] = e, i[vn] = l, a) {
      case "dialog":
        Xt("cancel", i), Xt("close", i);
        break;
      case "iframe":
      case "object":
      case "embed":
        Xt("load", i);
        break;
      case "video":
      case "audio":
        for (a = 0; a < Ro.length; a++)
          Xt(Ro[a], i);
        break;
      case "source":
        Xt("error", i);
        break;
      case "img":
      case "image":
      case "link":
        Xt("error", i), Xt("load", i);
        break;
      case "details":
        Xt("toggle", i);
        break;
      case "input":
        Xt("invalid", i), w0(
          i,
          l.value,
          l.defaultValue,
          l.checked,
          l.defaultChecked,
          l.type,
          l.name,
          !0
        );
        break;
      case "select":
        Xt("invalid", i);
        break;
      case "textarea":
        Xt("invalid", i), j0(i, l.value, l.defaultValue, l.children);
    }
    a = l.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || i.textContent === "" + a || l.suppressHydrationWarning === !0 || Rv(i.textContent, a) ? (l.popover != null && (Xt("beforetoggle", i), Xt("toggle", i)), l.onScroll != null && Xt("scroll", i), l.onScrollEnd != null && Xt("scrollend", i), l.onClick != null && (i.onclick = _i), i = !0) : i = !1, i || os(e, !0);
  }
  function gg(e) {
    for (Qe = e.return; Qe; )
      switch (Qe.tag) {
        case 5:
        case 31:
        case 13:
          Gn = !1;
          return;
        case 27:
        case 3:
          Gn = !0;
          return;
        default:
          Qe = Qe.return;
      }
  }
  function Ia(e) {
    if (e !== Qe) return !1;
    if (!$t) return gg(e), $t = !0, !1;
    var i = e.tag, a;
    if ((a = i !== 3 && i !== 27) && ((a = i === 5) && (a = e.type, a = !(a !== "form" && a !== "button") || eh(e.type, e.memoizedProps)), a = !a), a && ve && os(e), gg(e), i === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(317));
      ve = Yv(e);
    } else if (i === 31) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(317));
      ve = Yv(e);
    } else
      i === 27 ? (i = ve, Ts(e.type) ? (e = rh, rh = null, ve = e) : ve = i) : ve = Qe ? Xn(e.stateNode.nextSibling) : null;
    return !0;
  }
  function Ks() {
    ve = Qe = null, $t = !1;
  }
  function Vf() {
    var e = rs;
    return e !== null && (Mn === null ? Mn = e : Mn.push.apply(
      Mn,
      e
    ), rs = null), e;
  }
  function uo(e) {
    rs === null ? rs = [e] : rs.push(e);
  }
  var Bf = _(null), Zs = null, ji = null;
  function ls(e, i, a) {
    nt(Bf, i._currentValue), i._currentValue = a;
  }
  function Ni(e) {
    e._currentValue = Bf.current, V(Bf);
  }
  function Hf(e, i, a) {
    for (; e !== null; ) {
      var l = e.alternate;
      if ((e.childLanes & i) !== i ? (e.childLanes |= i, l !== null && (l.childLanes |= i)) : l !== null && (l.childLanes & i) !== i && (l.childLanes |= i), e === a) break;
      e = e.return;
    }
  }
  function Yf(e, i, a, l) {
    var f = e.child;
    for (f !== null && (f.return = e); f !== null; ) {
      var m = f.dependencies;
      if (m !== null) {
        var b = f.child;
        m = m.firstContext;
        t: for (; m !== null; ) {
          var M = m;
          m = f;
          for (var j = 0; j < i.length; j++)
            if (M.context === i[j]) {
              m.lanes |= a, M = m.alternate, M !== null && (M.lanes |= a), Hf(
                m.return,
                a,
                e
              ), l || (b = null);
              break t;
            }
          m = M.next;
        }
      } else if (f.tag === 18) {
        if (b = f.return, b === null) throw Error(r(341));
        b.lanes |= a, m = b.alternate, m !== null && (m.lanes |= a), Hf(b, a, e), b = null;
      } else b = f.child;
      if (b !== null) b.return = f;
      else
        for (b = f; b !== null; ) {
          if (b === e) {
            b = null;
            break;
          }
          if (f = b.sibling, f !== null) {
            f.return = b.return, b = f;
            break;
          }
          b = b.return;
        }
      f = b;
    }
  }
  function Fa(e, i, a, l) {
    e = null;
    for (var f = i, m = !1; f !== null; ) {
      if (!m) {
        if ((f.flags & 524288) !== 0) m = !0;
        else if ((f.flags & 262144) !== 0) break;
      }
      if (f.tag === 10) {
        var b = f.alternate;
        if (b === null) throw Error(r(387));
        if (b = b.memoizedProps, b !== null) {
          var M = f.type;
          En(f.pendingProps.value, b.value) || (e !== null ? e.push(M) : e = [M]);
        }
      } else if (f === ft.current) {
        if (b = f.alternate, b === null) throw Error(r(387));
        b.memoizedState.memoizedState !== f.memoizedState.memoizedState && (e !== null ? e.push(Uo) : e = [Uo]);
      }
      f = f.return;
    }
    e !== null && Yf(
      i,
      e,
      a,
      l
    ), i.flags |= 262144;
  }
  function Hl(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!En(
        e.context._currentValue,
        e.memoizedValue
      ))
        return !0;
      e = e.next;
    }
    return !1;
  }
  function Qs(e) {
    Zs = e, ji = null, e = e.dependencies, e !== null && (e.firstContext = null);
  }
  function Je(e) {
    return yg(Zs, e);
  }
  function Yl(e, i) {
    return Zs === null && Qs(e), yg(e, i);
  }
  function yg(e, i) {
    var a = i._currentValue;
    if (i = { context: i, memoizedValue: a, next: null }, ji === null) {
      if (e === null) throw Error(r(308));
      ji = i, e.dependencies = { lanes: 0, firstContext: i }, e.flags |= 524288;
    } else ji = ji.next = i;
    return a;
  }
  var OC = typeof AbortController < "u" ? AbortController : function() {
    var e = [], i = this.signal = {
      aborted: !1,
      addEventListener: function(a, l) {
        e.push(l);
      }
    };
    this.abort = function() {
      i.aborted = !0, e.forEach(function(a) {
        return a();
      });
    };
  }, zC = t.unstable_scheduleCallback, kC = t.unstable_NormalPriority, Ne = {
    $$typeof: O,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Gf() {
    return {
      controller: new OC(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function co(e) {
    e.refCount--, e.refCount === 0 && zC(kC, function() {
      e.controller.abort();
    });
  }
  var fo = null, qf = 0, $a = 0, Ka = null;
  function LC(e, i) {
    if (fo === null) {
      var a = fo = [];
      qf = 0, $a = Id(), Ka = {
        status: "pending",
        value: void 0,
        then: function(l) {
          a.push(l);
        }
      };
    }
    return qf++, i.then(vg, vg), i;
  }
  function vg() {
    if (--qf === 0 && fo !== null) {
      Ka !== null && (Ka.status = "fulfilled");
      var e = fo;
      fo = null, $a = 0, Ka = null;
      for (var i = 0; i < e.length; i++) (0, e[i])();
    }
  }
  function UC(e, i) {
    var a = [], l = {
      status: "pending",
      value: null,
      reason: null,
      then: function(f) {
        a.push(f);
      }
    };
    return e.then(
      function() {
        l.status = "fulfilled", l.value = i;
        for (var f = 0; f < a.length; f++) (0, a[f])(i);
      },
      function(f) {
        for (l.status = "rejected", l.reason = f, f = 0; f < a.length; f++)
          (0, a[f])(void 0);
      }
    ), l;
  }
  var xg = D.S;
  D.S = function(e, i) {
    nv = jt(), typeof i == "object" && i !== null && typeof i.then == "function" && LC(e, i), xg !== null && xg(e, i);
  };
  var Js = _(null);
  function Xf() {
    var e = Js.current;
    return e !== null ? e : he.pooledCache;
  }
  function Gl(e, i) {
    i === null ? nt(Js, Js.current) : nt(Js, i.pool);
  }
  function bg() {
    var e = Xf();
    return e === null ? null : { parent: Ne._currentValue, pool: e };
  }
  var Za = Error(r(460)), Pf = Error(r(474)), ql = Error(r(542)), Xl = { then: function() {
  } };
  function Tg(e) {
    return e = e.status, e === "fulfilled" || e === "rejected";
  }
  function Sg(e, i, a) {
    switch (a = e[a], a === void 0 ? e.push(i) : a !== i && (i.then(_i, _i), i = a), i.status) {
      case "fulfilled":
        return i.value;
      case "rejected":
        throw e = i.reason, Ag(e), e;
      default:
        if (typeof i.status == "string") i.then(_i, _i);
        else {
          if (e = he, e !== null && 100 < e.shellSuspendCounter)
            throw Error(r(482));
          e = i, e.status = "pending", e.then(
            function(l) {
              if (i.status === "pending") {
                var f = i;
                f.status = "fulfilled", f.value = l;
              }
            },
            function(l) {
              if (i.status === "pending") {
                var f = i;
                f.status = "rejected", f.reason = l;
              }
            }
          );
        }
        switch (i.status) {
          case "fulfilled":
            return i.value;
          case "rejected":
            throw e = i.reason, Ag(e), e;
        }
        throw ta = i, Za;
    }
  }
  function Ws(e) {
    try {
      var i = e._init;
      return i(e._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (ta = a, Za) : a;
    }
  }
  var ta = null;
  function Mg() {
    if (ta === null) throw Error(r(459));
    var e = ta;
    return ta = null, e;
  }
  function Ag(e) {
    if (e === Za || e === ql)
      throw Error(r(483));
  }
  var Qa = null, ho = 0;
  function Pl(e) {
    var i = ho;
    return ho += 1, Qa === null && (Qa = []), Sg(Qa, e, i);
  }
  function mo(e, i) {
    i = i.props.ref, e.ref = i !== void 0 ? i : null;
  }
  function Il(e, i) {
    throw i.$$typeof === x ? Error(r(525)) : (e = Object.prototype.toString.call(i), Error(
      r(
        31,
        e === "[object Object]" ? "object with keys {" + Object.keys(i).join(", ") + "}" : e
      )
    ));
  }
  function Cg(e) {
    function i(B, z) {
      if (e) {
        var F = B.deletions;
        F === null ? (B.deletions = [z], B.flags |= 16) : F.push(z);
      }
    }
    function a(B, z) {
      if (!e) return null;
      for (; z !== null; )
        i(B, z), z = z.sibling;
      return null;
    }
    function l(B) {
      for (var z = /* @__PURE__ */ new Map(); B !== null; )
        B.key !== null ? z.set(B.key, B) : z.set(B.index, B), B = B.sibling;
      return z;
    }
    function f(B, z) {
      return B = wi(B, z), B.index = 0, B.sibling = null, B;
    }
    function m(B, z, F) {
      return B.index = F, e ? (F = B.alternate, F !== null ? (F = F.index, F < z ? (B.flags |= 67108866, z) : F) : (B.flags |= 67108866, z)) : (B.flags |= 1048576, z);
    }
    function b(B) {
      return e && B.alternate === null && (B.flags |= 67108866), B;
    }
    function M(B, z, F, et) {
      return z === null || z.tag !== 6 ? (z = Of(F, B.mode, et), z.return = B, z) : (z = f(z, F), z.return = B, z);
    }
    function j(B, z, F, et) {
      var Mt = F.type;
      return Mt === A ? tt(
        B,
        z,
        F.props.children,
        et,
        F.key
      ) : z !== null && (z.elementType === Mt || typeof Mt == "object" && Mt !== null && Mt.$$typeof === Y && Ws(Mt) === z.type) ? (z = f(z, F.props), mo(z, F), z.return = B, z) : (z = Vl(
        F.type,
        F.key,
        F.props,
        null,
        B.mode,
        et
      ), mo(z, F), z.return = B, z);
    }
    function $(B, z, F, et) {
      return z === null || z.tag !== 4 || z.stateNode.containerInfo !== F.containerInfo || z.stateNode.implementation !== F.implementation ? (z = zf(F, B.mode, et), z.return = B, z) : (z = f(z, F.children || []), z.return = B, z);
    }
    function tt(B, z, F, et, Mt) {
      return z === null || z.tag !== 7 ? (z = $s(
        F,
        B.mode,
        et,
        Mt
      ), z.return = B, z) : (z = f(z, F), z.return = B, z);
    }
    function it(B, z, F) {
      if (typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint")
        return z = Of(
          "" + z,
          B.mode,
          F
        ), z.return = B, z;
      if (typeof z == "object" && z !== null) {
        switch (z.$$typeof) {
          case T:
            return F = Vl(
              z.type,
              z.key,
              z.props,
              null,
              B.mode,
              F
            ), mo(F, z), F.return = B, F;
          case S:
            return z = zf(
              z,
              B.mode,
              F
            ), z.return = B, z;
          case Y:
            return z = Ws(z), it(B, z, F);
        }
        if (ot(z) || ut(z))
          return z = $s(
            z,
            B.mode,
            F,
            null
          ), z.return = B, z;
        if (typeof z.then == "function")
          return it(B, Pl(z), F);
        if (z.$$typeof === O)
          return it(
            B,
            Yl(B, z),
            F
          );
        Il(B, z);
      }
      return null;
    }
    function K(B, z, F, et) {
      var Mt = z !== null ? z.key : null;
      if (typeof F == "string" && F !== "" || typeof F == "number" || typeof F == "bigint")
        return Mt !== null ? null : M(B, z, "" + F, et);
      if (typeof F == "object" && F !== null) {
        switch (F.$$typeof) {
          case T:
            return F.key === Mt ? j(B, z, F, et) : null;
          case S:
            return F.key === Mt ? $(B, z, F, et) : null;
          case Y:
            return F = Ws(F), K(B, z, F, et);
        }
        if (ot(F) || ut(F))
          return Mt !== null ? null : tt(B, z, F, et, null);
        if (typeof F.then == "function")
          return K(
            B,
            z,
            Pl(F),
            et
          );
        if (F.$$typeof === O)
          return K(
            B,
            z,
            Yl(B, F),
            et
          );
        Il(B, F);
      }
      return null;
    }
    function Q(B, z, F, et, Mt) {
      if (typeof et == "string" && et !== "" || typeof et == "number" || typeof et == "bigint")
        return B = B.get(F) || null, M(z, B, "" + et, Mt);
      if (typeof et == "object" && et !== null) {
        switch (et.$$typeof) {
          case T:
            return B = B.get(
              et.key === null ? F : et.key
            ) || null, j(z, B, et, Mt);
          case S:
            return B = B.get(
              et.key === null ? F : et.key
            ) || null, $(z, B, et, Mt);
          case Y:
            return et = Ws(et), Q(
              B,
              z,
              F,
              et,
              Mt
            );
        }
        if (ot(et) || ut(et))
          return B = B.get(F) || null, tt(z, B, et, Mt, null);
        if (typeof et.then == "function")
          return Q(
            B,
            z,
            F,
            Pl(et),
            Mt
          );
        if (et.$$typeof === O)
          return Q(
            B,
            z,
            F,
            Yl(z, et),
            Mt
          );
        Il(z, et);
      }
      return null;
    }
    function vt(B, z, F, et) {
      for (var Mt = null, Wt = null, bt = z, Lt = z = 0, It = null; bt !== null && Lt < F.length; Lt++) {
        bt.index > Lt ? (It = bt, bt = null) : It = bt.sibling;
        var te = K(
          B,
          bt,
          F[Lt],
          et
        );
        if (te === null) {
          bt === null && (bt = It);
          break;
        }
        e && bt && te.alternate === null && i(B, bt), z = m(te, z, Lt), Wt === null ? Mt = te : Wt.sibling = te, Wt = te, bt = It;
      }
      if (Lt === F.length)
        return a(B, bt), $t && Di(B, Lt), Mt;
      if (bt === null) {
        for (; Lt < F.length; Lt++)
          bt = it(B, F[Lt], et), bt !== null && (z = m(
            bt,
            z,
            Lt
          ), Wt === null ? Mt = bt : Wt.sibling = bt, Wt = bt);
        return $t && Di(B, Lt), Mt;
      }
      for (bt = l(bt); Lt < F.length; Lt++)
        It = Q(
          bt,
          B,
          Lt,
          F[Lt],
          et
        ), It !== null && (e && It.alternate !== null && bt.delete(
          It.key === null ? Lt : It.key
        ), z = m(
          It,
          z,
          Lt
        ), Wt === null ? Mt = It : Wt.sibling = It, Wt = It);
      return e && bt.forEach(function(_s) {
        return i(B, _s);
      }), $t && Di(B, Lt), Mt;
    }
    function At(B, z, F, et) {
      if (F == null) throw Error(r(151));
      for (var Mt = null, Wt = null, bt = z, Lt = z = 0, It = null, te = F.next(); bt !== null && !te.done; Lt++, te = F.next()) {
        bt.index > Lt ? (It = bt, bt = null) : It = bt.sibling;
        var _s = K(B, bt, te.value, et);
        if (_s === null) {
          bt === null && (bt = It);
          break;
        }
        e && bt && _s.alternate === null && i(B, bt), z = m(_s, z, Lt), Wt === null ? Mt = _s : Wt.sibling = _s, Wt = _s, bt = It;
      }
      if (te.done)
        return a(B, bt), $t && Di(B, Lt), Mt;
      if (bt === null) {
        for (; !te.done; Lt++, te = F.next())
          te = it(B, te.value, et), te !== null && (z = m(te, z, Lt), Wt === null ? Mt = te : Wt.sibling = te, Wt = te);
        return $t && Di(B, Lt), Mt;
      }
      for (bt = l(bt); !te.done; Lt++, te = F.next())
        te = Q(bt, B, Lt, te.value, et), te !== null && (e && te.alternate !== null && bt.delete(te.key === null ? Lt : te.key), z = m(te, z, Lt), Wt === null ? Mt = te : Wt.sibling = te, Wt = te);
      return e && bt.forEach(function($_) {
        return i(B, $_);
      }), $t && Di(B, Lt), Mt;
    }
    function ce(B, z, F, et) {
      if (typeof F == "object" && F !== null && F.type === A && F.key === null && (F = F.props.children), typeof F == "object" && F !== null) {
        switch (F.$$typeof) {
          case T:
            t: {
              for (var Mt = F.key; z !== null; ) {
                if (z.key === Mt) {
                  if (Mt = F.type, Mt === A) {
                    if (z.tag === 7) {
                      a(
                        B,
                        z.sibling
                      ), et = f(
                        z,
                        F.props.children
                      ), et.return = B, B = et;
                      break t;
                    }
                  } else if (z.elementType === Mt || typeof Mt == "object" && Mt !== null && Mt.$$typeof === Y && Ws(Mt) === z.type) {
                    a(
                      B,
                      z.sibling
                    ), et = f(z, F.props), mo(et, F), et.return = B, B = et;
                    break t;
                  }
                  a(B, z);
                  break;
                } else i(B, z);
                z = z.sibling;
              }
              F.type === A ? (et = $s(
                F.props.children,
                B.mode,
                et,
                F.key
              ), et.return = B, B = et) : (et = Vl(
                F.type,
                F.key,
                F.props,
                null,
                B.mode,
                et
              ), mo(et, F), et.return = B, B = et);
            }
            return b(B);
          case S:
            t: {
              for (Mt = F.key; z !== null; ) {
                if (z.key === Mt)
                  if (z.tag === 4 && z.stateNode.containerInfo === F.containerInfo && z.stateNode.implementation === F.implementation) {
                    a(
                      B,
                      z.sibling
                    ), et = f(z, F.children || []), et.return = B, B = et;
                    break t;
                  } else {
                    a(B, z);
                    break;
                  }
                else i(B, z);
                z = z.sibling;
              }
              et = zf(F, B.mode, et), et.return = B, B = et;
            }
            return b(B);
          case Y:
            return F = Ws(F), ce(
              B,
              z,
              F,
              et
            );
        }
        if (ot(F))
          return vt(
            B,
            z,
            F,
            et
          );
        if (ut(F)) {
          if (Mt = ut(F), typeof Mt != "function") throw Error(r(150));
          return F = Mt.call(F), At(
            B,
            z,
            F,
            et
          );
        }
        if (typeof F.then == "function")
          return ce(
            B,
            z,
            Pl(F),
            et
          );
        if (F.$$typeof === O)
          return ce(
            B,
            z,
            Yl(B, F),
            et
          );
        Il(B, F);
      }
      return typeof F == "string" && F !== "" || typeof F == "number" || typeof F == "bigint" ? (F = "" + F, z !== null && z.tag === 6 ? (a(B, z.sibling), et = f(z, F), et.return = B, B = et) : (a(B, z), et = Of(F, B.mode, et), et.return = B, B = et), b(B)) : a(B, z);
    }
    return function(B, z, F, et) {
      try {
        ho = 0;
        var Mt = ce(
          B,
          z,
          F,
          et
        );
        return Qa = null, Mt;
      } catch (bt) {
        if (bt === Za || bt === ql) throw bt;
        var Wt = wn(29, bt, null, B.mode);
        return Wt.lanes = et, Wt.return = B, Wt;
      }
    };
  }
  var ea = Cg(!0), _g = Cg(!1), us = !1;
  function If(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Ff(e, i) {
    e = e.updateQueue, i.updateQueue === e && (i.updateQueue = {
      baseState: e.baseState,
      firstBaseUpdate: e.firstBaseUpdate,
      lastBaseUpdate: e.lastBaseUpdate,
      shared: e.shared,
      callbacks: null
    });
  }
  function cs(e) {
    return { lane: e, tag: 0, payload: null, callback: null, next: null };
  }
  function fs(e, i, a) {
    var l = e.updateQueue;
    if (l === null) return null;
    if (l = l.shared, (ne & 2) !== 0) {
      var f = l.pending;
      return f === null ? i.next = i : (i.next = f.next, f.next = i), l.pending = i, i = Ul(e), ug(e, null, a), i;
    }
    return Ll(e, l, i, a), Ul(e);
  }
  function po(e, i, a) {
    if (i = i.updateQueue, i !== null && (i = i.shared, (a & 4194048) !== 0)) {
      var l = i.lanes;
      l &= e.pendingLanes, a |= l, i.lanes = a, sf(e, a);
    }
  }
  function $f(e, i) {
    var a = e.updateQueue, l = e.alternate;
    if (l !== null && (l = l.updateQueue, a === l)) {
      var f = null, m = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var b = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          m === null ? f = m = b : m = m.next = b, a = a.next;
        } while (a !== null);
        m === null ? f = m = i : m = m.next = i;
      } else f = m = i;
      a = {
        baseState: l.baseState,
        firstBaseUpdate: f,
        lastBaseUpdate: m,
        shared: l.shared,
        callbacks: l.callbacks
      }, e.updateQueue = a;
      return;
    }
    e = a.lastBaseUpdate, e === null ? a.firstBaseUpdate = i : e.next = i, a.lastBaseUpdate = i;
  }
  var Kf = !1;
  function go() {
    if (Kf) {
      var e = Ka;
      if (e !== null) throw e;
    }
  }
  function yo(e, i, a, l) {
    Kf = !1;
    var f = e.updateQueue;
    us = !1;
    var m = f.firstBaseUpdate, b = f.lastBaseUpdate, M = f.shared.pending;
    if (M !== null) {
      f.shared.pending = null;
      var j = M, $ = j.next;
      j.next = null, b === null ? m = $ : b.next = $, b = j;
      var tt = e.alternate;
      tt !== null && (tt = tt.updateQueue, M = tt.lastBaseUpdate, M !== b && (M === null ? tt.firstBaseUpdate = $ : M.next = $, tt.lastBaseUpdate = j));
    }
    if (m !== null) {
      var it = f.baseState;
      b = 0, tt = $ = j = null, M = m;
      do {
        var K = M.lane & -536870913, Q = K !== M.lane;
        if (Q ? (Pt & K) === K : (l & K) === K) {
          K !== 0 && K === $a && (Kf = !0), tt !== null && (tt = tt.next = {
            lane: 0,
            tag: M.tag,
            payload: M.payload,
            callback: null,
            next: null
          });
          t: {
            var vt = e, At = M;
            K = i;
            var ce = a;
            switch (At.tag) {
              case 1:
                if (vt = At.payload, typeof vt == "function") {
                  it = vt.call(ce, it, K);
                  break t;
                }
                it = vt;
                break t;
              case 3:
                vt.flags = vt.flags & -65537 | 128;
              case 0:
                if (vt = At.payload, K = typeof vt == "function" ? vt.call(ce, it, K) : vt, K == null) break t;
                it = y({}, it, K);
                break t;
              case 2:
                us = !0;
            }
          }
          K = M.callback, K !== null && (e.flags |= 64, Q && (e.flags |= 8192), Q = f.callbacks, Q === null ? f.callbacks = [K] : Q.push(K));
        } else
          Q = {
            lane: K,
            tag: M.tag,
            payload: M.payload,
            callback: M.callback,
            next: null
          }, tt === null ? ($ = tt = Q, j = it) : tt = tt.next = Q, b |= K;
        if (M = M.next, M === null) {
          if (M = f.shared.pending, M === null)
            break;
          Q = M, M = Q.next, Q.next = null, f.lastBaseUpdate = Q, f.shared.pending = null;
        }
      } while (!0);
      tt === null && (j = it), f.baseState = j, f.firstBaseUpdate = $, f.lastBaseUpdate = tt, m === null && (f.shared.lanes = 0), gs |= b, e.lanes = b, e.memoizedState = it;
    }
  }
  function Eg(e, i) {
    if (typeof e != "function")
      throw Error(r(191, e));
    e.call(i);
  }
  function wg(e, i) {
    var a = e.callbacks;
    if (a !== null)
      for (e.callbacks = null, e = 0; e < a.length; e++)
        Eg(a[e], i);
  }
  var Ja = _(null), Fl = _(0);
  function Dg(e, i) {
    e = Hi, nt(Fl, e), nt(Ja, i), Hi = e | i.baseLanes;
  }
  function Zf() {
    nt(Fl, Hi), nt(Ja, Ja.current);
  }
  function Qf() {
    Hi = Fl.current, V(Ja), V(Fl);
  }
  var Dn = _(null), qn = null;
  function ds(e) {
    var i = e.alternate;
    nt(Ee, Ee.current & 1), nt(Dn, e), qn === null && (i === null || Ja.current !== null || i.memoizedState !== null) && (qn = e);
  }
  function Jf(e) {
    nt(Ee, Ee.current), nt(Dn, e), qn === null && (qn = e);
  }
  function jg(e) {
    e.tag === 22 ? (nt(Ee, Ee.current), nt(Dn, e), qn === null && (qn = e)) : hs();
  }
  function hs() {
    nt(Ee, Ee.current), nt(Dn, Dn.current);
  }
  function jn(e) {
    V(Dn), qn === e && (qn = null), V(Ee);
  }
  var Ee = _(0);
  function $l(e) {
    for (var i = e; i !== null; ) {
      if (i.tag === 13) {
        var a = i.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || sh(a) || ah(a)))
          return i;
      } else if (i.tag === 19 && (i.memoizedProps.revealOrder === "forwards" || i.memoizedProps.revealOrder === "backwards" || i.memoizedProps.revealOrder === "unstable_legacy-backwards" || i.memoizedProps.revealOrder === "together")) {
        if ((i.flags & 128) !== 0) return i;
      } else if (i.child !== null) {
        i.child.return = i, i = i.child;
        continue;
      }
      if (i === e) break;
      for (; i.sibling === null; ) {
        if (i.return === null || i.return === e) return null;
        i = i.return;
      }
      i.sibling.return = i.return, i = i.sibling;
    }
    return null;
  }
  var Ri = 0, kt = null, le = null, Re = null, Kl = !1, Wa = !1, na = !1, Zl = 0, vo = 0, tr = null, VC = 0;
  function Ae() {
    throw Error(r(321));
  }
  function Wf(e, i) {
    if (i === null) return !1;
    for (var a = 0; a < i.length && a < e.length; a++)
      if (!En(e[a], i[a])) return !1;
    return !0;
  }
  function td(e, i, a, l, f, m) {
    return Ri = m, kt = i, i.memoizedState = null, i.updateQueue = null, i.lanes = 0, D.H = e === null || e.memoizedState === null ? hy : pd, na = !1, m = a(l, f), na = !1, Wa && (m = Rg(
      i,
      a,
      l,
      f
    )), Ng(e), m;
  }
  function Ng(e) {
    D.H = To;
    var i = le !== null && le.next !== null;
    if (Ri = 0, Re = le = kt = null, Kl = !1, vo = 0, tr = null, i) throw Error(r(300));
    e === null || Oe || (e = e.dependencies, e !== null && Hl(e) && (Oe = !0));
  }
  function Rg(e, i, a, l) {
    kt = e;
    var f = 0;
    do {
      if (Wa && (tr = null), vo = 0, Wa = !1, 25 <= f) throw Error(r(301));
      if (f += 1, Re = le = null, e.updateQueue != null) {
        var m = e.updateQueue;
        m.lastEffect = null, m.events = null, m.stores = null, m.memoCache != null && (m.memoCache.index = 0);
      }
      D.H = my, m = i(a, l);
    } while (Wa);
    return m;
  }
  function BC() {
    var e = D.H, i = e.useState()[0];
    return i = typeof i.then == "function" ? xo(i) : i, e = e.useState()[0], (le !== null ? le.memoizedState : null) !== e && (kt.flags |= 1024), i;
  }
  function ed() {
    var e = Zl !== 0;
    return Zl = 0, e;
  }
  function nd(e, i, a) {
    i.updateQueue = e.updateQueue, i.flags &= -2053, e.lanes &= ~a;
  }
  function id(e) {
    if (Kl) {
      for (e = e.memoizedState; e !== null; ) {
        var i = e.queue;
        i !== null && (i.pending = null), e = e.next;
      }
      Kl = !1;
    }
    Ri = 0, Re = le = kt = null, Wa = !1, vo = Zl = 0, tr = null;
  }
  function dn() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Re === null ? kt.memoizedState = Re = e : Re = Re.next = e, Re;
  }
  function we() {
    if (le === null) {
      var e = kt.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = le.next;
    var i = Re === null ? kt.memoizedState : Re.next;
    if (i !== null)
      Re = i, le = e;
    else {
      if (e === null)
        throw kt.alternate === null ? Error(r(467)) : Error(r(310));
      le = e, e = {
        memoizedState: le.memoizedState,
        baseState: le.baseState,
        baseQueue: le.baseQueue,
        queue: le.queue,
        next: null
      }, Re === null ? kt.memoizedState = Re = e : Re = Re.next = e;
    }
    return Re;
  }
  function Ql() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function xo(e) {
    var i = vo;
    return vo += 1, tr === null && (tr = []), e = Sg(tr, e, i), i = kt, (Re === null ? i.memoizedState : Re.next) === null && (i = i.alternate, D.H = i === null || i.memoizedState === null ? hy : pd), e;
  }
  function Jl(e) {
    if (e !== null && typeof e == "object") {
      if (typeof e.then == "function") return xo(e);
      if (e.$$typeof === O) return Je(e);
    }
    throw Error(r(438, String(e)));
  }
  function sd(e) {
    var i = null, a = kt.updateQueue;
    if (a !== null && (i = a.memoCache), i == null) {
      var l = kt.alternate;
      l !== null && (l = l.updateQueue, l !== null && (l = l.memoCache, l != null && (i = {
        data: l.data.map(function(f) {
          return f.slice();
        }),
        index: 0
      })));
    }
    if (i == null && (i = { data: [], index: 0 }), a === null && (a = Ql(), kt.updateQueue = a), a.memoCache = i, a = i.data[i.index], a === void 0)
      for (a = i.data[i.index] = Array(e), l = 0; l < e; l++)
        a[l] = J;
    return i.index++, a;
  }
  function Oi(e, i) {
    return typeof i == "function" ? i(e) : i;
  }
  function Wl(e) {
    var i = we();
    return ad(i, le, e);
  }
  function ad(e, i, a) {
    var l = e.queue;
    if (l === null) throw Error(r(311));
    l.lastRenderedReducer = a;
    var f = e.baseQueue, m = l.pending;
    if (m !== null) {
      if (f !== null) {
        var b = f.next;
        f.next = m.next, m.next = b;
      }
      i.baseQueue = f = m, l.pending = null;
    }
    if (m = e.baseState, f === null) e.memoizedState = m;
    else {
      i = f.next;
      var M = b = null, j = null, $ = i, tt = !1;
      do {
        var it = $.lane & -536870913;
        if (it !== $.lane ? (Pt & it) === it : (Ri & it) === it) {
          var K = $.revertLane;
          if (K === 0)
            j !== null && (j = j.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: $.action,
              hasEagerState: $.hasEagerState,
              eagerState: $.eagerState,
              next: null
            }), it === $a && (tt = !0);
          else if ((Ri & K) === K) {
            $ = $.next, K === $a && (tt = !0);
            continue;
          } else
            it = {
              lane: 0,
              revertLane: $.revertLane,
              gesture: null,
              action: $.action,
              hasEagerState: $.hasEagerState,
              eagerState: $.eagerState,
              next: null
            }, j === null ? (M = j = it, b = m) : j = j.next = it, kt.lanes |= K, gs |= K;
          it = $.action, na && a(m, it), m = $.hasEagerState ? $.eagerState : a(m, it);
        } else
          K = {
            lane: it,
            revertLane: $.revertLane,
            gesture: $.gesture,
            action: $.action,
            hasEagerState: $.hasEagerState,
            eagerState: $.eagerState,
            next: null
          }, j === null ? (M = j = K, b = m) : j = j.next = K, kt.lanes |= it, gs |= it;
        $ = $.next;
      } while ($ !== null && $ !== i);
      if (j === null ? b = m : j.next = M, !En(m, e.memoizedState) && (Oe = !0, tt && (a = Ka, a !== null)))
        throw a;
      e.memoizedState = m, e.baseState = b, e.baseQueue = j, l.lastRenderedState = m;
    }
    return f === null && (l.lanes = 0), [e.memoizedState, l.dispatch];
  }
  function rd(e) {
    var i = we(), a = i.queue;
    if (a === null) throw Error(r(311));
    a.lastRenderedReducer = e;
    var l = a.dispatch, f = a.pending, m = i.memoizedState;
    if (f !== null) {
      a.pending = null;
      var b = f = f.next;
      do
        m = e(m, b.action), b = b.next;
      while (b !== f);
      En(m, i.memoizedState) || (Oe = !0), i.memoizedState = m, i.baseQueue === null && (i.baseState = m), a.lastRenderedState = m;
    }
    return [m, l];
  }
  function Og(e, i, a) {
    var l = kt, f = we(), m = $t;
    if (m) {
      if (a === void 0) throw Error(r(407));
      a = a();
    } else a = i();
    var b = !En(
      (le || f).memoizedState,
      a
    );
    if (b && (f.memoizedState = a, Oe = !0), f = f.queue, ud(Lg.bind(null, l, f, e), [
      e
    ]), f.getSnapshot !== i || b || Re !== null && Re.memoizedState.tag & 1) {
      if (l.flags |= 2048, er(
        9,
        { destroy: void 0 },
        kg.bind(
          null,
          l,
          f,
          a,
          i
        ),
        null
      ), he === null) throw Error(r(349));
      m || (Ri & 127) !== 0 || zg(l, i, a);
    }
    return a;
  }
  function zg(e, i, a) {
    e.flags |= 16384, e = { getSnapshot: i, value: a }, i = kt.updateQueue, i === null ? (i = Ql(), kt.updateQueue = i, i.stores = [e]) : (a = i.stores, a === null ? i.stores = [e] : a.push(e));
  }
  function kg(e, i, a, l) {
    i.value = a, i.getSnapshot = l, Ug(i) && Vg(e);
  }
  function Lg(e, i, a) {
    return a(function() {
      Ug(i) && Vg(e);
    });
  }
  function Ug(e) {
    var i = e.getSnapshot;
    e = e.value;
    try {
      var a = i();
      return !En(e, a);
    } catch {
      return !0;
    }
  }
  function Vg(e) {
    var i = Fs(e, 2);
    i !== null && An(i, e, 2);
  }
  function od(e) {
    var i = dn();
    if (typeof e == "function") {
      var a = e;
      if (e = a(), na) {
        Ke(!0);
        try {
          a();
        } finally {
          Ke(!1);
        }
      }
    }
    return i.memoizedState = i.baseState = e, i.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Oi,
      lastRenderedState: e
    }, i;
  }
  function Bg(e, i, a, l) {
    return e.baseState = a, ad(
      e,
      le,
      typeof l == "function" ? l : Oi
    );
  }
  function HC(e, i, a, l, f) {
    if (nu(e)) throw Error(r(485));
    if (e = i.action, e !== null) {
      var m = {
        payload: f,
        action: e,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(b) {
          m.listeners.push(b);
        }
      };
      D.T !== null ? a(!0) : m.isTransition = !1, l(m), a = i.pending, a === null ? (m.next = i.pending = m, Hg(i, m)) : (m.next = a.next, i.pending = a.next = m);
    }
  }
  function Hg(e, i) {
    var a = i.action, l = i.payload, f = e.state;
    if (i.isTransition) {
      var m = D.T, b = {};
      D.T = b;
      try {
        var M = a(f, l), j = D.S;
        j !== null && j(b, M), Yg(e, i, M);
      } catch ($) {
        ld(e, i, $);
      } finally {
        m !== null && b.types !== null && (m.types = b.types), D.T = m;
      }
    } else
      try {
        m = a(f, l), Yg(e, i, m);
      } catch ($) {
        ld(e, i, $);
      }
  }
  function Yg(e, i, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(l) {
        Gg(e, i, l);
      },
      function(l) {
        return ld(e, i, l);
      }
    ) : Gg(e, i, a);
  }
  function Gg(e, i, a) {
    i.status = "fulfilled", i.value = a, qg(i), e.state = a, i = e.pending, i !== null && (a = i.next, a === i ? e.pending = null : (a = a.next, i.next = a, Hg(e, a)));
  }
  function ld(e, i, a) {
    var l = e.pending;
    if (e.pending = null, l !== null) {
      l = l.next;
      do
        i.status = "rejected", i.reason = a, qg(i), i = i.next;
      while (i !== l);
    }
    e.action = null;
  }
  function qg(e) {
    e = e.listeners;
    for (var i = 0; i < e.length; i++) (0, e[i])();
  }
  function Xg(e, i) {
    return i;
  }
  function Pg(e, i) {
    if ($t) {
      var a = he.formState;
      if (a !== null) {
        t: {
          var l = kt;
          if ($t) {
            if (ve) {
              e: {
                for (var f = ve, m = Gn; f.nodeType !== 8; ) {
                  if (!m) {
                    f = null;
                    break e;
                  }
                  if (f = Xn(
                    f.nextSibling
                  ), f === null) {
                    f = null;
                    break e;
                  }
                }
                m = f.data, f = m === "F!" || m === "F" ? f : null;
              }
              if (f) {
                ve = Xn(
                  f.nextSibling
                ), l = f.data === "F!";
                break t;
              }
            }
            os(l);
          }
          l = !1;
        }
        l && (i = a[0]);
      }
    }
    return a = dn(), a.memoizedState = a.baseState = i, l = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Xg,
      lastRenderedState: i
    }, a.queue = l, a = cy.bind(
      null,
      kt,
      l
    ), l.dispatch = a, l = od(!1), m = md.bind(
      null,
      kt,
      !1,
      l.queue
    ), l = dn(), f = {
      state: i,
      dispatch: null,
      action: e,
      pending: null
    }, l.queue = f, a = HC.bind(
      null,
      kt,
      f,
      m,
      a
    ), f.dispatch = a, l.memoizedState = e, [i, a, !1];
  }
  function Ig(e) {
    var i = we();
    return Fg(i, le, e);
  }
  function Fg(e, i, a) {
    if (i = ad(
      e,
      i,
      Xg
    )[0], e = Wl(Oi)[0], typeof i == "object" && i !== null && typeof i.then == "function")
      try {
        var l = xo(i);
      } catch (b) {
        throw b === Za ? ql : b;
      }
    else l = i;
    i = we();
    var f = i.queue, m = f.dispatch;
    return a !== i.memoizedState && (kt.flags |= 2048, er(
      9,
      { destroy: void 0 },
      YC.bind(null, f, a),
      null
    )), [l, m, e];
  }
  function YC(e, i) {
    e.action = i;
  }
  function $g(e) {
    var i = we(), a = le;
    if (a !== null)
      return Fg(i, a, e);
    we(), i = i.memoizedState, a = we();
    var l = a.queue.dispatch;
    return a.memoizedState = e, [i, l, !1];
  }
  function er(e, i, a, l) {
    return e = { tag: e, create: a, deps: l, inst: i, next: null }, i = kt.updateQueue, i === null && (i = Ql(), kt.updateQueue = i), a = i.lastEffect, a === null ? i.lastEffect = e.next = e : (l = a.next, a.next = e, e.next = l, i.lastEffect = e), e;
  }
  function Kg() {
    return we().memoizedState;
  }
  function tu(e, i, a, l) {
    var f = dn();
    kt.flags |= e, f.memoizedState = er(
      1 | i,
      { destroy: void 0 },
      a,
      l === void 0 ? null : l
    );
  }
  function eu(e, i, a, l) {
    var f = we();
    l = l === void 0 ? null : l;
    var m = f.memoizedState.inst;
    le !== null && l !== null && Wf(l, le.memoizedState.deps) ? f.memoizedState = er(i, m, a, l) : (kt.flags |= e, f.memoizedState = er(
      1 | i,
      m,
      a,
      l
    ));
  }
  function Zg(e, i) {
    tu(8390656, 8, e, i);
  }
  function ud(e, i) {
    eu(2048, 8, e, i);
  }
  function GC(e) {
    kt.flags |= 4;
    var i = kt.updateQueue;
    if (i === null)
      i = Ql(), kt.updateQueue = i, i.events = [e];
    else {
      var a = i.events;
      a === null ? i.events = [e] : a.push(e);
    }
  }
  function Qg(e) {
    var i = we().memoizedState;
    return GC({ ref: i, nextImpl: e }), function() {
      if ((ne & 2) !== 0) throw Error(r(440));
      return i.impl.apply(void 0, arguments);
    };
  }
  function Jg(e, i) {
    return eu(4, 2, e, i);
  }
  function Wg(e, i) {
    return eu(4, 4, e, i);
  }
  function ty(e, i) {
    if (typeof i == "function") {
      e = e();
      var a = i(e);
      return function() {
        typeof a == "function" ? a() : i(null);
      };
    }
    if (i != null)
      return e = e(), i.current = e, function() {
        i.current = null;
      };
  }
  function ey(e, i, a) {
    a = a != null ? a.concat([e]) : null, eu(4, 4, ty.bind(null, i, e), a);
  }
  function cd() {
  }
  function ny(e, i) {
    var a = we();
    i = i === void 0 ? null : i;
    var l = a.memoizedState;
    return i !== null && Wf(i, l[1]) ? l[0] : (a.memoizedState = [e, i], e);
  }
  function iy(e, i) {
    var a = we();
    i = i === void 0 ? null : i;
    var l = a.memoizedState;
    if (i !== null && Wf(i, l[1]))
      return l[0];
    if (l = e(), na) {
      Ke(!0);
      try {
        e();
      } finally {
        Ke(!1);
      }
    }
    return a.memoizedState = [l, i], l;
  }
  function fd(e, i, a) {
    return a === void 0 || (Ri & 1073741824) !== 0 && (Pt & 261930) === 0 ? e.memoizedState = i : (e.memoizedState = a, e = sv(), kt.lanes |= e, gs |= e, a);
  }
  function sy(e, i, a, l) {
    return En(a, i) ? a : Ja.current !== null ? (e = fd(e, a, l), En(e, i) || (Oe = !0), e) : (Ri & 42) === 0 || (Ri & 1073741824) !== 0 && (Pt & 261930) === 0 ? (Oe = !0, e.memoizedState = a) : (e = sv(), kt.lanes |= e, gs |= e, i);
  }
  function ay(e, i, a, l, f) {
    var m = q.p;
    q.p = m !== 0 && 8 > m ? m : 8;
    var b = D.T, M = {};
    D.T = M, md(e, !1, i, a);
    try {
      var j = f(), $ = D.S;
      if ($ !== null && $(M, j), j !== null && typeof j == "object" && typeof j.then == "function") {
        var tt = UC(
          j,
          l
        );
        bo(
          e,
          i,
          tt,
          On(e)
        );
      } else
        bo(
          e,
          i,
          l,
          On(e)
        );
    } catch (it) {
      bo(
        e,
        i,
        { then: function() {
        }, status: "rejected", reason: it },
        On()
      );
    } finally {
      q.p = m, b !== null && M.types !== null && (b.types = M.types), D.T = b;
    }
  }
  function qC() {
  }
  function dd(e, i, a, l) {
    if (e.tag !== 5) throw Error(r(476));
    var f = ry(e).queue;
    ay(
      e,
      f,
      i,
      w,
      a === null ? qC : function() {
        return oy(e), a(l);
      }
    );
  }
  function ry(e) {
    var i = e.memoizedState;
    if (i !== null) return i;
    i = {
      memoizedState: w,
      baseState: w,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Oi,
        lastRenderedState: w
      },
      next: null
    };
    var a = {};
    return i.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Oi,
        lastRenderedState: a
      },
      next: null
    }, e.memoizedState = i, e = e.alternate, e !== null && (e.memoizedState = i), i;
  }
  function oy(e) {
    var i = ry(e);
    i.next === null && (i = e.alternate.memoizedState), bo(
      e,
      i.next.queue,
      {},
      On()
    );
  }
  function hd() {
    return Je(Uo);
  }
  function ly() {
    return we().memoizedState;
  }
  function uy() {
    return we().memoizedState;
  }
  function XC(e) {
    for (var i = e.return; i !== null; ) {
      switch (i.tag) {
        case 24:
        case 3:
          var a = On();
          e = cs(a);
          var l = fs(i, e, a);
          l !== null && (An(l, i, a), po(l, i, a)), i = { cache: Gf() }, e.payload = i;
          return;
      }
      i = i.return;
    }
  }
  function PC(e, i, a) {
    var l = On();
    a = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, nu(e) ? fy(i, a) : (a = Nf(e, i, a, l), a !== null && (An(a, e, l), dy(a, i, l)));
  }
  function cy(e, i, a) {
    var l = On();
    bo(e, i, a, l);
  }
  function bo(e, i, a, l) {
    var f = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (nu(e)) fy(i, f);
    else {
      var m = e.alternate;
      if (e.lanes === 0 && (m === null || m.lanes === 0) && (m = i.lastRenderedReducer, m !== null))
        try {
          var b = i.lastRenderedState, M = m(b, a);
          if (f.hasEagerState = !0, f.eagerState = M, En(M, b))
            return Ll(e, i, f, 0), he === null && kl(), !1;
        } catch {
        }
      if (a = Nf(e, i, f, l), a !== null)
        return An(a, e, l), dy(a, i, l), !0;
    }
    return !1;
  }
  function md(e, i, a, l) {
    if (l = {
      lane: 2,
      revertLane: Id(),
      gesture: null,
      action: l,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, nu(e)) {
      if (i) throw Error(r(479));
    } else
      i = Nf(
        e,
        a,
        l,
        2
      ), i !== null && An(i, e, 2);
  }
  function nu(e) {
    var i = e.alternate;
    return e === kt || i !== null && i === kt;
  }
  function fy(e, i) {
    Wa = Kl = !0;
    var a = e.pending;
    a === null ? i.next = i : (i.next = a.next, a.next = i), e.pending = i;
  }
  function dy(e, i, a) {
    if ((a & 4194048) !== 0) {
      var l = i.lanes;
      l &= e.pendingLanes, a |= l, i.lanes = a, sf(e, a);
    }
  }
  var To = {
    readContext: Je,
    use: Jl,
    useCallback: Ae,
    useContext: Ae,
    useEffect: Ae,
    useImperativeHandle: Ae,
    useLayoutEffect: Ae,
    useInsertionEffect: Ae,
    useMemo: Ae,
    useReducer: Ae,
    useRef: Ae,
    useState: Ae,
    useDebugValue: Ae,
    useDeferredValue: Ae,
    useTransition: Ae,
    useSyncExternalStore: Ae,
    useId: Ae,
    useHostTransitionStatus: Ae,
    useFormState: Ae,
    useActionState: Ae,
    useOptimistic: Ae,
    useMemoCache: Ae,
    useCacheRefresh: Ae
  };
  To.useEffectEvent = Ae;
  var hy = {
    readContext: Je,
    use: Jl,
    useCallback: function(e, i) {
      return dn().memoizedState = [
        e,
        i === void 0 ? null : i
      ], e;
    },
    useContext: Je,
    useEffect: Zg,
    useImperativeHandle: function(e, i, a) {
      a = a != null ? a.concat([e]) : null, tu(
        4194308,
        4,
        ty.bind(null, i, e),
        a
      );
    },
    useLayoutEffect: function(e, i) {
      return tu(4194308, 4, e, i);
    },
    useInsertionEffect: function(e, i) {
      tu(4, 2, e, i);
    },
    useMemo: function(e, i) {
      var a = dn();
      i = i === void 0 ? null : i;
      var l = e();
      if (na) {
        Ke(!0);
        try {
          e();
        } finally {
          Ke(!1);
        }
      }
      return a.memoizedState = [l, i], l;
    },
    useReducer: function(e, i, a) {
      var l = dn();
      if (a !== void 0) {
        var f = a(i);
        if (na) {
          Ke(!0);
          try {
            a(i);
          } finally {
            Ke(!1);
          }
        }
      } else f = i;
      return l.memoizedState = l.baseState = f, e = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: e,
        lastRenderedState: f
      }, l.queue = e, e = e.dispatch = PC.bind(
        null,
        kt,
        e
      ), [l.memoizedState, e];
    },
    useRef: function(e) {
      var i = dn();
      return e = { current: e }, i.memoizedState = e;
    },
    useState: function(e) {
      e = od(e);
      var i = e.queue, a = cy.bind(null, kt, i);
      return i.dispatch = a, [e.memoizedState, a];
    },
    useDebugValue: cd,
    useDeferredValue: function(e, i) {
      var a = dn();
      return fd(a, e, i);
    },
    useTransition: function() {
      var e = od(!1);
      return e = ay.bind(
        null,
        kt,
        e.queue,
        !0,
        !1
      ), dn().memoizedState = e, [!1, e];
    },
    useSyncExternalStore: function(e, i, a) {
      var l = kt, f = dn();
      if ($t) {
        if (a === void 0)
          throw Error(r(407));
        a = a();
      } else {
        if (a = i(), he === null)
          throw Error(r(349));
        (Pt & 127) !== 0 || zg(l, i, a);
      }
      f.memoizedState = a;
      var m = { value: a, getSnapshot: i };
      return f.queue = m, Zg(Lg.bind(null, l, m, e), [
        e
      ]), l.flags |= 2048, er(
        9,
        { destroy: void 0 },
        kg.bind(
          null,
          l,
          m,
          a,
          i
        ),
        null
      ), a;
    },
    useId: function() {
      var e = dn(), i = he.identifierPrefix;
      if ($t) {
        var a = hi, l = di;
        a = (l & ~(1 << 32 - Ye(l) - 1)).toString(32) + a, i = "_" + i + "R_" + a, a = Zl++, 0 < a && (i += "H" + a.toString(32)), i += "_";
      } else
        a = VC++, i = "_" + i + "r_" + a.toString(32) + "_";
      return e.memoizedState = i;
    },
    useHostTransitionStatus: hd,
    useFormState: Pg,
    useActionState: Pg,
    useOptimistic: function(e) {
      var i = dn();
      i.memoizedState = i.baseState = e;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return i.queue = a, i = md.bind(
        null,
        kt,
        !0,
        a
      ), a.dispatch = i, [e, i];
    },
    useMemoCache: sd,
    useCacheRefresh: function() {
      return dn().memoizedState = XC.bind(
        null,
        kt
      );
    },
    useEffectEvent: function(e) {
      var i = dn(), a = { impl: e };
      return i.memoizedState = a, function() {
        if ((ne & 2) !== 0)
          throw Error(r(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, pd = {
    readContext: Je,
    use: Jl,
    useCallback: ny,
    useContext: Je,
    useEffect: ud,
    useImperativeHandle: ey,
    useInsertionEffect: Jg,
    useLayoutEffect: Wg,
    useMemo: iy,
    useReducer: Wl,
    useRef: Kg,
    useState: function() {
      return Wl(Oi);
    },
    useDebugValue: cd,
    useDeferredValue: function(e, i) {
      var a = we();
      return sy(
        a,
        le.memoizedState,
        e,
        i
      );
    },
    useTransition: function() {
      var e = Wl(Oi)[0], i = we().memoizedState;
      return [
        typeof e == "boolean" ? e : xo(e),
        i
      ];
    },
    useSyncExternalStore: Og,
    useId: ly,
    useHostTransitionStatus: hd,
    useFormState: Ig,
    useActionState: Ig,
    useOptimistic: function(e, i) {
      var a = we();
      return Bg(a, le, e, i);
    },
    useMemoCache: sd,
    useCacheRefresh: uy
  };
  pd.useEffectEvent = Qg;
  var my = {
    readContext: Je,
    use: Jl,
    useCallback: ny,
    useContext: Je,
    useEffect: ud,
    useImperativeHandle: ey,
    useInsertionEffect: Jg,
    useLayoutEffect: Wg,
    useMemo: iy,
    useReducer: rd,
    useRef: Kg,
    useState: function() {
      return rd(Oi);
    },
    useDebugValue: cd,
    useDeferredValue: function(e, i) {
      var a = we();
      return le === null ? fd(a, e, i) : sy(
        a,
        le.memoizedState,
        e,
        i
      );
    },
    useTransition: function() {
      var e = rd(Oi)[0], i = we().memoizedState;
      return [
        typeof e == "boolean" ? e : xo(e),
        i
      ];
    },
    useSyncExternalStore: Og,
    useId: ly,
    useHostTransitionStatus: hd,
    useFormState: $g,
    useActionState: $g,
    useOptimistic: function(e, i) {
      var a = we();
      return le !== null ? Bg(a, le, e, i) : (a.baseState = e, [e, a.queue.dispatch]);
    },
    useMemoCache: sd,
    useCacheRefresh: uy
  };
  my.useEffectEvent = Qg;
  function gd(e, i, a, l) {
    i = e.memoizedState, a = a(l, i), a = a == null ? i : y({}, i, a), e.memoizedState = a, e.lanes === 0 && (e.updateQueue.baseState = a);
  }
  var yd = {
    enqueueSetState: function(e, i, a) {
      e = e._reactInternals;
      var l = On(), f = cs(l);
      f.payload = i, a != null && (f.callback = a), i = fs(e, f, l), i !== null && (An(i, e, l), po(i, e, l));
    },
    enqueueReplaceState: function(e, i, a) {
      e = e._reactInternals;
      var l = On(), f = cs(l);
      f.tag = 1, f.payload = i, a != null && (f.callback = a), i = fs(e, f, l), i !== null && (An(i, e, l), po(i, e, l));
    },
    enqueueForceUpdate: function(e, i) {
      e = e._reactInternals;
      var a = On(), l = cs(a);
      l.tag = 2, i != null && (l.callback = i), i = fs(e, l, a), i !== null && (An(i, e, a), po(i, e, a));
    }
  };
  function py(e, i, a, l, f, m, b) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(l, m, b) : i.prototype && i.prototype.isPureReactComponent ? !ro(a, l) || !ro(f, m) : !0;
  }
  function gy(e, i, a, l) {
    e = i.state, typeof i.componentWillReceiveProps == "function" && i.componentWillReceiveProps(a, l), typeof i.UNSAFE_componentWillReceiveProps == "function" && i.UNSAFE_componentWillReceiveProps(a, l), i.state !== e && yd.enqueueReplaceState(i, i.state, null);
  }
  function ia(e, i) {
    var a = i;
    if ("ref" in i) {
      a = {};
      for (var l in i)
        l !== "ref" && (a[l] = i[l]);
    }
    if (e = e.defaultProps) {
      a === i && (a = y({}, a));
      for (var f in e)
        a[f] === void 0 && (a[f] = e[f]);
    }
    return a;
  }
  function yy(e) {
    zl(e);
  }
  function vy(e) {
    console.error(e);
  }
  function xy(e) {
    zl(e);
  }
  function iu(e, i) {
    try {
      var a = e.onUncaughtError;
      a(i.value, { componentStack: i.stack });
    } catch (l) {
      setTimeout(function() {
        throw l;
      });
    }
  }
  function by(e, i, a) {
    try {
      var l = e.onCaughtError;
      l(a.value, {
        componentStack: a.stack,
        errorBoundary: i.tag === 1 ? i.stateNode : null
      });
    } catch (f) {
      setTimeout(function() {
        throw f;
      });
    }
  }
  function vd(e, i, a) {
    return a = cs(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      iu(e, i);
    }, a;
  }
  function Ty(e) {
    return e = cs(e), e.tag = 3, e;
  }
  function Sy(e, i, a, l) {
    var f = a.type.getDerivedStateFromError;
    if (typeof f == "function") {
      var m = l.value;
      e.payload = function() {
        return f(m);
      }, e.callback = function() {
        by(i, a, l);
      };
    }
    var b = a.stateNode;
    b !== null && typeof b.componentDidCatch == "function" && (e.callback = function() {
      by(i, a, l), typeof f != "function" && (ys === null ? ys = /* @__PURE__ */ new Set([this]) : ys.add(this));
      var M = l.stack;
      this.componentDidCatch(l.value, {
        componentStack: M !== null ? M : ""
      });
    });
  }
  function IC(e, i, a, l, f) {
    if (a.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
      if (i = a.alternate, i !== null && Fa(
        i,
        a,
        f,
        !0
      ), a = Dn.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
            return qn === null ? pu() : a.alternate === null && Ce === 0 && (Ce = 3), a.flags &= -257, a.flags |= 65536, a.lanes = f, l === Xl ? a.flags |= 16384 : (i = a.updateQueue, i === null ? a.updateQueue = /* @__PURE__ */ new Set([l]) : i.add(l), qd(e, l, f)), !1;
          case 22:
            return a.flags |= 65536, l === Xl ? a.flags |= 16384 : (i = a.updateQueue, i === null ? (i = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([l])
            }, a.updateQueue = i) : (a = i.retryQueue, a === null ? i.retryQueue = /* @__PURE__ */ new Set([l]) : a.add(l)), qd(e, l, f)), !1;
        }
        throw Error(r(435, a.tag));
      }
      return qd(e, l, f), pu(), !1;
    }
    if ($t)
      return i = Dn.current, i !== null ? ((i.flags & 65536) === 0 && (i.flags |= 256), i.flags |= 65536, i.lanes = f, l !== Uf && (e = Error(r(422), { cause: l }), uo(Bn(e, a)))) : (l !== Uf && (i = Error(r(423), {
        cause: l
      }), uo(
        Bn(i, a)
      )), e = e.current.alternate, e.flags |= 65536, f &= -f, e.lanes |= f, l = Bn(l, a), f = vd(
        e.stateNode,
        l,
        f
      ), $f(e, f), Ce !== 4 && (Ce = 2)), !1;
    var m = Error(r(520), { cause: l });
    if (m = Bn(m, a), Do === null ? Do = [m] : Do.push(m), Ce !== 4 && (Ce = 2), i === null) return !0;
    l = Bn(l, a), a = i;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, e = f & -f, a.lanes |= e, e = vd(a.stateNode, l, e), $f(a, e), !1;
        case 1:
          if (i = a.type, m = a.stateNode, (a.flags & 128) === 0 && (typeof i.getDerivedStateFromError == "function" || m !== null && typeof m.componentDidCatch == "function" && (ys === null || !ys.has(m))))
            return a.flags |= 65536, f &= -f, a.lanes |= f, f = Ty(f), Sy(
              f,
              e,
              a,
              l
            ), $f(a, f), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var xd = Error(r(461)), Oe = !1;
  function We(e, i, a, l) {
    i.child = e === null ? _g(i, null, a, l) : ea(
      i,
      e.child,
      a,
      l
    );
  }
  function My(e, i, a, l, f) {
    a = a.render;
    var m = i.ref;
    if ("ref" in l) {
      var b = {};
      for (var M in l)
        M !== "ref" && (b[M] = l[M]);
    } else b = l;
    return Qs(i), l = td(
      e,
      i,
      a,
      b,
      m,
      f
    ), M = ed(), e !== null && !Oe ? (nd(e, i, f), zi(e, i, f)) : ($t && M && kf(i), i.flags |= 1, We(e, i, l, f), i.child);
  }
  function Ay(e, i, a, l, f) {
    if (e === null) {
      var m = a.type;
      return typeof m == "function" && !Rf(m) && m.defaultProps === void 0 && a.compare === null ? (i.tag = 15, i.type = m, Cy(
        e,
        i,
        m,
        l,
        f
      )) : (e = Vl(
        a.type,
        null,
        l,
        i,
        i.mode,
        f
      ), e.ref = i.ref, e.return = i, i.child = e);
    }
    if (m = e.child, !Ed(e, f)) {
      var b = m.memoizedProps;
      if (a = a.compare, a = a !== null ? a : ro, a(b, l) && e.ref === i.ref)
        return zi(e, i, f);
    }
    return i.flags |= 1, e = wi(m, l), e.ref = i.ref, e.return = i, i.child = e;
  }
  function Cy(e, i, a, l, f) {
    if (e !== null) {
      var m = e.memoizedProps;
      if (ro(m, l) && e.ref === i.ref)
        if (Oe = !1, i.pendingProps = l = m, Ed(e, f))
          (e.flags & 131072) !== 0 && (Oe = !0);
        else
          return i.lanes = e.lanes, zi(e, i, f);
    }
    return bd(
      e,
      i,
      a,
      l,
      f
    );
  }
  function _y(e, i, a, l) {
    var f = l.children, m = e !== null ? e.memoizedState : null;
    if (e === null && i.stateNode === null && (i.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), l.mode === "hidden") {
      if ((i.flags & 128) !== 0) {
        if (m = m !== null ? m.baseLanes | a : a, e !== null) {
          for (l = i.child = e.child, f = 0; l !== null; )
            f = f | l.lanes | l.childLanes, l = l.sibling;
          l = f & ~m;
        } else l = 0, i.child = null;
        return Ey(
          e,
          i,
          m,
          a,
          l
        );
      }
      if ((a & 536870912) !== 0)
        i.memoizedState = { baseLanes: 0, cachePool: null }, e !== null && Gl(
          i,
          m !== null ? m.cachePool : null
        ), m !== null ? Dg(i, m) : Zf(), jg(i);
      else
        return l = i.lanes = 536870912, Ey(
          e,
          i,
          m !== null ? m.baseLanes | a : a,
          a,
          l
        );
    } else
      m !== null ? (Gl(i, m.cachePool), Dg(i, m), hs(), i.memoizedState = null) : (e !== null && Gl(i, null), Zf(), hs());
    return We(e, i, f, a), i.child;
  }
  function So(e, i) {
    return e !== null && e.tag === 22 || i.stateNode !== null || (i.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), i.sibling;
  }
  function Ey(e, i, a, l, f) {
    var m = Xf();
    return m = m === null ? null : { parent: Ne._currentValue, pool: m }, i.memoizedState = {
      baseLanes: a,
      cachePool: m
    }, e !== null && Gl(i, null), Zf(), jg(i), e !== null && Fa(e, i, l, !0), i.childLanes = f, null;
  }
  function su(e, i) {
    return i = ru(
      { mode: i.mode, children: i.children },
      e.mode
    ), i.ref = e.ref, e.child = i, i.return = e, i;
  }
  function wy(e, i, a) {
    return ea(i, e.child, null, a), e = su(i, i.pendingProps), e.flags |= 2, jn(i), i.memoizedState = null, e;
  }
  function FC(e, i, a) {
    var l = i.pendingProps, f = (i.flags & 128) !== 0;
    if (i.flags &= -129, e === null) {
      if ($t) {
        if (l.mode === "hidden")
          return e = su(i, l), i.lanes = 536870912, So(null, e);
        if (Jf(i), (e = ve) ? (e = Hv(
          e,
          Gn
        ), e = e !== null && e.data === "&" ? e : null, e !== null && (i.memoizedState = {
          dehydrated: e,
          treeContext: as !== null ? { id: di, overflow: hi } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = fg(e), a.return = i, i.child = a, Qe = i, ve = null)) : e = null, e === null) throw os(i);
        return i.lanes = 536870912, null;
      }
      return su(i, l);
    }
    var m = e.memoizedState;
    if (m !== null) {
      var b = m.dehydrated;
      if (Jf(i), f)
        if (i.flags & 256)
          i.flags &= -257, i = wy(
            e,
            i,
            a
          );
        else if (i.memoizedState !== null)
          i.child = e.child, i.flags |= 128, i = null;
        else throw Error(r(558));
      else if (Oe || Fa(e, i, a, !1), f = (a & e.childLanes) !== 0, Oe || f) {
        if (l = he, l !== null && (b = Zr(l, a), b !== 0 && b !== m.retryLane))
          throw m.retryLane = b, Fs(e, b), An(l, e, b), xd;
        pu(), i = wy(
          e,
          i,
          a
        );
      } else
        e = m.treeContext, ve = Xn(b.nextSibling), Qe = i, $t = !0, rs = null, Gn = !1, e !== null && mg(i, e), i = su(i, l), i.flags |= 4096;
      return i;
    }
    return e = wi(e.child, {
      mode: l.mode,
      children: l.children
    }), e.ref = i.ref, i.child = e, e.return = i, e;
  }
  function au(e, i) {
    var a = i.ref;
    if (a === null)
      e !== null && e.ref !== null && (i.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(r(284));
      (e === null || e.ref !== a) && (i.flags |= 4194816);
    }
  }
  function bd(e, i, a, l, f) {
    return Qs(i), a = td(
      e,
      i,
      a,
      l,
      void 0,
      f
    ), l = ed(), e !== null && !Oe ? (nd(e, i, f), zi(e, i, f)) : ($t && l && kf(i), i.flags |= 1, We(e, i, a, f), i.child);
  }
  function Dy(e, i, a, l, f, m) {
    return Qs(i), i.updateQueue = null, a = Rg(
      i,
      l,
      a,
      f
    ), Ng(e), l = ed(), e !== null && !Oe ? (nd(e, i, m), zi(e, i, m)) : ($t && l && kf(i), i.flags |= 1, We(e, i, a, m), i.child);
  }
  function jy(e, i, a, l, f) {
    if (Qs(i), i.stateNode === null) {
      var m = qa, b = a.contextType;
      typeof b == "object" && b !== null && (m = Je(b)), m = new a(l, m), i.memoizedState = m.state !== null && m.state !== void 0 ? m.state : null, m.updater = yd, i.stateNode = m, m._reactInternals = i, m = i.stateNode, m.props = l, m.state = i.memoizedState, m.refs = {}, If(i), b = a.contextType, m.context = typeof b == "object" && b !== null ? Je(b) : qa, m.state = i.memoizedState, b = a.getDerivedStateFromProps, typeof b == "function" && (gd(
        i,
        a,
        b,
        l
      ), m.state = i.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof m.getSnapshotBeforeUpdate == "function" || typeof m.UNSAFE_componentWillMount != "function" && typeof m.componentWillMount != "function" || (b = m.state, typeof m.componentWillMount == "function" && m.componentWillMount(), typeof m.UNSAFE_componentWillMount == "function" && m.UNSAFE_componentWillMount(), b !== m.state && yd.enqueueReplaceState(m, m.state, null), yo(i, l, m, f), go(), m.state = i.memoizedState), typeof m.componentDidMount == "function" && (i.flags |= 4194308), l = !0;
    } else if (e === null) {
      m = i.stateNode;
      var M = i.memoizedProps, j = ia(a, M);
      m.props = j;
      var $ = m.context, tt = a.contextType;
      b = qa, typeof tt == "object" && tt !== null && (b = Je(tt));
      var it = a.getDerivedStateFromProps;
      tt = typeof it == "function" || typeof m.getSnapshotBeforeUpdate == "function", M = i.pendingProps !== M, tt || typeof m.UNSAFE_componentWillReceiveProps != "function" && typeof m.componentWillReceiveProps != "function" || (M || $ !== b) && gy(
        i,
        m,
        l,
        b
      ), us = !1;
      var K = i.memoizedState;
      m.state = K, yo(i, l, m, f), go(), $ = i.memoizedState, M || K !== $ || us ? (typeof it == "function" && (gd(
        i,
        a,
        it,
        l
      ), $ = i.memoizedState), (j = us || py(
        i,
        a,
        j,
        l,
        K,
        $,
        b
      )) ? (tt || typeof m.UNSAFE_componentWillMount != "function" && typeof m.componentWillMount != "function" || (typeof m.componentWillMount == "function" && m.componentWillMount(), typeof m.UNSAFE_componentWillMount == "function" && m.UNSAFE_componentWillMount()), typeof m.componentDidMount == "function" && (i.flags |= 4194308)) : (typeof m.componentDidMount == "function" && (i.flags |= 4194308), i.memoizedProps = l, i.memoizedState = $), m.props = l, m.state = $, m.context = b, l = j) : (typeof m.componentDidMount == "function" && (i.flags |= 4194308), l = !1);
    } else {
      m = i.stateNode, Ff(e, i), b = i.memoizedProps, tt = ia(a, b), m.props = tt, it = i.pendingProps, K = m.context, $ = a.contextType, j = qa, typeof $ == "object" && $ !== null && (j = Je($)), M = a.getDerivedStateFromProps, ($ = typeof M == "function" || typeof m.getSnapshotBeforeUpdate == "function") || typeof m.UNSAFE_componentWillReceiveProps != "function" && typeof m.componentWillReceiveProps != "function" || (b !== it || K !== j) && gy(
        i,
        m,
        l,
        j
      ), us = !1, K = i.memoizedState, m.state = K, yo(i, l, m, f), go();
      var Q = i.memoizedState;
      b !== it || K !== Q || us || e !== null && e.dependencies !== null && Hl(e.dependencies) ? (typeof M == "function" && (gd(
        i,
        a,
        M,
        l
      ), Q = i.memoizedState), (tt = us || py(
        i,
        a,
        tt,
        l,
        K,
        Q,
        j
      ) || e !== null && e.dependencies !== null && Hl(e.dependencies)) ? ($ || typeof m.UNSAFE_componentWillUpdate != "function" && typeof m.componentWillUpdate != "function" || (typeof m.componentWillUpdate == "function" && m.componentWillUpdate(l, Q, j), typeof m.UNSAFE_componentWillUpdate == "function" && m.UNSAFE_componentWillUpdate(
        l,
        Q,
        j
      )), typeof m.componentDidUpdate == "function" && (i.flags |= 4), typeof m.getSnapshotBeforeUpdate == "function" && (i.flags |= 1024)) : (typeof m.componentDidUpdate != "function" || b === e.memoizedProps && K === e.memoizedState || (i.flags |= 4), typeof m.getSnapshotBeforeUpdate != "function" || b === e.memoizedProps && K === e.memoizedState || (i.flags |= 1024), i.memoizedProps = l, i.memoizedState = Q), m.props = l, m.state = Q, m.context = j, l = tt) : (typeof m.componentDidUpdate != "function" || b === e.memoizedProps && K === e.memoizedState || (i.flags |= 4), typeof m.getSnapshotBeforeUpdate != "function" || b === e.memoizedProps && K === e.memoizedState || (i.flags |= 1024), l = !1);
    }
    return m = l, au(e, i), l = (i.flags & 128) !== 0, m || l ? (m = i.stateNode, a = l && typeof a.getDerivedStateFromError != "function" ? null : m.render(), i.flags |= 1, e !== null && l ? (i.child = ea(
      i,
      e.child,
      null,
      f
    ), i.child = ea(
      i,
      null,
      a,
      f
    )) : We(e, i, a, f), i.memoizedState = m.state, e = i.child) : e = zi(
      e,
      i,
      f
    ), e;
  }
  function Ny(e, i, a, l) {
    return Ks(), i.flags |= 256, We(e, i, a, l), i.child;
  }
  var Td = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function Sd(e) {
    return { baseLanes: e, cachePool: bg() };
  }
  function Md(e, i, a) {
    return e = e !== null ? e.childLanes & ~a : 0, i && (e |= Rn), e;
  }
  function Ry(e, i, a) {
    var l = i.pendingProps, f = !1, m = (i.flags & 128) !== 0, b;
    if ((b = m) || (b = e !== null && e.memoizedState === null ? !1 : (Ee.current & 2) !== 0), b && (f = !0, i.flags &= -129), b = (i.flags & 32) !== 0, i.flags &= -33, e === null) {
      if ($t) {
        if (f ? ds(i) : hs(), (e = ve) ? (e = Hv(
          e,
          Gn
        ), e = e !== null && e.data !== "&" ? e : null, e !== null && (i.memoizedState = {
          dehydrated: e,
          treeContext: as !== null ? { id: di, overflow: hi } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = fg(e), a.return = i, i.child = a, Qe = i, ve = null)) : e = null, e === null) throw os(i);
        return ah(e) ? i.lanes = 32 : i.lanes = 536870912, null;
      }
      var M = l.children;
      return l = l.fallback, f ? (hs(), f = i.mode, M = ru(
        { mode: "hidden", children: M },
        f
      ), l = $s(
        l,
        f,
        a,
        null
      ), M.return = i, l.return = i, M.sibling = l, i.child = M, l = i.child, l.memoizedState = Sd(a), l.childLanes = Md(
        e,
        b,
        a
      ), i.memoizedState = Td, So(null, l)) : (ds(i), Ad(i, M));
    }
    var j = e.memoizedState;
    if (j !== null && (M = j.dehydrated, M !== null)) {
      if (m)
        i.flags & 256 ? (ds(i), i.flags &= -257, i = Cd(
          e,
          i,
          a
        )) : i.memoizedState !== null ? (hs(), i.child = e.child, i.flags |= 128, i = null) : (hs(), M = l.fallback, f = i.mode, l = ru(
          { mode: "visible", children: l.children },
          f
        ), M = $s(
          M,
          f,
          a,
          null
        ), M.flags |= 2, l.return = i, M.return = i, l.sibling = M, i.child = l, ea(
          i,
          e.child,
          null,
          a
        ), l = i.child, l.memoizedState = Sd(a), l.childLanes = Md(
          e,
          b,
          a
        ), i.memoizedState = Td, i = So(null, l));
      else if (ds(i), ah(M)) {
        if (b = M.nextSibling && M.nextSibling.dataset, b) var $ = b.dgst;
        b = $, l = Error(r(419)), l.stack = "", l.digest = b, uo({ value: l, source: null, stack: null }), i = Cd(
          e,
          i,
          a
        );
      } else if (Oe || Fa(e, i, a, !1), b = (a & e.childLanes) !== 0, Oe || b) {
        if (b = he, b !== null && (l = Zr(b, a), l !== 0 && l !== j.retryLane))
          throw j.retryLane = l, Fs(e, l), An(b, e, l), xd;
        sh(M) || pu(), i = Cd(
          e,
          i,
          a
        );
      } else
        sh(M) ? (i.flags |= 192, i.child = e.child, i = null) : (e = j.treeContext, ve = Xn(
          M.nextSibling
        ), Qe = i, $t = !0, rs = null, Gn = !1, e !== null && mg(i, e), i = Ad(
          i,
          l.children
        ), i.flags |= 4096);
      return i;
    }
    return f ? (hs(), M = l.fallback, f = i.mode, j = e.child, $ = j.sibling, l = wi(j, {
      mode: "hidden",
      children: l.children
    }), l.subtreeFlags = j.subtreeFlags & 65011712, $ !== null ? M = wi(
      $,
      M
    ) : (M = $s(
      M,
      f,
      a,
      null
    ), M.flags |= 2), M.return = i, l.return = i, l.sibling = M, i.child = l, So(null, l), l = i.child, M = e.child.memoizedState, M === null ? M = Sd(a) : (f = M.cachePool, f !== null ? (j = Ne._currentValue, f = f.parent !== j ? { parent: j, pool: j } : f) : f = bg(), M = {
      baseLanes: M.baseLanes | a,
      cachePool: f
    }), l.memoizedState = M, l.childLanes = Md(
      e,
      b,
      a
    ), i.memoizedState = Td, So(e.child, l)) : (ds(i), a = e.child, e = a.sibling, a = wi(a, {
      mode: "visible",
      children: l.children
    }), a.return = i, a.sibling = null, e !== null && (b = i.deletions, b === null ? (i.deletions = [e], i.flags |= 16) : b.push(e)), i.child = a, i.memoizedState = null, a);
  }
  function Ad(e, i) {
    return i = ru(
      { mode: "visible", children: i },
      e.mode
    ), i.return = e, e.child = i;
  }
  function ru(e, i) {
    return e = wn(22, e, null, i), e.lanes = 0, e;
  }
  function Cd(e, i, a) {
    return ea(i, e.child, null, a), e = Ad(
      i,
      i.pendingProps.children
    ), e.flags |= 2, i.memoizedState = null, e;
  }
  function Oy(e, i, a) {
    e.lanes |= i;
    var l = e.alternate;
    l !== null && (l.lanes |= i), Hf(e.return, i, a);
  }
  function _d(e, i, a, l, f, m) {
    var b = e.memoizedState;
    b === null ? e.memoizedState = {
      isBackwards: i,
      rendering: null,
      renderingStartTime: 0,
      last: l,
      tail: a,
      tailMode: f,
      treeForkCount: m
    } : (b.isBackwards = i, b.rendering = null, b.renderingStartTime = 0, b.last = l, b.tail = a, b.tailMode = f, b.treeForkCount = m);
  }
  function zy(e, i, a) {
    var l = i.pendingProps, f = l.revealOrder, m = l.tail;
    l = l.children;
    var b = Ee.current, M = (b & 2) !== 0;
    if (M ? (b = b & 1 | 2, i.flags |= 128) : b &= 1, nt(Ee, b), We(e, i, l, a), l = $t ? lo : 0, !M && e !== null && (e.flags & 128) !== 0)
      t: for (e = i.child; e !== null; ) {
        if (e.tag === 13)
          e.memoizedState !== null && Oy(e, a, i);
        else if (e.tag === 19)
          Oy(e, a, i);
        else if (e.child !== null) {
          e.child.return = e, e = e.child;
          continue;
        }
        if (e === i) break t;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === i)
            break t;
          e = e.return;
        }
        e.sibling.return = e.return, e = e.sibling;
      }
    switch (f) {
      case "forwards":
        for (a = i.child, f = null; a !== null; )
          e = a.alternate, e !== null && $l(e) === null && (f = a), a = a.sibling;
        a = f, a === null ? (f = i.child, i.child = null) : (f = a.sibling, a.sibling = null), _d(
          i,
          !1,
          f,
          a,
          m,
          l
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (a = null, f = i.child, i.child = null; f !== null; ) {
          if (e = f.alternate, e !== null && $l(e) === null) {
            i.child = f;
            break;
          }
          e = f.sibling, f.sibling = a, a = f, f = e;
        }
        _d(
          i,
          !0,
          a,
          null,
          m,
          l
        );
        break;
      case "together":
        _d(
          i,
          !1,
          null,
          null,
          void 0,
          l
        );
        break;
      default:
        i.memoizedState = null;
    }
    return i.child;
  }
  function zi(e, i, a) {
    if (e !== null && (i.dependencies = e.dependencies), gs |= i.lanes, (a & i.childLanes) === 0)
      if (e !== null) {
        if (Fa(
          e,
          i,
          a,
          !1
        ), (a & i.childLanes) === 0)
          return null;
      } else return null;
    if (e !== null && i.child !== e.child)
      throw Error(r(153));
    if (i.child !== null) {
      for (e = i.child, a = wi(e, e.pendingProps), i.child = a, a.return = i; e.sibling !== null; )
        e = e.sibling, a = a.sibling = wi(e, e.pendingProps), a.return = i;
      a.sibling = null;
    }
    return i.child;
  }
  function Ed(e, i) {
    return (e.lanes & i) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && Hl(e)));
  }
  function $C(e, i, a) {
    switch (i.tag) {
      case 3:
        Tt(i, i.stateNode.containerInfo), ls(i, Ne, e.memoizedState.cache), Ks();
        break;
      case 27:
      case 5:
        ct(i);
        break;
      case 4:
        Tt(i, i.stateNode.containerInfo);
        break;
      case 10:
        ls(
          i,
          i.type,
          i.memoizedProps.value
        );
        break;
      case 31:
        if (i.memoizedState !== null)
          return i.flags |= 128, Jf(i), null;
        break;
      case 13:
        var l = i.memoizedState;
        if (l !== null)
          return l.dehydrated !== null ? (ds(i), i.flags |= 128, null) : (a & i.child.childLanes) !== 0 ? Ry(e, i, a) : (ds(i), e = zi(
            e,
            i,
            a
          ), e !== null ? e.sibling : null);
        ds(i);
        break;
      case 19:
        var f = (e.flags & 128) !== 0;
        if (l = (a & i.childLanes) !== 0, l || (Fa(
          e,
          i,
          a,
          !1
        ), l = (a & i.childLanes) !== 0), f) {
          if (l)
            return zy(
              e,
              i,
              a
            );
          i.flags |= 128;
        }
        if (f = i.memoizedState, f !== null && (f.rendering = null, f.tail = null, f.lastEffect = null), nt(Ee, Ee.current), l) break;
        return null;
      case 22:
        return i.lanes = 0, _y(
          e,
          i,
          a,
          i.pendingProps
        );
      case 24:
        ls(i, Ne, e.memoizedState.cache);
    }
    return zi(e, i, a);
  }
  function ky(e, i, a) {
    if (e !== null)
      if (e.memoizedProps !== i.pendingProps)
        Oe = !0;
      else {
        if (!Ed(e, a) && (i.flags & 128) === 0)
          return Oe = !1, $C(
            e,
            i,
            a
          );
        Oe = (e.flags & 131072) !== 0;
      }
    else
      Oe = !1, $t && (i.flags & 1048576) !== 0 && hg(i, lo, i.index);
    switch (i.lanes = 0, i.tag) {
      case 16:
        t: {
          var l = i.pendingProps;
          if (e = Ws(i.elementType), i.type = e, typeof e == "function")
            Rf(e) ? (l = ia(e, l), i.tag = 1, i = jy(
              null,
              i,
              e,
              l,
              a
            )) : (i.tag = 0, i = bd(
              null,
              i,
              e,
              l,
              a
            ));
          else {
            if (e != null) {
              var f = e.$$typeof;
              if (f === k) {
                i.tag = 11, i = My(
                  null,
                  i,
                  e,
                  l,
                  a
                );
                break t;
              } else if (f === X) {
                i.tag = 14, i = Ay(
                  null,
                  i,
                  e,
                  l,
                  a
                );
                break t;
              }
            }
            throw i = dt(e) || e, Error(r(306, i, ""));
          }
        }
        return i;
      case 0:
        return bd(
          e,
          i,
          i.type,
          i.pendingProps,
          a
        );
      case 1:
        return l = i.type, f = ia(
          l,
          i.pendingProps
        ), jy(
          e,
          i,
          l,
          f,
          a
        );
      case 3:
        t: {
          if (Tt(
            i,
            i.stateNode.containerInfo
          ), e === null) throw Error(r(387));
          l = i.pendingProps;
          var m = i.memoizedState;
          f = m.element, Ff(e, i), yo(i, l, null, a);
          var b = i.memoizedState;
          if (l = b.cache, ls(i, Ne, l), l !== m.cache && Yf(
            i,
            [Ne],
            a,
            !0
          ), go(), l = b.element, m.isDehydrated)
            if (m = {
              element: l,
              isDehydrated: !1,
              cache: b.cache
            }, i.updateQueue.baseState = m, i.memoizedState = m, i.flags & 256) {
              i = Ny(
                e,
                i,
                l,
                a
              );
              break t;
            } else if (l !== f) {
              f = Bn(
                Error(r(424)),
                i
              ), uo(f), i = Ny(
                e,
                i,
                l,
                a
              );
              break t;
            } else
              for (e = i.stateNode.containerInfo, e.nodeType === 9 ? e = e.body : e = e.nodeName === "HTML" ? e.ownerDocument.body : e, ve = Xn(e.firstChild), Qe = i, $t = !0, rs = null, Gn = !0, a = _g(
                i,
                null,
                l,
                a
              ), i.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
          else {
            if (Ks(), l === f) {
              i = zi(
                e,
                i,
                a
              );
              break t;
            }
            We(e, i, l, a);
          }
          i = i.child;
        }
        return i;
      case 26:
        return au(e, i), e === null ? (a = Iv(
          i.type,
          null,
          i.pendingProps,
          null
        )) ? i.memoizedState = a : $t || (a = i.type, e = i.pendingProps, l = Su(
          st.current
        ).createElement(a), l[Ze] = i, l[vn] = e, tn(l, a, e), qe(l), i.stateNode = l) : i.memoizedState = Iv(
          i.type,
          e.memoizedProps,
          i.pendingProps,
          e.memoizedState
        ), null;
      case 27:
        return ct(i), e === null && $t && (l = i.stateNode = qv(
          i.type,
          i.pendingProps,
          st.current
        ), Qe = i, Gn = !0, f = ve, Ts(i.type) ? (rh = f, ve = Xn(l.firstChild)) : ve = f), We(
          e,
          i,
          i.pendingProps.children,
          a
        ), au(e, i), e === null && (i.flags |= 4194304), i.child;
      case 5:
        return e === null && $t && ((f = l = ve) && (l = A_(
          l,
          i.type,
          i.pendingProps,
          Gn
        ), l !== null ? (i.stateNode = l, Qe = i, ve = Xn(l.firstChild), Gn = !1, f = !0) : f = !1), f || os(i)), ct(i), f = i.type, m = i.pendingProps, b = e !== null ? e.memoizedProps : null, l = m.children, eh(f, m) ? l = null : b !== null && eh(f, b) && (i.flags |= 32), i.memoizedState !== null && (f = td(
          e,
          i,
          BC,
          null,
          null,
          a
        ), Uo._currentValue = f), au(e, i), We(e, i, l, a), i.child;
      case 6:
        return e === null && $t && ((e = a = ve) && (a = C_(
          a,
          i.pendingProps,
          Gn
        ), a !== null ? (i.stateNode = a, Qe = i, ve = null, e = !0) : e = !1), e || os(i)), null;
      case 13:
        return Ry(e, i, a);
      case 4:
        return Tt(
          i,
          i.stateNode.containerInfo
        ), l = i.pendingProps, e === null ? i.child = ea(
          i,
          null,
          l,
          a
        ) : We(e, i, l, a), i.child;
      case 11:
        return My(
          e,
          i,
          i.type,
          i.pendingProps,
          a
        );
      case 7:
        return We(
          e,
          i,
          i.pendingProps,
          a
        ), i.child;
      case 8:
        return We(
          e,
          i,
          i.pendingProps.children,
          a
        ), i.child;
      case 12:
        return We(
          e,
          i,
          i.pendingProps.children,
          a
        ), i.child;
      case 10:
        return l = i.pendingProps, ls(i, i.type, l.value), We(e, i, l.children, a), i.child;
      case 9:
        return f = i.type._context, l = i.pendingProps.children, Qs(i), f = Je(f), l = l(f), i.flags |= 1, We(e, i, l, a), i.child;
      case 14:
        return Ay(
          e,
          i,
          i.type,
          i.pendingProps,
          a
        );
      case 15:
        return Cy(
          e,
          i,
          i.type,
          i.pendingProps,
          a
        );
      case 19:
        return zy(e, i, a);
      case 31:
        return FC(e, i, a);
      case 22:
        return _y(
          e,
          i,
          a,
          i.pendingProps
        );
      case 24:
        return Qs(i), l = Je(Ne), e === null ? (f = Xf(), f === null && (f = he, m = Gf(), f.pooledCache = m, m.refCount++, m !== null && (f.pooledCacheLanes |= a), f = m), i.memoizedState = { parent: l, cache: f }, If(i), ls(i, Ne, f)) : ((e.lanes & a) !== 0 && (Ff(e, i), yo(i, null, null, a), go()), f = e.memoizedState, m = i.memoizedState, f.parent !== l ? (f = { parent: l, cache: l }, i.memoizedState = f, i.lanes === 0 && (i.memoizedState = i.updateQueue.baseState = f), ls(i, Ne, l)) : (l = m.cache, ls(i, Ne, l), l !== f.cache && Yf(
          i,
          [Ne],
          a,
          !0
        ))), We(
          e,
          i,
          i.pendingProps.children,
          a
        ), i.child;
      case 29:
        throw i.pendingProps;
    }
    throw Error(r(156, i.tag));
  }
  function ki(e) {
    e.flags |= 4;
  }
  function wd(e, i, a, l, f) {
    if ((i = (e.mode & 32) !== 0) && (i = !1), i) {
      if (e.flags |= 16777216, (f & 335544128) === f)
        if (e.stateNode.complete) e.flags |= 8192;
        else if (lv()) e.flags |= 8192;
        else
          throw ta = Xl, Pf;
    } else e.flags &= -16777217;
  }
  function Ly(e, i) {
    if (i.type !== "stylesheet" || (i.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (e.flags |= 16777216, !Qv(i))
      if (lv()) e.flags |= 8192;
      else
        throw ta = Xl, Pf;
  }
  function ou(e, i) {
    i !== null && (e.flags |= 4), e.flags & 16384 && (i = e.tag !== 22 ? Yt() : 536870912, e.lanes |= i, ar |= i);
  }
  function Mo(e, i) {
    if (!$t)
      switch (e.tailMode) {
        case "hidden":
          i = e.tail;
          for (var a = null; i !== null; )
            i.alternate !== null && (a = i), i = i.sibling;
          a === null ? e.tail = null : a.sibling = null;
          break;
        case "collapsed":
          a = e.tail;
          for (var l = null; a !== null; )
            a.alternate !== null && (l = a), a = a.sibling;
          l === null ? i || e.tail === null ? e.tail = null : e.tail.sibling = null : l.sibling = null;
      }
  }
  function xe(e) {
    var i = e.alternate !== null && e.alternate.child === e.child, a = 0, l = 0;
    if (i)
      for (var f = e.child; f !== null; )
        a |= f.lanes | f.childLanes, l |= f.subtreeFlags & 65011712, l |= f.flags & 65011712, f.return = e, f = f.sibling;
    else
      for (f = e.child; f !== null; )
        a |= f.lanes | f.childLanes, l |= f.subtreeFlags, l |= f.flags, f.return = e, f = f.sibling;
    return e.subtreeFlags |= l, e.childLanes = a, i;
  }
  function KC(e, i, a) {
    var l = i.pendingProps;
    switch (Lf(i), i.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return xe(i), null;
      case 1:
        return xe(i), null;
      case 3:
        return a = i.stateNode, l = null, e !== null && (l = e.memoizedState.cache), i.memoizedState.cache !== l && (i.flags |= 2048), Ni(Ne), P(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (e === null || e.child === null) && (Ia(i) ? ki(i) : e === null || e.memoizedState.isDehydrated && (i.flags & 256) === 0 || (i.flags |= 1024, Vf())), xe(i), null;
      case 26:
        var f = i.type, m = i.memoizedState;
        return e === null ? (ki(i), m !== null ? (xe(i), Ly(i, m)) : (xe(i), wd(
          i,
          f,
          null,
          l,
          a
        ))) : m ? m !== e.memoizedState ? (ki(i), xe(i), Ly(i, m)) : (xe(i), i.flags &= -16777217) : (e = e.memoizedProps, e !== l && ki(i), xe(i), wd(
          i,
          f,
          e,
          l,
          a
        )), null;
      case 27:
        if (ht(i), a = st.current, f = i.type, e !== null && i.stateNode != null)
          e.memoizedProps !== l && ki(i);
        else {
          if (!l) {
            if (i.stateNode === null)
              throw Error(r(166));
            return xe(i), null;
          }
          e = at.current, Ia(i) ? pg(i) : (e = qv(f, l, a), i.stateNode = e, ki(i));
        }
        return xe(i), null;
      case 5:
        if (ht(i), f = i.type, e !== null && i.stateNode != null)
          e.memoizedProps !== l && ki(i);
        else {
          if (!l) {
            if (i.stateNode === null)
              throw Error(r(166));
            return xe(i), null;
          }
          if (m = at.current, Ia(i))
            pg(i);
          else {
            var b = Su(
              st.current
            );
            switch (m) {
              case 1:
                m = b.createElementNS(
                  "http://www.w3.org/2000/svg",
                  f
                );
                break;
              case 2:
                m = b.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  f
                );
                break;
              default:
                switch (f) {
                  case "svg":
                    m = b.createElementNS(
                      "http://www.w3.org/2000/svg",
                      f
                    );
                    break;
                  case "math":
                    m = b.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      f
                    );
                    break;
                  case "script":
                    m = b.createElement("div"), m.innerHTML = "<script><\/script>", m = m.removeChild(
                      m.firstChild
                    );
                    break;
                  case "select":
                    m = typeof l.is == "string" ? b.createElement("select", {
                      is: l.is
                    }) : b.createElement("select"), l.multiple ? m.multiple = !0 : l.size && (m.size = l.size);
                    break;
                  default:
                    m = typeof l.is == "string" ? b.createElement(f, { is: l.is }) : b.createElement(f);
                }
            }
            m[Ze] = i, m[vn] = l;
            t: for (b = i.child; b !== null; ) {
              if (b.tag === 5 || b.tag === 6)
                m.appendChild(b.stateNode);
              else if (b.tag !== 4 && b.tag !== 27 && b.child !== null) {
                b.child.return = b, b = b.child;
                continue;
              }
              if (b === i) break t;
              for (; b.sibling === null; ) {
                if (b.return === null || b.return === i)
                  break t;
                b = b.return;
              }
              b.sibling.return = b.return, b = b.sibling;
            }
            i.stateNode = m;
            t: switch (tn(m, f, l), f) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                l = !!l.autoFocus;
                break t;
              case "img":
                l = !0;
                break t;
              default:
                l = !1;
            }
            l && ki(i);
          }
        }
        return xe(i), wd(
          i,
          i.type,
          e === null ? null : e.memoizedProps,
          i.pendingProps,
          a
        ), null;
      case 6:
        if (e && i.stateNode != null)
          e.memoizedProps !== l && ki(i);
        else {
          if (typeof l != "string" && i.stateNode === null)
            throw Error(r(166));
          if (e = st.current, Ia(i)) {
            if (e = i.stateNode, a = i.memoizedProps, l = null, f = Qe, f !== null)
              switch (f.tag) {
                case 27:
                case 5:
                  l = f.memoizedProps;
              }
            e[Ze] = i, e = !!(e.nodeValue === a || l !== null && l.suppressHydrationWarning === !0 || Rv(e.nodeValue, a)), e || os(i, !0);
          } else
            e = Su(e).createTextNode(
              l
            ), e[Ze] = i, i.stateNode = e;
        }
        return xe(i), null;
      case 31:
        if (a = i.memoizedState, e === null || e.memoizedState !== null) {
          if (l = Ia(i), a !== null) {
            if (e === null) {
              if (!l) throw Error(r(318));
              if (e = i.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(r(557));
              e[Ze] = i;
            } else
              Ks(), (i.flags & 128) === 0 && (i.memoizedState = null), i.flags |= 4;
            xe(i), e = !1;
          } else
            a = Vf(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a), e = !0;
          if (!e)
            return i.flags & 256 ? (jn(i), i) : (jn(i), null);
          if ((i.flags & 128) !== 0)
            throw Error(r(558));
        }
        return xe(i), null;
      case 13:
        if (l = i.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (f = Ia(i), l !== null && l.dehydrated !== null) {
            if (e === null) {
              if (!f) throw Error(r(318));
              if (f = i.memoizedState, f = f !== null ? f.dehydrated : null, !f) throw Error(r(317));
              f[Ze] = i;
            } else
              Ks(), (i.flags & 128) === 0 && (i.memoizedState = null), i.flags |= 4;
            xe(i), f = !1;
          } else
            f = Vf(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = f), f = !0;
          if (!f)
            return i.flags & 256 ? (jn(i), i) : (jn(i), null);
        }
        return jn(i), (i.flags & 128) !== 0 ? (i.lanes = a, i) : (a = l !== null, e = e !== null && e.memoizedState !== null, a && (l = i.child, f = null, l.alternate !== null && l.alternate.memoizedState !== null && l.alternate.memoizedState.cachePool !== null && (f = l.alternate.memoizedState.cachePool.pool), m = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (m = l.memoizedState.cachePool.pool), m !== f && (l.flags |= 2048)), a !== e && a && (i.child.flags |= 8192), ou(i, i.updateQueue), xe(i), null);
      case 4:
        return P(), e === null && Zd(i.stateNode.containerInfo), xe(i), null;
      case 10:
        return Ni(i.type), xe(i), null;
      case 19:
        if (V(Ee), l = i.memoizedState, l === null) return xe(i), null;
        if (f = (i.flags & 128) !== 0, m = l.rendering, m === null)
          if (f) Mo(l, !1);
          else {
            if (Ce !== 0 || e !== null && (e.flags & 128) !== 0)
              for (e = i.child; e !== null; ) {
                if (m = $l(e), m !== null) {
                  for (i.flags |= 128, Mo(l, !1), e = m.updateQueue, i.updateQueue = e, ou(i, e), i.subtreeFlags = 0, e = a, a = i.child; a !== null; )
                    cg(a, e), a = a.sibling;
                  return nt(
                    Ee,
                    Ee.current & 1 | 2
                  ), $t && Di(i, l.treeForkCount), i.child;
                }
                e = e.sibling;
              }
            l.tail !== null && jt() > du && (i.flags |= 128, f = !0, Mo(l, !1), i.lanes = 4194304);
          }
        else {
          if (!f)
            if (e = $l(m), e !== null) {
              if (i.flags |= 128, f = !0, e = e.updateQueue, i.updateQueue = e, ou(i, e), Mo(l, !0), l.tail === null && l.tailMode === "hidden" && !m.alternate && !$t)
                return xe(i), null;
            } else
              2 * jt() - l.renderingStartTime > du && a !== 536870912 && (i.flags |= 128, f = !0, Mo(l, !1), i.lanes = 4194304);
          l.isBackwards ? (m.sibling = i.child, i.child = m) : (e = l.last, e !== null ? e.sibling = m : i.child = m, l.last = m);
        }
        return l.tail !== null ? (e = l.tail, l.rendering = e, l.tail = e.sibling, l.renderingStartTime = jt(), e.sibling = null, a = Ee.current, nt(
          Ee,
          f ? a & 1 | 2 : a & 1
        ), $t && Di(i, l.treeForkCount), e) : (xe(i), null);
      case 22:
      case 23:
        return jn(i), Qf(), l = i.memoizedState !== null, e !== null ? e.memoizedState !== null !== l && (i.flags |= 8192) : l && (i.flags |= 8192), l ? (a & 536870912) !== 0 && (i.flags & 128) === 0 && (xe(i), i.subtreeFlags & 6 && (i.flags |= 8192)) : xe(i), a = i.updateQueue, a !== null && ou(i, a.retryQueue), a = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (a = e.memoizedState.cachePool.pool), l = null, i.memoizedState !== null && i.memoizedState.cachePool !== null && (l = i.memoizedState.cachePool.pool), l !== a && (i.flags |= 2048), e !== null && V(Js), null;
      case 24:
        return a = null, e !== null && (a = e.memoizedState.cache), i.memoizedState.cache !== a && (i.flags |= 2048), Ni(Ne), xe(i), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(r(156, i.tag));
  }
  function ZC(e, i) {
    switch (Lf(i), i.tag) {
      case 1:
        return e = i.flags, e & 65536 ? (i.flags = e & -65537 | 128, i) : null;
      case 3:
        return Ni(Ne), P(), e = i.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (i.flags = e & -65537 | 128, i) : null;
      case 26:
      case 27:
      case 5:
        return ht(i), null;
      case 31:
        if (i.memoizedState !== null) {
          if (jn(i), i.alternate === null)
            throw Error(r(340));
          Ks();
        }
        return e = i.flags, e & 65536 ? (i.flags = e & -65537 | 128, i) : null;
      case 13:
        if (jn(i), e = i.memoizedState, e !== null && e.dehydrated !== null) {
          if (i.alternate === null)
            throw Error(r(340));
          Ks();
        }
        return e = i.flags, e & 65536 ? (i.flags = e & -65537 | 128, i) : null;
      case 19:
        return V(Ee), null;
      case 4:
        return P(), null;
      case 10:
        return Ni(i.type), null;
      case 22:
      case 23:
        return jn(i), Qf(), e !== null && V(Js), e = i.flags, e & 65536 ? (i.flags = e & -65537 | 128, i) : null;
      case 24:
        return Ni(Ne), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function Uy(e, i) {
    switch (Lf(i), i.tag) {
      case 3:
        Ni(Ne), P();
        break;
      case 26:
      case 27:
      case 5:
        ht(i);
        break;
      case 4:
        P();
        break;
      case 31:
        i.memoizedState !== null && jn(i);
        break;
      case 13:
        jn(i);
        break;
      case 19:
        V(Ee);
        break;
      case 10:
        Ni(i.type);
        break;
      case 22:
      case 23:
        jn(i), Qf(), e !== null && V(Js);
        break;
      case 24:
        Ni(Ne);
    }
  }
  function Ao(e, i) {
    try {
      var a = i.updateQueue, l = a !== null ? a.lastEffect : null;
      if (l !== null) {
        var f = l.next;
        a = f;
        do {
          if ((a.tag & e) === e) {
            l = void 0;
            var m = a.create, b = a.inst;
            l = m(), b.destroy = l;
          }
          a = a.next;
        } while (a !== f);
      }
    } catch (M) {
      se(i, i.return, M);
    }
  }
  function ms(e, i, a) {
    try {
      var l = i.updateQueue, f = l !== null ? l.lastEffect : null;
      if (f !== null) {
        var m = f.next;
        l = m;
        do {
          if ((l.tag & e) === e) {
            var b = l.inst, M = b.destroy;
            if (M !== void 0) {
              b.destroy = void 0, f = i;
              var j = a, $ = M;
              try {
                $();
              } catch (tt) {
                se(
                  f,
                  j,
                  tt
                );
              }
            }
          }
          l = l.next;
        } while (l !== m);
      }
    } catch (tt) {
      se(i, i.return, tt);
    }
  }
  function Vy(e) {
    var i = e.updateQueue;
    if (i !== null) {
      var a = e.stateNode;
      try {
        wg(i, a);
      } catch (l) {
        se(e, e.return, l);
      }
    }
  }
  function By(e, i, a) {
    a.props = ia(
      e.type,
      e.memoizedProps
    ), a.state = e.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (l) {
      se(e, i, l);
    }
  }
  function Co(e, i) {
    try {
      var a = e.ref;
      if (a !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var l = e.stateNode;
            break;
          case 30:
            l = e.stateNode;
            break;
          default:
            l = e.stateNode;
        }
        typeof a == "function" ? e.refCleanup = a(l) : a.current = l;
      }
    } catch (f) {
      se(e, i, f);
    }
  }
  function mi(e, i) {
    var a = e.ref, l = e.refCleanup;
    if (a !== null)
      if (typeof l == "function")
        try {
          l();
        } catch (f) {
          se(e, i, f);
        } finally {
          e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (f) {
          se(e, i, f);
        }
      else a.current = null;
  }
  function Hy(e) {
    var i = e.type, a = e.memoizedProps, l = e.stateNode;
    try {
      t: switch (i) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && l.focus();
          break t;
        case "img":
          a.src ? l.src = a.src : a.srcSet && (l.srcset = a.srcSet);
      }
    } catch (f) {
      se(e, e.return, f);
    }
  }
  function Dd(e, i, a) {
    try {
      var l = e.stateNode;
      v_(l, e.type, a, i), l[vn] = i;
    } catch (f) {
      se(e, e.return, f);
    }
  }
  function Yy(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Ts(e.type) || e.tag === 4;
  }
  function jd(e) {
    t: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || Yy(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.tag === 27 && Ts(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue t;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function Nd(e, i, a) {
    var l = e.tag;
    if (l === 5 || l === 6)
      e = e.stateNode, i ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, i) : (i = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, i.appendChild(e), a = a._reactRootContainer, a != null || i.onclick !== null || (i.onclick = _i));
    else if (l !== 4 && (l === 27 && Ts(e.type) && (a = e.stateNode, i = null), e = e.child, e !== null))
      for (Nd(e, i, a), e = e.sibling; e !== null; )
        Nd(e, i, a), e = e.sibling;
  }
  function lu(e, i, a) {
    var l = e.tag;
    if (l === 5 || l === 6)
      e = e.stateNode, i ? a.insertBefore(e, i) : a.appendChild(e);
    else if (l !== 4 && (l === 27 && Ts(e.type) && (a = e.stateNode), e = e.child, e !== null))
      for (lu(e, i, a), e = e.sibling; e !== null; )
        lu(e, i, a), e = e.sibling;
  }
  function Gy(e) {
    var i = e.stateNode, a = e.memoizedProps;
    try {
      for (var l = e.type, f = i.attributes; f.length; )
        i.removeAttributeNode(f[0]);
      tn(i, l, a), i[Ze] = e, i[vn] = a;
    } catch (m) {
      se(e, e.return, m);
    }
  }
  var Li = !1, ze = !1, Rd = !1, qy = typeof WeakSet == "function" ? WeakSet : Set, Xe = null;
  function QC(e, i) {
    if (e = e.containerInfo, Wd = Du, e = eg(e), Cf(e)) {
      if ("selectionStart" in e)
        var a = {
          start: e.selectionStart,
          end: e.selectionEnd
        };
      else
        t: {
          a = (a = e.ownerDocument) && a.defaultView || window;
          var l = a.getSelection && a.getSelection();
          if (l && l.rangeCount !== 0) {
            a = l.anchorNode;
            var f = l.anchorOffset, m = l.focusNode;
            l = l.focusOffset;
            try {
              a.nodeType, m.nodeType;
            } catch {
              a = null;
              break t;
            }
            var b = 0, M = -1, j = -1, $ = 0, tt = 0, it = e, K = null;
            e: for (; ; ) {
              for (var Q; it !== a || f !== 0 && it.nodeType !== 3 || (M = b + f), it !== m || l !== 0 && it.nodeType !== 3 || (j = b + l), it.nodeType === 3 && (b += it.nodeValue.length), (Q = it.firstChild) !== null; )
                K = it, it = Q;
              for (; ; ) {
                if (it === e) break e;
                if (K === a && ++$ === f && (M = b), K === m && ++tt === l && (j = b), (Q = it.nextSibling) !== null) break;
                it = K, K = it.parentNode;
              }
              it = Q;
            }
            a = M === -1 || j === -1 ? null : { start: M, end: j };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (th = { focusedElem: e, selectionRange: a }, Du = !1, Xe = i; Xe !== null; )
      if (i = Xe, e = i.child, (i.subtreeFlags & 1028) !== 0 && e !== null)
        e.return = i, Xe = e;
      else
        for (; Xe !== null; ) {
          switch (i = Xe, m = i.alternate, e = i.flags, i.tag) {
            case 0:
              if ((e & 4) !== 0 && (e = i.updateQueue, e = e !== null ? e.events : null, e !== null))
                for (a = 0; a < e.length; a++)
                  f = e[a], f.ref.impl = f.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((e & 1024) !== 0 && m !== null) {
                e = void 0, a = i, f = m.memoizedProps, m = m.memoizedState, l = a.stateNode;
                try {
                  var vt = ia(
                    a.type,
                    f
                  );
                  e = l.getSnapshotBeforeUpdate(
                    vt,
                    m
                  ), l.__reactInternalSnapshotBeforeUpdate = e;
                } catch (At) {
                  se(
                    a,
                    a.return,
                    At
                  );
                }
              }
              break;
            case 3:
              if ((e & 1024) !== 0) {
                if (e = i.stateNode.containerInfo, a = e.nodeType, a === 9)
                  ih(e);
                else if (a === 1)
                  switch (e.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      ih(e);
                      break;
                    default:
                      e.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((e & 1024) !== 0) throw Error(r(163));
          }
          if (e = i.sibling, e !== null) {
            e.return = i.return, Xe = e;
            break;
          }
          Xe = i.return;
        }
  }
  function Xy(e, i, a) {
    var l = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        Vi(e, a), l & 4 && Ao(5, a);
        break;
      case 1:
        if (Vi(e, a), l & 4)
          if (e = a.stateNode, i === null)
            try {
              e.componentDidMount();
            } catch (b) {
              se(a, a.return, b);
            }
          else {
            var f = ia(
              a.type,
              i.memoizedProps
            );
            i = i.memoizedState;
            try {
              e.componentDidUpdate(
                f,
                i,
                e.__reactInternalSnapshotBeforeUpdate
              );
            } catch (b) {
              se(
                a,
                a.return,
                b
              );
            }
          }
        l & 64 && Vy(a), l & 512 && Co(a, a.return);
        break;
      case 3:
        if (Vi(e, a), l & 64 && (e = a.updateQueue, e !== null)) {
          if (i = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                i = a.child.stateNode;
                break;
              case 1:
                i = a.child.stateNode;
            }
          try {
            wg(e, i);
          } catch (b) {
            se(a, a.return, b);
          }
        }
        break;
      case 27:
        i === null && l & 4 && Gy(a);
      case 26:
      case 5:
        Vi(e, a), i === null && l & 4 && Hy(a), l & 512 && Co(a, a.return);
        break;
      case 12:
        Vi(e, a);
        break;
      case 31:
        Vi(e, a), l & 4 && Fy(e, a);
        break;
      case 13:
        Vi(e, a), l & 4 && $y(e, a), l & 64 && (e = a.memoizedState, e !== null && (e = e.dehydrated, e !== null && (a = r_.bind(
          null,
          a
        ), __(e, a))));
        break;
      case 22:
        if (l = a.memoizedState !== null || Li, !l) {
          i = i !== null && i.memoizedState !== null || ze, f = Li;
          var m = ze;
          Li = l, (ze = i) && !m ? Bi(
            e,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : Vi(e, a), Li = f, ze = m;
        }
        break;
      case 30:
        break;
      default:
        Vi(e, a);
    }
  }
  function Py(e) {
    var i = e.alternate;
    i !== null && (e.alternate = null, Py(i)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (i = e.stateNode, i !== null && lf(i)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  var be = null, bn = !1;
  function Ui(e, i, a) {
    for (a = a.child; a !== null; )
      Iy(e, i, a), a = a.sibling;
  }
  function Iy(e, i, a) {
    if (Me && typeof Me.onCommitFiberUnmount == "function")
      try {
        Me.onCommitFiberUnmount(on, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        ze || mi(a, i), Ui(
          e,
          i,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        ze || mi(a, i);
        var l = be, f = bn;
        Ts(a.type) && (be = a.stateNode, bn = !1), Ui(
          e,
          i,
          a
        ), zo(a.stateNode), be = l, bn = f;
        break;
      case 5:
        ze || mi(a, i);
      case 6:
        if (l = be, f = bn, be = null, Ui(
          e,
          i,
          a
        ), be = l, bn = f, be !== null)
          if (bn)
            try {
              (be.nodeType === 9 ? be.body : be.nodeName === "HTML" ? be.ownerDocument.body : be).removeChild(a.stateNode);
            } catch (m) {
              se(
                a,
                i,
                m
              );
            }
          else
            try {
              be.removeChild(a.stateNode);
            } catch (m) {
              se(
                a,
                i,
                m
              );
            }
        break;
      case 18:
        be !== null && (bn ? (e = be, Vv(
          e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e,
          a.stateNode
        ), hr(e)) : Vv(be, a.stateNode));
        break;
      case 4:
        l = be, f = bn, be = a.stateNode.containerInfo, bn = !0, Ui(
          e,
          i,
          a
        ), be = l, bn = f;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        ms(2, a, i), ze || ms(4, a, i), Ui(
          e,
          i,
          a
        );
        break;
      case 1:
        ze || (mi(a, i), l = a.stateNode, typeof l.componentWillUnmount == "function" && By(
          a,
          i,
          l
        )), Ui(
          e,
          i,
          a
        );
        break;
      case 21:
        Ui(
          e,
          i,
          a
        );
        break;
      case 22:
        ze = (l = ze) || a.memoizedState !== null, Ui(
          e,
          i,
          a
        ), ze = l;
        break;
      default:
        Ui(
          e,
          i,
          a
        );
    }
  }
  function Fy(e, i) {
    if (i.memoizedState === null && (e = i.alternate, e !== null && (e = e.memoizedState, e !== null))) {
      e = e.dehydrated;
      try {
        hr(e);
      } catch (a) {
        se(i, i.return, a);
      }
    }
  }
  function $y(e, i) {
    if (i.memoizedState === null && (e = i.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null))))
      try {
        hr(e);
      } catch (a) {
        se(i, i.return, a);
      }
  }
  function JC(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var i = e.stateNode;
        return i === null && (i = e.stateNode = new qy()), i;
      case 22:
        return e = e.stateNode, i = e._retryCache, i === null && (i = e._retryCache = new qy()), i;
      default:
        throw Error(r(435, e.tag));
    }
  }
  function uu(e, i) {
    var a = JC(e);
    i.forEach(function(l) {
      if (!a.has(l)) {
        a.add(l);
        var f = o_.bind(null, e, l);
        l.then(f, f);
      }
    });
  }
  function Tn(e, i) {
    var a = i.deletions;
    if (a !== null)
      for (var l = 0; l < a.length; l++) {
        var f = a[l], m = e, b = i, M = b;
        t: for (; M !== null; ) {
          switch (M.tag) {
            case 27:
              if (Ts(M.type)) {
                be = M.stateNode, bn = !1;
                break t;
              }
              break;
            case 5:
              be = M.stateNode, bn = !1;
              break t;
            case 3:
            case 4:
              be = M.stateNode.containerInfo, bn = !0;
              break t;
          }
          M = M.return;
        }
        if (be === null) throw Error(r(160));
        Iy(m, b, f), be = null, bn = !1, m = f.alternate, m !== null && (m.return = null), f.return = null;
      }
    if (i.subtreeFlags & 13886)
      for (i = i.child; i !== null; )
        Ky(i, e), i = i.sibling;
  }
  var ei = null;
  function Ky(e, i) {
    var a = e.alternate, l = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        Tn(i, e), Sn(e), l & 4 && (ms(3, e, e.return), Ao(3, e), ms(5, e, e.return));
        break;
      case 1:
        Tn(i, e), Sn(e), l & 512 && (ze || a === null || mi(a, a.return)), l & 64 && Li && (e = e.updateQueue, e !== null && (l = e.callbacks, l !== null && (a = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = a === null ? l : a.concat(l))));
        break;
      case 26:
        var f = ei;
        if (Tn(i, e), Sn(e), l & 512 && (ze || a === null || mi(a, a.return)), l & 4) {
          var m = a !== null ? a.memoizedState : null;
          if (l = e.memoizedState, a === null)
            if (l === null)
              if (e.stateNode === null) {
                t: {
                  l = e.type, a = e.memoizedProps, f = f.ownerDocument || f;
                  e: switch (l) {
                    case "title":
                      m = f.getElementsByTagName("title")[0], (!m || m[Qr] || m[Ze] || m.namespaceURI === "http://www.w3.org/2000/svg" || m.hasAttribute("itemprop")) && (m = f.createElement(l), f.head.insertBefore(
                        m,
                        f.querySelector("head > title")
                      )), tn(m, l, a), m[Ze] = e, qe(m), l = m;
                      break t;
                    case "link":
                      var b = Kv(
                        "link",
                        "href",
                        f
                      ).get(l + (a.href || ""));
                      if (b) {
                        for (var M = 0; M < b.length; M++)
                          if (m = b[M], m.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && m.getAttribute("rel") === (a.rel == null ? null : a.rel) && m.getAttribute("title") === (a.title == null ? null : a.title) && m.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                            b.splice(M, 1);
                            break e;
                          }
                      }
                      m = f.createElement(l), tn(m, l, a), f.head.appendChild(m);
                      break;
                    case "meta":
                      if (b = Kv(
                        "meta",
                        "content",
                        f
                      ).get(l + (a.content || ""))) {
                        for (M = 0; M < b.length; M++)
                          if (m = b[M], m.getAttribute("content") === (a.content == null ? null : "" + a.content) && m.getAttribute("name") === (a.name == null ? null : a.name) && m.getAttribute("property") === (a.property == null ? null : a.property) && m.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && m.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                            b.splice(M, 1);
                            break e;
                          }
                      }
                      m = f.createElement(l), tn(m, l, a), f.head.appendChild(m);
                      break;
                    default:
                      throw Error(r(468, l));
                  }
                  m[Ze] = e, qe(m), l = m;
                }
                e.stateNode = l;
              } else
                Zv(
                  f,
                  e.type,
                  e.stateNode
                );
            else
              e.stateNode = $v(
                f,
                l,
                e.memoizedProps
              );
          else
            m !== l ? (m === null ? a.stateNode !== null && (a = a.stateNode, a.parentNode.removeChild(a)) : m.count--, l === null ? Zv(
              f,
              e.type,
              e.stateNode
            ) : $v(
              f,
              l,
              e.memoizedProps
            )) : l === null && e.stateNode !== null && Dd(
              e,
              e.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        Tn(i, e), Sn(e), l & 512 && (ze || a === null || mi(a, a.return)), a !== null && l & 4 && Dd(
          e,
          e.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (Tn(i, e), Sn(e), l & 512 && (ze || a === null || mi(a, a.return)), e.flags & 32) {
          f = e.stateNode;
          try {
            La(f, "");
          } catch (vt) {
            se(e, e.return, vt);
          }
        }
        l & 4 && e.stateNode != null && (f = e.memoizedProps, Dd(
          e,
          f,
          a !== null ? a.memoizedProps : f
        )), l & 1024 && (Rd = !0);
        break;
      case 6:
        if (Tn(i, e), Sn(e), l & 4) {
          if (e.stateNode === null)
            throw Error(r(162));
          l = e.memoizedProps, a = e.stateNode;
          try {
            a.nodeValue = l;
          } catch (vt) {
            se(e, e.return, vt);
          }
        }
        break;
      case 3:
        if (Cu = null, f = ei, ei = Mu(i.containerInfo), Tn(i, e), ei = f, Sn(e), l & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            hr(i.containerInfo);
          } catch (vt) {
            se(e, e.return, vt);
          }
        Rd && (Rd = !1, Zy(e));
        break;
      case 4:
        l = ei, ei = Mu(
          e.stateNode.containerInfo
        ), Tn(i, e), Sn(e), ei = l;
        break;
      case 12:
        Tn(i, e), Sn(e);
        break;
      case 31:
        Tn(i, e), Sn(e), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, uu(e, l)));
        break;
      case 13:
        Tn(i, e), Sn(e), e.child.flags & 8192 && e.memoizedState !== null != (a !== null && a.memoizedState !== null) && (fu = jt()), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, uu(e, l)));
        break;
      case 22:
        f = e.memoizedState !== null;
        var j = a !== null && a.memoizedState !== null, $ = Li, tt = ze;
        if (Li = $ || f, ze = tt || j, Tn(i, e), ze = tt, Li = $, Sn(e), l & 8192)
          t: for (i = e.stateNode, i._visibility = f ? i._visibility & -2 : i._visibility | 1, f && (a === null || j || Li || ze || sa(e)), a = null, i = e; ; ) {
            if (i.tag === 5 || i.tag === 26) {
              if (a === null) {
                j = a = i;
                try {
                  if (m = j.stateNode, f)
                    b = m.style, typeof b.setProperty == "function" ? b.setProperty("display", "none", "important") : b.display = "none";
                  else {
                    M = j.stateNode;
                    var it = j.memoizedProps.style, K = it != null && it.hasOwnProperty("display") ? it.display : null;
                    M.style.display = K == null || typeof K == "boolean" ? "" : ("" + K).trim();
                  }
                } catch (vt) {
                  se(j, j.return, vt);
                }
              }
            } else if (i.tag === 6) {
              if (a === null) {
                j = i;
                try {
                  j.stateNode.nodeValue = f ? "" : j.memoizedProps;
                } catch (vt) {
                  se(j, j.return, vt);
                }
              }
            } else if (i.tag === 18) {
              if (a === null) {
                j = i;
                try {
                  var Q = j.stateNode;
                  f ? Bv(Q, !0) : Bv(j.stateNode, !1);
                } catch (vt) {
                  se(j, j.return, vt);
                }
              }
            } else if ((i.tag !== 22 && i.tag !== 23 || i.memoizedState === null || i === e) && i.child !== null) {
              i.child.return = i, i = i.child;
              continue;
            }
            if (i === e) break t;
            for (; i.sibling === null; ) {
              if (i.return === null || i.return === e) break t;
              a === i && (a = null), i = i.return;
            }
            a === i && (a = null), i.sibling.return = i.return, i = i.sibling;
          }
        l & 4 && (l = e.updateQueue, l !== null && (a = l.retryQueue, a !== null && (l.retryQueue = null, uu(e, a))));
        break;
      case 19:
        Tn(i, e), Sn(e), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, uu(e, l)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        Tn(i, e), Sn(e);
    }
  }
  function Sn(e) {
    var i = e.flags;
    if (i & 2) {
      try {
        for (var a, l = e.return; l !== null; ) {
          if (Yy(l)) {
            a = l;
            break;
          }
          l = l.return;
        }
        if (a == null) throw Error(r(160));
        switch (a.tag) {
          case 27:
            var f = a.stateNode, m = jd(e);
            lu(e, m, f);
            break;
          case 5:
            var b = a.stateNode;
            a.flags & 32 && (La(b, ""), a.flags &= -33);
            var M = jd(e);
            lu(e, M, b);
            break;
          case 3:
          case 4:
            var j = a.stateNode.containerInfo, $ = jd(e);
            Nd(
              e,
              $,
              j
            );
            break;
          default:
            throw Error(r(161));
        }
      } catch (tt) {
        se(e, e.return, tt);
      }
      e.flags &= -3;
    }
    i & 4096 && (e.flags &= -4097);
  }
  function Zy(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var i = e;
        Zy(i), i.tag === 5 && i.flags & 1024 && i.stateNode.reset(), e = e.sibling;
      }
  }
  function Vi(e, i) {
    if (i.subtreeFlags & 8772)
      for (i = i.child; i !== null; )
        Xy(e, i.alternate, i), i = i.sibling;
  }
  function sa(e) {
    for (e = e.child; e !== null; ) {
      var i = e;
      switch (i.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          ms(4, i, i.return), sa(i);
          break;
        case 1:
          mi(i, i.return);
          var a = i.stateNode;
          typeof a.componentWillUnmount == "function" && By(
            i,
            i.return,
            a
          ), sa(i);
          break;
        case 27:
          zo(i.stateNode);
        case 26:
        case 5:
          mi(i, i.return), sa(i);
          break;
        case 22:
          i.memoizedState === null && sa(i);
          break;
        case 30:
          sa(i);
          break;
        default:
          sa(i);
      }
      e = e.sibling;
    }
  }
  function Bi(e, i, a) {
    for (a = a && (i.subtreeFlags & 8772) !== 0, i = i.child; i !== null; ) {
      var l = i.alternate, f = e, m = i, b = m.flags;
      switch (m.tag) {
        case 0:
        case 11:
        case 15:
          Bi(
            f,
            m,
            a
          ), Ao(4, m);
          break;
        case 1:
          if (Bi(
            f,
            m,
            a
          ), l = m, f = l.stateNode, typeof f.componentDidMount == "function")
            try {
              f.componentDidMount();
            } catch ($) {
              se(l, l.return, $);
            }
          if (l = m, f = l.updateQueue, f !== null) {
            var M = l.stateNode;
            try {
              var j = f.shared.hiddenCallbacks;
              if (j !== null)
                for (f.shared.hiddenCallbacks = null, f = 0; f < j.length; f++)
                  Eg(j[f], M);
            } catch ($) {
              se(l, l.return, $);
            }
          }
          a && b & 64 && Vy(m), Co(m, m.return);
          break;
        case 27:
          Gy(m);
        case 26:
        case 5:
          Bi(
            f,
            m,
            a
          ), a && l === null && b & 4 && Hy(m), Co(m, m.return);
          break;
        case 12:
          Bi(
            f,
            m,
            a
          );
          break;
        case 31:
          Bi(
            f,
            m,
            a
          ), a && b & 4 && Fy(f, m);
          break;
        case 13:
          Bi(
            f,
            m,
            a
          ), a && b & 4 && $y(f, m);
          break;
        case 22:
          m.memoizedState === null && Bi(
            f,
            m,
            a
          ), Co(m, m.return);
          break;
        case 30:
          break;
        default:
          Bi(
            f,
            m,
            a
          );
      }
      i = i.sibling;
    }
  }
  function Od(e, i) {
    var a = null;
    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (a = e.memoizedState.cachePool.pool), e = null, i.memoizedState !== null && i.memoizedState.cachePool !== null && (e = i.memoizedState.cachePool.pool), e !== a && (e != null && e.refCount++, a != null && co(a));
  }
  function zd(e, i) {
    e = null, i.alternate !== null && (e = i.alternate.memoizedState.cache), i = i.memoizedState.cache, i !== e && (i.refCount++, e != null && co(e));
  }
  function ni(e, i, a, l) {
    if (i.subtreeFlags & 10256)
      for (i = i.child; i !== null; )
        Qy(
          e,
          i,
          a,
          l
        ), i = i.sibling;
  }
  function Qy(e, i, a, l) {
    var f = i.flags;
    switch (i.tag) {
      case 0:
      case 11:
      case 15:
        ni(
          e,
          i,
          a,
          l
        ), f & 2048 && Ao(9, i);
        break;
      case 1:
        ni(
          e,
          i,
          a,
          l
        );
        break;
      case 3:
        ni(
          e,
          i,
          a,
          l
        ), f & 2048 && (e = null, i.alternate !== null && (e = i.alternate.memoizedState.cache), i = i.memoizedState.cache, i !== e && (i.refCount++, e != null && co(e)));
        break;
      case 12:
        if (f & 2048) {
          ni(
            e,
            i,
            a,
            l
          ), e = i.stateNode;
          try {
            var m = i.memoizedProps, b = m.id, M = m.onPostCommit;
            typeof M == "function" && M(
              b,
              i.alternate === null ? "mount" : "update",
              e.passiveEffectDuration,
              -0
            );
          } catch (j) {
            se(i, i.return, j);
          }
        } else
          ni(
            e,
            i,
            a,
            l
          );
        break;
      case 31:
        ni(
          e,
          i,
          a,
          l
        );
        break;
      case 13:
        ni(
          e,
          i,
          a,
          l
        );
        break;
      case 23:
        break;
      case 22:
        m = i.stateNode, b = i.alternate, i.memoizedState !== null ? m._visibility & 2 ? ni(
          e,
          i,
          a,
          l
        ) : _o(e, i) : m._visibility & 2 ? ni(
          e,
          i,
          a,
          l
        ) : (m._visibility |= 2, nr(
          e,
          i,
          a,
          l,
          (i.subtreeFlags & 10256) !== 0 || !1
        )), f & 2048 && Od(b, i);
        break;
      case 24:
        ni(
          e,
          i,
          a,
          l
        ), f & 2048 && zd(i.alternate, i);
        break;
      default:
        ni(
          e,
          i,
          a,
          l
        );
    }
  }
  function nr(e, i, a, l, f) {
    for (f = f && ((i.subtreeFlags & 10256) !== 0 || !1), i = i.child; i !== null; ) {
      var m = e, b = i, M = a, j = l, $ = b.flags;
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          nr(
            m,
            b,
            M,
            j,
            f
          ), Ao(8, b);
          break;
        case 23:
          break;
        case 22:
          var tt = b.stateNode;
          b.memoizedState !== null ? tt._visibility & 2 ? nr(
            m,
            b,
            M,
            j,
            f
          ) : _o(
            m,
            b
          ) : (tt._visibility |= 2, nr(
            m,
            b,
            M,
            j,
            f
          )), f && $ & 2048 && Od(
            b.alternate,
            b
          );
          break;
        case 24:
          nr(
            m,
            b,
            M,
            j,
            f
          ), f && $ & 2048 && zd(b.alternate, b);
          break;
        default:
          nr(
            m,
            b,
            M,
            j,
            f
          );
      }
      i = i.sibling;
    }
  }
  function _o(e, i) {
    if (i.subtreeFlags & 10256)
      for (i = i.child; i !== null; ) {
        var a = e, l = i, f = l.flags;
        switch (l.tag) {
          case 22:
            _o(a, l), f & 2048 && Od(
              l.alternate,
              l
            );
            break;
          case 24:
            _o(a, l), f & 2048 && zd(l.alternate, l);
            break;
          default:
            _o(a, l);
        }
        i = i.sibling;
      }
  }
  var Eo = 8192;
  function ir(e, i, a) {
    if (e.subtreeFlags & Eo)
      for (e = e.child; e !== null; )
        Jy(
          e,
          i,
          a
        ), e = e.sibling;
  }
  function Jy(e, i, a) {
    switch (e.tag) {
      case 26:
        ir(
          e,
          i,
          a
        ), e.flags & Eo && e.memoizedState !== null && V_(
          a,
          ei,
          e.memoizedState,
          e.memoizedProps
        );
        break;
      case 5:
        ir(
          e,
          i,
          a
        );
        break;
      case 3:
      case 4:
        var l = ei;
        ei = Mu(e.stateNode.containerInfo), ir(
          e,
          i,
          a
        ), ei = l;
        break;
      case 22:
        e.memoizedState === null && (l = e.alternate, l !== null && l.memoizedState !== null ? (l = Eo, Eo = 16777216, ir(
          e,
          i,
          a
        ), Eo = l) : ir(
          e,
          i,
          a
        ));
        break;
      default:
        ir(
          e,
          i,
          a
        );
    }
  }
  function Wy(e) {
    var i = e.alternate;
    if (i !== null && (e = i.child, e !== null)) {
      i.child = null;
      do
        i = e.sibling, e.sibling = null, e = i;
      while (e !== null);
    }
  }
  function wo(e) {
    var i = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (i !== null)
        for (var a = 0; a < i.length; a++) {
          var l = i[a];
          Xe = l, ev(
            l,
            e
          );
        }
      Wy(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; )
        tv(e), e = e.sibling;
  }
  function tv(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        wo(e), e.flags & 2048 && ms(9, e, e.return);
        break;
      case 3:
        wo(e);
        break;
      case 12:
        wo(e);
        break;
      case 22:
        var i = e.stateNode;
        e.memoizedState !== null && i._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (i._visibility &= -3, cu(e)) : wo(e);
        break;
      default:
        wo(e);
    }
  }
  function cu(e) {
    var i = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (i !== null)
        for (var a = 0; a < i.length; a++) {
          var l = i[a];
          Xe = l, ev(
            l,
            e
          );
        }
      Wy(e);
    }
    for (e = e.child; e !== null; ) {
      switch (i = e, i.tag) {
        case 0:
        case 11:
        case 15:
          ms(8, i, i.return), cu(i);
          break;
        case 22:
          a = i.stateNode, a._visibility & 2 && (a._visibility &= -3, cu(i));
          break;
        default:
          cu(i);
      }
      e = e.sibling;
    }
  }
  function ev(e, i) {
    for (; Xe !== null; ) {
      var a = Xe;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          ms(8, a, i);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var l = a.memoizedState.cachePool.pool;
            l != null && l.refCount++;
          }
          break;
        case 24:
          co(a.memoizedState.cache);
      }
      if (l = a.child, l !== null) l.return = a, Xe = l;
      else
        t: for (a = e; Xe !== null; ) {
          l = Xe;
          var f = l.sibling, m = l.return;
          if (Py(l), l === a) {
            Xe = null;
            break t;
          }
          if (f !== null) {
            f.return = m, Xe = f;
            break t;
          }
          Xe = m;
        }
    }
  }
  var WC = {
    getCacheForType: function(e) {
      var i = Je(Ne), a = i.data.get(e);
      return a === void 0 && (a = e(), i.data.set(e, a)), a;
    },
    cacheSignal: function() {
      return Je(Ne).controller.signal;
    }
  }, t_ = typeof WeakMap == "function" ? WeakMap : Map, ne = 0, he = null, qt = null, Pt = 0, ie = 0, Nn = null, ps = !1, sr = !1, kd = !1, Hi = 0, Ce = 0, gs = 0, aa = 0, Ld = 0, Rn = 0, ar = 0, Do = null, Mn = null, Ud = !1, fu = 0, nv = 0, du = 1 / 0, hu = null, ys = null, Ue = 0, vs = null, rr = null, Yi = 0, Vd = 0, Bd = null, iv = null, jo = 0, Hd = null;
  function On() {
    return (ne & 2) !== 0 && Pt !== 0 ? Pt & -Pt : D.T !== null ? Id() : x0();
  }
  function sv() {
    if (Rn === 0)
      if ((Pt & 536870912) === 0 || $t) {
        var e = je;
        je <<= 1, (je & 3932160) === 0 && (je = 262144), Rn = e;
      } else Rn = 536870912;
    return e = Dn.current, e !== null && (e.flags |= 32), Rn;
  }
  function An(e, i, a) {
    (e === he && (ie === 2 || ie === 9) || e.cancelPendingCommit !== null) && (or(e, 0), xs(
      e,
      Pt,
      Rn,
      !1
    )), oe(e, a), ((ne & 2) === 0 || e !== he) && (e === he && ((ne & 2) === 0 && (aa |= a), Ce === 4 && xs(
      e,
      Pt,
      Rn,
      !1
    )), pi(e));
  }
  function av(e, i, a) {
    if ((ne & 6) !== 0) throw Error(r(327));
    var l = !a && (i & 127) === 0 && (i & e.expiredLanes) === 0 || kn(e, i), f = l ? i_(e, i) : Gd(e, i, !0), m = l;
    do {
      if (f === 0) {
        sr && !l && xs(e, i, 0, !1);
        break;
      } else {
        if (a = e.current.alternate, m && !e_(a)) {
          f = Gd(e, i, !1), m = !1;
          continue;
        }
        if (f === 2) {
          if (m = i, e.errorRecoveryDisabledLanes & m)
            var b = 0;
          else
            b = e.pendingLanes & -536870913, b = b !== 0 ? b : b & 536870912 ? 536870912 : 0;
          if (b !== 0) {
            i = b;
            t: {
              var M = e;
              f = Do;
              var j = M.current.memoizedState.isDehydrated;
              if (j && (or(M, b).flags |= 256), b = Gd(
                M,
                b,
                !1
              ), b !== 2) {
                if (kd && !j) {
                  M.errorRecoveryDisabledLanes |= m, aa |= m, f = 4;
                  break t;
                }
                m = Mn, Mn = f, m !== null && (Mn === null ? Mn = m : Mn.push.apply(
                  Mn,
                  m
                ));
              }
              f = b;
            }
            if (m = !1, f !== 2) continue;
          }
        }
        if (f === 1) {
          or(e, 0), xs(e, i, 0, !0);
          break;
        }
        t: {
          switch (l = e, m = f, m) {
            case 0:
            case 1:
              throw Error(r(345));
            case 4:
              if ((i & 4194048) !== i) break;
            case 6:
              xs(
                l,
                i,
                Rn,
                !ps
              );
              break t;
            case 2:
              Mn = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(r(329));
          }
          if ((i & 62914560) === i && (f = fu + 300 - jt(), 10 < f)) {
            if (xs(
              l,
              i,
              Rn,
              !ps
            ), ns(l, 0, !0) !== 0) break t;
            Yi = i, l.timeoutHandle = Lv(
              rv.bind(
                null,
                l,
                a,
                Mn,
                hu,
                Ud,
                i,
                Rn,
                aa,
                ar,
                ps,
                m,
                "Throttled",
                -0,
                0
              ),
              f
            );
            break t;
          }
          rv(
            l,
            a,
            Mn,
            hu,
            Ud,
            i,
            Rn,
            aa,
            ar,
            ps,
            m,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    pi(e);
  }
  function rv(e, i, a, l, f, m, b, M, j, $, tt, it, K, Q) {
    if (e.timeoutHandle = -1, it = i.subtreeFlags, it & 8192 || (it & 16785408) === 16785408) {
      it = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: _i
      }, Jy(
        i,
        m,
        it
      );
      var vt = (m & 62914560) === m ? fu - jt() : (m & 4194048) === m ? nv - jt() : 0;
      if (vt = B_(
        it,
        vt
      ), vt !== null) {
        Yi = m, e.cancelPendingCommit = vt(
          mv.bind(
            null,
            e,
            i,
            m,
            a,
            l,
            f,
            b,
            M,
            j,
            tt,
            it,
            null,
            K,
            Q
          )
        ), xs(e, m, b, !$);
        return;
      }
    }
    mv(
      e,
      i,
      m,
      a,
      l,
      f,
      b,
      M,
      j
    );
  }
  function e_(e) {
    for (var i = e; ; ) {
      var a = i.tag;
      if ((a === 0 || a === 11 || a === 15) && i.flags & 16384 && (a = i.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var l = 0; l < a.length; l++) {
          var f = a[l], m = f.getSnapshot;
          f = f.value;
          try {
            if (!En(m(), f)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = i.child, i.subtreeFlags & 16384 && a !== null)
        a.return = i, i = a;
      else {
        if (i === e) break;
        for (; i.sibling === null; ) {
          if (i.return === null || i.return === e) return !0;
          i = i.return;
        }
        i.sibling.return = i.return, i = i.sibling;
      }
    }
    return !0;
  }
  function xs(e, i, a, l) {
    i &= ~Ld, i &= ~aa, e.suspendedLanes |= i, e.pingedLanes &= ~i, l && (e.warmLanes |= i), l = e.expirationTimes;
    for (var f = i; 0 < f; ) {
      var m = 31 - Ye(f), b = 1 << m;
      l[m] = -1, f &= ~b;
    }
    a !== 0 && Ge(e, a, i);
  }
  function mu() {
    return (ne & 6) === 0 ? (No(0), !1) : !0;
  }
  function Yd() {
    if (qt !== null) {
      if (ie === 0)
        var e = qt.return;
      else
        e = qt, ji = Zs = null, id(e), Qa = null, ho = 0, e = qt;
      for (; e !== null; )
        Uy(e.alternate, e), e = e.return;
      qt = null;
    }
  }
  function or(e, i) {
    var a = e.timeoutHandle;
    a !== -1 && (e.timeoutHandle = -1, T_(a)), a = e.cancelPendingCommit, a !== null && (e.cancelPendingCommit = null, a()), Yi = 0, Yd(), he = e, qt = a = wi(e.current, null), Pt = i, ie = 0, Nn = null, ps = !1, sr = kn(e, i), kd = !1, ar = Rn = Ld = aa = gs = Ce = 0, Mn = Do = null, Ud = !1, (i & 8) !== 0 && (i |= i & 32);
    var l = e.entangledLanes;
    if (l !== 0)
      for (e = e.entanglements, l &= i; 0 < l; ) {
        var f = 31 - Ye(l), m = 1 << f;
        i |= e[f], l &= ~m;
      }
    return Hi = i, kl(), a;
  }
  function ov(e, i) {
    kt = null, D.H = To, i === Za || i === ql ? (i = Mg(), ie = 3) : i === Pf ? (i = Mg(), ie = 4) : ie = i === xd ? 8 : i !== null && typeof i == "object" && typeof i.then == "function" ? 6 : 1, Nn = i, qt === null && (Ce = 1, iu(
      e,
      Bn(i, e.current)
    ));
  }
  function lv() {
    var e = Dn.current;
    return e === null ? !0 : (Pt & 4194048) === Pt ? qn === null : (Pt & 62914560) === Pt || (Pt & 536870912) !== 0 ? e === qn : !1;
  }
  function uv() {
    var e = D.H;
    return D.H = To, e === null ? To : e;
  }
  function cv() {
    var e = D.A;
    return D.A = WC, e;
  }
  function pu() {
    Ce = 4, ps || (Pt & 4194048) !== Pt && Dn.current !== null || (sr = !0), (gs & 134217727) === 0 && (aa & 134217727) === 0 || he === null || xs(
      he,
      Pt,
      Rn,
      !1
    );
  }
  function Gd(e, i, a) {
    var l = ne;
    ne |= 2;
    var f = uv(), m = cv();
    (he !== e || Pt !== i) && (hu = null, or(e, i)), i = !1;
    var b = Ce;
    t: do
      try {
        if (ie !== 0 && qt !== null) {
          var M = qt, j = Nn;
          switch (ie) {
            case 8:
              Yd(), b = 6;
              break t;
            case 3:
            case 2:
            case 9:
            case 6:
              Dn.current === null && (i = !0);
              var $ = ie;
              if (ie = 0, Nn = null, lr(e, M, j, $), a && sr) {
                b = 0;
                break t;
              }
              break;
            default:
              $ = ie, ie = 0, Nn = null, lr(e, M, j, $);
          }
        }
        n_(), b = Ce;
        break;
      } catch (tt) {
        ov(e, tt);
      }
    while (!0);
    return i && e.shellSuspendCounter++, ji = Zs = null, ne = l, D.H = f, D.A = m, qt === null && (he = null, Pt = 0, kl()), b;
  }
  function n_() {
    for (; qt !== null; ) fv(qt);
  }
  function i_(e, i) {
    var a = ne;
    ne |= 2;
    var l = uv(), f = cv();
    he !== e || Pt !== i ? (hu = null, du = jt() + 500, or(e, i)) : sr = kn(
      e,
      i
    );
    t: do
      try {
        if (ie !== 0 && qt !== null) {
          i = qt;
          var m = Nn;
          e: switch (ie) {
            case 1:
              ie = 0, Nn = null, lr(e, i, m, 1);
              break;
            case 2:
            case 9:
              if (Tg(m)) {
                ie = 0, Nn = null, dv(i);
                break;
              }
              i = function() {
                ie !== 2 && ie !== 9 || he !== e || (ie = 7), pi(e);
              }, m.then(i, i);
              break t;
            case 3:
              ie = 7;
              break t;
            case 4:
              ie = 5;
              break t;
            case 7:
              Tg(m) ? (ie = 0, Nn = null, dv(i)) : (ie = 0, Nn = null, lr(e, i, m, 7));
              break;
            case 5:
              var b = null;
              switch (qt.tag) {
                case 26:
                  b = qt.memoizedState;
                case 5:
                case 27:
                  var M = qt;
                  if (b ? Qv(b) : M.stateNode.complete) {
                    ie = 0, Nn = null;
                    var j = M.sibling;
                    if (j !== null) qt = j;
                    else {
                      var $ = M.return;
                      $ !== null ? (qt = $, gu($)) : qt = null;
                    }
                    break e;
                  }
              }
              ie = 0, Nn = null, lr(e, i, m, 5);
              break;
            case 6:
              ie = 0, Nn = null, lr(e, i, m, 6);
              break;
            case 8:
              Yd(), Ce = 6;
              break t;
            default:
              throw Error(r(462));
          }
        }
        s_();
        break;
      } catch (tt) {
        ov(e, tt);
      }
    while (!0);
    return ji = Zs = null, D.H = l, D.A = f, ne = a, qt !== null ? 0 : (he = null, Pt = 0, kl(), Ce);
  }
  function s_() {
    for (; qt !== null && !ge(); )
      fv(qt);
  }
  function fv(e) {
    var i = ky(e.alternate, e, Hi);
    e.memoizedProps = e.pendingProps, i === null ? gu(e) : qt = i;
  }
  function dv(e) {
    var i = e, a = i.alternate;
    switch (i.tag) {
      case 15:
      case 0:
        i = Dy(
          a,
          i,
          i.pendingProps,
          i.type,
          void 0,
          Pt
        );
        break;
      case 11:
        i = Dy(
          a,
          i,
          i.pendingProps,
          i.type.render,
          i.ref,
          Pt
        );
        break;
      case 5:
        id(i);
      default:
        Uy(a, i), i = qt = cg(i, Hi), i = ky(a, i, Hi);
    }
    e.memoizedProps = e.pendingProps, i === null ? gu(e) : qt = i;
  }
  function lr(e, i, a, l) {
    ji = Zs = null, id(i), Qa = null, ho = 0;
    var f = i.return;
    try {
      if (IC(
        e,
        f,
        i,
        a,
        Pt
      )) {
        Ce = 1, iu(
          e,
          Bn(a, e.current)
        ), qt = null;
        return;
      }
    } catch (m) {
      if (f !== null) throw qt = f, m;
      Ce = 1, iu(
        e,
        Bn(a, e.current)
      ), qt = null;
      return;
    }
    i.flags & 32768 ? ($t || l === 1 ? e = !0 : sr || (Pt & 536870912) !== 0 ? e = !1 : (ps = e = !0, (l === 2 || l === 9 || l === 3 || l === 6) && (l = Dn.current, l !== null && l.tag === 13 && (l.flags |= 16384))), hv(i, e)) : gu(i);
  }
  function gu(e) {
    var i = e;
    do {
      if ((i.flags & 32768) !== 0) {
        hv(
          i,
          ps
        );
        return;
      }
      e = i.return;
      var a = KC(
        i.alternate,
        i,
        Hi
      );
      if (a !== null) {
        qt = a;
        return;
      }
      if (i = i.sibling, i !== null) {
        qt = i;
        return;
      }
      qt = i = e;
    } while (i !== null);
    Ce === 0 && (Ce = 5);
  }
  function hv(e, i) {
    do {
      var a = ZC(e.alternate, e);
      if (a !== null) {
        a.flags &= 32767, qt = a;
        return;
      }
      if (a = e.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !i && (e = e.sibling, e !== null)) {
        qt = e;
        return;
      }
      qt = e = a;
    } while (e !== null);
    Ce = 6, qt = null;
  }
  function mv(e, i, a, l, f, m, b, M, j) {
    e.cancelPendingCommit = null;
    do
      yu();
    while (Ue !== 0);
    if ((ne & 6) !== 0) throw Error(r(327));
    if (i !== null) {
      if (i === e.current) throw Error(r(177));
      if (m = i.lanes | i.childLanes, m |= jf, Vt(
        e,
        a,
        m,
        b,
        M,
        j
      ), e === he && (qt = he = null, Pt = 0), rr = i, vs = e, Yi = a, Vd = m, Bd = f, iv = l, (i.subtreeFlags & 10256) !== 0 || (i.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, l_(ye, function() {
        return xv(), null;
      })) : (e.callbackNode = null, e.callbackPriority = 0), l = (i.flags & 13878) !== 0, (i.subtreeFlags & 13878) !== 0 || l) {
        l = D.T, D.T = null, f = q.p, q.p = 2, b = ne, ne |= 4;
        try {
          QC(e, i, a);
        } finally {
          ne = b, q.p = f, D.T = l;
        }
      }
      Ue = 1, pv(), gv(), yv();
    }
  }
  function pv() {
    if (Ue === 1) {
      Ue = 0;
      var e = vs, i = rr, a = (i.flags & 13878) !== 0;
      if ((i.subtreeFlags & 13878) !== 0 || a) {
        a = D.T, D.T = null;
        var l = q.p;
        q.p = 2;
        var f = ne;
        ne |= 4;
        try {
          Ky(i, e);
          var m = th, b = eg(e.containerInfo), M = m.focusedElem, j = m.selectionRange;
          if (b !== M && M && M.ownerDocument && tg(
            M.ownerDocument.documentElement,
            M
          )) {
            if (j !== null && Cf(M)) {
              var $ = j.start, tt = j.end;
              if (tt === void 0 && (tt = $), "selectionStart" in M)
                M.selectionStart = $, M.selectionEnd = Math.min(
                  tt,
                  M.value.length
                );
              else {
                var it = M.ownerDocument || document, K = it && it.defaultView || window;
                if (K.getSelection) {
                  var Q = K.getSelection(), vt = M.textContent.length, At = Math.min(j.start, vt), ce = j.end === void 0 ? At : Math.min(j.end, vt);
                  !Q.extend && At > ce && (b = ce, ce = At, At = b);
                  var B = W0(
                    M,
                    At
                  ), z = W0(
                    M,
                    ce
                  );
                  if (B && z && (Q.rangeCount !== 1 || Q.anchorNode !== B.node || Q.anchorOffset !== B.offset || Q.focusNode !== z.node || Q.focusOffset !== z.offset)) {
                    var F = it.createRange();
                    F.setStart(B.node, B.offset), Q.removeAllRanges(), At > ce ? (Q.addRange(F), Q.extend(z.node, z.offset)) : (F.setEnd(z.node, z.offset), Q.addRange(F));
                  }
                }
              }
            }
            for (it = [], Q = M; Q = Q.parentNode; )
              Q.nodeType === 1 && it.push({
                element: Q,
                left: Q.scrollLeft,
                top: Q.scrollTop
              });
            for (typeof M.focus == "function" && M.focus(), M = 0; M < it.length; M++) {
              var et = it[M];
              et.element.scrollLeft = et.left, et.element.scrollTop = et.top;
            }
          }
          Du = !!Wd, th = Wd = null;
        } finally {
          ne = f, q.p = l, D.T = a;
        }
      }
      e.current = i, Ue = 2;
    }
  }
  function gv() {
    if (Ue === 2) {
      Ue = 0;
      var e = vs, i = rr, a = (i.flags & 8772) !== 0;
      if ((i.subtreeFlags & 8772) !== 0 || a) {
        a = D.T, D.T = null;
        var l = q.p;
        q.p = 2;
        var f = ne;
        ne |= 4;
        try {
          Xy(e, i.alternate, i);
        } finally {
          ne = f, q.p = l, D.T = a;
        }
      }
      Ue = 3;
    }
  }
  function yv() {
    if (Ue === 4 || Ue === 3) {
      Ue = 0, Dt();
      var e = vs, i = rr, a = Yi, l = iv;
      (i.subtreeFlags & 10256) !== 0 || (i.flags & 10256) !== 0 ? Ue = 5 : (Ue = 0, rr = vs = null, vv(e, e.pendingLanes));
      var f = e.pendingLanes;
      if (f === 0 && (ys = null), rf(a), i = i.stateNode, Me && typeof Me.onCommitFiberRoot == "function")
        try {
          Me.onCommitFiberRoot(
            on,
            i,
            void 0,
            (i.current.flags & 128) === 128
          );
        } catch {
        }
      if (l !== null) {
        i = D.T, f = q.p, q.p = 2, D.T = null;
        try {
          for (var m = e.onRecoverableError, b = 0; b < l.length; b++) {
            var M = l[b];
            m(M.value, {
              componentStack: M.stack
            });
          }
        } finally {
          D.T = i, q.p = f;
        }
      }
      (Yi & 3) !== 0 && yu(), pi(e), f = e.pendingLanes, (a & 261930) !== 0 && (f & 42) !== 0 ? e === Hd ? jo++ : (jo = 0, Hd = e) : jo = 0, No(0);
    }
  }
  function vv(e, i) {
    (e.pooledCacheLanes &= i) === 0 && (i = e.pooledCache, i != null && (e.pooledCache = null, co(i)));
  }
  function yu() {
    return pv(), gv(), yv(), xv();
  }
  function xv() {
    if (Ue !== 5) return !1;
    var e = vs, i = Vd;
    Vd = 0;
    var a = rf(Yi), l = D.T, f = q.p;
    try {
      q.p = 32 > a ? 32 : a, D.T = null, a = Bd, Bd = null;
      var m = vs, b = Yi;
      if (Ue = 0, rr = vs = null, Yi = 0, (ne & 6) !== 0) throw Error(r(331));
      var M = ne;
      if (ne |= 4, tv(m.current), Qy(
        m,
        m.current,
        b,
        a
      ), ne = M, No(0, !1), Me && typeof Me.onPostCommitFiberRoot == "function")
        try {
          Me.onPostCommitFiberRoot(on, m);
        } catch {
        }
      return !0;
    } finally {
      q.p = f, D.T = l, vv(e, i);
    }
  }
  function bv(e, i, a) {
    i = Bn(a, i), i = vd(e.stateNode, i, 2), e = fs(e, i, 2), e !== null && (oe(e, 2), pi(e));
  }
  function se(e, i, a) {
    if (e.tag === 3)
      bv(e, e, a);
    else
      for (; i !== null; ) {
        if (i.tag === 3) {
          bv(
            i,
            e,
            a
          );
          break;
        } else if (i.tag === 1) {
          var l = i.stateNode;
          if (typeof i.type.getDerivedStateFromError == "function" || typeof l.componentDidCatch == "function" && (ys === null || !ys.has(l))) {
            e = Bn(a, e), a = Ty(2), l = fs(i, a, 2), l !== null && (Sy(
              a,
              l,
              i,
              e
            ), oe(l, 2), pi(l));
            break;
          }
        }
        i = i.return;
      }
  }
  function qd(e, i, a) {
    var l = e.pingCache;
    if (l === null) {
      l = e.pingCache = new t_();
      var f = /* @__PURE__ */ new Set();
      l.set(i, f);
    } else
      f = l.get(i), f === void 0 && (f = /* @__PURE__ */ new Set(), l.set(i, f));
    f.has(a) || (kd = !0, f.add(a), e = a_.bind(null, e, i, a), i.then(e, e));
  }
  function a_(e, i, a) {
    var l = e.pingCache;
    l !== null && l.delete(i), e.pingedLanes |= e.suspendedLanes & a, e.warmLanes &= ~a, he === e && (Pt & a) === a && (Ce === 4 || Ce === 3 && (Pt & 62914560) === Pt && 300 > jt() - fu ? (ne & 2) === 0 && or(e, 0) : Ld |= a, ar === Pt && (ar = 0)), pi(e);
  }
  function Tv(e, i) {
    i === 0 && (i = Yt()), e = Fs(e, i), e !== null && (oe(e, i), pi(e));
  }
  function r_(e) {
    var i = e.memoizedState, a = 0;
    i !== null && (a = i.retryLane), Tv(e, a);
  }
  function o_(e, i) {
    var a = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var l = e.stateNode, f = e.memoizedState;
        f !== null && (a = f.retryLane);
        break;
      case 19:
        l = e.stateNode;
        break;
      case 22:
        l = e.stateNode._retryCache;
        break;
      default:
        throw Error(r(314));
    }
    l !== null && l.delete(i), Tv(e, a);
  }
  function l_(e, i) {
    return Qt(e, i);
  }
  var vu = null, ur = null, Xd = !1, xu = !1, Pd = !1, bs = 0;
  function pi(e) {
    e !== ur && e.next === null && (ur === null ? vu = ur = e : ur = ur.next = e), xu = !0, Xd || (Xd = !0, c_());
  }
  function No(e, i) {
    if (!Pd && xu) {
      Pd = !0;
      do
        for (var a = !1, l = vu; l !== null; ) {
          if (e !== 0) {
            var f = l.pendingLanes;
            if (f === 0) var m = 0;
            else {
              var b = l.suspendedLanes, M = l.pingedLanes;
              m = (1 << 31 - Ye(42 | e) + 1) - 1, m &= f & ~(b & ~M), m = m & 201326741 ? m & 201326741 | 1 : m ? m | 2 : 0;
            }
            m !== 0 && (a = !0, Cv(l, m));
          } else
            m = Pt, m = ns(
              l,
              l === he ? m : 0,
              l.cancelPendingCommit !== null || l.timeoutHandle !== -1
            ), (m & 3) === 0 || kn(l, m) || (a = !0, Cv(l, m));
          l = l.next;
        }
      while (a);
      Pd = !1;
    }
  }
  function u_() {
    Sv();
  }
  function Sv() {
    xu = Xd = !1;
    var e = 0;
    bs !== 0 && b_() && (e = bs);
    for (var i = jt(), a = null, l = vu; l !== null; ) {
      var f = l.next, m = Mv(l, i);
      m === 0 ? (l.next = null, a === null ? vu = f : a.next = f, f === null && (ur = a)) : (a = l, (e !== 0 || (m & 3) !== 0) && (xu = !0)), l = f;
    }
    Ue !== 0 && Ue !== 5 || No(e), bs !== 0 && (bs = 0);
  }
  function Mv(e, i) {
    for (var a = e.suspendedLanes, l = e.pingedLanes, f = e.expirationTimes, m = e.pendingLanes & -62914561; 0 < m; ) {
      var b = 31 - Ye(m), M = 1 << b, j = f[b];
      j === -1 ? ((M & a) === 0 || (M & l) !== 0) && (f[b] = Nt(M, i)) : j <= i && (e.expiredLanes |= M), m &= ~M;
    }
    if (i = he, a = Pt, a = ns(
      e,
      e === i ? a : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), l = e.callbackNode, a === 0 || e === i && (ie === 2 || ie === 9) || e.cancelPendingCommit !== null)
      return l !== null && l !== null && Jt(l), e.callbackNode = null, e.callbackPriority = 0;
    if ((a & 3) === 0 || kn(e, a)) {
      if (i = a & -a, i === e.callbackPriority) return i;
      switch (l !== null && Jt(l), rf(a)) {
        case 2:
        case 8:
          a = zt;
          break;
        case 32:
          a = ye;
          break;
        case 268435456:
          a = yn;
          break;
        default:
          a = ye;
      }
      return l = Av.bind(null, e), a = Qt(a, l), e.callbackPriority = i, e.callbackNode = a, i;
    }
    return l !== null && l !== null && Jt(l), e.callbackPriority = 2, e.callbackNode = null, 2;
  }
  function Av(e, i) {
    if (Ue !== 0 && Ue !== 5)
      return e.callbackNode = null, e.callbackPriority = 0, null;
    var a = e.callbackNode;
    if (yu() && e.callbackNode !== a)
      return null;
    var l = Pt;
    return l = ns(
      e,
      e === he ? l : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), l === 0 ? null : (av(e, l, i), Mv(e, jt()), e.callbackNode != null && e.callbackNode === a ? Av.bind(null, e) : null);
  }
  function Cv(e, i) {
    if (yu()) return null;
    av(e, i, !0);
  }
  function c_() {
    S_(function() {
      (ne & 6) !== 0 ? Qt(
        Gt,
        u_
      ) : Sv();
    });
  }
  function Id() {
    if (bs === 0) {
      var e = $a;
      e === 0 && (e = es, es <<= 1, (es & 261888) === 0 && (es = 256)), bs = e;
    }
    return bs;
  }
  function _v(e) {
    return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : El("" + e);
  }
  function Ev(e, i) {
    var a = i.ownerDocument.createElement("input");
    return a.name = i.name, a.value = i.value, e.id && a.setAttribute("form", e.id), i.parentNode.insertBefore(a, i), e = new FormData(e), a.parentNode.removeChild(a), e;
  }
  function f_(e, i, a, l, f) {
    if (i === "submit" && a && a.stateNode === f) {
      var m = _v(
        (f[vn] || null).action
      ), b = l.submitter;
      b && (i = (i = b[vn] || null) ? _v(i.formAction) : b.getAttribute("formAction"), i !== null && (m = i, b = null));
      var M = new Nl(
        "action",
        "action",
        null,
        l,
        f
      );
      e.push({
        event: M,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (l.defaultPrevented) {
                if (bs !== 0) {
                  var j = b ? Ev(f, b) : new FormData(f);
                  dd(
                    a,
                    {
                      pending: !0,
                      data: j,
                      method: f.method,
                      action: m
                    },
                    null,
                    j
                  );
                }
              } else
                typeof m == "function" && (M.preventDefault(), j = b ? Ev(f, b) : new FormData(f), dd(
                  a,
                  {
                    pending: !0,
                    data: j,
                    method: f.method,
                    action: m
                  },
                  m,
                  j
                ));
            },
            currentTarget: f
          }
        ]
      });
    }
  }
  for (var Fd = 0; Fd < Df.length; Fd++) {
    var $d = Df[Fd], d_ = $d.toLowerCase(), h_ = $d[0].toUpperCase() + $d.slice(1);
    ti(
      d_,
      "on" + h_
    );
  }
  ti(sg, "onAnimationEnd"), ti(ag, "onAnimationIteration"), ti(rg, "onAnimationStart"), ti("dblclick", "onDoubleClick"), ti("focusin", "onFocus"), ti("focusout", "onBlur"), ti(DC, "onTransitionRun"), ti(jC, "onTransitionStart"), ti(NC, "onTransitionCancel"), ti(og, "onTransitionEnd"), za("onMouseEnter", ["mouseout", "mouseover"]), za("onMouseLeave", ["mouseout", "mouseover"]), za("onPointerEnter", ["pointerout", "pointerover"]), za("onPointerLeave", ["pointerout", "pointerover"]), qs(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), qs(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), qs("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), qs(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), qs(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), qs(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Ro = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), m_ = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Ro)
  );
  function wv(e, i) {
    i = (i & 4) !== 0;
    for (var a = 0; a < e.length; a++) {
      var l = e[a], f = l.event;
      l = l.listeners;
      t: {
        var m = void 0;
        if (i)
          for (var b = l.length - 1; 0 <= b; b--) {
            var M = l[b], j = M.instance, $ = M.currentTarget;
            if (M = M.listener, j !== m && f.isPropagationStopped())
              break t;
            m = M, f.currentTarget = $;
            try {
              m(f);
            } catch (tt) {
              zl(tt);
            }
            f.currentTarget = null, m = j;
          }
        else
          for (b = 0; b < l.length; b++) {
            if (M = l[b], j = M.instance, $ = M.currentTarget, M = M.listener, j !== m && f.isPropagationStopped())
              break t;
            m = M, f.currentTarget = $;
            try {
              m(f);
            } catch (tt) {
              zl(tt);
            }
            f.currentTarget = null, m = j;
          }
      }
    }
  }
  function Xt(e, i) {
    var a = i[of];
    a === void 0 && (a = i[of] = /* @__PURE__ */ new Set());
    var l = e + "__bubble";
    a.has(l) || (Dv(i, e, 2, !1), a.add(l));
  }
  function Kd(e, i, a) {
    var l = 0;
    i && (l |= 4), Dv(
      a,
      e,
      l,
      i
    );
  }
  var bu = "_reactListening" + Math.random().toString(36).slice(2);
  function Zd(e) {
    if (!e[bu]) {
      e[bu] = !0, S0.forEach(function(a) {
        a !== "selectionchange" && (m_.has(a) || Kd(a, !1, e), Kd(a, !0, e));
      });
      var i = e.nodeType === 9 ? e : e.ownerDocument;
      i === null || i[bu] || (i[bu] = !0, Kd("selectionchange", !1, i));
    }
  }
  function Dv(e, i, a, l) {
    switch (s1(i)) {
      case 2:
        var f = G_;
        break;
      case 8:
        f = q_;
        break;
      default:
        f = fh;
    }
    a = f.bind(
      null,
      i,
      a,
      e
    ), f = void 0, !gf || i !== "touchstart" && i !== "touchmove" && i !== "wheel" || (f = !0), l ? f !== void 0 ? e.addEventListener(i, a, {
      capture: !0,
      passive: f
    }) : e.addEventListener(i, a, !0) : f !== void 0 ? e.addEventListener(i, a, {
      passive: f
    }) : e.addEventListener(i, a, !1);
  }
  function Qd(e, i, a, l, f) {
    var m = l;
    if ((i & 1) === 0 && (i & 2) === 0 && l !== null)
      t: for (; ; ) {
        if (l === null) return;
        var b = l.tag;
        if (b === 3 || b === 4) {
          var M = l.stateNode.containerInfo;
          if (M === f) break;
          if (b === 4)
            for (b = l.return; b !== null; ) {
              var j = b.tag;
              if ((j === 3 || j === 4) && b.stateNode.containerInfo === f)
                return;
              b = b.return;
            }
          for (; M !== null; ) {
            if (b = Na(M), b === null) return;
            if (j = b.tag, j === 5 || j === 6 || j === 26 || j === 27) {
              l = m = b;
              continue t;
            }
            M = M.parentNode;
          }
        }
        l = l.return;
      }
    z0(function() {
      var $ = m, tt = mf(a), it = [];
      t: {
        var K = lg.get(e);
        if (K !== void 0) {
          var Q = Nl, vt = e;
          switch (e) {
            case "keypress":
              if (Dl(a) === 0) break t;
            case "keydown":
            case "keyup":
              Q = oC;
              break;
            case "focusin":
              vt = "focus", Q = bf;
              break;
            case "focusout":
              vt = "blur", Q = bf;
              break;
            case "beforeblur":
            case "afterblur":
              Q = bf;
              break;
            case "click":
              if (a.button === 2) break t;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              Q = U0;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              Q = KA;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              Q = cC;
              break;
            case sg:
            case ag:
            case rg:
              Q = JA;
              break;
            case og:
              Q = dC;
              break;
            case "scroll":
            case "scrollend":
              Q = FA;
              break;
            case "wheel":
              Q = mC;
              break;
            case "copy":
            case "cut":
            case "paste":
              Q = tC;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              Q = B0;
              break;
            case "toggle":
            case "beforetoggle":
              Q = gC;
          }
          var At = (i & 4) !== 0, ce = !At && (e === "scroll" || e === "scrollend"), B = At ? K !== null ? K + "Capture" : null : K;
          At = [];
          for (var z = $, F; z !== null; ) {
            var et = z;
            if (F = et.stateNode, et = et.tag, et !== 5 && et !== 26 && et !== 27 || F === null || B === null || (et = Wr(z, B), et != null && At.push(
              Oo(z, et, F)
            )), ce) break;
            z = z.return;
          }
          0 < At.length && (K = new Q(
            K,
            vt,
            null,
            a,
            tt
          ), it.push({ event: K, listeners: At }));
        }
      }
      if ((i & 7) === 0) {
        t: {
          if (K = e === "mouseover" || e === "pointerover", Q = e === "mouseout" || e === "pointerout", K && a !== hf && (vt = a.relatedTarget || a.fromElement) && (Na(vt) || vt[ja]))
            break t;
          if ((Q || K) && (K = tt.window === tt ? tt : (K = tt.ownerDocument) ? K.defaultView || K.parentWindow : window, Q ? (vt = a.relatedTarget || a.toElement, Q = $, vt = vt ? Na(vt) : null, vt !== null && (ce = u(vt), At = vt.tag, vt !== ce || At !== 5 && At !== 27 && At !== 6) && (vt = null)) : (Q = null, vt = $), Q !== vt)) {
            if (At = U0, et = "onMouseLeave", B = "onMouseEnter", z = "mouse", (e === "pointerout" || e === "pointerover") && (At = B0, et = "onPointerLeave", B = "onPointerEnter", z = "pointer"), ce = Q == null ? K : Jr(Q), F = vt == null ? K : Jr(vt), K = new At(
              et,
              z + "leave",
              Q,
              a,
              tt
            ), K.target = ce, K.relatedTarget = F, et = null, Na(tt) === $ && (At = new At(
              B,
              z + "enter",
              vt,
              a,
              tt
            ), At.target = F, At.relatedTarget = ce, et = At), ce = et, Q && vt)
              e: {
                for (At = p_, B = Q, z = vt, F = 0, et = B; et; et = At(et))
                  F++;
                et = 0;
                for (var Mt = z; Mt; Mt = At(Mt))
                  et++;
                for (; 0 < F - et; )
                  B = At(B), F--;
                for (; 0 < et - F; )
                  z = At(z), et--;
                for (; F--; ) {
                  if (B === z || z !== null && B === z.alternate) {
                    At = B;
                    break e;
                  }
                  B = At(B), z = At(z);
                }
                At = null;
              }
            else At = null;
            Q !== null && jv(
              it,
              K,
              Q,
              At,
              !1
            ), vt !== null && ce !== null && jv(
              it,
              ce,
              vt,
              At,
              !0
            );
          }
        }
        t: {
          if (K = $ ? Jr($) : window, Q = K.nodeName && K.nodeName.toLowerCase(), Q === "select" || Q === "input" && K.type === "file")
            var Wt = F0;
          else if (P0(K))
            if ($0)
              Wt = _C;
            else {
              Wt = AC;
              var bt = MC;
            }
          else
            Q = K.nodeName, !Q || Q.toLowerCase() !== "input" || K.type !== "checkbox" && K.type !== "radio" ? $ && df($.elementType) && (Wt = F0) : Wt = CC;
          if (Wt && (Wt = Wt(e, $))) {
            I0(
              it,
              Wt,
              a,
              tt
            );
            break t;
          }
          bt && bt(e, K, $), e === "focusout" && $ && K.type === "number" && $.memoizedProps.value != null && ff(K, "number", K.value);
        }
        switch (bt = $ ? Jr($) : window, e) {
          case "focusin":
            (P0(bt) || bt.contentEditable === "true") && (Ha = bt, _f = $, oo = null);
            break;
          case "focusout":
            oo = _f = Ha = null;
            break;
          case "mousedown":
            Ef = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Ef = !1, ng(it, a, tt);
            break;
          case "selectionchange":
            if (wC) break;
          case "keydown":
          case "keyup":
            ng(it, a, tt);
        }
        var Lt;
        if (Sf)
          t: {
            switch (e) {
              case "compositionstart":
                var It = "onCompositionStart";
                break t;
              case "compositionend":
                It = "onCompositionEnd";
                break t;
              case "compositionupdate":
                It = "onCompositionUpdate";
                break t;
            }
            It = void 0;
          }
        else
          Ba ? q0(e, a) && (It = "onCompositionEnd") : e === "keydown" && a.keyCode === 229 && (It = "onCompositionStart");
        It && (H0 && a.locale !== "ko" && (Ba || It !== "onCompositionStart" ? It === "onCompositionEnd" && Ba && (Lt = k0()) : (ss = tt, yf = "value" in ss ? ss.value : ss.textContent, Ba = !0)), bt = Tu($, It), 0 < bt.length && (It = new V0(
          It,
          e,
          null,
          a,
          tt
        ), it.push({ event: It, listeners: bt }), Lt ? It.data = Lt : (Lt = X0(a), Lt !== null && (It.data = Lt)))), (Lt = vC ? xC(e, a) : bC(e, a)) && (It = Tu($, "onBeforeInput"), 0 < It.length && (bt = new V0(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          tt
        ), it.push({
          event: bt,
          listeners: It
        }), bt.data = Lt)), f_(
          it,
          e,
          $,
          a,
          tt
        );
      }
      wv(it, i);
    });
  }
  function Oo(e, i, a) {
    return {
      instance: e,
      listener: i,
      currentTarget: a
    };
  }
  function Tu(e, i) {
    for (var a = i + "Capture", l = []; e !== null; ) {
      var f = e, m = f.stateNode;
      if (f = f.tag, f !== 5 && f !== 26 && f !== 27 || m === null || (f = Wr(e, a), f != null && l.unshift(
        Oo(e, f, m)
      ), f = Wr(e, i), f != null && l.push(
        Oo(e, f, m)
      )), e.tag === 3) return l;
      e = e.return;
    }
    return [];
  }
  function p_(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function jv(e, i, a, l, f) {
    for (var m = i._reactName, b = []; a !== null && a !== l; ) {
      var M = a, j = M.alternate, $ = M.stateNode;
      if (M = M.tag, j !== null && j === l) break;
      M !== 5 && M !== 26 && M !== 27 || $ === null || (j = $, f ? ($ = Wr(a, m), $ != null && b.unshift(
        Oo(a, $, j)
      )) : f || ($ = Wr(a, m), $ != null && b.push(
        Oo(a, $, j)
      ))), a = a.return;
    }
    b.length !== 0 && e.push({ event: i, listeners: b });
  }
  var g_ = /\r\n?/g, y_ = /\u0000|\uFFFD/g;
  function Nv(e) {
    return (typeof e == "string" ? e : "" + e).replace(g_, `
`).replace(y_, "");
  }
  function Rv(e, i) {
    return i = Nv(i), Nv(e) === i;
  }
  function ue(e, i, a, l, f, m) {
    switch (a) {
      case "children":
        typeof l == "string" ? i === "body" || i === "textarea" && l === "" || La(e, l) : (typeof l == "number" || typeof l == "bigint") && i !== "body" && La(e, "" + l);
        break;
      case "className":
        Cl(e, "class", l);
        break;
      case "tabIndex":
        Cl(e, "tabindex", l);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Cl(e, a, l);
        break;
      case "style":
        R0(e, l, m);
        break;
      case "data":
        if (i !== "object") {
          Cl(e, "data", l);
          break;
        }
      case "src":
      case "href":
        if (l === "" && (i !== "a" || a !== "href")) {
          e.removeAttribute(a);
          break;
        }
        if (l == null || typeof l == "function" || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(a);
          break;
        }
        l = El("" + l), e.setAttribute(a, l);
        break;
      case "action":
      case "formAction":
        if (typeof l == "function") {
          e.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof m == "function" && (a === "formAction" ? (i !== "input" && ue(e, i, "name", f.name, f, null), ue(
            e,
            i,
            "formEncType",
            f.formEncType,
            f,
            null
          ), ue(
            e,
            i,
            "formMethod",
            f.formMethod,
            f,
            null
          ), ue(
            e,
            i,
            "formTarget",
            f.formTarget,
            f,
            null
          )) : (ue(e, i, "encType", f.encType, f, null), ue(e, i, "method", f.method, f, null), ue(e, i, "target", f.target, f, null)));
        if (l == null || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(a);
          break;
        }
        l = El("" + l), e.setAttribute(a, l);
        break;
      case "onClick":
        l != null && (e.onclick = _i);
        break;
      case "onScroll":
        l != null && Xt("scroll", e);
        break;
      case "onScrollEnd":
        l != null && Xt("scrollend", e);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(r(61));
          if (a = l.__html, a != null) {
            if (f.children != null) throw Error(r(60));
            e.innerHTML = a;
          }
        }
        break;
      case "multiple":
        e.multiple = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "muted":
        e.muted = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (l == null || typeof l == "function" || typeof l == "boolean" || typeof l == "symbol") {
          e.removeAttribute("xlink:href");
          break;
        }
        a = El("" + l), e.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, "" + l) : e.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        l && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, "") : e.removeAttribute(a);
        break;
      case "capture":
      case "download":
        l === !0 ? e.setAttribute(a, "") : l !== !1 && l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, l) : e.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        l != null && typeof l != "function" && typeof l != "symbol" && !isNaN(l) && 1 <= l ? e.setAttribute(a, l) : e.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        l == null || typeof l == "function" || typeof l == "symbol" || isNaN(l) ? e.removeAttribute(a) : e.setAttribute(a, l);
        break;
      case "popover":
        Xt("beforetoggle", e), Xt("toggle", e), Al(e, "popover", l);
        break;
      case "xlinkActuate":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          l
        );
        break;
      case "xlinkArcrole":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          l
        );
        break;
      case "xlinkRole":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          l
        );
        break;
      case "xlinkShow":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          l
        );
        break;
      case "xlinkTitle":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          l
        );
        break;
      case "xlinkType":
        Ci(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          l
        );
        break;
      case "xmlBase":
        Ci(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          l
        );
        break;
      case "xmlLang":
        Ci(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          l
        );
        break;
      case "xmlSpace":
        Ci(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          l
        );
        break;
      case "is":
        Al(e, "is", l);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = PA.get(a) || a, Al(e, a, l));
    }
  }
  function Jd(e, i, a, l, f, m) {
    switch (a) {
      case "style":
        R0(e, l, m);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(r(61));
          if (a = l.__html, a != null) {
            if (f.children != null) throw Error(r(60));
            e.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof l == "string" ? La(e, l) : (typeof l == "number" || typeof l == "bigint") && La(e, "" + l);
        break;
      case "onScroll":
        l != null && Xt("scroll", e);
        break;
      case "onScrollEnd":
        l != null && Xt("scrollend", e);
        break;
      case "onClick":
        l != null && (e.onclick = _i);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!M0.hasOwnProperty(a))
          t: {
            if (a[0] === "o" && a[1] === "n" && (f = a.endsWith("Capture"), i = a.slice(2, f ? a.length - 7 : void 0), m = e[vn] || null, m = m != null ? m[a] : null, typeof m == "function" && e.removeEventListener(i, m, f), typeof l == "function")) {
              typeof m != "function" && m !== null && (a in e ? e[a] = null : e.hasAttribute(a) && e.removeAttribute(a)), e.addEventListener(i, l, f);
              break t;
            }
            a in e ? e[a] = l : l === !0 ? e.setAttribute(a, "") : Al(e, a, l);
          }
    }
  }
  function tn(e, i, a) {
    switch (i) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        Xt("error", e), Xt("load", e);
        var l = !1, f = !1, m;
        for (m in a)
          if (a.hasOwnProperty(m)) {
            var b = a[m];
            if (b != null)
              switch (m) {
                case "src":
                  l = !0;
                  break;
                case "srcSet":
                  f = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(r(137, i));
                default:
                  ue(e, i, m, b, a, null);
              }
          }
        f && ue(e, i, "srcSet", a.srcSet, a, null), l && ue(e, i, "src", a.src, a, null);
        return;
      case "input":
        Xt("invalid", e);
        var M = m = b = f = null, j = null, $ = null;
        for (l in a)
          if (a.hasOwnProperty(l)) {
            var tt = a[l];
            if (tt != null)
              switch (l) {
                case "name":
                  f = tt;
                  break;
                case "type":
                  b = tt;
                  break;
                case "checked":
                  j = tt;
                  break;
                case "defaultChecked":
                  $ = tt;
                  break;
                case "value":
                  m = tt;
                  break;
                case "defaultValue":
                  M = tt;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (tt != null)
                    throw Error(r(137, i));
                  break;
                default:
                  ue(e, i, l, tt, a, null);
              }
          }
        w0(
          e,
          m,
          M,
          j,
          $,
          b,
          f,
          !1
        );
        return;
      case "select":
        Xt("invalid", e), l = b = m = null;
        for (f in a)
          if (a.hasOwnProperty(f) && (M = a[f], M != null))
            switch (f) {
              case "value":
                m = M;
                break;
              case "defaultValue":
                b = M;
                break;
              case "multiple":
                l = M;
              default:
                ue(e, i, f, M, a, null);
            }
        i = m, a = b, e.multiple = !!l, i != null ? ka(e, !!l, i, !1) : a != null && ka(e, !!l, a, !0);
        return;
      case "textarea":
        Xt("invalid", e), m = f = l = null;
        for (b in a)
          if (a.hasOwnProperty(b) && (M = a[b], M != null))
            switch (b) {
              case "value":
                l = M;
                break;
              case "defaultValue":
                f = M;
                break;
              case "children":
                m = M;
                break;
              case "dangerouslySetInnerHTML":
                if (M != null) throw Error(r(91));
                break;
              default:
                ue(e, i, b, M, a, null);
            }
        j0(e, l, f, m);
        return;
      case "option":
        for (j in a)
          a.hasOwnProperty(j) && (l = a[j], l != null) && (j === "selected" ? e.selected = l && typeof l != "function" && typeof l != "symbol" : ue(e, i, j, l, a, null));
        return;
      case "dialog":
        Xt("beforetoggle", e), Xt("toggle", e), Xt("cancel", e), Xt("close", e);
        break;
      case "iframe":
      case "object":
        Xt("load", e);
        break;
      case "video":
      case "audio":
        for (l = 0; l < Ro.length; l++)
          Xt(Ro[l], e);
        break;
      case "image":
        Xt("error", e), Xt("load", e);
        break;
      case "details":
        Xt("toggle", e);
        break;
      case "embed":
      case "source":
      case "link":
        Xt("error", e), Xt("load", e);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for ($ in a)
          if (a.hasOwnProperty($) && (l = a[$], l != null))
            switch ($) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(r(137, i));
              default:
                ue(e, i, $, l, a, null);
            }
        return;
      default:
        if (df(i)) {
          for (tt in a)
            a.hasOwnProperty(tt) && (l = a[tt], l !== void 0 && Jd(
              e,
              i,
              tt,
              l,
              a,
              void 0
            ));
          return;
        }
    }
    for (M in a)
      a.hasOwnProperty(M) && (l = a[M], l != null && ue(e, i, M, l, a, null));
  }
  function v_(e, i, a, l) {
    switch (i) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var f = null, m = null, b = null, M = null, j = null, $ = null, tt = null;
        for (Q in a) {
          var it = a[Q];
          if (a.hasOwnProperty(Q) && it != null)
            switch (Q) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                j = it;
              default:
                l.hasOwnProperty(Q) || ue(e, i, Q, null, l, it);
            }
        }
        for (var K in l) {
          var Q = l[K];
          if (it = a[K], l.hasOwnProperty(K) && (Q != null || it != null))
            switch (K) {
              case "type":
                m = Q;
                break;
              case "name":
                f = Q;
                break;
              case "checked":
                $ = Q;
                break;
              case "defaultChecked":
                tt = Q;
                break;
              case "value":
                b = Q;
                break;
              case "defaultValue":
                M = Q;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (Q != null)
                  throw Error(r(137, i));
                break;
              default:
                Q !== it && ue(
                  e,
                  i,
                  K,
                  Q,
                  l,
                  it
                );
            }
        }
        cf(
          e,
          b,
          M,
          j,
          $,
          tt,
          m,
          f
        );
        return;
      case "select":
        Q = b = M = K = null;
        for (m in a)
          if (j = a[m], a.hasOwnProperty(m) && j != null)
            switch (m) {
              case "value":
                break;
              case "multiple":
                Q = j;
              default:
                l.hasOwnProperty(m) || ue(
                  e,
                  i,
                  m,
                  null,
                  l,
                  j
                );
            }
        for (f in l)
          if (m = l[f], j = a[f], l.hasOwnProperty(f) && (m != null || j != null))
            switch (f) {
              case "value":
                K = m;
                break;
              case "defaultValue":
                M = m;
                break;
              case "multiple":
                b = m;
              default:
                m !== j && ue(
                  e,
                  i,
                  f,
                  m,
                  l,
                  j
                );
            }
        i = M, a = b, l = Q, K != null ? ka(e, !!a, K, !1) : !!l != !!a && (i != null ? ka(e, !!a, i, !0) : ka(e, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        Q = K = null;
        for (M in a)
          if (f = a[M], a.hasOwnProperty(M) && f != null && !l.hasOwnProperty(M))
            switch (M) {
              case "value":
                break;
              case "children":
                break;
              default:
                ue(e, i, M, null, l, f);
            }
        for (b in l)
          if (f = l[b], m = a[b], l.hasOwnProperty(b) && (f != null || m != null))
            switch (b) {
              case "value":
                K = f;
                break;
              case "defaultValue":
                Q = f;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (f != null) throw Error(r(91));
                break;
              default:
                f !== m && ue(e, i, b, f, l, m);
            }
        D0(e, K, Q);
        return;
      case "option":
        for (var vt in a)
          K = a[vt], a.hasOwnProperty(vt) && K != null && !l.hasOwnProperty(vt) && (vt === "selected" ? e.selected = !1 : ue(
            e,
            i,
            vt,
            null,
            l,
            K
          ));
        for (j in l)
          K = l[j], Q = a[j], l.hasOwnProperty(j) && K !== Q && (K != null || Q != null) && (j === "selected" ? e.selected = K && typeof K != "function" && typeof K != "symbol" : ue(
            e,
            i,
            j,
            K,
            l,
            Q
          ));
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var At in a)
          K = a[At], a.hasOwnProperty(At) && K != null && !l.hasOwnProperty(At) && ue(e, i, At, null, l, K);
        for ($ in l)
          if (K = l[$], Q = a[$], l.hasOwnProperty($) && K !== Q && (K != null || Q != null))
            switch ($) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (K != null)
                  throw Error(r(137, i));
                break;
              default:
                ue(
                  e,
                  i,
                  $,
                  K,
                  l,
                  Q
                );
            }
        return;
      default:
        if (df(i)) {
          for (var ce in a)
            K = a[ce], a.hasOwnProperty(ce) && K !== void 0 && !l.hasOwnProperty(ce) && Jd(
              e,
              i,
              ce,
              void 0,
              l,
              K
            );
          for (tt in l)
            K = l[tt], Q = a[tt], !l.hasOwnProperty(tt) || K === Q || K === void 0 && Q === void 0 || Jd(
              e,
              i,
              tt,
              K,
              l,
              Q
            );
          return;
        }
    }
    for (var B in a)
      K = a[B], a.hasOwnProperty(B) && K != null && !l.hasOwnProperty(B) && ue(e, i, B, null, l, K);
    for (it in l)
      K = l[it], Q = a[it], !l.hasOwnProperty(it) || K === Q || K == null && Q == null || ue(e, i, it, K, l, Q);
  }
  function Ov(e) {
    switch (e) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function x_() {
    if (typeof performance.getEntriesByType == "function") {
      for (var e = 0, i = 0, a = performance.getEntriesByType("resource"), l = 0; l < a.length; l++) {
        var f = a[l], m = f.transferSize, b = f.initiatorType, M = f.duration;
        if (m && M && Ov(b)) {
          for (b = 0, M = f.responseEnd, l += 1; l < a.length; l++) {
            var j = a[l], $ = j.startTime;
            if ($ > M) break;
            var tt = j.transferSize, it = j.initiatorType;
            tt && Ov(it) && (j = j.responseEnd, b += tt * (j < M ? 1 : (M - $) / (j - $)));
          }
          if (--l, i += 8 * (m + b) / (f.duration / 1e3), e++, 10 < e) break;
        }
      }
      if (0 < e) return i / e / 1e6;
    }
    return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
  }
  var Wd = null, th = null;
  function Su(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function zv(e) {
    switch (e) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function kv(e, i) {
    if (e === 0)
      switch (i) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return e === 1 && i === "foreignObject" ? 0 : e;
  }
  function eh(e, i) {
    return e === "textarea" || e === "noscript" || typeof i.children == "string" || typeof i.children == "number" || typeof i.children == "bigint" || typeof i.dangerouslySetInnerHTML == "object" && i.dangerouslySetInnerHTML !== null && i.dangerouslySetInnerHTML.__html != null;
  }
  var nh = null;
  function b_() {
    var e = window.event;
    return e && e.type === "popstate" ? e === nh ? !1 : (nh = e, !0) : (nh = null, !1);
  }
  var Lv = typeof setTimeout == "function" ? setTimeout : void 0, T_ = typeof clearTimeout == "function" ? clearTimeout : void 0, Uv = typeof Promise == "function" ? Promise : void 0, S_ = typeof queueMicrotask == "function" ? queueMicrotask : typeof Uv < "u" ? function(e) {
    return Uv.resolve(null).then(e).catch(M_);
  } : Lv;
  function M_(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function Ts(e) {
    return e === "head";
  }
  function Vv(e, i) {
    var a = i, l = 0;
    do {
      var f = a.nextSibling;
      if (e.removeChild(a), f && f.nodeType === 8)
        if (a = f.data, a === "/$" || a === "/&") {
          if (l === 0) {
            e.removeChild(f), hr(i);
            return;
          }
          l--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          l++;
        else if (a === "html")
          zo(e.ownerDocument.documentElement);
        else if (a === "head") {
          a = e.ownerDocument.head, zo(a);
          for (var m = a.firstChild; m; ) {
            var b = m.nextSibling, M = m.nodeName;
            m[Qr] || M === "SCRIPT" || M === "STYLE" || M === "LINK" && m.rel.toLowerCase() === "stylesheet" || a.removeChild(m), m = b;
          }
        } else
          a === "body" && zo(e.ownerDocument.body);
      a = f;
    } while (a);
    hr(i);
  }
  function Bv(e, i) {
    var a = e;
    e = 0;
    do {
      var l = a.nextSibling;
      if (a.nodeType === 1 ? i ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (i ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), l && l.nodeType === 8)
        if (a = l.data, a === "/$") {
          if (e === 0) break;
          e--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || e++;
      a = l;
    } while (a);
  }
  function ih(e) {
    var i = e.firstChild;
    for (i && i.nodeType === 10 && (i = i.nextSibling); i; ) {
      var a = i;
      switch (i = i.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          ih(a), lf(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      e.removeChild(a);
    }
  }
  function A_(e, i, a, l) {
    for (; e.nodeType === 1; ) {
      var f = a;
      if (e.nodeName.toLowerCase() !== i.toLowerCase()) {
        if (!l && (e.nodeName !== "INPUT" || e.type !== "hidden"))
          break;
      } else if (l) {
        if (!e[Qr])
          switch (i) {
            case "meta":
              if (!e.hasAttribute("itemprop")) break;
              return e;
            case "link":
              if (m = e.getAttribute("rel"), m === "stylesheet" && e.hasAttribute("data-precedence"))
                break;
              if (m !== f.rel || e.getAttribute("href") !== (f.href == null || f.href === "" ? null : f.href) || e.getAttribute("crossorigin") !== (f.crossOrigin == null ? null : f.crossOrigin) || e.getAttribute("title") !== (f.title == null ? null : f.title))
                break;
              return e;
            case "style":
              if (e.hasAttribute("data-precedence")) break;
              return e;
            case "script":
              if (m = e.getAttribute("src"), (m !== (f.src == null ? null : f.src) || e.getAttribute("type") !== (f.type == null ? null : f.type) || e.getAttribute("crossorigin") !== (f.crossOrigin == null ? null : f.crossOrigin)) && m && e.hasAttribute("async") && !e.hasAttribute("itemprop"))
                break;
              return e;
            default:
              return e;
          }
      } else if (i === "input" && e.type === "hidden") {
        var m = f.name == null ? null : "" + f.name;
        if (f.type === "hidden" && e.getAttribute("name") === m)
          return e;
      } else return e;
      if (e = Xn(e.nextSibling), e === null) break;
    }
    return null;
  }
  function C_(e, i, a) {
    if (i === "") return null;
    for (; e.nodeType !== 3; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !a || (e = Xn(e.nextSibling), e === null)) return null;
    return e;
  }
  function Hv(e, i) {
    for (; e.nodeType !== 8; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !i || (e = Xn(e.nextSibling), e === null)) return null;
    return e;
  }
  function sh(e) {
    return e.data === "$?" || e.data === "$~";
  }
  function ah(e) {
    return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
  }
  function __(e, i) {
    var a = e.ownerDocument;
    if (e.data === "$~") e._reactRetry = i;
    else if (e.data !== "$?" || a.readyState !== "loading")
      i();
    else {
      var l = function() {
        i(), a.removeEventListener("DOMContentLoaded", l);
      };
      a.addEventListener("DOMContentLoaded", l), e._reactRetry = l;
    }
  }
  function Xn(e) {
    for (; e != null; e = e.nextSibling) {
      var i = e.nodeType;
      if (i === 1 || i === 3) break;
      if (i === 8) {
        if (i = e.data, i === "$" || i === "$!" || i === "$?" || i === "$~" || i === "&" || i === "F!" || i === "F")
          break;
        if (i === "/$" || i === "/&") return null;
      }
    }
    return e;
  }
  var rh = null;
  function Yv(e) {
    e = e.nextSibling;
    for (var i = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === "/$" || a === "/&") {
          if (i === 0)
            return Xn(e.nextSibling);
          i--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || i++;
      }
      e = e.nextSibling;
    }
    return null;
  }
  function Gv(e) {
    e = e.previousSibling;
    for (var i = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (i === 0) return e;
          i--;
        } else a !== "/$" && a !== "/&" || i++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function qv(e, i, a) {
    switch (i = Su(a), e) {
      case "html":
        if (e = i.documentElement, !e) throw Error(r(452));
        return e;
      case "head":
        if (e = i.head, !e) throw Error(r(453));
        return e;
      case "body":
        if (e = i.body, !e) throw Error(r(454));
        return e;
      default:
        throw Error(r(451));
    }
  }
  function zo(e) {
    for (var i = e.attributes; i.length; )
      e.removeAttributeNode(i[0]);
    lf(e);
  }
  var Pn = /* @__PURE__ */ new Map(), Xv = /* @__PURE__ */ new Set();
  function Mu(e) {
    return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
  }
  var Gi = q.d;
  q.d = {
    f: E_,
    r: w_,
    D: D_,
    C: j_,
    L: N_,
    m: R_,
    X: z_,
    S: O_,
    M: k_
  };
  function E_() {
    var e = Gi.f(), i = mu();
    return e || i;
  }
  function w_(e) {
    var i = Ra(e);
    i !== null && i.tag === 5 && i.type === "form" ? oy(i) : Gi.r(e);
  }
  var cr = typeof document > "u" ? null : document;
  function Pv(e, i, a) {
    var l = cr;
    if (l && typeof i == "string" && i) {
      var f = Un(i);
      f = 'link[rel="' + e + '"][href="' + f + '"]', typeof a == "string" && (f += '[crossorigin="' + a + '"]'), Xv.has(f) || (Xv.add(f), e = { rel: e, crossOrigin: a, href: i }, l.querySelector(f) === null && (i = l.createElement("link"), tn(i, "link", e), qe(i), l.head.appendChild(i)));
    }
  }
  function D_(e) {
    Gi.D(e), Pv("dns-prefetch", e, null);
  }
  function j_(e, i) {
    Gi.C(e, i), Pv("preconnect", e, i);
  }
  function N_(e, i, a) {
    Gi.L(e, i, a);
    var l = cr;
    if (l && e && i) {
      var f = 'link[rel="preload"][as="' + Un(i) + '"]';
      i === "image" && a && a.imageSrcSet ? (f += '[imagesrcset="' + Un(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (f += '[imagesizes="' + Un(
        a.imageSizes
      ) + '"]')) : f += '[href="' + Un(e) + '"]';
      var m = f;
      switch (i) {
        case "style":
          m = fr(e);
          break;
        case "script":
          m = dr(e);
      }
      Pn.has(m) || (e = y(
        {
          rel: "preload",
          href: i === "image" && a && a.imageSrcSet ? void 0 : e,
          as: i
        },
        a
      ), Pn.set(m, e), l.querySelector(f) !== null || i === "style" && l.querySelector(ko(m)) || i === "script" && l.querySelector(Lo(m)) || (i = l.createElement("link"), tn(i, "link", e), qe(i), l.head.appendChild(i)));
    }
  }
  function R_(e, i) {
    Gi.m(e, i);
    var a = cr;
    if (a && e) {
      var l = i && typeof i.as == "string" ? i.as : "script", f = 'link[rel="modulepreload"][as="' + Un(l) + '"][href="' + Un(e) + '"]', m = f;
      switch (l) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          m = dr(e);
      }
      if (!Pn.has(m) && (e = y({ rel: "modulepreload", href: e }, i), Pn.set(m, e), a.querySelector(f) === null)) {
        switch (l) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(Lo(m)))
              return;
        }
        l = a.createElement("link"), tn(l, "link", e), qe(l), a.head.appendChild(l);
      }
    }
  }
  function O_(e, i, a) {
    Gi.S(e, i, a);
    var l = cr;
    if (l && e) {
      var f = Oa(l).hoistableStyles, m = fr(e);
      i = i || "default";
      var b = f.get(m);
      if (!b) {
        var M = { loading: 0, preload: null };
        if (b = l.querySelector(
          ko(m)
        ))
          M.loading = 5;
        else {
          e = y(
            { rel: "stylesheet", href: e, "data-precedence": i },
            a
          ), (a = Pn.get(m)) && oh(e, a);
          var j = b = l.createElement("link");
          qe(j), tn(j, "link", e), j._p = new Promise(function($, tt) {
            j.onload = $, j.onerror = tt;
          }), j.addEventListener("load", function() {
            M.loading |= 1;
          }), j.addEventListener("error", function() {
            M.loading |= 2;
          }), M.loading |= 4, Au(b, i, l);
        }
        b = {
          type: "stylesheet",
          instance: b,
          count: 1,
          state: M
        }, f.set(m, b);
      }
    }
  }
  function z_(e, i) {
    Gi.X(e, i);
    var a = cr;
    if (a && e) {
      var l = Oa(a).hoistableScripts, f = dr(e), m = l.get(f);
      m || (m = a.querySelector(Lo(f)), m || (e = y({ src: e, async: !0 }, i), (i = Pn.get(f)) && lh(e, i), m = a.createElement("script"), qe(m), tn(m, "link", e), a.head.appendChild(m)), m = {
        type: "script",
        instance: m,
        count: 1,
        state: null
      }, l.set(f, m));
    }
  }
  function k_(e, i) {
    Gi.M(e, i);
    var a = cr;
    if (a && e) {
      var l = Oa(a).hoistableScripts, f = dr(e), m = l.get(f);
      m || (m = a.querySelector(Lo(f)), m || (e = y({ src: e, async: !0, type: "module" }, i), (i = Pn.get(f)) && lh(e, i), m = a.createElement("script"), qe(m), tn(m, "link", e), a.head.appendChild(m)), m = {
        type: "script",
        instance: m,
        count: 1,
        state: null
      }, l.set(f, m));
    }
  }
  function Iv(e, i, a, l) {
    var f = (f = st.current) ? Mu(f) : null;
    if (!f) throw Error(r(446));
    switch (e) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (i = fr(a.href), a = Oa(
          f
        ).hoistableStyles, l = a.get(i), l || (l = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(i, l)), l) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          e = fr(a.href);
          var m = Oa(
            f
          ).hoistableStyles, b = m.get(e);
          if (b || (f = f.ownerDocument || f, b = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, m.set(e, b), (m = f.querySelector(
            ko(e)
          )) && !m._p && (b.instance = m, b.state.loading = 5), Pn.has(e) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Pn.set(e, a), m || L_(
            f,
            e,
            a,
            b.state
          ))), i && l === null)
            throw Error(r(528, ""));
          return b;
        }
        if (i && l !== null)
          throw Error(r(529, ""));
        return null;
      case "script":
        return i = a.async, a = a.src, typeof a == "string" && i && typeof i != "function" && typeof i != "symbol" ? (i = dr(a), a = Oa(
          f
        ).hoistableScripts, l = a.get(i), l || (l = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, a.set(i, l)), l) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(r(444, e));
    }
  }
  function fr(e) {
    return 'href="' + Un(e) + '"';
  }
  function ko(e) {
    return 'link[rel="stylesheet"][' + e + "]";
  }
  function Fv(e) {
    return y({}, e, {
      "data-precedence": e.precedence,
      precedence: null
    });
  }
  function L_(e, i, a, l) {
    e.querySelector('link[rel="preload"][as="style"][' + i + "]") ? l.loading = 1 : (i = e.createElement("link"), l.preload = i, i.addEventListener("load", function() {
      return l.loading |= 1;
    }), i.addEventListener("error", function() {
      return l.loading |= 2;
    }), tn(i, "link", a), qe(i), e.head.appendChild(i));
  }
  function dr(e) {
    return '[src="' + Un(e) + '"]';
  }
  function Lo(e) {
    return "script[async]" + e;
  }
  function $v(e, i, a) {
    if (i.count++, i.instance === null)
      switch (i.type) {
        case "style":
          var l = e.querySelector(
            'style[data-href~="' + Un(a.href) + '"]'
          );
          if (l)
            return i.instance = l, qe(l), l;
          var f = y({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return l = (e.ownerDocument || e).createElement(
            "style"
          ), qe(l), tn(l, "style", f), Au(l, a.precedence, e), i.instance = l;
        case "stylesheet":
          f = fr(a.href);
          var m = e.querySelector(
            ko(f)
          );
          if (m)
            return i.state.loading |= 4, i.instance = m, qe(m), m;
          l = Fv(a), (f = Pn.get(f)) && oh(l, f), m = (e.ownerDocument || e).createElement("link"), qe(m);
          var b = m;
          return b._p = new Promise(function(M, j) {
            b.onload = M, b.onerror = j;
          }), tn(m, "link", l), i.state.loading |= 4, Au(m, a.precedence, e), i.instance = m;
        case "script":
          return m = dr(a.src), (f = e.querySelector(
            Lo(m)
          )) ? (i.instance = f, qe(f), f) : (l = a, (f = Pn.get(m)) && (l = y({}, a), lh(l, f)), e = e.ownerDocument || e, f = e.createElement("script"), qe(f), tn(f, "link", l), e.head.appendChild(f), i.instance = f);
        case "void":
          return null;
        default:
          throw Error(r(443, i.type));
      }
    else
      i.type === "stylesheet" && (i.state.loading & 4) === 0 && (l = i.instance, i.state.loading |= 4, Au(l, a.precedence, e));
    return i.instance;
  }
  function Au(e, i, a) {
    for (var l = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), f = l.length ? l[l.length - 1] : null, m = f, b = 0; b < l.length; b++) {
      var M = l[b];
      if (M.dataset.precedence === i) m = M;
      else if (m !== f) break;
    }
    m ? m.parentNode.insertBefore(e, m.nextSibling) : (i = a.nodeType === 9 ? a.head : a, i.insertBefore(e, i.firstChild));
  }
  function oh(e, i) {
    e.crossOrigin == null && (e.crossOrigin = i.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = i.referrerPolicy), e.title == null && (e.title = i.title);
  }
  function lh(e, i) {
    e.crossOrigin == null && (e.crossOrigin = i.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = i.referrerPolicy), e.integrity == null && (e.integrity = i.integrity);
  }
  var Cu = null;
  function Kv(e, i, a) {
    if (Cu === null) {
      var l = /* @__PURE__ */ new Map(), f = Cu = /* @__PURE__ */ new Map();
      f.set(a, l);
    } else
      f = Cu, l = f.get(a), l || (l = /* @__PURE__ */ new Map(), f.set(a, l));
    if (l.has(e)) return l;
    for (l.set(e, null), a = a.getElementsByTagName(e), f = 0; f < a.length; f++) {
      var m = a[f];
      if (!(m[Qr] || m[Ze] || e === "link" && m.getAttribute("rel") === "stylesheet") && m.namespaceURI !== "http://www.w3.org/2000/svg") {
        var b = m.getAttribute(i) || "";
        b = e + b;
        var M = l.get(b);
        M ? M.push(m) : l.set(b, [m]);
      }
    }
    return l;
  }
  function Zv(e, i, a) {
    e = e.ownerDocument || e, e.head.insertBefore(
      a,
      i === "title" ? e.querySelector("head > title") : null
    );
  }
  function U_(e, i, a) {
    if (a === 1 || i.itemProp != null) return !1;
    switch (e) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof i.precedence != "string" || typeof i.href != "string" || i.href === "")
          break;
        return !0;
      case "link":
        if (typeof i.rel != "string" || typeof i.href != "string" || i.href === "" || i.onLoad || i.onError)
          break;
        return i.rel === "stylesheet" ? (e = i.disabled, typeof i.precedence == "string" && e == null) : !0;
      case "script":
        if (i.async && typeof i.async != "function" && typeof i.async != "symbol" && !i.onLoad && !i.onError && i.src && typeof i.src == "string")
          return !0;
    }
    return !1;
  }
  function Qv(e) {
    return !(e.type === "stylesheet" && (e.state.loading & 3) === 0);
  }
  function V_(e, i, a, l) {
    if (a.type === "stylesheet" && (typeof l.media != "string" || matchMedia(l.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var f = fr(l.href), m = i.querySelector(
          ko(f)
        );
        if (m) {
          i = m._p, i !== null && typeof i == "object" && typeof i.then == "function" && (e.count++, e = _u.bind(e), i.then(e, e)), a.state.loading |= 4, a.instance = m, qe(m);
          return;
        }
        m = i.ownerDocument || i, l = Fv(l), (f = Pn.get(f)) && oh(l, f), m = m.createElement("link"), qe(m);
        var b = m;
        b._p = new Promise(function(M, j) {
          b.onload = M, b.onerror = j;
        }), tn(m, "link", l), a.instance = m;
      }
      e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(a, i), (i = a.state.preload) && (a.state.loading & 3) === 0 && (e.count++, a = _u.bind(e), i.addEventListener("load", a), i.addEventListener("error", a));
    }
  }
  var uh = 0;
  function B_(e, i) {
    return e.stylesheets && e.count === 0 && wu(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(a) {
      var l = setTimeout(function() {
        if (e.stylesheets && wu(e, e.stylesheets), e.unsuspend) {
          var m = e.unsuspend;
          e.unsuspend = null, m();
        }
      }, 6e4 + i);
      0 < e.imgBytes && uh === 0 && (uh = 62500 * x_());
      var f = setTimeout(
        function() {
          if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && wu(e, e.stylesheets), e.unsuspend)) {
            var m = e.unsuspend;
            e.unsuspend = null, m();
          }
        },
        (e.imgBytes > uh ? 50 : 800) + i
      );
      return e.unsuspend = a, function() {
        e.unsuspend = null, clearTimeout(l), clearTimeout(f);
      };
    } : null;
  }
  function _u() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) wu(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        this.unsuspend = null, e();
      }
    }
  }
  var Eu = null;
  function wu(e, i) {
    e.stylesheets = null, e.unsuspend !== null && (e.count++, Eu = /* @__PURE__ */ new Map(), i.forEach(H_, e), Eu = null, _u.call(e));
  }
  function H_(e, i) {
    if (!(i.state.loading & 4)) {
      var a = Eu.get(e);
      if (a) var l = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Eu.set(e, a);
        for (var f = e.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), m = 0; m < f.length; m++) {
          var b = f[m];
          (b.nodeName === "LINK" || b.getAttribute("media") !== "not all") && (a.set(b.dataset.precedence, b), l = b);
        }
        l && a.set(null, l);
      }
      f = i.instance, b = f.getAttribute("data-precedence"), m = a.get(b) || l, m === l && a.set(null, f), a.set(b, f), this.count++, l = _u.bind(this), f.addEventListener("load", l), f.addEventListener("error", l), m ? m.parentNode.insertBefore(f, m.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(f, e.firstChild)), i.state.loading |= 4;
    }
  }
  var Uo = {
    $$typeof: O,
    Provider: null,
    Consumer: null,
    _currentValue: w,
    _currentValue2: w,
    _threadCount: 0
  };
  function Y_(e, i, a, l, f, m, b, M, j) {
    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Ot(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ot(0), this.hiddenUpdates = Ot(null), this.identifierPrefix = l, this.onUncaughtError = f, this.onCaughtError = m, this.onRecoverableError = b, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = j, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Jv(e, i, a, l, f, m, b, M, j, $, tt, it) {
    return e = new Y_(
      e,
      i,
      a,
      b,
      j,
      $,
      tt,
      it,
      M
    ), i = 1, m === !0 && (i |= 24), m = wn(3, null, null, i), e.current = m, m.stateNode = e, i = Gf(), i.refCount++, e.pooledCache = i, i.refCount++, m.memoizedState = {
      element: l,
      isDehydrated: a,
      cache: i
    }, If(m), e;
  }
  function Wv(e) {
    return e ? (e = qa, e) : qa;
  }
  function t1(e, i, a, l, f, m) {
    f = Wv(f), l.context === null ? l.context = f : l.pendingContext = f, l = cs(i), l.payload = { element: a }, m = m === void 0 ? null : m, m !== null && (l.callback = m), a = fs(e, l, i), a !== null && (An(a, e, i), po(a, e, i));
  }
  function e1(e, i) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var a = e.retryLane;
      e.retryLane = a !== 0 && a < i ? a : i;
    }
  }
  function ch(e, i) {
    e1(e, i), (e = e.alternate) && e1(e, i);
  }
  function n1(e) {
    if (e.tag === 13 || e.tag === 31) {
      var i = Fs(e, 67108864);
      i !== null && An(i, e, 67108864), ch(e, 67108864);
    }
  }
  function i1(e) {
    if (e.tag === 13 || e.tag === 31) {
      var i = On();
      i = af(i);
      var a = Fs(e, i);
      a !== null && An(a, e, i), ch(e, i);
    }
  }
  var Du = !0;
  function G_(e, i, a, l) {
    var f = D.T;
    D.T = null;
    var m = q.p;
    try {
      q.p = 2, fh(e, i, a, l);
    } finally {
      q.p = m, D.T = f;
    }
  }
  function q_(e, i, a, l) {
    var f = D.T;
    D.T = null;
    var m = q.p;
    try {
      q.p = 8, fh(e, i, a, l);
    } finally {
      q.p = m, D.T = f;
    }
  }
  function fh(e, i, a, l) {
    if (Du) {
      var f = dh(l);
      if (f === null)
        Qd(
          e,
          i,
          l,
          ju,
          a
        ), a1(e, l);
      else if (P_(
        f,
        e,
        i,
        a,
        l
      ))
        l.stopPropagation();
      else if (a1(e, l), i & 4 && -1 < X_.indexOf(e)) {
        for (; f !== null; ) {
          var m = Ra(f);
          if (m !== null)
            switch (m.tag) {
              case 3:
                if (m = m.stateNode, m.current.memoizedState.isDehydrated) {
                  var b = fn(m.pendingLanes);
                  if (b !== 0) {
                    var M = m;
                    for (M.pendingLanes |= 2, M.entangledLanes |= 2; b; ) {
                      var j = 1 << 31 - Ye(b);
                      M.entanglements[1] |= j, b &= ~j;
                    }
                    pi(m), (ne & 6) === 0 && (du = jt() + 500, No(0));
                  }
                }
                break;
              case 31:
              case 13:
                M = Fs(m, 2), M !== null && An(M, m, 2), mu(), ch(m, 2);
            }
          if (m = dh(l), m === null && Qd(
            e,
            i,
            l,
            ju,
            a
          ), m === f) break;
          f = m;
        }
        f !== null && l.stopPropagation();
      } else
        Qd(
          e,
          i,
          l,
          null,
          a
        );
    }
  }
  function dh(e) {
    return e = mf(e), hh(e);
  }
  var ju = null;
  function hh(e) {
    if (ju = null, e = Na(e), e !== null) {
      var i = u(e);
      if (i === null) e = null;
      else {
        var a = i.tag;
        if (a === 13) {
          if (e = c(i), e !== null) return e;
          e = null;
        } else if (a === 31) {
          if (e = d(i), e !== null) return e;
          e = null;
        } else if (a === 3) {
          if (i.stateNode.current.memoizedState.isDehydrated)
            return i.tag === 3 ? i.stateNode.containerInfo : null;
          e = null;
        } else i !== e && (e = null);
      }
    }
    return ju = e, null;
  }
  function s1(e) {
    switch (e) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (Ht()) {
          case Gt:
            return 2;
          case zt:
            return 8;
          case ye:
          case me:
            return 32;
          case yn:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var mh = !1, Ss = null, Ms = null, As = null, Vo = /* @__PURE__ */ new Map(), Bo = /* @__PURE__ */ new Map(), Cs = [], X_ = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function a1(e, i) {
    switch (e) {
      case "focusin":
      case "focusout":
        Ss = null;
        break;
      case "dragenter":
      case "dragleave":
        Ms = null;
        break;
      case "mouseover":
      case "mouseout":
        As = null;
        break;
      case "pointerover":
      case "pointerout":
        Vo.delete(i.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Bo.delete(i.pointerId);
    }
  }
  function Ho(e, i, a, l, f, m) {
    return e === null || e.nativeEvent !== m ? (e = {
      blockedOn: i,
      domEventName: a,
      eventSystemFlags: l,
      nativeEvent: m,
      targetContainers: [f]
    }, i !== null && (i = Ra(i), i !== null && n1(i)), e) : (e.eventSystemFlags |= l, i = e.targetContainers, f !== null && i.indexOf(f) === -1 && i.push(f), e);
  }
  function P_(e, i, a, l, f) {
    switch (i) {
      case "focusin":
        return Ss = Ho(
          Ss,
          e,
          i,
          a,
          l,
          f
        ), !0;
      case "dragenter":
        return Ms = Ho(
          Ms,
          e,
          i,
          a,
          l,
          f
        ), !0;
      case "mouseover":
        return As = Ho(
          As,
          e,
          i,
          a,
          l,
          f
        ), !0;
      case "pointerover":
        var m = f.pointerId;
        return Vo.set(
          m,
          Ho(
            Vo.get(m) || null,
            e,
            i,
            a,
            l,
            f
          )
        ), !0;
      case "gotpointercapture":
        return m = f.pointerId, Bo.set(
          m,
          Ho(
            Bo.get(m) || null,
            e,
            i,
            a,
            l,
            f
          )
        ), !0;
    }
    return !1;
  }
  function r1(e) {
    var i = Na(e.target);
    if (i !== null) {
      var a = u(i);
      if (a !== null) {
        if (i = a.tag, i === 13) {
          if (i = c(a), i !== null) {
            e.blockedOn = i, b0(e.priority, function() {
              i1(a);
            });
            return;
          }
        } else if (i === 31) {
          if (i = d(a), i !== null) {
            e.blockedOn = i, b0(e.priority, function() {
              i1(a);
            });
            return;
          }
        } else if (i === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function Nu(e) {
    if (e.blockedOn !== null) return !1;
    for (var i = e.targetContainers; 0 < i.length; ) {
      var a = dh(e.nativeEvent);
      if (a === null) {
        a = e.nativeEvent;
        var l = new a.constructor(
          a.type,
          a
        );
        hf = l, a.target.dispatchEvent(l), hf = null;
      } else
        return i = Ra(a), i !== null && n1(i), e.blockedOn = a, !1;
      i.shift();
    }
    return !0;
  }
  function o1(e, i, a) {
    Nu(e) && a.delete(i);
  }
  function I_() {
    mh = !1, Ss !== null && Nu(Ss) && (Ss = null), Ms !== null && Nu(Ms) && (Ms = null), As !== null && Nu(As) && (As = null), Vo.forEach(o1), Bo.forEach(o1);
  }
  function Ru(e, i) {
    e.blockedOn === i && (e.blockedOn = null, mh || (mh = !0, t.unstable_scheduleCallback(
      t.unstable_NormalPriority,
      I_
    )));
  }
  var Ou = null;
  function l1(e) {
    Ou !== e && (Ou = e, t.unstable_scheduleCallback(
      t.unstable_NormalPriority,
      function() {
        Ou === e && (Ou = null);
        for (var i = 0; i < e.length; i += 3) {
          var a = e[i], l = e[i + 1], f = e[i + 2];
          if (typeof l != "function") {
            if (hh(l || a) === null)
              continue;
            break;
          }
          var m = Ra(a);
          m !== null && (e.splice(i, 3), i -= 3, dd(
            m,
            {
              pending: !0,
              data: f,
              method: a.method,
              action: l
            },
            l,
            f
          ));
        }
      }
    ));
  }
  function hr(e) {
    function i(j) {
      return Ru(j, e);
    }
    Ss !== null && Ru(Ss, e), Ms !== null && Ru(Ms, e), As !== null && Ru(As, e), Vo.forEach(i), Bo.forEach(i);
    for (var a = 0; a < Cs.length; a++) {
      var l = Cs[a];
      l.blockedOn === e && (l.blockedOn = null);
    }
    for (; 0 < Cs.length && (a = Cs[0], a.blockedOn === null); )
      r1(a), a.blockedOn === null && Cs.shift();
    if (a = (e.ownerDocument || e).$$reactFormReplay, a != null)
      for (l = 0; l < a.length; l += 3) {
        var f = a[l], m = a[l + 1], b = f[vn] || null;
        if (typeof m == "function")
          b || l1(a);
        else if (b) {
          var M = null;
          if (m && m.hasAttribute("formAction")) {
            if (f = m, b = m[vn] || null)
              M = b.formAction;
            else if (hh(f) !== null) continue;
          } else M = b.action;
          typeof M == "function" ? a[l + 1] = M : (a.splice(l, 3), l -= 3), l1(a);
        }
      }
  }
  function u1() {
    function e(m) {
      m.canIntercept && m.info === "react-transition" && m.intercept({
        handler: function() {
          return new Promise(function(b) {
            return f = b;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function i() {
      f !== null && (f(), f = null), l || setTimeout(a, 20);
    }
    function a() {
      if (!l && !navigation.transition) {
        var m = navigation.currentEntry;
        m && m.url != null && navigation.navigate(m.url, {
          state: m.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var l = !1, f = null;
      return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", i), navigation.addEventListener("navigateerror", i), setTimeout(a, 100), function() {
        l = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", i), navigation.removeEventListener("navigateerror", i), f !== null && (f(), f = null);
      };
    }
  }
  function ph(e) {
    this._internalRoot = e;
  }
  zu.prototype.render = ph.prototype.render = function(e) {
    var i = this._internalRoot;
    if (i === null) throw Error(r(409));
    var a = i.current, l = On();
    t1(a, l, e, i, null, null);
  }, zu.prototype.unmount = ph.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var i = e.containerInfo;
      t1(e.current, 2, null, e, null, null), mu(), i[ja] = null;
    }
  };
  function zu(e) {
    this._internalRoot = e;
  }
  zu.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var i = x0();
      e = { blockedOn: null, target: e, priority: i };
      for (var a = 0; a < Cs.length && i !== 0 && i < Cs[a].priority; a++) ;
      Cs.splice(a, 0, e), a === 0 && r1(e);
    }
  };
  var c1 = n.version;
  if (c1 !== "19.2.8")
    throw Error(
      r(
        527,
        c1,
        "19.2.8"
      )
    );
  q.findDOMNode = function(e) {
    var i = e._reactInternals;
    if (i === void 0)
      throw typeof e.render == "function" ? Error(r(188)) : (e = Object.keys(e).join(","), Error(r(268, e)));
    return e = h(i), e = e !== null ? g(e) : null, e = e === null ? null : e.stateNode, e;
  };
  var F_ = {
    bundleType: 0,
    version: "19.2.8",
    rendererPackageName: "react-dom",
    currentDispatcherRef: D,
    reconcilerVersion: "19.2.8"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var ku = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!ku.isDisabled && ku.supportsFiber)
      try {
        on = ku.inject(
          F_
        ), Me = ku;
      } catch {
      }
  }
  return Go.createRoot = function(e, i) {
    if (!o(e)) throw Error(r(299));
    var a = !1, l = "", f = yy, m = vy, b = xy;
    return i != null && (i.unstable_strictMode === !0 && (a = !0), i.identifierPrefix !== void 0 && (l = i.identifierPrefix), i.onUncaughtError !== void 0 && (f = i.onUncaughtError), i.onCaughtError !== void 0 && (m = i.onCaughtError), i.onRecoverableError !== void 0 && (b = i.onRecoverableError)), i = Jv(
      e,
      1,
      !1,
      null,
      null,
      a,
      l,
      null,
      f,
      m,
      b,
      u1
    ), e[ja] = i.current, Zd(e), new ph(i);
  }, Go.hydrateRoot = function(e, i, a) {
    if (!o(e)) throw Error(r(299));
    var l = !1, f = "", m = yy, b = vy, M = xy, j = null;
    return a != null && (a.unstable_strictMode === !0 && (l = !0), a.identifierPrefix !== void 0 && (f = a.identifierPrefix), a.onUncaughtError !== void 0 && (m = a.onUncaughtError), a.onCaughtError !== void 0 && (b = a.onCaughtError), a.onRecoverableError !== void 0 && (M = a.onRecoverableError), a.formState !== void 0 && (j = a.formState)), i = Jv(
      e,
      1,
      !0,
      i,
      a ?? null,
      l,
      f,
      j,
      m,
      b,
      M,
      u1
    ), i.context = Wv(null), a = i.current, l = On(), l = af(l), f = cs(l), f.callback = null, fs(a, f, l), a = l, i.current.lanes = a, oe(i, a), pi(i), e[ja] = i.current, Zd(e), new zu(i);
  }, Go.version = "19.2.8", Go;
}
var b1;
function nE() {
  if (b1) return vh.exports;
  b1 = 1;
  function t() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(t);
      } catch (n) {
        console.error(n);
      }
  }
  return t(), vh.exports = eE(), vh.exports;
}
var wT = nE(), Sh, T1;
function DT() {
  if (T1) return Sh;
  T1 = 1;
  function t(n) {
    var s = typeof n;
    return n != null && (s == "object" || s == "function");
  }
  return Sh = t, Sh;
}
var Mh, S1;
function iE() {
  if (S1) return Mh;
  S1 = 1;
  var t = typeof Lu == "object" && Lu && Lu.Object === Object && Lu;
  return Mh = t, Mh;
}
var Ah, M1;
function jT() {
  if (M1) return Ah;
  M1 = 1;
  var t = iE(), n = typeof self == "object" && self && self.Object === Object && self, s = t || n || Function("return this")();
  return Ah = s, Ah;
}
var Ch, A1;
function sE() {
  if (A1) return Ch;
  A1 = 1;
  var t = jT(), n = function() {
    return t.Date.now();
  };
  return Ch = n, Ch;
}
var _h, C1;
function aE() {
  if (C1) return _h;
  C1 = 1;
  var t = /\s/;
  function n(s) {
    for (var r = s.length; r-- && t.test(s.charAt(r)); )
      ;
    return r;
  }
  return _h = n, _h;
}
var Eh, _1;
function rE() {
  if (_1) return Eh;
  _1 = 1;
  var t = aE(), n = /^\s+/;
  function s(r) {
    return r && r.slice(0, t(r) + 1).replace(n, "");
  }
  return Eh = s, Eh;
}
var wh, E1;
function NT() {
  if (E1) return wh;
  E1 = 1;
  var t = jT(), n = t.Symbol;
  return wh = n, wh;
}
var Dh, w1;
function oE() {
  if (w1) return Dh;
  w1 = 1;
  var t = NT(), n = Object.prototype, s = n.hasOwnProperty, r = n.toString, o = t ? t.toStringTag : void 0;
  function u(c) {
    var d = s.call(c, o), p = c[o];
    try {
      c[o] = void 0;
      var h = !0;
    } catch {
    }
    var g = r.call(c);
    return h && (d ? c[o] = p : delete c[o]), g;
  }
  return Dh = u, Dh;
}
var jh, D1;
function lE() {
  if (D1) return jh;
  D1 = 1;
  var t = Object.prototype, n = t.toString;
  function s(r) {
    return n.call(r);
  }
  return jh = s, jh;
}
var Nh, j1;
function uE() {
  if (j1) return Nh;
  j1 = 1;
  var t = NT(), n = oE(), s = lE(), r = "[object Null]", o = "[object Undefined]", u = t ? t.toStringTag : void 0;
  function c(d) {
    return d == null ? d === void 0 ? o : r : u && u in Object(d) ? n(d) : s(d);
  }
  return Nh = c, Nh;
}
var Rh, N1;
function cE() {
  if (N1) return Rh;
  N1 = 1;
  function t(n) {
    return n != null && typeof n == "object";
  }
  return Rh = t, Rh;
}
var Oh, R1;
function fE() {
  if (R1) return Oh;
  R1 = 1;
  var t = uE(), n = cE(), s = "[object Symbol]";
  function r(o) {
    return typeof o == "symbol" || n(o) && t(o) == s;
  }
  return Oh = r, Oh;
}
var zh, O1;
function dE() {
  if (O1) return zh;
  O1 = 1;
  var t = rE(), n = DT(), s = fE(), r = NaN, o = /^[-+]0x[0-9a-f]+$/i, u = /^0b[01]+$/i, c = /^0o[0-7]+$/i, d = parseInt;
  function p(h) {
    if (typeof h == "number")
      return h;
    if (s(h))
      return r;
    if (n(h)) {
      var g = typeof h.valueOf == "function" ? h.valueOf() : h;
      h = n(g) ? g + "" : g;
    }
    if (typeof h != "string")
      return h === 0 ? h : +h;
    h = t(h);
    var y = u.test(h);
    return y || c.test(h) ? d(h.slice(2), y ? 2 : 8) : o.test(h) ? r : +h;
  }
  return zh = p, zh;
}
var kh, z1;
function hE() {
  if (z1) return kh;
  z1 = 1;
  var t = DT(), n = sE(), s = dE(), r = "Expected a function", o = Math.max, u = Math.min;
  function c(d, p, h) {
    var g, y, x, T, S, A, C = 0, N = !1, R = !1, O = !0;
    if (typeof d != "function")
      throw new TypeError(r);
    p = s(p) || 0, t(h) && (N = !!h.leading, R = "maxWait" in h, x = R ? o(s(h.maxWait) || 0, p) : x, O = "trailing" in h ? !!h.trailing : O);
    function k(lt) {
      var dt = g, ot = y;
      return g = y = void 0, C = lt, T = d.apply(ot, dt), T;
    }
    function H(lt) {
      return C = lt, S = setTimeout(Y, p), N ? k(lt) : T;
    }
    function G(lt) {
      var dt = lt - A, ot = lt - C, D = p - dt;
      return R ? u(D, x - ot) : D;
    }
    function X(lt) {
      var dt = lt - A, ot = lt - C;
      return A === void 0 || dt >= p || dt < 0 || R && ot >= x;
    }
    function Y() {
      var lt = n();
      if (X(lt))
        return Z(lt);
      S = setTimeout(Y, G(lt));
    }
    function Z(lt) {
      return S = void 0, O && g ? k(lt) : (g = y = void 0, T);
    }
    function J() {
      S !== void 0 && clearTimeout(S), C = 0, g = A = y = S = void 0;
    }
    function W() {
      return S === void 0 ? T : Z(n());
    }
    function ut() {
      var lt = n(), dt = X(lt);
      if (g = arguments, y = this, A = lt, dt) {
        if (S === void 0)
          return H(A);
        if (R)
          return clearTimeout(S), S = setTimeout(Y, p), k(A);
      }
      return S === void 0 && (S = setTimeout(Y, p)), T;
    }
    return ut.cancel = J, ut.flush = W, ut;
  }
  return kh = c, kh;
}
var mE = hE();
const pE = /* @__PURE__ */ _T(mE), gE = [], k1 = {
  width: 0,
  height: 0,
  top: 0,
  left: 0
};
function yE() {
  let {
    initialSize: t = k1,
    debounceTime: n = 300,
    ignoreDimensions: s = gE,
    enableDebounceLeadingCall: r = !0,
    resizeObserverPolyfill: o
  } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const u = E.useRef(null), c = E.useRef(0), [d, p] = E.useState({
    ...k1,
    ...t
  }), h = E.useMemo(() => {
    const g = Array.isArray(s) ? s : [s];
    return pE((y) => {
      p((x) => Object.keys(x).filter((C) => x[C] !== y[C]).every((C) => g.includes(C)) ? x : y);
    }, n, {
      leading: r
    });
  }, [n, r, s]);
  return E.useEffect(() => {
    const g = o || window.ResizeObserver, y = new g((x) => {
      x.forEach((T) => {
        const {
          left: S,
          top: A,
          width: C,
          height: N
        } = T?.contentRect ?? {};
        c.current = window.requestAnimationFrame(() => {
          h({
            width: C,
            height: N,
            top: A,
            left: S
          });
        });
      });
    });
    return u.current && y.observe(u.current), () => {
      window.cancelAnimationFrame(c.current), y.disconnect(), h.cancel();
    };
  }, [h, o]), {
    parentRef: u,
    resize: h,
    ...d
  };
}
const vE = {
  width: "100%",
  height: "100%"
};
function xE(t) {
  let {
    className: n,
    children: s,
    debounceTime: r,
    ignoreDimensions: o,
    initialSize: u,
    parentSizeStyles: c = vE,
    enableDebounceLeadingCall: d = !0,
    resizeObserverPolyfill: p,
    ...h
  } = t;
  const {
    parentRef: g,
    resize: y,
    ...x
  } = yE({
    initialSize: u,
    debounceTime: r,
    ignoreDimensions: o,
    enableDebounceLeadingCall: d,
    resizeObserverPolyfill: p
  });
  return /* @__PURE__ */ v.jsx("div", {
    style: c,
    ref: g,
    className: n,
    ...h,
    children: s({
      ...x,
      ref: g.current,
      resize: y
    })
  });
}
function RT(t) {
  var n, s, r = "";
  if (typeof t == "string" || typeof t == "number") r += t;
  else if (typeof t == "object") if (Array.isArray(t)) {
    var o = t.length;
    for (n = 0; n < o; n++) t[n] && (s = RT(t[n])) && (r && (r += " "), r += s);
  } else for (s in t) t[s] && (r && (r += " "), r += s);
  return r;
}
function bE() {
  for (var t, n, s = 0, r = "", o = arguments.length; s < o; s++) (t = arguments[s]) && (n = RT(t)) && (r && (r += " "), r += n);
  return r;
}
const TE = (t, n) => {
  const s = new Array(t.length + n.length);
  for (let r = 0; r < t.length; r++)
    s[r] = t[r];
  for (let r = 0; r < n.length; r++)
    s[t.length + r] = n[r];
  return s;
}, SE = (t, n) => ({
  classGroupId: t,
  validator: n
}), OT = (t = /* @__PURE__ */ new Map(), n = null, s) => ({
  nextPart: t,
  validators: n,
  classGroupId: s
}), pc = "-", L1 = [], ME = "arbitrary..", AE = (t) => {
  const n = _E(t), {
    conflictingClassGroups: s,
    conflictingClassGroupModifiers: r
  } = t;
  return {
    getClassGroupId: (c) => {
      if (c.startsWith("[") && c.endsWith("]"))
        return CE(c);
      const d = c.split(pc), p = d[0] === "" && d.length > 1 ? 1 : 0;
      return zT(d, p, n);
    },
    getConflictingClassGroupIds: (c, d) => {
      if (d) {
        const p = r[c], h = s[c];
        return p ? h ? TE(h, p) : p : h || L1;
      }
      return s[c] || L1;
    }
  };
}, zT = (t, n, s) => {
  if (t.length - n === 0)
    return s.classGroupId;
  const o = t[n], u = s.nextPart.get(o);
  if (u) {
    const h = zT(t, n + 1, u);
    if (h) return h;
  }
  const c = s.validators;
  if (c === null)
    return;
  const d = n === 0 ? t.join(pc) : t.slice(n).join(pc), p = c.length;
  for (let h = 0; h < p; h++) {
    const g = c[h];
    if (g.validator(d))
      return g.classGroupId;
  }
}, CE = (t) => t.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const n = t.slice(1, -1), s = n.indexOf(":"), r = n.slice(0, s);
  return r ? ME + r : void 0;
})(), _E = (t) => {
  const {
    theme: n,
    classGroups: s
  } = t;
  return EE(s, n);
}, EE = (t, n) => {
  const s = OT();
  for (const r in t) {
    const o = t[r];
    vp(o, s, r, n);
  }
  return s;
}, vp = (t, n, s, r) => {
  const o = t.length;
  for (let u = 0; u < o; u++) {
    const c = t[u];
    wE(c, n, s, r);
  }
}, wE = (t, n, s, r) => {
  if (typeof t == "string") {
    DE(t, n, s);
    return;
  }
  if (typeof t == "function") {
    jE(t, n, s, r);
    return;
  }
  NE(t, n, s, r);
}, DE = (t, n, s) => {
  const r = t === "" ? n : kT(n, t);
  r.classGroupId = s;
}, jE = (t, n, s, r) => {
  if (RE(t)) {
    vp(t(r), n, s, r);
    return;
  }
  n.validators === null && (n.validators = []), n.validators.push(SE(s, t));
}, NE = (t, n, s, r) => {
  const o = Object.entries(t), u = o.length;
  for (let c = 0; c < u; c++) {
    const [d, p] = o[c];
    vp(p, kT(n, d), s, r);
  }
}, kT = (t, n) => {
  let s = t;
  const r = n.split(pc), o = r.length;
  for (let u = 0; u < o; u++) {
    const c = r[u];
    let d = s.nextPart.get(c);
    d || (d = OT(), s.nextPart.set(c, d)), s = d;
  }
  return s;
}, RE = (t) => "isThemeGetter" in t && t.isThemeGetter === !0, OE = (t) => {
  if (t < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let n = 0, s = /* @__PURE__ */ Object.create(null), r = /* @__PURE__ */ Object.create(null);
  const o = (u, c) => {
    s[u] = c, n++, n > t && (n = 0, r = s, s = /* @__PURE__ */ Object.create(null));
  };
  return {
    get(u) {
      let c = s[u];
      if (c !== void 0)
        return c;
      if ((c = r[u]) !== void 0)
        return o(u, c), c;
    },
    set(u, c) {
      u in s ? s[u] = c : o(u, c);
    }
  };
}, Am = "!", U1 = ":", zE = [], V1 = (t, n, s, r, o) => ({
  modifiers: t,
  hasImportantModifier: n,
  baseClassName: s,
  maybePostfixModifierPosition: r,
  isExternal: o
}), kE = (t) => {
  const {
    prefix: n,
    experimentalParseClassName: s
  } = t;
  let r = (o) => {
    const u = [];
    let c = 0, d = 0, p = 0, h;
    const g = o.length;
    for (let A = 0; A < g; A++) {
      const C = o[A];
      if (c === 0 && d === 0) {
        if (C === U1) {
          u.push(o.slice(p, A)), p = A + 1;
          continue;
        }
        if (C === "/") {
          h = A;
          continue;
        }
      }
      C === "[" ? c++ : C === "]" ? c-- : C === "(" ? d++ : C === ")" && d--;
    }
    const y = u.length === 0 ? o : o.slice(p);
    let x = y, T = !1;
    y.endsWith(Am) ? (x = y.slice(0, -1), T = !0) : (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      y.startsWith(Am) && (x = y.slice(1), T = !0)
    );
    const S = h && h > p ? h - p : void 0;
    return V1(u, T, x, S);
  };
  if (n) {
    const o = n + U1, u = r;
    r = (c) => c.startsWith(o) ? u(c.slice(o.length)) : V1(zE, !1, c, void 0, !0);
  }
  if (s) {
    const o = r;
    r = (u) => s({
      className: u,
      parseClassName: o
    });
  }
  return r;
}, LE = (t) => {
  const n = /* @__PURE__ */ new Map();
  return t.orderSensitiveModifiers.forEach((s, r) => {
    n.set(s, 1e6 + r);
  }), (s) => {
    const r = [];
    let o = [];
    for (let u = 0; u < s.length; u++) {
      const c = s[u], d = c[0] === "[", p = n.has(c);
      d || p ? (o.length > 0 && (o.sort(), r.push(...o), o = []), r.push(c)) : o.push(c);
    }
    return o.length > 0 && (o.sort(), r.push(...o)), r;
  };
}, UE = (t) => ({
  cache: OE(t.cacheSize),
  parseClassName: kE(t),
  sortModifiers: LE(t),
  postfixLookupClassGroupIds: VE(t),
  ...AE(t)
}), VE = (t) => {
  const n = /* @__PURE__ */ Object.create(null), s = t.postfixLookupClassGroups;
  if (s)
    for (let r = 0; r < s.length; r++)
      n[s[r]] = !0;
  return n;
}, BE = /\s+/, HE = (t, n) => {
  const {
    parseClassName: s,
    getClassGroupId: r,
    getConflictingClassGroupIds: o,
    sortModifiers: u,
    postfixLookupClassGroupIds: c
  } = n, d = [], p = t.trim().split(BE);
  let h = "";
  for (let g = p.length - 1; g >= 0; g -= 1) {
    const y = p[g], {
      isExternal: x,
      modifiers: T,
      hasImportantModifier: S,
      baseClassName: A,
      maybePostfixModifierPosition: C
    } = s(y);
    if (x) {
      h = y + (h.length > 0 ? " " + h : h);
      continue;
    }
    let N = !!C, R;
    if (N) {
      const X = A.substring(0, C);
      R = r(X);
      const Y = R && c[R] ? r(A) : void 0;
      Y && Y !== R && (R = Y, N = !1);
    } else
      R = r(A);
    if (!R) {
      if (!N) {
        h = y + (h.length > 0 ? " " + h : h);
        continue;
      }
      if (R = r(A), !R) {
        h = y + (h.length > 0 ? " " + h : h);
        continue;
      }
      N = !1;
    }
    const O = T.length === 0 ? "" : T.length === 1 ? T[0] : u(T).join(":"), k = S ? O + Am : O, H = k + R;
    if (d.indexOf(H) > -1)
      continue;
    d.push(H);
    const G = o(R, N);
    for (let X = 0; X < G.length; ++X) {
      const Y = G[X];
      d.push(k + Y);
    }
    h = y + (h.length > 0 ? " " + h : h);
  }
  return h;
}, YE = (...t) => {
  let n = 0, s, r, o = "";
  for (; n < t.length; )
    (s = t[n++]) && (r = LT(s)) && (o && (o += " "), o += r);
  return o;
}, LT = (t) => {
  if (typeof t == "string")
    return t;
  let n, s = "";
  for (let r = 0; r < t.length; r++)
    t[r] && (n = LT(t[r])) && (s && (s += " "), s += n);
  return s;
}, GE = (t, ...n) => {
  let s, r, o, u;
  const c = (p) => {
    const h = n.reduce((g, y) => y(g), t());
    return s = UE(h), r = s.cache.get, o = s.cache.set, u = d, d(p);
  }, d = (p) => {
    const h = r(p);
    if (h)
      return h;
    const g = HE(p, s);
    return o(p, g), g;
  };
  return u = c, (...p) => u(YE(...p));
}, qE = [], Ve = (t) => {
  const n = (s) => s[t] || qE;
  return n.isThemeGetter = !0, n;
}, UT = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, VT = /^\((?:(\w[\w-]*):)?(.+)\)$/i, XE = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/, PE = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, IE = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, FE = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/, $E = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, KE = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, Es = (t) => XE.test(t), Bt = (t) => !!t && !Number.isNaN(Number(t)), gi = (t) => !!t && Number.isInteger(Number(t)), Lh = (t) => t.endsWith("%") && Bt(t.slice(0, -1)), qi = (t) => PE.test(t), BT = () => !0, ZE = (t) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  IE.test(t) && !FE.test(t)
), xp = () => !1, QE = (t) => $E.test(t), JE = (t) => KE.test(t), WE = (t) => !pt(t) && !yt(t), tw = (t) => t.startsWith("@container") && (t[10] === "/" && t[11] !== void 0 || t[11] === "s" && t[16] !== void 0 && t.startsWith("-size/", 10) || t[11] === "n" && t[18] !== void 0 && t.startsWith("-normal/", 10)), ew = (t) => Vs(t, GT, xp), pt = (t) => UT.test(t), ra = (t) => Vs(t, qT, ZE), B1 = (t) => Vs(t, uw, Bt), nw = (t) => Vs(t, PT, BT), iw = (t) => Vs(t, XT, xp), H1 = (t) => Vs(t, HT, xp), sw = (t) => Vs(t, YT, JE), Uu = (t) => Vs(t, IT, QE), yt = (t) => VT.test(t), qo = (t) => Ca(t, qT), aw = (t) => Ca(t, XT), Y1 = (t) => Ca(t, HT), rw = (t) => Ca(t, GT), ow = (t) => Ca(t, YT), Vu = (t) => Ca(t, IT, !0), lw = (t) => Ca(t, PT, !0), Vs = (t, n, s) => {
  const r = UT.exec(t);
  return r ? r[1] ? n(r[1]) : s(r[2]) : !1;
}, Ca = (t, n, s = !1) => {
  const r = VT.exec(t);
  return r ? r[1] ? n(r[1]) : s : !1;
}, HT = (t) => t === "position" || t === "percentage", YT = (t) => t === "image" || t === "url", GT = (t) => t === "length" || t === "size" || t === "bg-size", qT = (t) => t === "length", uw = (t) => t === "number", XT = (t) => t === "family-name", PT = (t) => t === "number" || t === "weight", IT = (t) => t === "shadow", cw = () => {
  const t = Ve("color"), n = Ve("font"), s = Ve("text"), r = Ve("font-weight"), o = Ve("tracking"), u = Ve("leading"), c = Ve("breakpoint"), d = Ve("container"), p = Ve("spacing"), h = Ve("radius"), g = Ve("shadow"), y = Ve("inset-shadow"), x = Ve("text-shadow"), T = Ve("drop-shadow"), S = Ve("blur"), A = Ve("perspective"), C = Ve("aspect"), N = Ve("ease"), R = Ve("animate"), O = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], k = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ], H = () => [...k(), yt, pt], G = () => ["auto", "hidden", "clip", "visible", "scroll"], X = () => ["auto", "contain", "none"], Y = () => [yt, pt, p], Z = () => [Es, "full", "auto", ...Y()], J = () => [gi, "none", "subgrid", yt, pt], W = () => ["auto", {
    span: ["full", gi, yt, pt]
  }, gi, yt, pt], ut = () => [gi, "auto", yt, pt], lt = () => ["auto", "min", "max", "fr", yt, pt], dt = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], ot = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], D = () => ["auto", ...Y()], q = () => [Es, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...Y()], w = () => [Es, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", ...Y()], L = () => [Es, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", ...Y()], U = () => [t, yt, pt], _ = () => [...k(), Y1, H1, {
    position: [yt, pt]
  }], V = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], nt = () => ["auto", "cover", "contain", rw, ew, {
    size: [yt, pt]
  }], at = () => [Lh, qo, ra], rt = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    h,
    yt,
    pt
  ], st = () => ["", Bt, qo, ra], ft = () => ["solid", "dashed", "dotted", "double"], Tt = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], P = () => [Bt, Lh, Y1, H1], ct = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    S,
    yt,
    pt
  ], ht = () => ["none", Bt, yt, pt], I = () => ["none", Bt, yt, pt], gt = () => [Bt, yt, pt], mt = () => [Es, "full", ...Y()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [qi],
      breakpoint: [qi],
      color: [BT],
      container: [qi],
      "drop-shadow": [qi],
      ease: ["in", "out", "in-out"],
      font: [WE],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [qi],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [qi],
      shadow: [qi],
      spacing: ["px", Bt],
      text: [qi],
      "text-shadow": [qi],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", Es, pt, yt, C]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Container Type
       * @see https://tailwindcss.com/docs/responsive-design#container-queries
       */
      "container-type": [{
        "@container": ["", "normal", "size", yt, pt]
      }],
      /**
       * Container Name
       * @see https://tailwindcss.com/docs/responsive-design#named-containers
       */
      "container-named": [tw],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [Bt, pt, yt, d]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": O()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": O()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: H()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: G()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": G()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": G()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: X()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": X()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": X()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Inset
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: Z()
      }],
      /**
       * Inset Inline
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": Z()
      }],
      /**
       * Inset Block
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": Z()
      }],
      /**
       * Inset Inline Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-s` in next major release
       */
      start: [{
        "inset-s": Z(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        start: Z()
      }],
      /**
       * Inset Inline End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-e` in next major release
       */
      end: [{
        "inset-e": Z(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        end: Z()
      }],
      /**
       * Inset Block Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-bs": [{
        "inset-bs": Z()
      }],
      /**
       * Inset Block End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-be": [{
        "inset-be": Z()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: Z()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: Z()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: Z()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: Z()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [gi, "auto", yt, pt]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [Es, "full", "auto", d, ...Y()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [Bt, Es, "auto", "initial", "none", pt]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", Bt, yt, pt]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", Bt, yt, pt]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [gi, "first", "last", "none", yt, pt]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": J()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: W()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": ut()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": ut()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": J()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: W()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": ut()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": ut()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": lt()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": lt()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: Y()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": Y()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": Y()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...dt(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...ot(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...ot()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...dt()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...ot(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...ot(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": dt()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...ot(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...ot()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: Y()
      }],
      /**
       * Padding Inline
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: Y()
      }],
      /**
       * Padding Block
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: Y()
      }],
      /**
       * Padding Inline Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: Y()
      }],
      /**
       * Padding Inline End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: Y()
      }],
      /**
       * Padding Block Start
       * @see https://tailwindcss.com/docs/padding
       */
      pbs: [{
        pbs: Y()
      }],
      /**
       * Padding Block End
       * @see https://tailwindcss.com/docs/padding
       */
      pbe: [{
        pbe: Y()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: Y()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: Y()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: Y()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: Y()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: D()
      }],
      /**
       * Margin Inline
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: D()
      }],
      /**
       * Margin Block
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: D()
      }],
      /**
       * Margin Inline Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: D()
      }],
      /**
       * Margin Inline End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: D()
      }],
      /**
       * Margin Block Start
       * @see https://tailwindcss.com/docs/margin
       */
      mbs: [{
        mbs: D()
      }],
      /**
       * Margin Block End
       * @see https://tailwindcss.com/docs/margin
       */
      mbe: [{
        mbe: D()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: D()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: D()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: D()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: D()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": Y()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": Y()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: q()
      }],
      /**
       * Inline Size
       * @see https://tailwindcss.com/docs/width
       */
      "inline-size": [{
        inline: ["auto", ...w()]
      }],
      /**
       * Min-Inline Size
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-inline-size": [{
        "min-inline": ["auto", ...w()]
      }],
      /**
       * Max-Inline Size
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-inline-size": [{
        "max-inline": ["none", ...w()]
      }],
      /**
       * Block Size
       * @see https://tailwindcss.com/docs/height
       */
      "block-size": [{
        block: ["auto", ...L()]
      }],
      /**
       * Min-Block Size
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-block-size": [{
        "min-block": ["auto", ...L()]
      }],
      /**
       * Max-Block Size
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-block-size": [{
        "max-block": ["none", ...L()]
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [d, "screen", ...q()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          d,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...q()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          d,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [c]
          },
          ...q()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...q()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...q()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...q()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", s, qo, ra]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [r, lw, nw]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", Lh, pt]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [aw, iw, n]
      }],
      /**
       * Font Feature Settings
       * @see https://tailwindcss.com/docs/font-feature-settings
       */
      "font-features": [{
        "font-features": [pt]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [o, yt, pt]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [Bt, "none", yt, B1]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          u,
          ...Y()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", yt, pt]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", yt, pt]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: U()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: U()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...ft(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [Bt, "from-font", "auto", yt, ra]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: U()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [Bt, "auto", yt, pt]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: Y()
      }],
      /**
       * Tab Size
       * @see https://tailwindcss.com/docs/tab-size
       */
      "tab-size": [{
        tab: [gi, yt, pt]
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", yt, pt]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", yt, pt]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: _()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: V()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: nt()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, gi, yt, pt],
          radial: ["", yt, pt],
          conic: [gi, yt, pt]
        }, ow, sw]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: U()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: at()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: at()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: at()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: U()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: U()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: U()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: rt()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": rt()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": rt()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": rt()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": rt()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": rt()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": rt()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": rt()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": rt()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": rt()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": rt()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": rt()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": rt()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": rt()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": rt()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: st()
      }],
      /**
       * Border Width Inline
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": st()
      }],
      /**
       * Border Width Block
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": st()
      }],
      /**
       * Border Width Inline Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": st()
      }],
      /**
       * Border Width Inline End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": st()
      }],
      /**
       * Border Width Block Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-bs": [{
        "border-bs": st()
      }],
      /**
       * Border Width Block End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-be": [{
        "border-be": st()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": st()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": st()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": st()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": st()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": st()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": st()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...ft(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...ft(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: U()
      }],
      /**
       * Border Color Inline
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": U()
      }],
      /**
       * Border Color Block
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": U()
      }],
      /**
       * Border Color Inline Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": U()
      }],
      /**
       * Border Color Inline End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": U()
      }],
      /**
       * Border Color Block Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-bs": [{
        "border-bs": U()
      }],
      /**
       * Border Color Block End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-be": [{
        "border-be": U()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": U()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": U()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": U()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": U()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: U()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...ft(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [Bt, yt, pt]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", Bt, qo, ra]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: U()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          g,
          Vu,
          Uu
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: U()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", y, Vu, Uu]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": U()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: st()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: U()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [Bt, ra]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": U()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": st()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": U()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", x, Vu, Uu]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": U()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [Bt, yt, pt]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...Tt(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": Tt()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [Bt]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": P()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": P()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": U()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": U()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": P()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": P()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": U()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": U()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": P()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": P()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": U()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": U()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": P()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": P()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": U()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": U()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": P()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": P()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": U()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": U()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": P()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": P()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": U()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": U()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": P()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": P()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": U()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": U()
      }],
      "mask-image-radial": [{
        "mask-radial": [yt, pt]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": P()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": P()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": U()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": U()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": k()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [Bt]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": P()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": P()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": U()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": U()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: _()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: V()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: nt()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", yt, pt]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          yt,
          pt
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: ct()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [Bt, yt, pt]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [Bt, yt, pt]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          T,
          Vu,
          Uu
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": U()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", Bt, yt, pt]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [Bt, yt, pt]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", Bt, yt, pt]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [Bt, yt, pt]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", Bt, yt, pt]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          yt,
          pt
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": ct()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [Bt, yt, pt]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [Bt, yt, pt]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", Bt, yt, pt]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [Bt, yt, pt]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", Bt, yt, pt]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [Bt, yt, pt]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [Bt, yt, pt]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", Bt, yt, pt]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": Y()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": Y()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": Y()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", yt, pt]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [Bt, "initial", yt, pt]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", N, yt, pt]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [Bt, yt, pt]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", R, yt, pt]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [A, yt, pt]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": H()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: ht()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": ht()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": ht()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": ht()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: I()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": I()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": I()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": I()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: gt()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": gt()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": gt()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [yt, pt, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: H()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: mt()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": mt()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": mt()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": mt()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      /**
       * Zoom
       * @see https://tailwindcss.com/docs/zoom
       */
      zoom: [{
        zoom: [gi, yt, pt]
      }],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: U()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: U()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", yt, pt]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scrollbar Thumb Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-thumb-color": [{
        "scrollbar-thumb": U()
      }],
      /**
       * Scrollbar Track Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-track-color": [{
        "scrollbar-track": U()
      }],
      /**
       * Scrollbar Gutter
       * @see https://tailwindcss.com/docs/scrollbar-gutter
       */
      "scrollbar-gutter": [{
        "scrollbar-gutter": ["auto", "stable", "both"]
      }],
      /**
       * Scrollbar Width
       * @see https://tailwindcss.com/docs/scrollbar-width
       */
      "scrollbar-w": [{
        scrollbar: ["auto", "thin", "none"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": Y()
      }],
      /**
       * Scroll Margin Inline
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": Y()
      }],
      /**
       * Scroll Margin Block
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": Y()
      }],
      /**
       * Scroll Margin Inline Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": Y()
      }],
      /**
       * Scroll Margin Inline End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": Y()
      }],
      /**
       * Scroll Margin Block Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbs": [{
        "scroll-mbs": Y()
      }],
      /**
       * Scroll Margin Block End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbe": [{
        "scroll-mbe": Y()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": Y()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": Y()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": Y()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": Y()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": Y()
      }],
      /**
       * Scroll Padding Inline
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": Y()
      }],
      /**
       * Scroll Padding Block
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": Y()
      }],
      /**
       * Scroll Padding Inline Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": Y()
      }],
      /**
       * Scroll Padding Inline End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": Y()
      }],
      /**
       * Scroll Padding Block Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbs": [{
        "scroll-pbs": Y()
      }],
      /**
       * Scroll Padding Block End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbe": [{
        "scroll-pbe": Y()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": Y()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": Y()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": Y()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": Y()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", yt, pt]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...U()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [Bt, qo, ra, B1]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...U()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      "container-named": ["container-type"],
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    postfixLookupClassGroups: ["container-type"],
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
}, fw = /* @__PURE__ */ GE(cw);
function ma(...t) {
  return fw(bE(t));
}
function Pe(t) {
  return function() {
    return t;
  };
}
const Cm = Math.PI, _m = 2 * Cm, ua = 1e-6, dw = _m - ua;
function FT(t) {
  this._ += t[0];
  for (let n = 1, s = t.length; n < s; ++n)
    this._ += arguments[n] + t[n];
}
function hw(t) {
  let n = Math.floor(t);
  if (!(n >= 0)) throw new Error(`invalid digits: ${t}`);
  if (n > 15) return FT;
  const s = 10 ** n;
  return function(r) {
    this._ += r[0];
    for (let o = 1, u = r.length; o < u; ++o)
      this._ += Math.round(arguments[o] * s) / s + r[o];
  };
}
class mw {
  constructor(n) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null, this._ = "", this._append = n == null ? FT : hw(n);
  }
  moveTo(n, s) {
    this._append`M${this._x0 = this._x1 = +n},${this._y0 = this._y1 = +s}`;
  }
  closePath() {
    this._x1 !== null && (this._x1 = this._x0, this._y1 = this._y0, this._append`Z`);
  }
  lineTo(n, s) {
    this._append`L${this._x1 = +n},${this._y1 = +s}`;
  }
  quadraticCurveTo(n, s, r, o) {
    this._append`Q${+n},${+s},${this._x1 = +r},${this._y1 = +o}`;
  }
  bezierCurveTo(n, s, r, o, u, c) {
    this._append`C${+n},${+s},${+r},${+o},${this._x1 = +u},${this._y1 = +c}`;
  }
  arcTo(n, s, r, o, u) {
    if (n = +n, s = +s, r = +r, o = +o, u = +u, u < 0) throw new Error(`negative radius: ${u}`);
    let c = this._x1, d = this._y1, p = r - n, h = o - s, g = c - n, y = d - s, x = g * g + y * y;
    if (this._x1 === null)
      this._append`M${this._x1 = n},${this._y1 = s}`;
    else if (x > ua) if (!(Math.abs(y * p - h * g) > ua) || !u)
      this._append`L${this._x1 = n},${this._y1 = s}`;
    else {
      let T = r - c, S = o - d, A = p * p + h * h, C = T * T + S * S, N = Math.sqrt(A), R = Math.sqrt(x), O = u * Math.tan((Cm - Math.acos((A + x - C) / (2 * N * R))) / 2), k = O / R, H = O / N;
      Math.abs(k - 1) > ua && this._append`L${n + k * g},${s + k * y}`, this._append`A${u},${u},0,0,${+(y * T > g * S)},${this._x1 = n + H * p},${this._y1 = s + H * h}`;
    }
  }
  arc(n, s, r, o, u, c) {
    if (n = +n, s = +s, r = +r, c = !!c, r < 0) throw new Error(`negative radius: ${r}`);
    let d = r * Math.cos(o), p = r * Math.sin(o), h = n + d, g = s + p, y = 1 ^ c, x = c ? o - u : u - o;
    this._x1 === null ? this._append`M${h},${g}` : (Math.abs(this._x1 - h) > ua || Math.abs(this._y1 - g) > ua) && this._append`L${h},${g}`, r && (x < 0 && (x = x % _m + _m), x > dw ? this._append`A${r},${r},0,1,${y},${n - d},${s - p}A${r},${r},0,1,${y},${this._x1 = h},${this._y1 = g}` : x > ua && this._append`A${r},${r},0,${+(x >= Cm)},${y},${this._x1 = n + r * Math.cos(u)},${this._y1 = s + r * Math.sin(u)}`);
  }
  rect(n, s, r, o) {
    this._append`M${this._x0 = this._x1 = +n},${this._y0 = this._y1 = +s}h${r = +r}v${+o}h${-r}Z`;
  }
  toString() {
    return this._;
  }
}
function $T(t) {
  let n = 3;
  return t.digits = function(s) {
    if (!arguments.length) return n;
    if (s == null)
      n = null;
    else {
      const r = Math.floor(s);
      if (!(r >= 0)) throw new RangeError(`invalid digits: ${s}`);
      n = r;
    }
    return t;
  }, () => new mw(n);
}
function KT(t) {
  return typeof t == "object" && "length" in t ? t : Array.from(t);
}
function ZT(t) {
  this._context = t;
}
ZT.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    (this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
  },
  point: function(t, n) {
    switch (t = +t, n = +n, this._point) {
      case 0:
        this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n);
        break;
      case 1:
        this._point = 2;
      // falls through
      default:
        this._context.lineTo(t, n);
        break;
    }
  }
};
function QT(t) {
  return new ZT(t);
}
function JT(t) {
  return t[0];
}
function WT(t) {
  return t[1];
}
function tS(t, n) {
  var s = Pe(!0), r = null, o = QT, u = null, c = $T(d);
  t = typeof t == "function" ? t : t === void 0 ? JT : Pe(t), n = typeof n == "function" ? n : n === void 0 ? WT : Pe(n);
  function d(p) {
    var h, g = (p = KT(p)).length, y, x = !1, T;
    for (r == null && (u = o(T = c())), h = 0; h <= g; ++h)
      !(h < g && s(y = p[h], h, p)) === x && ((x = !x) ? u.lineStart() : u.lineEnd()), x && u.point(+t(y, h, p), +n(y, h, p));
    if (T) return u = null, T + "" || null;
  }
  return d.x = function(p) {
    return arguments.length ? (t = typeof p == "function" ? p : Pe(+p), d) : t;
  }, d.y = function(p) {
    return arguments.length ? (n = typeof p == "function" ? p : Pe(+p), d) : n;
  }, d.defined = function(p) {
    return arguments.length ? (s = typeof p == "function" ? p : Pe(!!p), d) : s;
  }, d.curve = function(p) {
    return arguments.length ? (o = p, r != null && (u = o(r)), d) : o;
  }, d.context = function(p) {
    return arguments.length ? (p == null ? r = u = null : u = o(r = p), d) : r;
  }, d;
}
function pw(t, n, s) {
  var r = null, o = Pe(!0), u = null, c = QT, d = null, p = $T(h);
  t = typeof t == "function" ? t : t === void 0 ? JT : Pe(+t), n = typeof n == "function" ? n : Pe(n === void 0 ? 0 : +n), s = typeof s == "function" ? s : s === void 0 ? WT : Pe(+s);
  function h(y) {
    var x, T, S, A = (y = KT(y)).length, C, N = !1, R, O = new Array(A), k = new Array(A);
    for (u == null && (d = c(R = p())), x = 0; x <= A; ++x) {
      if (!(x < A && o(C = y[x], x, y)) === N)
        if (N = !N)
          T = x, d.areaStart(), d.lineStart();
        else {
          for (d.lineEnd(), d.lineStart(), S = x - 1; S >= T; --S)
            d.point(O[S], k[S]);
          d.lineEnd(), d.areaEnd();
        }
      N && (O[x] = +t(C, x, y), k[x] = +n(C, x, y), d.point(r ? +r(C, x, y) : O[x], s ? +s(C, x, y) : k[x]));
    }
    if (R) return d = null, R + "" || null;
  }
  function g() {
    return tS().defined(o).curve(c).context(u);
  }
  return h.x = function(y) {
    return arguments.length ? (t = typeof y == "function" ? y : Pe(+y), r = null, h) : t;
  }, h.x0 = function(y) {
    return arguments.length ? (t = typeof y == "function" ? y : Pe(+y), h) : t;
  }, h.x1 = function(y) {
    return arguments.length ? (r = y == null ? null : typeof y == "function" ? y : Pe(+y), h) : r;
  }, h.y = function(y) {
    return arguments.length ? (n = typeof y == "function" ? y : Pe(+y), s = null, h) : n;
  }, h.y0 = function(y) {
    return arguments.length ? (n = typeof y == "function" ? y : Pe(+y), h) : n;
  }, h.y1 = function(y) {
    return arguments.length ? (s = y == null ? null : typeof y == "function" ? y : Pe(+y), h) : s;
  }, h.lineX0 = h.lineY0 = function() {
    return g().x(t).y(n);
  }, h.lineY1 = function() {
    return g().x(t).y(s);
  }, h.lineX1 = function() {
    return g().x(r).y(n);
  }, h.defined = function(y) {
    return arguments.length ? (o = typeof y == "function" ? y : Pe(!!y), h) : o;
  }, h.curve = function(y) {
    return arguments.length ? (c = y, u != null && (d = c(u)), h) : c;
  }, h.context = function(y) {
    return arguments.length ? (y == null ? u = d = null : d = c(u = y), h) : u;
  }, h;
}
function G1(t) {
  return t < 0 ? -1 : 1;
}
function q1(t, n, s) {
  var r = t._x1 - t._x0, o = n - t._x1, u = (t._y1 - t._y0) / (r || o < 0 && -0), c = (s - t._y1) / (o || r < 0 && -0), d = (u * o + c * r) / (r + o);
  return (G1(u) + G1(c)) * Math.min(Math.abs(u), Math.abs(c), 0.5 * Math.abs(d)) || 0;
}
function X1(t, n) {
  var s = t._x1 - t._x0;
  return s ? (3 * (t._y1 - t._y0) / s - n) / 2 : n;
}
function Uh(t, n, s) {
  var r = t._x0, o = t._y0, u = t._x1, c = t._y1, d = (u - r) / 3;
  t._context.bezierCurveTo(r + d, o + d * n, u - d, c - d * s, u, c);
}
function gc(t) {
  this._context = t;
}
gc.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN, this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
      case 3:
        Uh(this, this._t0, X1(this, this._t0));
        break;
    }
    (this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
  },
  point: function(t, n) {
    var s = NaN;
    if (t = +t, n = +n, !(t === this._x1 && n === this._y1)) {
      switch (this._point) {
        case 0:
          this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n);
          break;
        case 1:
          this._point = 2;
          break;
        case 2:
          this._point = 3, Uh(this, X1(this, s = q1(this, t, n)), s);
          break;
        default:
          Uh(this, this._t0, s = q1(this, t, n));
          break;
      }
      this._x0 = this._x1, this._x1 = t, this._y0 = this._y1, this._y1 = n, this._t0 = s;
    }
  }
};
Object.create(gc.prototype).point = function(t, n) {
  gc.prototype.point.call(this, n, t);
};
function eS(t) {
  return new gc(t);
}
var Vh = { exports: {} };
var P1;
function gw() {
  return P1 || (P1 = 1, (function(t) {
    (function() {
      var n = {}.hasOwnProperty;
      function s() {
        for (var u = "", c = 0; c < arguments.length; c++) {
          var d = arguments[c];
          d && (u = o(u, r(d)));
        }
        return u;
      }
      function r(u) {
        if (typeof u == "string" || typeof u == "number")
          return u;
        if (typeof u != "object")
          return "";
        if (Array.isArray(u))
          return s.apply(null, u);
        if (u.toString !== Object.prototype.toString && !u.toString.toString().includes("[native code]"))
          return u.toString();
        var c = "";
        for (var d in u)
          n.call(u, d) && u[d] && (c = o(c, d));
        return c;
      }
      function o(u, c) {
        return c ? u ? u + " " + c : u + c : u;
      }
      t.exports ? (s.default = s, t.exports = s) : window.classNames = s;
    })();
  })(Vh)), Vh.exports;
}
var yw = gw();
const Xr = /* @__PURE__ */ _T(yw);
function ri(t, n) {
  t(n);
}
function vw() {
  let {
    x: t,
    x0: n,
    x1: s,
    y: r,
    y0: o,
    y1: u,
    defined: c,
    curve: d
  } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const p = pw();
  return t && ri(p.x, t), n && ri(p.x0, n), s && ri(p.x1, s), r && ri(p.y, r), o && ri(p.y0, o), u && ri(p.y1, u), c && p.defined(c), d && p.curve(d), p;
}
function xw() {
  let {
    x: t,
    y: n,
    defined: s,
    curve: r
  } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const o = tS();
  return t && ri(o.x, t), n && ri(o.y, n), s && o.defined(s), r && o.curve(r), o;
}
function nS(t) {
  let {
    top: n = 0,
    left: s = 0,
    transform: r,
    className: o,
    children: u,
    innerRef: c,
    ...d
  } = t;
  return /* @__PURE__ */ v.jsx("g", {
    ref: c,
    className: Xr("visx-group", o),
    transform: r || `translate(${s}, ${n})`,
    ...d,
    children: u
  });
}
function iS(t) {
  let {
    from: n = {
      x: 0,
      y: 0
    },
    to: s = {
      x: 1,
      y: 1
    },
    fill: r = "transparent",
    className: o,
    innerRef: u,
    ...c
  } = t;
  const d = n.x === s.x || n.y === s.y;
  return /* @__PURE__ */ v.jsx("line", {
    ref: u,
    className: Xr("visx-line", o),
    x1: n.x,
    y1: n.y,
    x2: s.x,
    y2: s.y,
    fill: r,
    shapeRendering: d ? "crispEdges" : "auto",
    ...c
  });
}
function sS(t) {
  let {
    children: n,
    data: s = [],
    x: r,
    y: o,
    fill: u = "transparent",
    className: c,
    curve: d,
    innerRef: p,
    defined: h = () => !0,
    ...g
  } = t;
  const y = xw({
    x: r,
    y: o,
    defined: h,
    curve: d
  });
  return n ? /* @__PURE__ */ v.jsx(v.Fragment, {
    children: n({
      path: y
    })
  }) : /* @__PURE__ */ v.jsx("path", {
    ref: p,
    className: Xr("visx-linepath", c),
    d: y(s) || "",
    fill: u,
    strokeLinecap: "round",
    ...g
  });
}
function bp(t) {
  let {
    x: n,
    x0: s,
    x1: r,
    y: o,
    y1: u,
    y0: c,
    yScale: d,
    data: p = [],
    defined: h = () => !0,
    className: g,
    curve: y,
    innerRef: x,
    children: T,
    ...S
  } = t;
  const A = vw({
    x: n,
    x0: s,
    x1: r,
    defined: h,
    curve: y
  });
  return c == null ? A.y0(d.range()[0]) : ri(A.y0, c), o && !u && ri(A.y1, o), u && !o && ri(A.y1, u), T ? /* @__PURE__ */ v.jsx(v.Fragment, {
    children: T({
      path: A
    })
  }) : /* @__PURE__ */ v.jsx("path", {
    ref: x,
    className: Xr("visx-area-closed", g),
    d: A(p) || "",
    ...S
  });
}
function Tp(t) {
  return t === !1 ? { left: !1, right: !1, any: !1 } : t === "left" ? { left: !0, right: !1, any: !0 } : t === "right" ? { left: !1, right: !0, any: !0 } : { left: !0, right: !0, any: !0 };
}
function Em(t) {
  return [
    { offset: "0%", opacity: t.left ? 0 : 1 },
    { offset: "15%", opacity: 1 },
    { offset: "85%", opacity: 1 },
    { offset: "100%", opacity: t.right ? 0 : 1 }
  ];
}
function wm(t) {
  return {
    gradientUnits: "userSpaceOnUse",
    x1: 0,
    x2: t,
    y1: 0,
    y2: 0
  };
}
function bw({
  gradientId: t,
  strokeGradientId: n,
  edgeMaskId: s,
  edgeGradientId: r,
  fill: o,
  fillOpacity: u,
  gradientToOpacity: c,
  gradientSpan: d = 1,
  resolvedStroke: p,
  isPatternFill: h,
  fadeEdges: g,
  innerWidth: y,
  innerHeight: x
}) {
  const T = Tp(g), S = T.any ? Em(T) : null, C = T.any && !h ? Em(T) : null, N = Math.min(1, Math.max(0.01, d)), R = `${N * 100}%`;
  return /* @__PURE__ */ v.jsxs("defs", { children: [
    h ? null : /* @__PURE__ */ v.jsxs("linearGradient", { id: t, x1: "0%", x2: "0%", y1: "0%", y2: "100%", children: [
      /* @__PURE__ */ v.jsx(
        "stop",
        {
          offset: "0%",
          style: { stopColor: o, stopOpacity: u }
        }
      ),
      /* @__PURE__ */ v.jsx(
        "stop",
        {
          offset: R,
          style: { stopColor: o, stopOpacity: c }
        }
      ),
      N < 1 ? /* @__PURE__ */ v.jsx(
        "stop",
        {
          offset: "100%",
          style: { stopColor: o, stopOpacity: c }
        }
      ) : null
    ] }),
    S ? /* @__PURE__ */ v.jsx(
      "linearGradient",
      {
        id: n,
        ...wm(y),
        children: S.map((O) => /* @__PURE__ */ v.jsx(
          "stop",
          {
            offset: O.offset,
            style: { stopColor: p, stopOpacity: O.opacity }
          },
          O.offset
        ))
      }
    ) : null,
    C ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
      /* @__PURE__ */ v.jsx(
        "linearGradient",
        {
          id: r,
          ...wm(y),
          children: C.map((O) => /* @__PURE__ */ v.jsx(
            "stop",
            {
              offset: O.offset,
              style: { stopColor: "white", stopOpacity: O.opacity }
            },
            O.offset
          ))
        }
      ),
      /* @__PURE__ */ v.jsx("mask", { id: s, children: /* @__PURE__ */ v.jsx(
        "rect",
        {
          fill: `url(#${r})`,
          height: x,
          width: y,
          x: "0",
          y: "0"
        }
      ) })
    ] }) : null
  ] });
}
function Wu(t, n) {
  return t == null || n == null ? NaN : t < n ? -1 : t > n ? 1 : t >= n ? 0 : NaN;
}
function Tw(t, n) {
  return t == null || n == null ? NaN : n < t ? -1 : n > t ? 1 : n >= t ? 0 : NaN;
}
function Hc(t) {
  let n, s, r;
  t.length !== 2 ? (n = Wu, s = (d, p) => Wu(t(d), p), r = (d, p) => t(d) - p) : (n = t === Wu || t === Tw ? t : Sw, s = t, r = t);
  function o(d, p, h = 0, g = d.length) {
    if (h < g) {
      if (n(p, p) !== 0) return g;
      do {
        const y = h + g >>> 1;
        s(d[y], p) < 0 ? h = y + 1 : g = y;
      } while (h < g);
    }
    return h;
  }
  function u(d, p, h = 0, g = d.length) {
    if (h < g) {
      if (n(p, p) !== 0) return g;
      do {
        const y = h + g >>> 1;
        s(d[y], p) <= 0 ? h = y + 1 : g = y;
      } while (h < g);
    }
    return h;
  }
  function c(d, p, h = 0, g = d.length) {
    const y = o(d, p, h, g - 1);
    return y > h && r(d[y - 1], p) > -r(d[y], p) ? y - 1 : y;
  }
  return { left: o, center: c, right: u };
}
function Sw() {
  return 0;
}
function Mw(t) {
  return t === null ? NaN : +t;
}
const Aw = Hc(Wu), Cw = Aw.right;
Hc(Mw).center;
function I1(t, n) {
  let s, r;
  if (n === void 0)
    for (const o of t)
      o != null && (s === void 0 ? o >= o && (s = r = o) : (s > o && (s = o), r < o && (r = o)));
  else {
    let o = -1;
    for (let u of t)
      (u = n(u, ++o, t)) != null && (s === void 0 ? u >= u && (s = r = u) : (s > u && (s = u), r < u && (r = u)));
  }
  return [s, r];
}
const _w = Math.sqrt(50), Ew = Math.sqrt(10), ww = Math.sqrt(2);
function yc(t, n, s) {
  const r = (n - t) / Math.max(0, s), o = Math.floor(Math.log10(r)), u = r / Math.pow(10, o), c = u >= _w ? 10 : u >= Ew ? 5 : u >= ww ? 2 : 1;
  let d, p, h;
  return o < 0 ? (h = Math.pow(10, -o) / c, d = Math.round(t * h), p = Math.round(n * h), d / h < t && ++d, p / h > n && --p, h = -h) : (h = Math.pow(10, o) * c, d = Math.round(t / h), p = Math.round(n / h), d * h < t && ++d, p * h > n && --p), p < d && 0.5 <= s && s < 2 ? yc(t, n, s * 2) : [d, p, h];
}
function Dw(t, n, s) {
  if (n = +n, t = +t, s = +s, !(s > 0)) return [];
  if (t === n) return [t];
  const r = n < t, [o, u, c] = r ? yc(n, t, s) : yc(t, n, s);
  if (!(u >= o)) return [];
  const d = u - o + 1, p = new Array(d);
  if (r)
    if (c < 0) for (let h = 0; h < d; ++h) p[h] = (u - h) / -c;
    else for (let h = 0; h < d; ++h) p[h] = (u - h) * c;
  else if (c < 0) for (let h = 0; h < d; ++h) p[h] = (o + h) / -c;
  else for (let h = 0; h < d; ++h) p[h] = (o + h) * c;
  return p;
}
function Dm(t, n, s) {
  return n = +n, t = +t, s = +s, yc(t, n, s)[2];
}
function jm(t, n, s) {
  n = +n, t = +t, s = +s;
  const r = n < t, o = r ? Dm(n, t, s) : Dm(t, n, s);
  return (r ? -1 : 1) * (o < 0 ? 1 / -o : o);
}
function aS(t, n) {
  switch (arguments.length) {
    case 0:
      break;
    case 1:
      this.range(t);
      break;
    default:
      this.range(n).domain(t);
      break;
  }
  return this;
}
function Pr(t, n, s) {
  t.prototype = n.prototype = s, s.constructor = t;
}
function gl(t, n) {
  var s = Object.create(t.prototype);
  for (var r in n) s[r] = n[r];
  return s;
}
function Bs() {
}
var xa = 0.7, Nr = 1 / xa, Er = "\\s*([+-]?\\d+)\\s*", rl = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", bi = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", jw = /^#([0-9a-f]{3,8})$/, Nw = new RegExp(`^rgb\\(${Er},${Er},${Er}\\)$`), Rw = new RegExp(`^rgb\\(${bi},${bi},${bi}\\)$`), Ow = new RegExp(`^rgba\\(${Er},${Er},${Er},${rl}\\)$`), zw = new RegExp(`^rgba\\(${bi},${bi},${bi},${rl}\\)$`), kw = new RegExp(`^hsl\\(${rl},${bi},${bi}\\)$`), Lw = new RegExp(`^hsla\\(${rl},${bi},${bi},${rl}\\)$`), F1 = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
Pr(Bs, ol, {
  copy(t) {
    return Object.assign(new this.constructor(), this, t);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: $1,
  // Deprecated! Use color.formatHex.
  formatHex: $1,
  formatHex8: Uw,
  formatHsl: Vw,
  formatRgb: K1,
  toString: K1
});
function $1() {
  return this.rgb().formatHex();
}
function Uw() {
  return this.rgb().formatHex8();
}
function Vw() {
  return rS(this).formatHsl();
}
function K1() {
  return this.rgb().formatRgb();
}
function ol(t) {
  var n, s;
  return t = (t + "").trim().toLowerCase(), (n = jw.exec(t)) ? (s = n[1].length, n = parseInt(n[1], 16), s === 6 ? Z1(n) : s === 3 ? new Ie(n >> 8 & 15 | n >> 4 & 240, n >> 4 & 15 | n & 240, (n & 15) << 4 | n & 15, 1) : s === 8 ? Bu(n >> 24 & 255, n >> 16 & 255, n >> 8 & 255, (n & 255) / 255) : s === 4 ? Bu(n >> 12 & 15 | n >> 8 & 240, n >> 8 & 15 | n >> 4 & 240, n >> 4 & 15 | n & 240, ((n & 15) << 4 | n & 15) / 255) : null) : (n = Nw.exec(t)) ? new Ie(n[1], n[2], n[3], 1) : (n = Rw.exec(t)) ? new Ie(n[1] * 255 / 100, n[2] * 255 / 100, n[3] * 255 / 100, 1) : (n = Ow.exec(t)) ? Bu(n[1], n[2], n[3], n[4]) : (n = zw.exec(t)) ? Bu(n[1] * 255 / 100, n[2] * 255 / 100, n[3] * 255 / 100, n[4]) : (n = kw.exec(t)) ? W1(n[1], n[2] / 100, n[3] / 100, 1) : (n = Lw.exec(t)) ? W1(n[1], n[2] / 100, n[3] / 100, n[4]) : F1.hasOwnProperty(t) ? Z1(F1[t]) : t === "transparent" ? new Ie(NaN, NaN, NaN, 0) : null;
}
function Z1(t) {
  return new Ie(t >> 16 & 255, t >> 8 & 255, t & 255, 1);
}
function Bu(t, n, s, r) {
  return r <= 0 && (t = n = s = NaN), new Ie(t, n, s, r);
}
function Sp(t) {
  return t instanceof Bs || (t = ol(t)), t ? (t = t.rgb(), new Ie(t.r, t.g, t.b, t.opacity)) : new Ie();
}
function Nm(t, n, s, r) {
  return arguments.length === 1 ? Sp(t) : new Ie(t, n, s, r ?? 1);
}
function Ie(t, n, s, r) {
  this.r = +t, this.g = +n, this.b = +s, this.opacity = +r;
}
Pr(Ie, Nm, gl(Bs, {
  brighter(t) {
    return t = t == null ? Nr : Math.pow(Nr, t), new Ie(this.r * t, this.g * t, this.b * t, this.opacity);
  },
  darker(t) {
    return t = t == null ? xa : Math.pow(xa, t), new Ie(this.r * t, this.g * t, this.b * t, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Ie(pa(this.r), pa(this.g), pa(this.b), vc(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: Q1,
  // Deprecated! Use color.formatHex.
  formatHex: Q1,
  formatHex8: Bw,
  formatRgb: J1,
  toString: J1
}));
function Q1() {
  return `#${fa(this.r)}${fa(this.g)}${fa(this.b)}`;
}
function Bw() {
  return `#${fa(this.r)}${fa(this.g)}${fa(this.b)}${fa((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function J1() {
  const t = vc(this.opacity);
  return `${t === 1 ? "rgb(" : "rgba("}${pa(this.r)}, ${pa(this.g)}, ${pa(this.b)}${t === 1 ? ")" : `, ${t})`}`;
}
function vc(t) {
  return isNaN(t) ? 1 : Math.max(0, Math.min(1, t));
}
function pa(t) {
  return Math.max(0, Math.min(255, Math.round(t) || 0));
}
function fa(t) {
  return t = pa(t), (t < 16 ? "0" : "") + t.toString(16);
}
function W1(t, n, s, r) {
  return r <= 0 ? t = n = s = NaN : s <= 0 || s >= 1 ? t = n = NaN : n <= 0 && (t = NaN), new oi(t, n, s, r);
}
function rS(t) {
  if (t instanceof oi) return new oi(t.h, t.s, t.l, t.opacity);
  if (t instanceof Bs || (t = ol(t)), !t) return new oi();
  if (t instanceof oi) return t;
  t = t.rgb();
  var n = t.r / 255, s = t.g / 255, r = t.b / 255, o = Math.min(n, s, r), u = Math.max(n, s, r), c = NaN, d = u - o, p = (u + o) / 2;
  return d ? (n === u ? c = (s - r) / d + (s < r) * 6 : s === u ? c = (r - n) / d + 2 : c = (n - s) / d + 4, d /= p < 0.5 ? u + o : 2 - u - o, c *= 60) : d = p > 0 && p < 1 ? 0 : c, new oi(c, d, p, t.opacity);
}
function Rm(t, n, s, r) {
  return arguments.length === 1 ? rS(t) : new oi(t, n, s, r ?? 1);
}
function oi(t, n, s, r) {
  this.h = +t, this.s = +n, this.l = +s, this.opacity = +r;
}
Pr(oi, Rm, gl(Bs, {
  brighter(t) {
    return t = t == null ? Nr : Math.pow(Nr, t), new oi(this.h, this.s, this.l * t, this.opacity);
  },
  darker(t) {
    return t = t == null ? xa : Math.pow(xa, t), new oi(this.h, this.s, this.l * t, this.opacity);
  },
  rgb() {
    var t = this.h % 360 + (this.h < 0) * 360, n = isNaN(t) || isNaN(this.s) ? 0 : this.s, s = this.l, r = s + (s < 0.5 ? s : 1 - s) * n, o = 2 * s - r;
    return new Ie(
      Bh(t >= 240 ? t - 240 : t + 120, o, r),
      Bh(t, o, r),
      Bh(t < 120 ? t + 240 : t - 120, o, r),
      this.opacity
    );
  },
  clamp() {
    return new oi(tx(this.h), Hu(this.s), Hu(this.l), vc(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const t = vc(this.opacity);
    return `${t === 1 ? "hsl(" : "hsla("}${tx(this.h)}, ${Hu(this.s) * 100}%, ${Hu(this.l) * 100}%${t === 1 ? ")" : `, ${t})`}`;
  }
}));
function tx(t) {
  return t = (t || 0) % 360, t < 0 ? t + 360 : t;
}
function Hu(t) {
  return Math.max(0, Math.min(1, t || 0));
}
function Bh(t, n, s) {
  return (t < 60 ? n + (s - n) * t / 60 : t < 180 ? s : t < 240 ? n + (s - n) * (240 - t) / 60 : n) * 255;
}
const oS = Math.PI / 180, lS = 180 / Math.PI, xc = 18, uS = 0.96422, cS = 1, fS = 0.82521, dS = 4 / 29, wr = 6 / 29, hS = 3 * wr * wr, Hw = wr * wr * wr;
function mS(t) {
  if (t instanceof Ti) return new Ti(t.l, t.a, t.b, t.opacity);
  if (t instanceof Fi) return pS(t);
  t instanceof Ie || (t = Sp(t));
  var n = qh(t.r), s = qh(t.g), r = qh(t.b), o = Hh((0.2225045 * n + 0.7168786 * s + 0.0606169 * r) / cS), u, c;
  return n === s && s === r ? u = c = o : (u = Hh((0.4360747 * n + 0.3850649 * s + 0.1430804 * r) / uS), c = Hh((0.0139322 * n + 0.0971045 * s + 0.7141733 * r) / fS)), new Ti(116 * o - 16, 500 * (u - o), 200 * (o - c), t.opacity);
}
function Om(t, n, s, r) {
  return arguments.length === 1 ? mS(t) : new Ti(t, n, s, r ?? 1);
}
function Ti(t, n, s, r) {
  this.l = +t, this.a = +n, this.b = +s, this.opacity = +r;
}
Pr(Ti, Om, gl(Bs, {
  brighter(t) {
    return new Ti(this.l + xc * (t ?? 1), this.a, this.b, this.opacity);
  },
  darker(t) {
    return new Ti(this.l - xc * (t ?? 1), this.a, this.b, this.opacity);
  },
  rgb() {
    var t = (this.l + 16) / 116, n = isNaN(this.a) ? t : t + this.a / 500, s = isNaN(this.b) ? t : t - this.b / 200;
    return n = uS * Yh(n), t = cS * Yh(t), s = fS * Yh(s), new Ie(
      Gh(3.1338561 * n - 1.6168667 * t - 0.4906146 * s),
      Gh(-0.9787684 * n + 1.9161415 * t + 0.033454 * s),
      Gh(0.0719453 * n - 0.2289914 * t + 1.4052427 * s),
      this.opacity
    );
  }
}));
function Hh(t) {
  return t > Hw ? Math.pow(t, 1 / 3) : t / hS + dS;
}
function Yh(t) {
  return t > wr ? t * t * t : hS * (t - dS);
}
function Gh(t) {
  return 255 * (t <= 31308e-7 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055);
}
function qh(t) {
  return (t /= 255) <= 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4);
}
function Yw(t) {
  if (t instanceof Fi) return new Fi(t.h, t.c, t.l, t.opacity);
  if (t instanceof Ti || (t = mS(t)), t.a === 0 && t.b === 0) return new Fi(NaN, 0 < t.l && t.l < 100 ? 0 : NaN, t.l, t.opacity);
  var n = Math.atan2(t.b, t.a) * lS;
  return new Fi(n < 0 ? n + 360 : n, Math.sqrt(t.a * t.a + t.b * t.b), t.l, t.opacity);
}
function zm(t, n, s, r) {
  return arguments.length === 1 ? Yw(t) : new Fi(t, n, s, r ?? 1);
}
function Fi(t, n, s, r) {
  this.h = +t, this.c = +n, this.l = +s, this.opacity = +r;
}
function pS(t) {
  if (isNaN(t.h)) return new Ti(t.l, 0, 0, t.opacity);
  var n = t.h * oS;
  return new Ti(t.l, Math.cos(n) * t.c, Math.sin(n) * t.c, t.opacity);
}
Pr(Fi, zm, gl(Bs, {
  brighter(t) {
    return new Fi(this.h, this.c, this.l + xc * (t ?? 1), this.opacity);
  },
  darker(t) {
    return new Fi(this.h, this.c, this.l - xc * (t ?? 1), this.opacity);
  },
  rgb() {
    return pS(this).rgb();
  }
}));
var gS = -0.14861, Mp = 1.78277, Ap = -0.29227, Yc = -0.90649, ll = 1.97294, ex = ll * Yc, nx = ll * Mp, ix = Mp * Ap - Yc * gS;
function Gw(t) {
  if (t instanceof ga) return new ga(t.h, t.s, t.l, t.opacity);
  t instanceof Ie || (t = Sp(t));
  var n = t.r / 255, s = t.g / 255, r = t.b / 255, o = (ix * r + ex * n - nx * s) / (ix + ex - nx), u = r - o, c = (ll * (s - o) - Ap * u) / Yc, d = Math.sqrt(c * c + u * u) / (ll * o * (1 - o)), p = d ? Math.atan2(c, u) * lS - 120 : NaN;
  return new ga(p < 0 ? p + 360 : p, d, o, t.opacity);
}
function km(t, n, s, r) {
  return arguments.length === 1 ? Gw(t) : new ga(t, n, s, r ?? 1);
}
function ga(t, n, s, r) {
  this.h = +t, this.s = +n, this.l = +s, this.opacity = +r;
}
Pr(ga, km, gl(Bs, {
  brighter(t) {
    return t = t == null ? Nr : Math.pow(Nr, t), new ga(this.h, this.s, this.l * t, this.opacity);
  },
  darker(t) {
    return t = t == null ? xa : Math.pow(xa, t), new ga(this.h, this.s, this.l * t, this.opacity);
  },
  rgb() {
    var t = isNaN(this.h) ? 0 : (this.h + 120) * oS, n = +this.l, s = isNaN(this.s) ? 0 : this.s * n * (1 - n), r = Math.cos(t), o = Math.sin(t);
    return new Ie(
      255 * (n + s * (gS * r + Mp * o)),
      255 * (n + s * (Ap * r + Yc * o)),
      255 * (n + s * (ll * r)),
      this.opacity
    );
  }
}));
const Gc = (t) => () => t;
function yS(t, n) {
  return function(s) {
    return t + s * n;
  };
}
function qw(t, n, s) {
  return t = Math.pow(t, s), n = Math.pow(n, s) - t, s = 1 / s, function(r) {
    return Math.pow(t + r * n, s);
  };
}
function Cp(t, n) {
  var s = n - t;
  return s ? yS(t, s > 180 || s < -180 ? s - 360 * Math.round(s / 360) : s) : Gc(isNaN(t) ? n : t);
}
function Xw(t) {
  return (t = +t) == 1 ? Fe : function(n, s) {
    return s - n ? qw(n, s, t) : Gc(isNaN(n) ? s : n);
  };
}
function Fe(t, n) {
  var s = n - t;
  return s ? yS(t, s) : Gc(isNaN(t) ? n : t);
}
const Lm = (function t(n) {
  var s = Xw(n);
  function r(o, u) {
    var c = s((o = Nm(o)).r, (u = Nm(u)).r), d = s(o.g, u.g), p = s(o.b, u.b), h = Fe(o.opacity, u.opacity);
    return function(g) {
      return o.r = c(g), o.g = d(g), o.b = p(g), o.opacity = h(g), o + "";
    };
  }
  return r.gamma = t, r;
})(1);
function Pw(t, n) {
  n || (n = []);
  var s = t ? Math.min(n.length, t.length) : 0, r = n.slice(), o;
  return function(u) {
    for (o = 0; o < s; ++o) r[o] = t[o] * (1 - u) + n[o] * u;
    return r;
  };
}
function Iw(t) {
  return ArrayBuffer.isView(t) && !(t instanceof DataView);
}
function Fw(t, n) {
  var s = n ? n.length : 0, r = t ? Math.min(s, t.length) : 0, o = new Array(r), u = new Array(s), c;
  for (c = 0; c < r; ++c) o[c] = _p(t[c], n[c]);
  for (; c < s; ++c) u[c] = n[c];
  return function(d) {
    for (c = 0; c < r; ++c) u[c] = o[c](d);
    return u;
  };
}
function $w(t, n) {
  var s = /* @__PURE__ */ new Date();
  return t = +t, n = +n, function(r) {
    return s.setTime(t * (1 - r) + n * r), s;
  };
}
function bc(t, n) {
  return t = +t, n = +n, function(s) {
    return t * (1 - s) + n * s;
  };
}
function Kw(t, n) {
  var s = {}, r = {}, o;
  (t === null || typeof t != "object") && (t = {}), (n === null || typeof n != "object") && (n = {});
  for (o in n)
    o in t ? s[o] = _p(t[o], n[o]) : r[o] = n[o];
  return function(u) {
    for (o in s) r[o] = s[o](u);
    return r;
  };
}
var Um = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Xh = new RegExp(Um.source, "g");
function Zw(t) {
  return function() {
    return t;
  };
}
function Qw(t) {
  return function(n) {
    return t(n) + "";
  };
}
function Jw(t, n) {
  var s = Um.lastIndex = Xh.lastIndex = 0, r, o, u, c = -1, d = [], p = [];
  for (t = t + "", n = n + ""; (r = Um.exec(t)) && (o = Xh.exec(n)); )
    (u = o.index) > s && (u = n.slice(s, u), d[c] ? d[c] += u : d[++c] = u), (r = r[0]) === (o = o[0]) ? d[c] ? d[c] += o : d[++c] = o : (d[++c] = null, p.push({ i: c, x: bc(r, o) })), s = Xh.lastIndex;
  return s < n.length && (u = n.slice(s), d[c] ? d[c] += u : d[++c] = u), d.length < 2 ? p[0] ? Qw(p[0].x) : Zw(n) : (n = p.length, function(h) {
    for (var g = 0, y; g < n; ++g) d[(y = p[g]).i] = y.x(h);
    return d.join("");
  });
}
function _p(t, n) {
  var s = typeof n, r;
  return n == null || s === "boolean" ? Gc(n) : (s === "number" ? bc : s === "string" ? (r = ol(n)) ? (n = r, Lm) : Jw : n instanceof ol ? Lm : n instanceof Date ? $w : Iw(n) ? Pw : Array.isArray(n) ? Fw : typeof n.valueOf != "function" && typeof n.toString != "function" || isNaN(n) ? Kw : bc)(t, n);
}
function vS(t, n) {
  return t = +t, n = +n, function(s) {
    return Math.round(t * (1 - s) + n * s);
  };
}
function xS(t) {
  return function(n, s) {
    var r = t((n = Rm(n)).h, (s = Rm(s)).h), o = Fe(n.s, s.s), u = Fe(n.l, s.l), c = Fe(n.opacity, s.opacity);
    return function(d) {
      return n.h = r(d), n.s = o(d), n.l = u(d), n.opacity = c(d), n + "";
    };
  };
}
const Ww = xS(Cp);
var tD = xS(Fe);
function eD(t, n) {
  var s = Fe((t = Om(t)).l, (n = Om(n)).l), r = Fe(t.a, n.a), o = Fe(t.b, n.b), u = Fe(t.opacity, n.opacity);
  return function(c) {
    return t.l = s(c), t.a = r(c), t.b = o(c), t.opacity = u(c), t + "";
  };
}
function bS(t) {
  return function(n, s) {
    var r = t((n = zm(n)).h, (s = zm(s)).h), o = Fe(n.c, s.c), u = Fe(n.l, s.l), c = Fe(n.opacity, s.opacity);
    return function(d) {
      return n.h = r(d), n.c = o(d), n.l = u(d), n.opacity = c(d), n + "";
    };
  };
}
const nD = bS(Cp);
var iD = bS(Fe);
function TS(t) {
  return (function n(s) {
    s = +s;
    function r(o, u) {
      var c = t((o = km(o)).h, (u = km(u)).h), d = Fe(o.s, u.s), p = Fe(o.l, u.l), h = Fe(o.opacity, u.opacity);
      return function(g) {
        return o.h = c(g), o.s = d(g), o.l = p(Math.pow(g, s)), o.opacity = h(g), o + "";
      };
    }
    return r.gamma = n, r;
  })(1);
}
const sD = TS(Cp);
var aD = TS(Fe);
function rD(t) {
  return function() {
    return t;
  };
}
function oD(t) {
  return +t;
}
var sx = [0, 1];
function Sr(t) {
  return t;
}
function Vm(t, n) {
  return (n -= t = +t) ? function(s) {
    return (s - t) / n;
  } : rD(isNaN(n) ? NaN : 0.5);
}
function lD(t, n) {
  var s;
  return t > n && (s = t, t = n, n = s), function(r) {
    return Math.max(t, Math.min(n, r));
  };
}
function uD(t, n, s) {
  var r = t[0], o = t[1], u = n[0], c = n[1];
  return o < r ? (r = Vm(o, r), u = s(c, u)) : (r = Vm(r, o), u = s(u, c)), function(d) {
    return u(r(d));
  };
}
function cD(t, n, s) {
  var r = Math.min(t.length, n.length) - 1, o = new Array(r), u = new Array(r), c = -1;
  for (t[r] < t[0] && (t = t.slice().reverse(), n = n.slice().reverse()); ++c < r; )
    o[c] = Vm(t[c], t[c + 1]), u[c] = s(n[c], n[c + 1]);
  return function(d) {
    var p = Cw(t, d, 1, r) - 1;
    return u[p](o[p](d));
  };
}
function SS(t, n) {
  return n.domain(t.domain()).range(t.range()).interpolate(t.interpolate()).clamp(t.clamp()).unknown(t.unknown());
}
function fD() {
  var t = sx, n = sx, s = _p, r, o, u, c = Sr, d, p, h;
  function g() {
    var x = Math.min(t.length, n.length);
    return c !== Sr && (c = lD(t[0], t[x - 1])), d = x > 2 ? cD : uD, p = h = null, y;
  }
  function y(x) {
    return x == null || isNaN(x = +x) ? u : (p || (p = d(t.map(r), n, s)))(r(c(x)));
  }
  return y.invert = function(x) {
    return c(o((h || (h = d(n, t.map(r), bc)))(x)));
  }, y.domain = function(x) {
    return arguments.length ? (t = Array.from(x, oD), g()) : t.slice();
  }, y.range = function(x) {
    return arguments.length ? (n = Array.from(x), g()) : n.slice();
  }, y.rangeRound = function(x) {
    return n = Array.from(x), s = vS, g();
  }, y.clamp = function(x) {
    return arguments.length ? (c = x ? !0 : Sr, g()) : c !== Sr;
  }, y.interpolate = function(x) {
    return arguments.length ? (s = x, g()) : s;
  }, y.unknown = function(x) {
    return arguments.length ? (u = x, y) : u;
  }, function(x, T) {
    return r = x, o = T, g();
  };
}
function MS() {
  return fD()(Sr, Sr);
}
function dD(t) {
  return Math.abs(t = Math.round(t)) >= 1e21 ? t.toLocaleString("en").replace(/,/g, "") : t.toString(10);
}
function Tc(t, n) {
  if ((s = (t = n ? t.toExponential(n - 1) : t.toExponential()).indexOf("e")) < 0) return null;
  var s, r = t.slice(0, s);
  return [
    r.length > 1 ? r[0] + r.slice(2) : r,
    +t.slice(s + 1)
  ];
}
function Rr(t) {
  return t = Tc(Math.abs(t)), t ? t[1] : NaN;
}
function hD(t, n) {
  return function(s, r) {
    for (var o = s.length, u = [], c = 0, d = t[0], p = 0; o > 0 && d > 0 && (p + d + 1 > r && (d = Math.max(1, r - p)), u.push(s.substring(o -= d, o + d)), !((p += d + 1) > r)); )
      d = t[c = (c + 1) % t.length];
    return u.reverse().join(n);
  };
}
function mD(t) {
  return function(n) {
    return n.replace(/[0-9]/g, function(s) {
      return t[+s];
    });
  };
}
var pD = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function Sc(t) {
  if (!(n = pD.exec(t))) throw new Error("invalid format: " + t);
  var n;
  return new Ep({
    fill: n[1],
    align: n[2],
    sign: n[3],
    symbol: n[4],
    zero: n[5],
    width: n[6],
    comma: n[7],
    precision: n[8] && n[8].slice(1),
    trim: n[9],
    type: n[10]
  });
}
Sc.prototype = Ep.prototype;
function Ep(t) {
  this.fill = t.fill === void 0 ? " " : t.fill + "", this.align = t.align === void 0 ? ">" : t.align + "", this.sign = t.sign === void 0 ? "-" : t.sign + "", this.symbol = t.symbol === void 0 ? "" : t.symbol + "", this.zero = !!t.zero, this.width = t.width === void 0 ? void 0 : +t.width, this.comma = !!t.comma, this.precision = t.precision === void 0 ? void 0 : +t.precision, this.trim = !!t.trim, this.type = t.type === void 0 ? "" : t.type + "";
}
Ep.prototype.toString = function() {
  return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
function gD(t) {
  t: for (var n = t.length, s = 1, r = -1, o; s < n; ++s)
    switch (t[s]) {
      case ".":
        r = o = s;
        break;
      case "0":
        r === 0 && (r = s), o = s;
        break;
      default:
        if (!+t[s]) break t;
        r > 0 && (r = 0);
        break;
    }
  return r > 0 ? t.slice(0, r) + t.slice(o + 1) : t;
}
var AS;
function yD(t, n) {
  var s = Tc(t, n);
  if (!s) return t + "";
  var r = s[0], o = s[1], u = o - (AS = Math.max(-8, Math.min(8, Math.floor(o / 3))) * 3) + 1, c = r.length;
  return u === c ? r : u > c ? r + new Array(u - c + 1).join("0") : u > 0 ? r.slice(0, u) + "." + r.slice(u) : "0." + new Array(1 - u).join("0") + Tc(t, Math.max(0, n + u - 1))[0];
}
function ax(t, n) {
  var s = Tc(t, n);
  if (!s) return t + "";
  var r = s[0], o = s[1];
  return o < 0 ? "0." + new Array(-o).join("0") + r : r.length > o + 1 ? r.slice(0, o + 1) + "." + r.slice(o + 1) : r + new Array(o - r.length + 2).join("0");
}
const rx = {
  "%": (t, n) => (t * 100).toFixed(n),
  b: (t) => Math.round(t).toString(2),
  c: (t) => t + "",
  d: dD,
  e: (t, n) => t.toExponential(n),
  f: (t, n) => t.toFixed(n),
  g: (t, n) => t.toPrecision(n),
  o: (t) => Math.round(t).toString(8),
  p: (t, n) => ax(t * 100, n),
  r: ax,
  s: yD,
  X: (t) => Math.round(t).toString(16).toUpperCase(),
  x: (t) => Math.round(t).toString(16)
};
function ox(t) {
  return t;
}
var lx = Array.prototype.map, ux = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
function vD(t) {
  var n = t.grouping === void 0 || t.thousands === void 0 ? ox : hD(lx.call(t.grouping, Number), t.thousands + ""), s = t.currency === void 0 ? "" : t.currency[0] + "", r = t.currency === void 0 ? "" : t.currency[1] + "", o = t.decimal === void 0 ? "." : t.decimal + "", u = t.numerals === void 0 ? ox : mD(lx.call(t.numerals, String)), c = t.percent === void 0 ? "%" : t.percent + "", d = t.minus === void 0 ? "−" : t.minus + "", p = t.nan === void 0 ? "NaN" : t.nan + "";
  function h(y) {
    y = Sc(y);
    var x = y.fill, T = y.align, S = y.sign, A = y.symbol, C = y.zero, N = y.width, R = y.comma, O = y.precision, k = y.trim, H = y.type;
    H === "n" ? (R = !0, H = "g") : rx[H] || (O === void 0 && (O = 12), k = !0, H = "g"), (C || x === "0" && T === "=") && (C = !0, x = "0", T = "=");
    var G = A === "$" ? s : A === "#" && /[boxX]/.test(H) ? "0" + H.toLowerCase() : "", X = A === "$" ? r : /[%p]/.test(H) ? c : "", Y = rx[H], Z = /[defgprs%]/.test(H);
    O = O === void 0 ? 6 : /[gprs]/.test(H) ? Math.max(1, Math.min(21, O)) : Math.max(0, Math.min(20, O));
    function J(W) {
      var ut = G, lt = X, dt, ot, D;
      if (H === "c")
        lt = Y(W) + lt, W = "";
      else {
        W = +W;
        var q = W < 0 || 1 / W < 0;
        if (W = isNaN(W) ? p : Y(Math.abs(W), O), k && (W = gD(W)), q && +W == 0 && S !== "+" && (q = !1), ut = (q ? S === "(" ? S : d : S === "-" || S === "(" ? "" : S) + ut, lt = (H === "s" ? ux[8 + AS / 3] : "") + lt + (q && S === "(" ? ")" : ""), Z) {
          for (dt = -1, ot = W.length; ++dt < ot; )
            if (D = W.charCodeAt(dt), 48 > D || D > 57) {
              lt = (D === 46 ? o + W.slice(dt + 1) : W.slice(dt)) + lt, W = W.slice(0, dt);
              break;
            }
        }
      }
      R && !C && (W = n(W, 1 / 0));
      var w = ut.length + W.length + lt.length, L = w < N ? new Array(N - w + 1).join(x) : "";
      switch (R && C && (W = n(L + W, L.length ? N - lt.length : 1 / 0), L = ""), T) {
        case "<":
          W = ut + W + lt + L;
          break;
        case "=":
          W = ut + L + W + lt;
          break;
        case "^":
          W = L.slice(0, w = L.length >> 1) + ut + W + lt + L.slice(w);
          break;
        default:
          W = L + ut + W + lt;
          break;
      }
      return u(W);
    }
    return J.toString = function() {
      return y + "";
    }, J;
  }
  function g(y, x) {
    var T = h((y = Sc(y), y.type = "f", y)), S = Math.max(-8, Math.min(8, Math.floor(Rr(x) / 3))) * 3, A = Math.pow(10, -S), C = ux[8 + S / 3];
    return function(N) {
      return T(A * N) + C;
    };
  }
  return {
    format: h,
    formatPrefix: g
  };
}
var Yu, CS, _S;
xD({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});
function xD(t) {
  return Yu = vD(t), CS = Yu.format, _S = Yu.formatPrefix, Yu;
}
function bD(t) {
  return Math.max(0, -Rr(Math.abs(t)));
}
function TD(t, n) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(Rr(n) / 3))) * 3 - Rr(Math.abs(t)));
}
function SD(t, n) {
  return t = Math.abs(t), n = Math.abs(n) - t, Math.max(0, Rr(n) - Rr(t)) + 1;
}
function MD(t, n, s, r) {
  var o = jm(t, n, s), u;
  switch (r = Sc(r ?? ",f"), r.type) {
    case "s": {
      var c = Math.max(Math.abs(t), Math.abs(n));
      return r.precision == null && !isNaN(u = TD(o, c)) && (r.precision = u), _S(r, c);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      r.precision == null && !isNaN(u = SD(o, Math.max(Math.abs(t), Math.abs(n)))) && (r.precision = u - (r.type === "e"));
      break;
    }
    case "f":
    case "%": {
      r.precision == null && !isNaN(u = bD(o)) && (r.precision = u - (r.type === "%") * 2);
      break;
    }
  }
  return CS(r);
}
function AD(t) {
  var n = t.domain;
  return t.ticks = function(s) {
    var r = n();
    return Dw(r[0], r[r.length - 1], s ?? 10);
  }, t.tickFormat = function(s, r) {
    var o = n();
    return MD(o[0], o[o.length - 1], s ?? 10, r);
  }, t.nice = function(s) {
    s == null && (s = 10);
    var r = n(), o = 0, u = r.length - 1, c = r[o], d = r[u], p, h, g = 10;
    for (d < c && (h = c, c = d, d = h, h = o, o = u, u = h); g-- > 0; ) {
      if (h = Dm(c, d, s), h === p)
        return r[o] = c, r[u] = d, n(r);
      if (h > 0)
        c = Math.floor(c / h) * h, d = Math.ceil(d / h) * h;
      else if (h < 0)
        c = Math.ceil(c * h) / h, d = Math.floor(d * h) / h;
      else
        break;
      p = h;
    }
    return t;
  }, t;
}
function ES() {
  var t = MS();
  return t.copy = function() {
    return SS(t, ES());
  }, aS.apply(t, arguments), AD(t);
}
function CD(t, n) {
  t = t.slice();
  var s = 0, r = t.length - 1, o = t[s], u = t[r], c;
  return u < o && (c = s, s = r, r = c, c = o, o = u, u = c), t[s] = n.floor(o), t[r] = n.ceil(u), t;
}
const Ph = /* @__PURE__ */ new Date(), Ih = /* @__PURE__ */ new Date();
function He(t, n, s, r) {
  function o(u) {
    return t(u = arguments.length === 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(+u)), u;
  }
  return o.floor = (u) => (t(u = /* @__PURE__ */ new Date(+u)), u), o.ceil = (u) => (t(u = new Date(u - 1)), n(u, 1), t(u), u), o.round = (u) => {
    const c = o(u), d = o.ceil(u);
    return u - c < d - u ? c : d;
  }, o.offset = (u, c) => (n(u = /* @__PURE__ */ new Date(+u), c == null ? 1 : Math.floor(c)), u), o.range = (u, c, d) => {
    const p = [];
    if (u = o.ceil(u), d = d == null ? 1 : Math.floor(d), !(u < c) || !(d > 0)) return p;
    let h;
    do
      p.push(h = /* @__PURE__ */ new Date(+u)), n(u, d), t(u);
    while (h < u && u < c);
    return p;
  }, o.filter = (u) => He((c) => {
    if (c >= c) for (; t(c), !u(c); ) c.setTime(c - 1);
  }, (c, d) => {
    if (c >= c)
      if (d < 0) for (; ++d <= 0; )
        for (; n(c, -1), !u(c); )
          ;
      else for (; --d >= 0; )
        for (; n(c, 1), !u(c); )
          ;
  }), s && (o.count = (u, c) => (Ph.setTime(+u), Ih.setTime(+c), t(Ph), t(Ih), Math.floor(s(Ph, Ih))), o.every = (u) => (u = Math.floor(u), !isFinite(u) || !(u > 0) ? null : u > 1 ? o.filter(r ? (c) => r(c) % u === 0 : (c) => o.count(0, c) % u === 0) : o)), o;
}
const Mc = He(() => {
}, (t, n) => {
  t.setTime(+t + n);
}, (t, n) => n - t);
Mc.every = (t) => (t = Math.floor(t), !isFinite(t) || !(t > 0) ? null : t > 1 ? He((n) => {
  n.setTime(Math.floor(n / t) * t);
}, (n, s) => {
  n.setTime(+n + s * t);
}, (n, s) => (s - n) / t) : Mc);
Mc.range;
const $i = 1e3, Zn = $i * 60, Ki = Zn * 60, Ji = Ki * 24, wp = Ji * 7, cx = Ji * 30, Fh = Ji * 365, js = He((t) => {
  t.setTime(t - t.getMilliseconds());
}, (t, n) => {
  t.setTime(+t + n * $i);
}, (t, n) => (n - t) / $i, (t) => t.getUTCSeconds());
js.range;
const qc = He((t) => {
  t.setTime(t - t.getMilliseconds() - t.getSeconds() * $i);
}, (t, n) => {
  t.setTime(+t + n * Zn);
}, (t, n) => (n - t) / Zn, (t) => t.getMinutes());
qc.range;
const wS = He((t) => {
  t.setUTCSeconds(0, 0);
}, (t, n) => {
  t.setTime(+t + n * Zn);
}, (t, n) => (n - t) / Zn, (t) => t.getUTCMinutes());
wS.range;
const Xc = He((t) => {
  t.setTime(t - t.getMilliseconds() - t.getSeconds() * $i - t.getMinutes() * Zn);
}, (t, n) => {
  t.setTime(+t + n * Ki);
}, (t, n) => (n - t) / Ki, (t) => t.getHours());
Xc.range;
const DS = He((t) => {
  t.setUTCMinutes(0, 0, 0);
}, (t, n) => {
  t.setTime(+t + n * Ki);
}, (t, n) => (n - t) / Ki, (t) => t.getUTCHours());
DS.range;
const Ir = He(
  (t) => t.setHours(0, 0, 0, 0),
  (t, n) => t.setDate(t.getDate() + n),
  (t, n) => (n - t - (n.getTimezoneOffset() - t.getTimezoneOffset()) * Zn) / Ji,
  (t) => t.getDate() - 1
);
Ir.range;
const Pc = He((t) => {
  t.setUTCHours(0, 0, 0, 0);
}, (t, n) => {
  t.setUTCDate(t.getUTCDate() + n);
}, (t, n) => (n - t) / Ji, (t) => t.getUTCDate() - 1);
Pc.range;
const _D = He((t) => {
  t.setUTCHours(0, 0, 0, 0);
}, (t, n) => {
  t.setUTCDate(t.getUTCDate() + n);
}, (t, n) => (n - t) / Ji, (t) => Math.floor(t / Ji));
_D.range;
function _a(t) {
  return He((n) => {
    n.setDate(n.getDate() - (n.getDay() + 7 - t) % 7), n.setHours(0, 0, 0, 0);
  }, (n, s) => {
    n.setDate(n.getDate() + s * 7);
  }, (n, s) => (s - n - (s.getTimezoneOffset() - n.getTimezoneOffset()) * Zn) / wp);
}
const yl = _a(0), Ac = _a(1), ED = _a(2), wD = _a(3), Or = _a(4), DD = _a(5), jD = _a(6);
yl.range;
Ac.range;
ED.range;
wD.range;
Or.range;
DD.range;
jD.range;
function Ea(t) {
  return He((n) => {
    n.setUTCDate(n.getUTCDate() - (n.getUTCDay() + 7 - t) % 7), n.setUTCHours(0, 0, 0, 0);
  }, (n, s) => {
    n.setUTCDate(n.getUTCDate() + s * 7);
  }, (n, s) => (s - n) / wp);
}
const Dp = Ea(0), Cc = Ea(1), ND = Ea(2), RD = Ea(3), zr = Ea(4), OD = Ea(5), zD = Ea(6);
Dp.range;
Cc.range;
ND.range;
RD.range;
zr.range;
OD.range;
zD.range;
const Ic = He((t) => {
  t.setDate(1), t.setHours(0, 0, 0, 0);
}, (t, n) => {
  t.setMonth(t.getMonth() + n);
}, (t, n) => n.getMonth() - t.getMonth() + (n.getFullYear() - t.getFullYear()) * 12, (t) => t.getMonth());
Ic.range;
const jS = He((t) => {
  t.setUTCDate(1), t.setUTCHours(0, 0, 0, 0);
}, (t, n) => {
  t.setUTCMonth(t.getUTCMonth() + n);
}, (t, n) => n.getUTCMonth() - t.getUTCMonth() + (n.getUTCFullYear() - t.getUTCFullYear()) * 12, (t) => t.getUTCMonth());
jS.range;
const Mi = He((t) => {
  t.setMonth(0, 1), t.setHours(0, 0, 0, 0);
}, (t, n) => {
  t.setFullYear(t.getFullYear() + n);
}, (t, n) => n.getFullYear() - t.getFullYear(), (t) => t.getFullYear());
Mi.every = (t) => !isFinite(t = Math.floor(t)) || !(t > 0) ? null : He((n) => {
  n.setFullYear(Math.floor(n.getFullYear() / t) * t), n.setMonth(0, 1), n.setHours(0, 0, 0, 0);
}, (n, s) => {
  n.setFullYear(n.getFullYear() + s * t);
});
Mi.range;
const zs = He((t) => {
  t.setUTCMonth(0, 1), t.setUTCHours(0, 0, 0, 0);
}, (t, n) => {
  t.setUTCFullYear(t.getUTCFullYear() + n);
}, (t, n) => n.getUTCFullYear() - t.getUTCFullYear(), (t) => t.getUTCFullYear());
zs.every = (t) => !isFinite(t = Math.floor(t)) || !(t > 0) ? null : He((n) => {
  n.setUTCFullYear(Math.floor(n.getUTCFullYear() / t) * t), n.setUTCMonth(0, 1), n.setUTCHours(0, 0, 0, 0);
}, (n, s) => {
  n.setUTCFullYear(n.getUTCFullYear() + s * t);
});
zs.range;
function kD(t, n, s, r, o, u) {
  const c = [
    [js, 1, $i],
    [js, 5, 5 * $i],
    [js, 15, 15 * $i],
    [js, 30, 30 * $i],
    [u, 1, Zn],
    [u, 5, 5 * Zn],
    [u, 15, 15 * Zn],
    [u, 30, 30 * Zn],
    [o, 1, Ki],
    [o, 3, 3 * Ki],
    [o, 6, 6 * Ki],
    [o, 12, 12 * Ki],
    [r, 1, Ji],
    [r, 2, 2 * Ji],
    [s, 1, wp],
    [n, 1, cx],
    [n, 3, 3 * cx],
    [t, 1, Fh]
  ];
  function d(h, g, y) {
    const x = g < h;
    x && ([h, g] = [g, h]);
    const T = y && typeof y.range == "function" ? y : p(h, g, y), S = T ? T.range(h, +g + 1) : [];
    return x ? S.reverse() : S;
  }
  function p(h, g, y) {
    const x = Math.abs(g - h) / y, T = Hc(([, , C]) => C).right(c, x);
    if (T === c.length) return t.every(jm(h / Fh, g / Fh, y));
    if (T === 0) return Mc.every(Math.max(jm(h, g, y), 1));
    const [S, A] = c[x / c[T - 1][2] < c[T][2] / x ? T - 1 : T];
    return S.every(A);
  }
  return [d, p];
}
const [LD, UD] = kD(Mi, Ic, yl, Ir, Xc, qc);
function $h(t) {
  if (0 <= t.y && t.y < 100) {
    var n = new Date(-1, t.m, t.d, t.H, t.M, t.S, t.L);
    return n.setFullYear(t.y), n;
  }
  return new Date(t.y, t.m, t.d, t.H, t.M, t.S, t.L);
}
function Kh(t) {
  if (0 <= t.y && t.y < 100) {
    var n = new Date(Date.UTC(-1, t.m, t.d, t.H, t.M, t.S, t.L));
    return n.setUTCFullYear(t.y), n;
  }
  return new Date(Date.UTC(t.y, t.m, t.d, t.H, t.M, t.S, t.L));
}
function Xo(t, n, s) {
  return { y: t, m: n, d: s, H: 0, M: 0, S: 0, L: 0 };
}
function VD(t) {
  var n = t.dateTime, s = t.date, r = t.time, o = t.periods, u = t.days, c = t.shortDays, d = t.months, p = t.shortMonths, h = Po(o), g = Io(o), y = Po(u), x = Io(u), T = Po(c), S = Io(c), A = Po(d), C = Io(d), N = Po(p), R = Io(p), O = {
    a: q,
    A: w,
    b: L,
    B: U,
    c: null,
    d: gx,
    e: gx,
    f: oj,
    g: yj,
    G: xj,
    H: sj,
    I: aj,
    j: rj,
    L: NS,
    m: lj,
    M: uj,
    p: _,
    q: V,
    Q: xx,
    s: bx,
    S: cj,
    u: fj,
    U: dj,
    V: hj,
    w: mj,
    W: pj,
    x: null,
    X: null,
    y: gj,
    Y: vj,
    Z: bj,
    "%": vx
  }, k = {
    a: nt,
    A: at,
    b: rt,
    B: st,
    c: null,
    d: yx,
    e: yx,
    f: Aj,
    g: zj,
    G: Lj,
    H: Tj,
    I: Sj,
    j: Mj,
    L: OS,
    m: Cj,
    M: _j,
    p: ft,
    q: Tt,
    Q: xx,
    s: bx,
    S: Ej,
    u: wj,
    U: Dj,
    V: jj,
    w: Nj,
    W: Rj,
    x: null,
    X: null,
    y: Oj,
    Y: kj,
    Z: Uj,
    "%": vx
  }, H = {
    a: J,
    A: W,
    b: ut,
    B: lt,
    c: dt,
    d: mx,
    e: mx,
    f: tj,
    g: hx,
    G: dx,
    H: px,
    I: px,
    j: ZD,
    L: WD,
    m: KD,
    M: QD,
    p: Z,
    q: $D,
    Q: nj,
    s: ij,
    S: JD,
    u: qD,
    U: XD,
    V: PD,
    w: GD,
    W: ID,
    x: ot,
    X: D,
    y: hx,
    Y: dx,
    Z: FD,
    "%": ej
  };
  O.x = G(s, O), O.X = G(r, O), O.c = G(n, O), k.x = G(s, k), k.X = G(r, k), k.c = G(n, k);
  function G(P, ct) {
    return function(ht) {
      var I = [], gt = -1, mt = 0, Et = P.length, St, wt, Kt;
      for (ht instanceof Date || (ht = /* @__PURE__ */ new Date(+ht)); ++gt < Et; )
        P.charCodeAt(gt) === 37 && (I.push(P.slice(mt, gt)), (wt = fx[St = P.charAt(++gt)]) != null ? St = P.charAt(++gt) : wt = St === "e" ? " " : "0", (Kt = ct[St]) && (St = Kt(ht, wt)), I.push(St), mt = gt + 1);
      return I.push(P.slice(mt, gt)), I.join("");
    };
  }
  function X(P, ct) {
    return function(ht) {
      var I = Xo(1900, void 0, 1), gt = Y(I, P, ht += "", 0), mt, Et;
      if (gt != ht.length) return null;
      if ("Q" in I) return new Date(I.Q);
      if ("s" in I) return new Date(I.s * 1e3 + ("L" in I ? I.L : 0));
      if (ct && !("Z" in I) && (I.Z = 0), "p" in I && (I.H = I.H % 12 + I.p * 12), I.m === void 0 && (I.m = "q" in I ? I.q : 0), "V" in I) {
        if (I.V < 1 || I.V > 53) return null;
        "w" in I || (I.w = 1), "Z" in I ? (mt = Kh(Xo(I.y, 0, 1)), Et = mt.getUTCDay(), mt = Et > 4 || Et === 0 ? Cc.ceil(mt) : Cc(mt), mt = Pc.offset(mt, (I.V - 1) * 7), I.y = mt.getUTCFullYear(), I.m = mt.getUTCMonth(), I.d = mt.getUTCDate() + (I.w + 6) % 7) : (mt = $h(Xo(I.y, 0, 1)), Et = mt.getDay(), mt = Et > 4 || Et === 0 ? Ac.ceil(mt) : Ac(mt), mt = Ir.offset(mt, (I.V - 1) * 7), I.y = mt.getFullYear(), I.m = mt.getMonth(), I.d = mt.getDate() + (I.w + 6) % 7);
      } else ("W" in I || "U" in I) && ("w" in I || (I.w = "u" in I ? I.u % 7 : "W" in I ? 1 : 0), Et = "Z" in I ? Kh(Xo(I.y, 0, 1)).getUTCDay() : $h(Xo(I.y, 0, 1)).getDay(), I.m = 0, I.d = "W" in I ? (I.w + 6) % 7 + I.W * 7 - (Et + 5) % 7 : I.w + I.U * 7 - (Et + 6) % 7);
      return "Z" in I ? (I.H += I.Z / 100 | 0, I.M += I.Z % 100, Kh(I)) : $h(I);
    };
  }
  function Y(P, ct, ht, I) {
    for (var gt = 0, mt = ct.length, Et = ht.length, St, wt; gt < mt; ) {
      if (I >= Et) return -1;
      if (St = ct.charCodeAt(gt++), St === 37) {
        if (St = ct.charAt(gt++), wt = H[St in fx ? ct.charAt(gt++) : St], !wt || (I = wt(P, ht, I)) < 0) return -1;
      } else if (St != ht.charCodeAt(I++))
        return -1;
    }
    return I;
  }
  function Z(P, ct, ht) {
    var I = h.exec(ct.slice(ht));
    return I ? (P.p = g.get(I[0].toLowerCase()), ht + I[0].length) : -1;
  }
  function J(P, ct, ht) {
    var I = T.exec(ct.slice(ht));
    return I ? (P.w = S.get(I[0].toLowerCase()), ht + I[0].length) : -1;
  }
  function W(P, ct, ht) {
    var I = y.exec(ct.slice(ht));
    return I ? (P.w = x.get(I[0].toLowerCase()), ht + I[0].length) : -1;
  }
  function ut(P, ct, ht) {
    var I = N.exec(ct.slice(ht));
    return I ? (P.m = R.get(I[0].toLowerCase()), ht + I[0].length) : -1;
  }
  function lt(P, ct, ht) {
    var I = A.exec(ct.slice(ht));
    return I ? (P.m = C.get(I[0].toLowerCase()), ht + I[0].length) : -1;
  }
  function dt(P, ct, ht) {
    return Y(P, n, ct, ht);
  }
  function ot(P, ct, ht) {
    return Y(P, s, ct, ht);
  }
  function D(P, ct, ht) {
    return Y(P, r, ct, ht);
  }
  function q(P) {
    return c[P.getDay()];
  }
  function w(P) {
    return u[P.getDay()];
  }
  function L(P) {
    return p[P.getMonth()];
  }
  function U(P) {
    return d[P.getMonth()];
  }
  function _(P) {
    return o[+(P.getHours() >= 12)];
  }
  function V(P) {
    return 1 + ~~(P.getMonth() / 3);
  }
  function nt(P) {
    return c[P.getUTCDay()];
  }
  function at(P) {
    return u[P.getUTCDay()];
  }
  function rt(P) {
    return p[P.getUTCMonth()];
  }
  function st(P) {
    return d[P.getUTCMonth()];
  }
  function ft(P) {
    return o[+(P.getUTCHours() >= 12)];
  }
  function Tt(P) {
    return 1 + ~~(P.getUTCMonth() / 3);
  }
  return {
    format: function(P) {
      var ct = G(P += "", O);
      return ct.toString = function() {
        return P;
      }, ct;
    },
    parse: function(P) {
      var ct = X(P += "", !1);
      return ct.toString = function() {
        return P;
      }, ct;
    },
    utcFormat: function(P) {
      var ct = G(P += "", k);
      return ct.toString = function() {
        return P;
      }, ct;
    },
    utcParse: function(P) {
      var ct = X(P += "", !0);
      return ct.toString = function() {
        return P;
      }, ct;
    }
  };
}
var fx = { "-": "", _: " ", 0: "0" }, $e = /^\s*\d+/, BD = /^%/, HD = /[\\^$*+?|[\]().{}]/g;
function ee(t, n, s) {
  var r = t < 0 ? "-" : "", o = (r ? -t : t) + "", u = o.length;
  return r + (u < s ? new Array(s - u + 1).join(n) + o : o);
}
function YD(t) {
  return t.replace(HD, "\\$&");
}
function Po(t) {
  return new RegExp("^(?:" + t.map(YD).join("|") + ")", "i");
}
function Io(t) {
  return new Map(t.map((n, s) => [n.toLowerCase(), s]));
}
function GD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 1));
  return r ? (t.w = +r[0], s + r[0].length) : -1;
}
function qD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 1));
  return r ? (t.u = +r[0], s + r[0].length) : -1;
}
function XD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.U = +r[0], s + r[0].length) : -1;
}
function PD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.V = +r[0], s + r[0].length) : -1;
}
function ID(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.W = +r[0], s + r[0].length) : -1;
}
function dx(t, n, s) {
  var r = $e.exec(n.slice(s, s + 4));
  return r ? (t.y = +r[0], s + r[0].length) : -1;
}
function hx(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.y = +r[0] + (+r[0] > 68 ? 1900 : 2e3), s + r[0].length) : -1;
}
function FD(t, n, s) {
  var r = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(n.slice(s, s + 6));
  return r ? (t.Z = r[1] ? 0 : -(r[2] + (r[3] || "00")), s + r[0].length) : -1;
}
function $D(t, n, s) {
  var r = $e.exec(n.slice(s, s + 1));
  return r ? (t.q = r[0] * 3 - 3, s + r[0].length) : -1;
}
function KD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.m = r[0] - 1, s + r[0].length) : -1;
}
function mx(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.d = +r[0], s + r[0].length) : -1;
}
function ZD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 3));
  return r ? (t.m = 0, t.d = +r[0], s + r[0].length) : -1;
}
function px(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.H = +r[0], s + r[0].length) : -1;
}
function QD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.M = +r[0], s + r[0].length) : -1;
}
function JD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 2));
  return r ? (t.S = +r[0], s + r[0].length) : -1;
}
function WD(t, n, s) {
  var r = $e.exec(n.slice(s, s + 3));
  return r ? (t.L = +r[0], s + r[0].length) : -1;
}
function tj(t, n, s) {
  var r = $e.exec(n.slice(s, s + 6));
  return r ? (t.L = Math.floor(r[0] / 1e3), s + r[0].length) : -1;
}
function ej(t, n, s) {
  var r = BD.exec(n.slice(s, s + 1));
  return r ? s + r[0].length : -1;
}
function nj(t, n, s) {
  var r = $e.exec(n.slice(s));
  return r ? (t.Q = +r[0], s + r[0].length) : -1;
}
function ij(t, n, s) {
  var r = $e.exec(n.slice(s));
  return r ? (t.s = +r[0], s + r[0].length) : -1;
}
function gx(t, n) {
  return ee(t.getDate(), n, 2);
}
function sj(t, n) {
  return ee(t.getHours(), n, 2);
}
function aj(t, n) {
  return ee(t.getHours() % 12 || 12, n, 2);
}
function rj(t, n) {
  return ee(1 + Ir.count(Mi(t), t), n, 3);
}
function NS(t, n) {
  return ee(t.getMilliseconds(), n, 3);
}
function oj(t, n) {
  return NS(t, n) + "000";
}
function lj(t, n) {
  return ee(t.getMonth() + 1, n, 2);
}
function uj(t, n) {
  return ee(t.getMinutes(), n, 2);
}
function cj(t, n) {
  return ee(t.getSeconds(), n, 2);
}
function fj(t) {
  var n = t.getDay();
  return n === 0 ? 7 : n;
}
function dj(t, n) {
  return ee(yl.count(Mi(t) - 1, t), n, 2);
}
function RS(t) {
  var n = t.getDay();
  return n >= 4 || n === 0 ? Or(t) : Or.ceil(t);
}
function hj(t, n) {
  return t = RS(t), ee(Or.count(Mi(t), t) + (Mi(t).getDay() === 4), n, 2);
}
function mj(t) {
  return t.getDay();
}
function pj(t, n) {
  return ee(Ac.count(Mi(t) - 1, t), n, 2);
}
function gj(t, n) {
  return ee(t.getFullYear() % 100, n, 2);
}
function yj(t, n) {
  return t = RS(t), ee(t.getFullYear() % 100, n, 2);
}
function vj(t, n) {
  return ee(t.getFullYear() % 1e4, n, 4);
}
function xj(t, n) {
  var s = t.getDay();
  return t = s >= 4 || s === 0 ? Or(t) : Or.ceil(t), ee(t.getFullYear() % 1e4, n, 4);
}
function bj(t) {
  var n = t.getTimezoneOffset();
  return (n > 0 ? "-" : (n *= -1, "+")) + ee(n / 60 | 0, "0", 2) + ee(n % 60, "0", 2);
}
function yx(t, n) {
  return ee(t.getUTCDate(), n, 2);
}
function Tj(t, n) {
  return ee(t.getUTCHours(), n, 2);
}
function Sj(t, n) {
  return ee(t.getUTCHours() % 12 || 12, n, 2);
}
function Mj(t, n) {
  return ee(1 + Pc.count(zs(t), t), n, 3);
}
function OS(t, n) {
  return ee(t.getUTCMilliseconds(), n, 3);
}
function Aj(t, n) {
  return OS(t, n) + "000";
}
function Cj(t, n) {
  return ee(t.getUTCMonth() + 1, n, 2);
}
function _j(t, n) {
  return ee(t.getUTCMinutes(), n, 2);
}
function Ej(t, n) {
  return ee(t.getUTCSeconds(), n, 2);
}
function wj(t) {
  var n = t.getUTCDay();
  return n === 0 ? 7 : n;
}
function Dj(t, n) {
  return ee(Dp.count(zs(t) - 1, t), n, 2);
}
function zS(t) {
  var n = t.getUTCDay();
  return n >= 4 || n === 0 ? zr(t) : zr.ceil(t);
}
function jj(t, n) {
  return t = zS(t), ee(zr.count(zs(t), t) + (zs(t).getUTCDay() === 4), n, 2);
}
function Nj(t) {
  return t.getUTCDay();
}
function Rj(t, n) {
  return ee(Cc.count(zs(t) - 1, t), n, 2);
}
function Oj(t, n) {
  return ee(t.getUTCFullYear() % 100, n, 2);
}
function zj(t, n) {
  return t = zS(t), ee(t.getUTCFullYear() % 100, n, 2);
}
function kj(t, n) {
  return ee(t.getUTCFullYear() % 1e4, n, 4);
}
function Lj(t, n) {
  var s = t.getUTCDay();
  return t = s >= 4 || s === 0 ? zr(t) : zr.ceil(t), ee(t.getUTCFullYear() % 1e4, n, 4);
}
function Uj() {
  return "+0000";
}
function vx() {
  return "%";
}
function xx(t) {
  return +t;
}
function bx(t) {
  return Math.floor(+t / 1e3);
}
var mr, kS;
Vj({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});
function Vj(t) {
  return mr = VD(t), kS = mr.format, mr.parse, mr.utcFormat, mr.utcParse, mr;
}
function Bj(t) {
  return new Date(t);
}
function Hj(t) {
  return t instanceof Date ? +t : +/* @__PURE__ */ new Date(+t);
}
function LS(t, n, s, r, o, u, c, d, p, h) {
  var g = MS(), y = g.invert, x = g.domain, T = h(".%L"), S = h(":%S"), A = h("%I:%M"), C = h("%I %p"), N = h("%a %d"), R = h("%b %d"), O = h("%B"), k = h("%Y");
  function H(G) {
    return (p(G) < G ? T : d(G) < G ? S : c(G) < G ? A : u(G) < G ? C : r(G) < G ? o(G) < G ? N : R : s(G) < G ? O : k)(G);
  }
  return g.invert = function(G) {
    return new Date(y(G));
  }, g.domain = function(G) {
    return arguments.length ? x(Array.from(G, Hj)) : x().map(Bj);
  }, g.ticks = function(G) {
    var X = x();
    return t(X[0], X[X.length - 1], G ?? 10);
  }, g.tickFormat = function(G, X) {
    return X == null ? H : h(X);
  }, g.nice = function(G) {
    var X = x();
    return (!G || typeof G.range != "function") && (G = n(X[0], X[X.length - 1], G ?? 10)), G ? x(CD(X, G)) : g;
  }, g.copy = function() {
    return SS(g, LS(t, n, s, r, o, u, c, d, p, h));
  }, g;
}
function Yj() {
  return aS.apply(LS(LD, UD, Mi, Ic, yl, Ir, Xc, qc, js, kS).domain([new Date(2e3, 0, 1), new Date(2e3, 0, 2)]), arguments);
}
function Gj(t, n) {
  n.domain && ("nice" in t || "quantiles" in t || "padding" in t, t.domain(n.domain));
}
function qj(t, n) {
  n.range && ("padding" in t, t.range(n.range));
}
function Xj(t, n) {
  "align" in t && "align" in n && typeof n.align < "u" && t.align(n.align);
}
function Pj(t, n) {
  "base" in t && "base" in n && typeof n.base < "u" && t.base(n.base);
}
function Ij(t, n) {
  "clamp" in t && "clamp" in n && typeof n.clamp < "u" && t.clamp(n.clamp);
}
function Fj(t, n) {
  "constant" in t && "constant" in n && typeof n.constant < "u" && t.constant(n.constant);
}
function $j(t, n) {
  "exponent" in t && "exponent" in n && typeof n.exponent < "u" && t.exponent(n.exponent);
}
const Tx = {
  lab: eD,
  hcl: nD,
  "hcl-long": iD,
  hsl: Ww,
  "hsl-long": tD,
  cubehelix: sD,
  "cubehelix-long": aD,
  rgb: Lm
};
function Kj(t) {
  switch (t) {
    case "lab":
    case "hcl":
    case "hcl-long":
    case "hsl":
    case "hsl-long":
    case "cubehelix":
    case "cubehelix-long":
    case "rgb":
      return Tx[t];
  }
  const {
    type: n,
    gamma: s
  } = t, r = Tx[n];
  return typeof s > "u" ? r : r.gamma(s);
}
function Zj(t, n) {
  if ("interpolate" in n && "interpolate" in t && typeof n.interpolate < "u") {
    const s = Kj(n.interpolate);
    t.interpolate(s);
  }
}
const Qj = new Date(Date.UTC(2020, 1, 2, 3, 4, 5)), Jj = "%Y-%m-%d %H:%M";
function Wj(t) {
  return t.tickFormat(1, Jj)(Qj) === "2020-02-02 03:04";
}
const Sx = {
  day: Ir,
  hour: Xc,
  minute: qc,
  month: Ic,
  second: js,
  week: yl,
  year: Mi
}, Mx = {
  day: Pc,
  hour: DS,
  minute: wS,
  month: jS,
  second: js,
  week: Dp,
  year: zs
};
function tN(t, n) {
  if ("nice" in n && typeof n.nice < "u" && "nice" in t) {
    const {
      nice: s
    } = n;
    if (typeof s == "boolean")
      s && t.nice();
    else if (typeof s == "number")
      t.nice(s);
    else {
      const r = t, o = Wj(r);
      if (typeof s == "string")
        r.nice(o ? Mx[s] : Sx[s]);
      else {
        const {
          interval: u,
          step: c
        } = s, d = (o ? Mx[u] : Sx[u]).every(c);
        d != null && r.nice(d);
      }
    }
  }
}
function eN(t, n) {
  "padding" in t && "padding" in n && typeof n.padding < "u" && t.padding(n.padding), "paddingInner" in t && "paddingInner" in n && typeof n.paddingInner < "u" && t.paddingInner(n.paddingInner), "paddingOuter" in t && "paddingOuter" in n && typeof n.paddingOuter < "u" && t.paddingOuter(n.paddingOuter);
}
function nN(t, n) {
  if (n.reverse) {
    const s = t.range().slice().reverse();
    "padding" in t, t.range(s);
  }
}
function iN(t, n) {
  "round" in n && typeof n.round < "u" && (n.round && "interpolate" in n && typeof n.interpolate < "u" ? console.warn("[visx/scale/applyRound] ignoring round: scale config contains round and interpolate. only applying interpolate. config:", n) : "round" in t ? t.round(n.round) : "interpolate" in t && n.round && t.interpolate(vS));
}
function sN(t, n) {
  "unknown" in t && "unknown" in n && typeof n.unknown < "u" && t.unknown(n.unknown);
}
function aN(t, n) {
  if ("zero" in n && n.zero === !0) {
    const s = t.domain(), [r, o] = s, u = o < r, [c, d] = u ? [o, r] : [r, o], p = [Math.min(0, c), Math.max(0, d)];
    t.domain(u ? p.reverse() : p);
  }
}
const rN = [
  // domain => nice => zero
  "domain",
  "nice",
  "zero",
  // interpolate before round
  "interpolate",
  "round",
  // set range then reverse
  "range",
  "reverse",
  // Order does not matter for these operators
  "align",
  "base",
  "clamp",
  "constant",
  "exponent",
  "padding",
  "unknown"
], oN = {
  domain: Gj,
  nice: tN,
  zero: aN,
  interpolate: Zj,
  round: iN,
  align: Xj,
  base: Pj,
  clamp: Ij,
  constant: Fj,
  exponent: $j,
  padding: eN,
  range: qj,
  reverse: nN,
  unknown: sN
};
function US() {
  for (var t = arguments.length, n = new Array(t), s = 0; s < t; s++)
    n[s] = arguments[s];
  const r = new Set(n), o = rN.filter((u) => r.has(u));
  return function(c, d) {
    return typeof d < "u" && o.forEach((p) => {
      oN[p](c, d);
    }), c;
  };
}
const lN = US("domain", "range", "reverse", "clamp", "interpolate", "nice", "round", "zero");
function kr(t) {
  return lN(ES(), t);
}
const uN = US("domain", "range", "reverse", "clamp", "interpolate", "nice", "round");
function cN(t) {
  return uN(Yj(), t);
}
function VS(t) {
  if ((typeof t == "function" || typeof t == "object" && t) && "valueOf" in t) {
    const n = t.valueOf();
    if (typeof n == "number") return n;
  }
  return t;
}
function BS(t, n) {
  const s = t;
  return "ticks" in s ? s.ticks(n) : s.domain().filter((r, o, u) => n == null || u.length <= n || o % Math.round((u.length - 1) / n) === 0);
}
const Ns = "left";
function vl(t) {
  return t == null || t === "" ? Ns : String(t);
}
function jp(t) {
  const n = /* @__PURE__ */ new Map();
  for (const s of t) {
    const r = vl(s.yAxisId), o = n.get(r) ?? [];
    o.push(s), n.set(r, o);
  }
  return n;
}
function fN(t, n) {
  const s = t[Ns];
  return s || (Object.values(t)[0] ?? n);
}
function dN({
  lines: t,
  innerHeight: n,
  domainsByAxis: s
}) {
  const r = jp(t), o = {};
  for (const [u] of r) {
    const c = s[u] ?? s[Ns] ?? [0, 100];
    o[u] = kr({
      range: [n, 0],
      domain: c
    });
  }
  return o[Ns] || (o[Ns] = kr({
    range: [n, 0],
    domain: s[Ns] ?? [0, 100]
  })), o;
}
const gn = {
  background: "var(--chart-background)",
  foreground: "var(--chart-foreground)",
  foregroundMuted: "var(--chart-foreground-muted)",
  linePrimary: "var(--chart-line-primary)",
  crosshair: "var(--chart-crosshair)",
  grid: "var(--chart-grid)",
  tooltipBackground: "var(--chart-tooltip-background)"
}, Zh = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)"
], HS = E.createContext(null), YS = E.createContext(null);
function hN({
  children: t,
  value: n
}) {
  const s = E.useMemo(
    () => ({
      data: n.data,
      renderData: n.renderData,
      xScale: n.xScale,
      yScale: n.yScale,
      yScales: n.yScales,
      width: n.width,
      height: n.height,
      innerWidth: n.innerWidth,
      innerHeight: n.innerHeight,
      margin: n.margin,
      columnWidth: n.columnWidth,
      containerRef: n.containerRef,
      lines: n.lines,
      referenceAreas: n.referenceAreas,
      chartPhase: n.chartPhase,
      chartStatus: n.chartStatus,
      loadingLabel: n.loadingLabel,
      yDomainTweenDuration: n.yDomainTweenDuration,
      yDomainSkeletonByAxis: n.yDomainSkeletonByAxis,
      yDomainTargetByAxis: n.yDomainTargetByAxis,
      isLoaded: n.isLoaded,
      animationDuration: n.animationDuration,
      animationEasing: n.animationEasing,
      enterTransition: n.enterTransition,
      revealEpoch: n.revealEpoch,
      notifyLoadingPulseComplete: n.notifyLoadingPulseComplete,
      xAccessor: n.xAccessor,
      dateLabels: n.dateLabels,
      xDomain: n.xDomain,
      xDomainSlotCount: n.xDomainSlotCount,
      barScale: n.barScale,
      bandWidth: n.bandWidth,
      barXAccessor: n.barXAccessor,
      orientation: n.orientation,
      stacked: n.stacked,
      stackOffsets: n.stackOffsets,
      composedBarDataKeys: n.composedBarDataKeys,
      composedBarSize: n.composedBarSize,
      composedMaxBarSize: n.composedMaxBarSize,
      composedBarGap: n.composedBarGap,
      composedStacked: n.composedStacked,
      composedStackOffsets: n.composedStackOffsets,
      composedStackGap: n.composedStackGap
    }),
    [
      n.data,
      n.renderData,
      n.xScale,
      n.yScale,
      n.yScales,
      n.width,
      n.height,
      n.innerWidth,
      n.innerHeight,
      n.margin,
      n.columnWidth,
      n.containerRef,
      n.lines,
      n.referenceAreas,
      n.chartPhase,
      n.chartStatus,
      n.loadingLabel,
      n.yDomainTweenDuration,
      n.yDomainSkeletonByAxis,
      n.yDomainTargetByAxis,
      n.isLoaded,
      n.animationDuration,
      n.animationEasing,
      n.enterTransition,
      n.revealEpoch,
      n.notifyLoadingPulseComplete,
      n.xAccessor,
      n.dateLabels,
      n.xDomain,
      n.xDomainSlotCount,
      n.barScale,
      n.bandWidth,
      n.barXAccessor,
      n.orientation,
      n.stacked,
      n.stackOffsets,
      n.composedBarDataKeys,
      n.composedBarSize,
      n.composedMaxBarSize,
      n.composedBarGap,
      n.composedStacked,
      n.composedStackOffsets,
      n.composedStackGap
    ]
  ), r = E.useMemo(
    () => ({
      tooltipData: n.tooltipData,
      setTooltipData: n.setTooltipData,
      selection: n.selection,
      clearSelection: n.clearSelection,
      hoveredBarIndex: n.hoveredBarIndex,
      setHoveredBarIndex: n.setHoveredBarIndex,
      hoveredCandleIndex: n.hoveredCandleIndex,
      setHoveredCandleIndex: n.setHoveredCandleIndex
    }),
    [
      n.tooltipData,
      n.setTooltipData,
      n.selection,
      n.clearSelection,
      n.hoveredBarIndex,
      n.setHoveredBarIndex,
      n.hoveredCandleIndex,
      n.setHoveredCandleIndex
    ]
  );
  return /* @__PURE__ */ v.jsx(HS.Provider, { value: s, children: /* @__PURE__ */ v.jsx(YS.Provider, { value: r, children: t }) });
}
function Wn() {
  const t = E.useContext(HS);
  if (!t)
    throw new Error(
      "useChartStable must be used within a ChartProvider. Make sure your component is wrapped in <LineChart>, <AreaChart>, <BarChart>, or <ComposedChart>."
    );
  return t;
}
function Np(t) {
  const { yScales: n, yScale: s } = Wn(), r = t == null || t === "" ? Ns : String(t);
  return n[r] ?? s;
}
function xl() {
  const t = E.useContext(YS);
  if (!t)
    throw new Error(
      "useChartHover must be used within a ChartProvider. Make sure your component is wrapped in <LineChart>, <AreaChart>, <BarChart>, or <ComposedChart>."
    );
  return t;
}
function GS() {
  const t = Wn(), n = xl();
  return { ...t, ...n };
}
const qS = E.createContext({});
function Rp(t) {
  const n = E.useRef(null);
  return n.current === null && (n.current = t()), n.current;
}
const mN = typeof window < "u", XS = mN ? E.useLayoutEffect : E.useEffect, Op = /* @__PURE__ */ E.createContext(null);
function zp(t, n) {
  t.indexOf(n) === -1 && t.push(n);
}
function Lr(t, n) {
  const s = t.indexOf(n);
  s > -1 && t.splice(s, 1);
}
const Ai = (t, n, s) => s > n ? n : s < t ? t : s;
let Fc = () => {
};
const ks = {}, PS = (t) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(t), IS = (t) => typeof t == "object" && t !== null, FS = (t) => /^0[^.\s]+$/u.test(t);
// @__NO_SIDE_EFFECTS__
function $S(t) {
  let n;
  return () => (n === void 0 && (n = t()), n);
}
const Jn = /* @__NO_SIDE_EFFECTS__ */ (t) => t, bl = (...t) => t.reduce((n, s) => (r) => s(n(r))), Ur = /* @__NO_SIDE_EFFECTS__ */ (t, n, s) => {
  const r = n - t;
  return r ? (s - t) / r : 1;
};
class kp {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return zp(this.subscriptions, n), () => Lr(this.subscriptions, n);
  }
  notify(n, s, r) {
    const o = this.subscriptions.length;
    if (o)
      if (o === 1)
        this.subscriptions[0](n, s, r);
      else
        for (let u = 0; u < o; u++) {
          const c = this.subscriptions[u];
          c && c(n, s, r);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const Cn = /* @__NO_SIDE_EFFECTS__ */ (t) => t * 1e3, Qn = /* @__NO_SIDE_EFFECTS__ */ (t) => t / 1e3, KS = /* @__NO_SIDE_EFFECTS__ */ (t, n) => n ? t * (1e3 / n) : 0, pN = (t, n, s) => {
  const r = n - t;
  return ((s - t) % r + r) % r + t;
}, ZS = (t, n, s) => (((1 - 3 * s + 3 * n) * t + (3 * s - 6 * n)) * t + 3 * n) * t, gN = 1e-7, yN = 12;
function vN(t, n, s, r, o) {
  let u, c, d = 0;
  do
    c = n + (s - n) / 2, u = ZS(c, r, o) - t, u > 0 ? s = c : n = c;
  while (Math.abs(u) > gN && ++d < yN);
  return c;
}
// @__NO_SIDE_EFFECTS__
function Tl(t, n, s, r) {
  if (t === n && s === r)
    return Jn;
  const o = (u) => vN(u, 0, 1, t, s);
  return (u) => u === 0 || u === 1 ? u : ZS(o(u), n, r);
}
const QS = /* @__NO_SIDE_EFFECTS__ */ (t) => (n) => n <= 0.5 ? t(2 * n) / 2 : (2 - t(2 * (1 - n))) / 2, Lp = /* @__NO_SIDE_EFFECTS__ */ (t) => (n) => 1 - t(1 - n), JS = /* @__PURE__ */ Tl(0.33, 1.53, 0.69, 0.99), Up = /* @__PURE__ */ Lp(JS), WS = /* @__PURE__ */ QS(Up), t2 = (t) => t >= 1 ? 1 : (t *= 2) < 1 ? 0.5 * Up(t) : 0.5 * (2 - Math.pow(2, -10 * (t - 1))), Vp = (t) => 1 - Math.sin(Math.acos(t)), e2 = /* @__PURE__ */ Lp(Vp), n2 = /* @__PURE__ */ QS(Vp), xN = /* @__PURE__ */ Tl(0.42, 0, 1, 1), bN = /* @__PURE__ */ Tl(0, 0, 0.58, 1), i2 = /* @__PURE__ */ Tl(0.42, 0, 0.58, 1), s2 = /* @__NO_SIDE_EFFECTS__ */ (t) => Array.isArray(t) && typeof t[0] != "number";
// @__NO_SIDE_EFFECTS__
function a2(t, n) {
  return /* @__PURE__ */ s2(t) ? t[pN(0, t.length, n)] : t;
}
const r2 = /* @__NO_SIDE_EFFECTS__ */ (t) => Array.isArray(t) && typeof t[0] == "number", TN = {
  linear: Jn,
  easeIn: xN,
  easeInOut: i2,
  easeOut: bN,
  circIn: Vp,
  circInOut: n2,
  circOut: e2,
  backIn: Up,
  backInOut: WS,
  backOut: JS,
  anticipate: t2
}, SN = (t) => typeof t == "string", Ax = (t) => {
  if (/* @__PURE__ */ r2(t)) {
    Fc(t.length === 4);
    const [n, s, r, o] = t;
    return /* @__PURE__ */ Tl(n, s, r, o);
  } else if (SN(t))
    return TN[t];
  return t;
}, Gu = [
  "setup",
  // Compute
  "read",
  // Read
  "resolveKeyframes",
  // Write/Read/Write/Read
  "preUpdate",
  // Compute
  "update",
  // Compute
  "preRender",
  // Compute
  "render",
  // Write
  "postRender"
  // Compute
];
function MN(t) {
  let n = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), r = !1, o = !1;
  const u = /* @__PURE__ */ new WeakSet();
  let c = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function d(h) {
    u.has(h) && (p.schedule(h), t()), h(c);
  }
  const p = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (h, g = !1, y = !1) => {
      const T = y && r ? n : s;
      return g && u.add(h), T.add(h), h;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (h) => {
      s.delete(h), u.delete(h);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (h) => {
      if (c = h, r) {
        o = !0;
        return;
      }
      r = !0;
      const g = n;
      n = s, s = g, n.forEach(d), n.clear(), r = !1, o && (o = !1, p.process(h));
    }
  };
  return p;
}
const AN = 40;
function o2(t, n) {
  let s = !1, r = !0;
  const o = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, u = () => s = !0, c = Gu.reduce((O, k) => (O[k] = MN(u), O), {}), { setup: d, read: p, resolveKeyframes: h, preUpdate: g, update: y, preRender: x, render: T, postRender: S } = c, A = () => {
    const O = ks.useManualTiming, k = O ? o.timestamp : performance.now();
    s = !1, O || (o.delta = r ? 1e3 / 60 : Math.max(Math.min(k - o.timestamp, AN), 1)), o.timestamp = k, o.isProcessing = !0, d.process(o), p.process(o), h.process(o), g.process(o), y.process(o), x.process(o), T.process(o), S.process(o), o.isProcessing = !1, s && n && (r = !1, t(A));
  }, C = () => {
    s = !0, r = !0, o.isProcessing || t(A);
  };
  return { schedule: Gu.reduce((O, k) => {
    const H = c[k];
    return O[k] = (G, X = !1, Y = !1) => (s || C(), H.schedule(G, X, Y)), O;
  }, {}), cancel: (O) => {
    for (let k = 0; k < Gu.length; k++)
      c[Gu[k]].cancel(O);
  }, state: o, steps: c };
}
const { schedule: re, cancel: Wi, state: en, steps: Qh } = /* @__PURE__ */ o2(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Jn, !0);
let tc;
function CN() {
  tc = void 0;
}
const mn = {
  now: () => (tc === void 0 && mn.set(en.isProcessing || ks.useManualTiming ? en.timestamp : performance.now()), tc),
  set: (t) => {
    tc = t, queueMicrotask(CN);
  }
}, l2 = (t) => (n) => typeof n == "string" && n.startsWith(t), u2 = /* @__PURE__ */ l2("--"), _N = /* @__PURE__ */ l2("var(--"), Bp = (t) => _N(t) ? EN.test(t.split("/*")[0].trim()) : !1, EN = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function Cx(t) {
  return typeof t != "string" ? !1 : t.split("/*")[0].includes("var(--");
}
const Fr = {
  test: (t) => typeof t == "number",
  parse: parseFloat,
  transform: (t) => t
}, ul = {
  ...Fr,
  transform: (t) => Ai(0, 1, t)
}, qu = {
  ...Fr,
  default: 1
}, Wo = (t) => Math.round(t * 1e5) / 1e5, Hp = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function wN(t) {
  return t == null;
}
const DN = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Yp = (t, n) => (s) => !!(typeof s == "string" && DN.test(s) && s.startsWith(t) || n && !wN(s) && Object.prototype.hasOwnProperty.call(s, n)), c2 = (t, n, s) => (r) => {
  if (typeof r != "string")
    return r;
  const [o, u, c, d] = r.match(Hp);
  return {
    [t]: parseFloat(o),
    [n]: parseFloat(u),
    [s]: parseFloat(c),
    alpha: d !== void 0 ? parseFloat(d) : 1
  };
}, jN = (t) => Ai(0, 255, t), Jh = {
  ...Fr,
  transform: (t) => Math.round(jN(t))
}, da = {
  test: /* @__PURE__ */ Yp("rgb", "red"),
  parse: /* @__PURE__ */ c2("red", "green", "blue"),
  transform: ({ red: t, green: n, blue: s, alpha: r = 1 }) => "rgba(" + Jh.transform(t) + ", " + Jh.transform(n) + ", " + Jh.transform(s) + ", " + Wo(ul.transform(r)) + ")"
};
function NN(t) {
  let n = "", s = "", r = "", o = "";
  return t.length > 5 ? (n = t.substring(1, 3), s = t.substring(3, 5), r = t.substring(5, 7), o = t.substring(7, 9)) : (n = t.substring(1, 2), s = t.substring(2, 3), r = t.substring(3, 4), o = t.substring(4, 5), n += n, s += s, r += r, o += o), {
    red: parseInt(n, 16),
    green: parseInt(s, 16),
    blue: parseInt(r, 16),
    alpha: o ? parseInt(o, 16) / 255 : 1
  };
}
const Bm = {
  test: /* @__PURE__ */ Yp("#"),
  parse: NN,
  transform: da.transform
}, Sl = /* @__NO_SIDE_EFFECTS__ */ (t) => ({
  test: (n) => typeof n == "string" && n.endsWith(t) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${t}`
}), Pi = /* @__PURE__ */ Sl("deg"), Si = /* @__PURE__ */ Sl("%"), xt = /* @__PURE__ */ Sl("px"), RN = /* @__PURE__ */ Sl("vh"), ON = /* @__PURE__ */ Sl("vw"), _x = {
  ...Si,
  parse: (t) => Si.parse(t) / 100,
  transform: (t) => Si.transform(t * 100)
}, Mr = {
  test: /* @__PURE__ */ Yp("hsl", "hue"),
  parse: /* @__PURE__ */ c2("hue", "saturation", "lightness"),
  transform: ({ hue: t, saturation: n, lightness: s, alpha: r = 1 }) => "hsla(" + Math.round(t) + ", " + Si.transform(Wo(n)) + ", " + Si.transform(Wo(s)) + ", " + Wo(ul.transform(r)) + ")"
}, Le = {
  test: (t) => da.test(t) || Bm.test(t) || Mr.test(t),
  parse: (t) => da.test(t) ? da.parse(t) : Mr.test(t) ? Mr.parse(t) : Bm.parse(t),
  transform: (t) => typeof t == "string" ? t : t.hasOwnProperty("red") ? da.transform(t) : Mr.transform(t),
  getAnimatableNone: (t) => {
    const n = Le.parse(t);
    return n.alpha = 0, Le.transform(n);
  }
}, zN = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function kN(t) {
  return isNaN(t) && typeof t == "string" && (t.match(Hp)?.length || 0) + (t.match(zN)?.length || 0) > 0;
}
const f2 = "number", d2 = "color", LN = "var", UN = "var(", Ex = "${}", VN = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function Vr(t) {
  const n = t.toString(), s = [], r = {
    color: [],
    number: [],
    var: []
  }, o = [];
  let u = 0;
  const d = n.replace(VN, (p) => (Le.test(p) ? (r.color.push(u), o.push(d2), s.push(Le.parse(p))) : p.startsWith(UN) ? (r.var.push(u), o.push(LN), s.push(p)) : (r.number.push(u), o.push(f2), s.push(parseFloat(p))), ++u, Ex)).split(Ex);
  return { values: s, split: d, indexes: r, types: o };
}
function BN(t) {
  return Vr(t).values;
}
function h2({ split: t, types: n }) {
  const s = t.length;
  return (r) => {
    let o = "";
    for (let u = 0; u < s; u++)
      if (o += t[u], r[u] !== void 0) {
        const c = n[u];
        c === f2 ? o += Wo(r[u]) : c === d2 ? o += Le.transform(r[u]) : o += r[u];
      }
    return o;
  };
}
function HN(t) {
  return h2(Vr(t));
}
const YN = (t) => typeof t == "number" ? 0 : Le.test(t) ? Le.getAnimatableNone(t) : t, GN = (t, n) => typeof t == "number" ? n?.trim().endsWith("/") ? t : 0 : YN(t);
function qN(t) {
  const n = Vr(t);
  return h2(n)(n.values.map((r, o) => GN(r, n.split[o])));
}
const ci = {
  test: kN,
  parse: BN,
  createTransformer: HN,
  getAnimatableNone: qN
};
function Wh(t, n, s) {
  return s < 0 && (s += 1), s > 1 && (s -= 1), s < 1 / 6 ? t + (n - t) * 6 * s : s < 1 / 2 ? n : s < 2 / 3 ? t + (n - t) * (2 / 3 - s) * 6 : t;
}
function XN({ hue: t, saturation: n, lightness: s, alpha: r }) {
  t /= 360, n /= 100, s /= 100;
  let o = 0, u = 0, c = 0;
  if (!n)
    o = u = c = s;
  else {
    const d = s < 0.5 ? s * (1 + n) : s + n - s * n, p = 2 * s - d;
    o = Wh(p, d, t + 1 / 3), u = Wh(p, d, t), c = Wh(p, d, t - 1 / 3);
  }
  return {
    red: Math.round(o * 255),
    green: Math.round(u * 255),
    blue: Math.round(c * 255),
    alpha: r
  };
}
function _c(t, n) {
  return (s) => s > 0 ? n : t;
}
const de = (t, n, s) => t + (n - t) * s, tm = (t, n, s) => {
  const r = t * t, o = s * (n * n - r) + r;
  return o < 0 ? 0 : Math.sqrt(o);
}, PN = [Bm, da, Mr], IN = (t) => PN.find((n) => n.test(t));
function wx(t) {
  const n = IN(t);
  if (!n)
    return !1;
  let s = n.parse(t);
  return n === Mr && (s = XN(s)), s;
}
const Dx = (t, n) => {
  const s = wx(t), r = wx(n);
  if (!s || !r)
    return _c(t, n);
  const o = { ...s };
  return (u) => (o.red = tm(s.red, r.red, u), o.green = tm(s.green, r.green, u), o.blue = tm(s.blue, r.blue, u), o.alpha = de(s.alpha, r.alpha, u), da.transform(o));
}, Hm = /* @__PURE__ */ new Set(["none", "hidden"]);
function FN(t, n) {
  return Hm.has(t) ? (s) => s <= 0 ? t : n : (s) => s >= 1 ? n : t;
}
function $N(t, n) {
  return (s) => de(t, n, s);
}
function Gp(t) {
  return typeof t == "number" ? $N : typeof t == "string" ? Bp(t) ? _c : Le.test(t) ? Dx : QN : Array.isArray(t) ? m2 : typeof t == "object" ? Le.test(t) ? Dx : KN : _c;
}
function m2(t, n) {
  const s = [...t], r = s.length, o = t.map((u, c) => Gp(u)(u, n[c]));
  return (u) => {
    for (let c = 0; c < r; c++)
      s[c] = o[c](u);
    return s;
  };
}
function KN(t, n) {
  const s = { ...t, ...n }, r = {};
  for (const o in s)
    t[o] !== void 0 && n[o] !== void 0 && (r[o] = Gp(t[o])(t[o], n[o]));
  return (o) => {
    for (const u in r)
      s[u] = r[u](o);
    return s;
  };
}
function ZN(t, n) {
  const s = [], r = { color: 0, var: 0, number: 0 };
  for (let o = 0; o < n.values.length; o++) {
    const u = n.types[o], c = t.indexes[u][r[u]], d = t.values[c] ?? 0;
    s[o] = d, r[u]++;
  }
  return s;
}
const QN = (t, n) => {
  const s = ci.createTransformer(n), r = Vr(t), o = Vr(n);
  return r.indexes.var.length === o.indexes.var.length && r.indexes.color.length === o.indexes.color.length && r.indexes.number.length >= o.indexes.number.length ? Hm.has(t) && !o.values.length || Hm.has(n) && !r.values.length ? FN(t, n) : bl(m2(ZN(r, o), o.values), s) : _c(t, n);
};
function p2(t, n, s) {
  return typeof t == "number" && typeof n == "number" && typeof s == "number" ? de(t, n, s) : Gp(t)(t, n);
}
const JN = (t) => {
  const n = ({ timestamp: s }) => t(s);
  return {
    start: (s = !0) => re.update(n, s),
    stop: () => Wi(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => en.isProcessing ? en.timestamp : mn.now()
  };
}, g2 = (t, n, s = 10) => {
  let r = "";
  const o = Math.max(Math.round(n / s), 2);
  for (let u = 0; u < o; u++)
    r += Math.round(t(u / (o - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${r.substring(0, r.length - 2)})`;
}, Ec = 2e4;
function qp(t) {
  let n = 0;
  const s = 50;
  let r = t.next(n);
  for (; !r.done && n < Ec; )
    n += s, r = t.next(n);
  return n >= Ec ? 1 / 0 : n;
}
function y2(t, n = 100, s) {
  const r = s({ ...t, keyframes: [0, n] }), o = Math.min(qp(r), Ec);
  return {
    type: "keyframes",
    ease: (u) => r.next(o * u).value / n,
    duration: /* @__PURE__ */ Qn(o)
  };
}
const _e = {
  // Default spring physics
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
  // Default duration/bounce-based options
  duration: 800,
  // in ms
  bounce: 0.3,
  visualDuration: 0.3,
  // in seconds
  // Rest thresholds
  restSpeed: {
    granular: 0.01,
    default: 2
  },
  restDelta: {
    granular: 5e-3,
    default: 0.5
  },
  // Limits
  minDuration: 0.01,
  // in seconds
  maxDuration: 10,
  // in seconds
  minDamping: 0.05,
  maxDamping: 1
};
function Ym(t, n) {
  return t * Math.sqrt(1 - n * n);
}
const WN = 12;
function t3(t, n, s) {
  let r = s;
  for (let o = 1; o < WN; o++)
    r = r - t(r) / n(r);
  return r;
}
const em = 1e-3;
function e3({ duration: t = _e.duration, bounce: n = _e.bounce, velocity: s = _e.velocity, mass: r = _e.mass }) {
  let o, u, c = 1 - n;
  c = Ai(_e.minDamping, _e.maxDamping, c), t = Ai(_e.minDuration, _e.maxDuration, /* @__PURE__ */ Qn(t)), c < 1 ? (o = (h) => {
    const g = h * c, y = g * t, x = g - s, T = Ym(h, c), S = Math.exp(-y);
    return em - x / T * S;
  }, u = (h) => {
    const y = h * c * t, x = y * s + s, T = Math.pow(c, 2) * Math.pow(h, 2) * t, S = Math.exp(-y), A = Ym(Math.pow(h, 2), c);
    return (-o(h) + em > 0 ? -1 : 1) * ((x - T) * S) / A;
  }) : (o = (h) => {
    const g = Math.exp(-h * t), y = (h - s) * t + 1;
    return -em + g * y;
  }, u = (h) => {
    const g = Math.exp(-h * t), y = (s - h) * (t * t);
    return g * y;
  });
  const d = 5 / t, p = t3(o, u, d);
  if (t = /* @__PURE__ */ Cn(t), isNaN(p))
    return {
      stiffness: _e.stiffness,
      damping: _e.damping,
      duration: t
    };
  {
    const h = Math.pow(p, 2) * r;
    return {
      stiffness: h,
      damping: c * 2 * Math.sqrt(r * h),
      duration: t
    };
  }
}
const n3 = ["duration", "bounce"], i3 = ["stiffness", "damping", "mass"];
function jx(t, n) {
  return n.some((s) => t[s] !== void 0);
}
function s3(t) {
  let n = {
    velocity: _e.velocity,
    stiffness: _e.stiffness,
    damping: _e.damping,
    mass: _e.mass,
    isResolvedFromDuration: !1,
    ...t
  };
  if (!jx(t, i3) && jx(t, n3))
    if (n.velocity = 0, t.visualDuration) {
      const s = t.visualDuration, r = 2 * Math.PI / (s * 1.2), o = r * r, u = 2 * Ai(0.05, 1, 1 - (t.bounce || 0)) * Math.sqrt(o);
      n = {
        ...n,
        mass: _e.mass,
        stiffness: o,
        damping: u
      };
    } else {
      const s = e3({ ...t, velocity: 0 });
      n = {
        ...n,
        ...s,
        mass: _e.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function cl(t = _e.visualDuration, n = _e.bounce) {
  const s = typeof t != "object" ? {
    visualDuration: t,
    keyframes: [0, 1],
    bounce: n
  } : t;
  let { restSpeed: r, restDelta: o } = s;
  const u = s.keyframes[0], c = s.keyframes[s.keyframes.length - 1], d = { done: !1, value: u }, { stiffness: p, damping: h, mass: g, duration: y, velocity: x, isResolvedFromDuration: T } = s3({
    ...s,
    velocity: -/* @__PURE__ */ Qn(s.velocity || 0)
  }), S = x || 0, A = h / (2 * Math.sqrt(p * g)), C = c - u, N = /* @__PURE__ */ Qn(Math.sqrt(p / g)), R = Math.abs(C) < 5;
  r || (r = R ? _e.restSpeed.granular : _e.restSpeed.default), o || (o = R ? _e.restDelta.granular : _e.restDelta.default);
  let O, k, H, G, X, Y;
  if (A < 1)
    H = Ym(N, A), G = (S + A * N * C) / H, O = (J) => {
      const W = Math.exp(-A * N * J);
      return c - W * (G * Math.sin(H * J) + C * Math.cos(H * J));
    }, X = A * N * G + C * H, Y = A * N * C - G * H, k = (J) => Math.exp(-A * N * J) * (X * Math.sin(H * J) + Y * Math.cos(H * J));
  else if (A === 1) {
    O = (W) => c - Math.exp(-N * W) * (C + (S + N * C) * W);
    const J = S + N * C;
    k = (W) => Math.exp(-N * W) * (N * J * W - S);
  } else {
    const J = N * Math.sqrt(A * A - 1);
    O = (dt) => {
      const ot = Math.exp(-A * N * dt), D = Math.min(J * dt, 300);
      return c - ot * ((S + A * N * C) * Math.sinh(D) + J * C * Math.cosh(D)) / J;
    };
    const W = (S + A * N * C) / J, ut = A * N * W - C * J, lt = A * N * C - W * J;
    k = (dt) => {
      const ot = Math.exp(-A * N * dt), D = Math.min(J * dt, 300);
      return ot * (ut * Math.sinh(D) + lt * Math.cosh(D));
    };
  }
  const Z = {
    calculatedDuration: T && y || null,
    velocity: (J) => /* @__PURE__ */ Cn(k(J)),
    next: (J) => {
      if (!T && A < 1) {
        const ut = Math.exp(-A * N * J), lt = Math.sin(H * J), dt = Math.cos(H * J), ot = c - ut * (G * lt + C * dt), D = /* @__PURE__ */ Cn(ut * (X * lt + Y * dt));
        return d.done = Math.abs(D) <= r && Math.abs(c - ot) <= o, d.value = d.done ? c : ot, d;
      }
      const W = O(J);
      if (T)
        d.done = J >= y;
      else {
        const ut = /* @__PURE__ */ Cn(k(J));
        d.done = Math.abs(ut) <= r && Math.abs(c - W) <= o;
      }
      return d.value = d.done ? c : W, d;
    },
    toString: () => {
      const J = Math.min(qp(Z), Ec), W = g2((ut) => Z.next(J * ut).value, J, 30);
      return J + "ms " + W;
    },
    toTransition: () => {
    }
  };
  return Z;
}
cl.applyToOptions = (t) => {
  const n = y2(t, 100, cl);
  return t.ease = n.ease, t.duration = /* @__PURE__ */ Cn(n.duration), t.type = "keyframes", t;
};
const a3 = 5;
function v2(t, n, s) {
  const r = Math.max(n - a3, 0);
  return /* @__PURE__ */ KS(s - t(r), n - r);
}
function Gm({ keyframes: t, velocity: n = 0, power: s = 0.8, timeConstant: r = 325, bounceDamping: o = 10, bounceStiffness: u = 500, modifyTarget: c, min: d, max: p, restDelta: h = 0.5, restSpeed: g }) {
  const y = t[0], x = {
    done: !1,
    value: y
  }, T = (Y) => d !== void 0 && Y < d || p !== void 0 && Y > p, S = (Y) => d === void 0 ? p : p === void 0 || Math.abs(d - Y) < Math.abs(p - Y) ? d : p;
  let A = s * n;
  const C = y + A, N = c === void 0 ? C : c(C);
  N !== C && (A = N - y);
  const R = (Y) => -A * Math.exp(-Y / r), O = (Y) => N + R(Y), k = (Y) => {
    const Z = R(Y), J = O(Y);
    x.done = Math.abs(Z) <= h, x.value = x.done ? N : J;
  };
  let H, G;
  const X = (Y) => {
    T(x.value) && (H = Y, G = cl({
      keyframes: [x.value, S(x.value)],
      velocity: v2(O, Y, x.value),
      // TODO: This should be passing * 1000
      damping: o,
      stiffness: u,
      restDelta: h,
      restSpeed: g
    }));
  };
  return X(0), {
    calculatedDuration: null,
    next: (Y) => {
      let Z = !1;
      return !G && H === void 0 && (Z = !0, k(Y), X(Y)), H !== void 0 && Y >= H ? G.next(Y - H) : (!Z && k(Y), x);
    }
  };
}
function r3(t, n, s) {
  const r = [], o = s || ks.mix || p2, u = t.length - 1;
  for (let c = 0; c < u; c++) {
    let d = o(t[c], t[c + 1]);
    if (n) {
      const p = Array.isArray(n) ? n[c] || Jn : n;
      d = bl(p, d);
    }
    r.push(d);
  }
  return r;
}
function x2(t, n, { clamp: s = !0, ease: r, mixer: o } = {}) {
  const u = t.length;
  if (Fc(u === n.length), u === 1)
    return () => n[0];
  if (u === 2 && n[0] === n[1])
    return () => n[1];
  const c = t[0] === t[1];
  t[0] > t[u - 1] && (t = [...t].reverse(), n = [...n].reverse());
  const d = r3(n, r, o), p = d.length, h = (g) => {
    if (c && g < t[0])
      return n[0];
    let y = 0;
    if (p > 1)
      for (; y < t.length - 2 && !(g < t[y + 1]); y++)
        ;
    const x = /* @__PURE__ */ Ur(t[y], t[y + 1], g);
    return d[y](x);
  };
  return s ? (g) => h(Ai(t[0], t[u - 1], g)) : h;
}
function b2(t, n) {
  const s = t[t.length - 1];
  for (let r = 1; r <= n; r++) {
    const o = /* @__PURE__ */ Ur(0, n, r);
    t.push(de(s, 1, o));
  }
}
function T2(t) {
  const n = [0];
  return b2(n, t.length - 1), n;
}
function o3(t, n) {
  return t.map((s) => s * n);
}
function l3(t, n) {
  return t.map(() => n || i2).splice(0, t.length - 1);
}
function tl({ duration: t = 300, keyframes: n, times: s, ease: r = "easeInOut" }) {
  const o = /* @__PURE__ */ s2(r) ? r.map(Ax) : Ax(r), u = {
    done: !1,
    value: n[0]
  }, c = o3(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    s && s.length === n.length ? s : T2(n),
    t
  ), d = x2(c, n, {
    ease: Array.isArray(o) ? o : l3(n, o)
  });
  return {
    calculatedDuration: t,
    next: (p) => (u.value = d(p), u.done = p >= t, u)
  };
}
const u3 = (t) => t !== null;
function $c(t, { repeat: n, repeatType: s = "loop" }, r, o = 1) {
  const u = t.filter(u3), d = o < 0 || n && s !== "loop" && n % 2 === 1 ? 0 : u.length - 1;
  return !d || r === void 0 ? u[d] : r;
}
const c3 = {
  decay: Gm,
  inertia: Gm,
  tween: tl,
  keyframes: tl,
  spring: cl
};
function S2(t) {
  typeof t.type == "string" && (t.type = c3[t.type]);
}
class Xp {
  constructor() {
    this.updateFinished();
  }
  get finished() {
    return this._finished;
  }
  updateFinished() {
    this._finished = new Promise((n) => {
      this.resolve = n;
    });
  }
  notifyFinished() {
    this.resolve();
  }
  /**
   * Allows the animation to be awaited.
   *
   * @deprecated Use `finished` instead.
   */
  then(n, s) {
    return this.finished.then(n, s);
  }
}
const f3 = (t) => t / 100;
let fl = class extends Xp {
  constructor(n) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      const { motionValue: s } = this.options;
      s && s.updatedAt !== mn.now() && this.tick(mn.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), this.options.onStop?.());
    }, this.options = n, this.initAnimation(), this.play(), n.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: n } = this;
    S2(n);
    const { type: s = tl, repeat: r = 0, repeatDelay: o = 0, repeatType: u, velocity: c = 0 } = n;
    let { keyframes: d } = n;
    const p = s || tl;
    p !== tl && typeof d[0] != "number" && (this.mixKeyframes = bl(f3, p2(d[0], d[1])), d = [0, 100]);
    const h = p({ ...n, keyframes: d });
    u === "mirror" && (this.mirroredGenerator = p({
      ...n,
      keyframes: [...d].reverse(),
      velocity: -c
    })), h.calculatedDuration === null && (h.calculatedDuration = qp(h));
    const { calculatedDuration: g } = h;
    this.calculatedDuration = g, this.resolvedDuration = g + o, this.totalDuration = this.resolvedDuration * (r + 1) - o, this.generator = h;
  }
  updateTime(n) {
    const s = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = s;
  }
  tick(n, s = !1) {
    const { generator: r, totalDuration: o, mixKeyframes: u, mirroredGenerator: c, resolvedDuration: d, calculatedDuration: p } = this;
    if (this.startTime === null)
      return r.next(0);
    const { delay: h = 0, keyframes: g, repeat: y, repeatType: x, repeatDelay: T, type: S, onUpdate: A, finalKeyframe: C } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - o / this.speed, this.startTime)), s ? this.currentTime = n : this.updateTime(n);
    const N = this.currentTime - h * (this.playbackSpeed >= 0 ? 1 : -1), R = this.playbackSpeed >= 0 ? N < 0 : N > o;
    this.currentTime = Math.max(N, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = o);
    let O = this.currentTime, k = r;
    if (y) {
      const Y = Math.min(this.currentTime, o) / d;
      let Z = Math.floor(Y), J = Y % 1;
      !J && Y >= 1 && (J = 1), J === 1 && Z--, Z = Math.min(Z, y + 1), Z % 2 && (x === "reverse" ? (J = 1 - J, T && (J -= T / d)) : x === "mirror" && (k = c)), O = Ai(0, 1, J) * d;
    }
    let H;
    R ? (this.delayState.value = g[0], H = this.delayState) : H = k.next(O), u && !R && (H.value = u(H.value));
    let { done: G } = H;
    !R && p !== null && (G = this.playbackSpeed >= 0 ? this.currentTime >= o : this.currentTime <= 0);
    const X = this.holdTime === null && (this.state === "finished" || this.state === "running" && G);
    return X && S !== Gm && (H.value = $c(g, this.options, C, this.speed)), A && A(H.value), X && this.finish(), H;
  }
  /**
   * Allows the returned animation to be awaited or promise-chained. Currently
   * resolves when the animation finishes at all but in a future update could/should
   * reject if its cancels.
   */
  then(n, s) {
    return this.finished.then(n, s);
  }
  get duration() {
    return /* @__PURE__ */ Qn(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Qn(n);
  }
  get time() {
    return /* @__PURE__ */ Qn(this.currentTime);
  }
  set time(n) {
    n = /* @__PURE__ */ Cn(n), this.currentTime = n, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = n : this.driver && (this.startTime = this.driver.now() - n / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = n, this.tick(n));
  }
  /**
   * Returns the generator's velocity at the current time in units/second.
   * Uses the analytical derivative when available (springs), avoiding
   * the MotionValue's frame-dependent velocity estimation.
   */
  getGeneratorVelocity() {
    const n = this.currentTime;
    if (n <= 0)
      return this.options.velocity || 0;
    if (this.generator.velocity)
      return this.generator.velocity(n);
    const s = this.generator.next(n).value;
    return v2((r) => this.generator.next(r).value, n, s);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const s = this.playbackSpeed !== n;
    s && this.driver && this.updateTime(mn.now()), this.playbackSpeed = n, s && this.driver && (this.time = /* @__PURE__ */ Qn(this.currentTime));
  }
  play() {
    if (this.isStopped)
      return;
    const { driver: n = JN, startTime: s } = this.options;
    this.driver || (this.driver = n((o) => this.tick(o))), this.options.onPlay?.();
    const r = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = r) : this.holdTime !== null ? this.startTime = r - this.holdTime : this.startTime || (this.startTime = s ?? r), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(mn.now()), this.holdTime = this.currentTime;
  }
  complete() {
    this.state !== "running" && this.play(), this.state = "finished", this.holdTime = null;
  }
  finish() {
    this.notifyFinished(), this.teardown(), this.state = "finished", this.options.onComplete?.();
  }
  cancel() {
    this.holdTime = null, this.startTime = 0, this.tick(0), this.teardown(), this.options.onCancel?.();
  }
  teardown() {
    this.state = "idle", this.stopDriver(), this.startTime = this.holdTime = null;
  }
  stopDriver() {
    this.driver && (this.driver.stop(), this.driver = void 0);
  }
  sample(n) {
    return this.startTime = 0, this.tick(n, !0);
  }
  attachTimeline(n) {
    return this.options.allowFlatten && (this.options.type = "keyframes", this.options.ease = "linear", this.initAnimation()), this.driver?.stop(), n.observe(this);
  }
};
function d3(t) {
  for (let n = 1; n < t.length; n++)
    t[n] ?? (t[n] = t[n - 1]);
}
const ha = (t) => t * 180 / Math.PI, qm = (t) => {
  const n = ha(Math.atan2(t[1], t[0]));
  return Xm(n);
}, h3 = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (t) => (Math.abs(t[0]) + Math.abs(t[3])) / 2,
  rotate: qm,
  rotateZ: qm,
  skewX: (t) => ha(Math.atan(t[1])),
  skewY: (t) => ha(Math.atan(t[2])),
  skew: (t) => (Math.abs(t[1]) + Math.abs(t[2])) / 2
}, Xm = (t) => (t = t % 360, t < 0 && (t += 360), t), Nx = qm, Rx = (t) => Math.sqrt(t[0] * t[0] + t[1] * t[1]), Ox = (t) => Math.sqrt(t[4] * t[4] + t[5] * t[5]), m3 = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Rx,
  scaleY: Ox,
  scale: (t) => (Rx(t) + Ox(t)) / 2,
  rotateX: (t) => Xm(ha(Math.atan2(t[6], t[5]))),
  rotateY: (t) => Xm(ha(Math.atan2(-t[2], t[0]))),
  rotateZ: Nx,
  rotate: Nx,
  skewX: (t) => ha(Math.atan(t[4])),
  skewY: (t) => ha(Math.atan(t[1])),
  skew: (t) => (Math.abs(t[1]) + Math.abs(t[4])) / 2
};
function Pm(t) {
  return t.includes("scale") ? 1 : 0;
}
function Im(t, n) {
  if (!t || t === "none")
    return Pm(n);
  const s = t.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let r, o;
  if (s)
    r = m3, o = s;
  else {
    const d = t.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    r = h3, o = d;
  }
  if (!o)
    return Pm(n);
  const u = r[n], c = o[1].split(",").map(g3);
  return typeof u == "function" ? u(c) : c[u];
}
const p3 = (t, n) => {
  const { transform: s = "none" } = getComputedStyle(t);
  return Im(s, n);
};
function g3(t) {
  return parseFloat(t.trim());
}
const $r = [
  "transformPerspective",
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY"
], Kr = /* @__PURE__ */ new Set([...$r, "pathRotation"]), zx = (t) => t === Fr || t === xt, y3 = /* @__PURE__ */ new Set(["x", "y", "z"]), v3 = $r.filter((t) => !y3.has(t));
function x3(t) {
  const n = [];
  return v3.forEach((s) => {
    const r = t.getValue(s);
    r !== void 0 && (n.push([s, r.get()]), r.set(s.startsWith("scale") ? 1 : 0));
  }), n;
}
const Rs = {
  // Dimensions
  width: ({ x: t }, { paddingLeft: n = "0", paddingRight: s = "0", boxSizing: r }) => {
    const o = t.max - t.min;
    return r === "border-box" ? o : o - parseFloat(n) - parseFloat(s);
  },
  height: ({ y: t }, { paddingTop: n = "0", paddingBottom: s = "0", boxSizing: r }) => {
    const o = t.max - t.min;
    return r === "border-box" ? o : o - parseFloat(n) - parseFloat(s);
  },
  top: (t, { top: n }) => parseFloat(n),
  left: (t, { left: n }) => parseFloat(n),
  bottom: ({ y: t }, { top: n }) => parseFloat(n) + (t.max - t.min),
  right: ({ x: t }, { left: n }) => parseFloat(n) + (t.max - t.min),
  // Transform
  x: (t, { transform: n }) => Im(n, "x"),
  y: (t, { transform: n }) => Im(n, "y")
};
Rs.translateX = Rs.x;
Rs.translateY = Rs.y;
const ya = /* @__PURE__ */ new Set();
let Fm = !1, $m = !1, Km = !1;
function M2() {
  if ($m) {
    const t = Array.from(ya).filter((r) => r.needsMeasurement), n = new Set(t.map((r) => r.element)), s = /* @__PURE__ */ new Map();
    n.forEach((r) => {
      const o = x3(r);
      o.length && (s.set(r, o), r.render());
    }), t.forEach((r) => r.measureInitialState()), n.forEach((r) => {
      r.render();
      const o = s.get(r);
      o && o.forEach(([u, c]) => {
        r.getValue(u)?.set(c);
      });
    }), t.forEach((r) => r.measureEndState()), t.forEach((r) => {
      r.suspendedScrollY !== void 0 && window.scrollTo(0, r.suspendedScrollY);
    });
  }
  $m = !1, Fm = !1, ya.forEach((t) => t.complete(Km)), ya.clear();
}
function A2() {
  ya.forEach((t) => {
    t.readKeyframes(), t.needsMeasurement && ($m = !0);
  });
}
function b3() {
  Km = !0, A2(), M2(), Km = !1;
}
class Pp {
  constructor(n, s, r, o, u, c = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = s, this.name = r, this.motionValue = o, this.element = u, this.isAsync = c;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (ya.add(this), Fm || (Fm = !0, re.read(A2), re.resolveKeyframes(M2))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: s, element: r, motionValue: o } = this;
    if (n[0] === null) {
      const u = o?.get(), c = n[n.length - 1];
      if (u !== void 0)
        n[0] = u;
      else if (r && s) {
        const d = r.readValue(s, c);
        d != null && (n[0] = d);
      }
      n[0] === void 0 && (n[0] = c), o && u === void 0 && o.set(n[0]);
    }
    d3(n);
  }
  setFinalKeyframe() {
  }
  measureInitialState() {
  }
  renderEndStyles() {
  }
  measureEndState() {
  }
  complete(n = !1) {
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), ya.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (ya.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const T3 = (t) => t.startsWith("--");
function C2(t, n, s) {
  T3(n) ? t.style.setProperty(n, s) : t.style[n] = s;
}
const S3 = {};
function _2(t, n) {
  const s = /* @__PURE__ */ $S(t);
  return () => S3[n] ?? s();
}
const M3 = /* @__PURE__ */ _2(() => window.ScrollTimeline !== void 0, "scrollTimeline"), E2 = /* @__PURE__ */ _2(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), Zo = ([t, n, s, r]) => `cubic-bezier(${t}, ${n}, ${s}, ${r})`, kx = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ Zo([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ Zo([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ Zo([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ Zo([0.33, 1.53, 0.69, 0.99])
};
function w2(t, n) {
  if (t)
    return typeof t == "function" ? E2() ? g2(t, n) : "ease-out" : /* @__PURE__ */ r2(t) ? Zo(t) : Array.isArray(t) ? t.map((s) => w2(s, n) || kx.easeOut) : kx[t];
}
function A3(t, n, s, { delay: r = 0, duration: o = 300, repeat: u = 0, repeatType: c = "loop", ease: d = "easeOut", times: p } = {}, h = void 0) {
  const g = {
    [n]: s
  };
  p && (g.offset = p);
  const y = w2(d, o);
  Array.isArray(y) && (g.easing = y);
  const x = {
    delay: r,
    duration: o,
    easing: Array.isArray(y) ? "linear" : y,
    fill: "both",
    iterations: u + 1,
    direction: c === "reverse" ? "alternate" : "normal"
  };
  return h && (x.pseudoElement = h), t.animate(g, x);
}
function Ip(t) {
  return typeof t == "function" && "applyToOptions" in t;
}
function C3({ type: t, ...n }) {
  return Ip(t) && E2() ? t.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class D2 extends Xp {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: s, name: r, keyframes: o, pseudoElement: u, allowFlatten: c = !1, finalKeyframe: d, onComplete: p } = n;
    this.isPseudoElement = !!u, this.allowFlatten = c, this.options = n, Fc(typeof n.type != "string");
    const h = C3(n);
    this.animation = A3(s, r, o, h, u), h.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !u) {
        const g = $c(o, this.options, d, this.speed);
        this.updateMotionValue && this.updateMotionValue(g), C2(s, r, g), this.animation.cancel();
      }
      p?.(), this.notifyFinished();
    };
  }
  play() {
    this.isStopped || (this.manualStartTime = null, this.animation.play(), this.state === "finished" && this.updateFinished());
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    this.animation.finish?.();
  }
  cancel() {
    try {
      this.animation.cancel();
    } catch {
    }
  }
  stop() {
    if (this.isStopped)
      return;
    this.isStopped = !0;
    const { state: n } = this;
    n === "idle" || n === "finished" || (this.updateMotionValue ? this.updateMotionValue() : this.commitStyles(), this.isPseudoElement || this.cancel());
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * In this method, we commit styles back to the DOM before cancelling
   * the animation.
   *
   * This is designed to be overridden by NativeAnimationExtended, which
   * will create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to also correctly calculate velocity for any subsequent animation
   * while deferring the commit until the next animation frame.
   */
  commitStyles() {
    const n = this.options?.element;
    !this.isPseudoElement && n?.isConnected && this.animation.commitStyles?.();
  }
  get duration() {
    const n = this.animation.effect?.getComputedTiming?.().duration || 0;
    return /* @__PURE__ */ Qn(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Qn(n);
  }
  get time() {
    return /* @__PURE__ */ Qn(Number(this.animation.currentTime) || 0);
  }
  set time(n) {
    const s = this.finishedTime !== null;
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ Cn(n), s && this.animation.pause();
  }
  /**
   * The playback speed of the animation.
   * 1 = normal speed, 2 = double speed, 0.5 = half speed.
   */
  get speed() {
    return this.animation.playbackRate;
  }
  set speed(n) {
    n < 0 && (this.finishedTime = null), this.animation.playbackRate = n;
  }
  get state() {
    return this.finishedTime !== null ? "finished" : this.animation.playState;
  }
  get startTime() {
    return this.manualStartTime ?? Number(this.animation.startTime);
  }
  set startTime(n) {
    this.manualStartTime = this.animation.startTime = n;
  }
  /**
   * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
   */
  attachTimeline({ timeline: n, rangeStart: s, rangeEnd: r, observe: o }) {
    return this.allowFlatten && this.animation.effect?.updateTiming({ easing: "linear" }), this.animation.onfinish = null, n && M3() ? (this.animation.timeline = n, s && (this.animation.rangeStart = s), r && (this.animation.rangeEnd = r), Jn) : o(this);
  }
}
const j2 = {
  anticipate: t2,
  backInOut: WS,
  circInOut: n2
};
function _3(t) {
  return t in j2;
}
function E3(t) {
  typeof t.ease == "string" && _3(t.ease) && (t.ease = j2[t.ease]);
}
const nm = 10;
class w3 extends D2 {
  constructor(n) {
    E3(n), S2(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * Rather than read committed styles back out of the DOM, we can
   * create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to calculate velocity for any subsequent animation.
   */
  updateMotionValue(n) {
    const { motionValue: s, onUpdate: r, onComplete: o, element: u, ...c } = this.options;
    if (!s)
      return;
    if (n !== void 0) {
      s.set(n);
      return;
    }
    const d = new fl({
      ...c,
      autoplay: !1
    }), p = Math.max(nm, mn.now() - this.startTime), h = Ai(0, nm, p - nm), g = d.sample(p).value, { name: y } = this.options;
    u && y && C2(u, y, g), s.setWithVelocity(d.sample(Math.max(0, p - h)).value, g, h), d.stop();
  }
}
const Lx = (t, n) => n === "zIndex" ? !1 : !!(typeof t == "number" || Array.isArray(t) || typeof t == "string" && // It's animatable if we have a string
(ci.test(t) || t === "0") && // And it contains numbers and/or colors
!t.startsWith("url("));
function D3(t) {
  const n = t[0];
  if (t.length === 1)
    return !0;
  for (let s = 0; s < t.length; s++)
    if (t[s] !== n)
      return !0;
}
function j3(t, n, s, r) {
  const o = t[0];
  if (o === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const u = t[t.length - 1], c = Lx(o, n), d = Lx(u, n);
  return !c || !d ? !1 : D3(t) || (s === "spring" || Ip(s)) && r;
}
function Zm(t) {
  t.duration = 0, t.type = "keyframes";
}
const N2 = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform",
  "backgroundColor"
]), N3 = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function R3(t) {
  for (let n = 0; n < t.length; n++)
    if (typeof t[n] == "string" && N3.test(t[n]))
      return !0;
  return !1;
}
const O3 = /* @__PURE__ */ new Set([
  "color",
  "backgroundColor",
  "outlineColor",
  "fill",
  "stroke",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor"
]), z3 = /* @__PURE__ */ $S(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function k3(t) {
  const { motionValue: n, name: s, repeatDelay: r, repeatType: o, damping: u, type: c, keyframes: d } = t, p = n?.owner?.current;
  if (!(p instanceof HTMLElement) && !(p instanceof SVGElement))
    return !1;
  const { onUpdate: h, transformTemplate: g } = n.owner.getProps();
  return z3() && s && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (N2.has(s) || O3.has(s) && R3(d)) && (s !== "transform" || !g) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !h && !r && o !== "mirror" && u !== 0 && c !== "inertia";
}
const L3 = 40;
class U3 extends Xp {
  constructor({ autoplay: n = !0, delay: s = 0, type: r = "keyframes", repeat: o = 0, repeatDelay: u = 0, repeatType: c = "loop", keyframes: d, name: p, motionValue: h, element: g, ...y }) {
    super(), this.stop = () => {
      this._animation && (this._animation.stop(), this.stopTimeline?.()), this.keyframeResolver?.cancel();
    }, this.createdAt = mn.now();
    const x = {
      autoplay: n,
      delay: s,
      type: r,
      repeat: o,
      repeatDelay: u,
      repeatType: c,
      name: p,
      motionValue: h,
      element: g,
      ...y
    }, T = g?.KeyframeResolver || Pp;
    this.keyframeResolver = new T(d, (S, A, C) => this.onKeyframesResolved(S, A, x, !C), p, h, g), this.keyframeResolver?.scheduleResolve();
  }
  onKeyframesResolved(n, s, r, o) {
    this.keyframeResolver = void 0;
    const { name: u, type: c, velocity: d, delay: p, isHandoff: h, onUpdate: g } = r;
    this.resolvedAt = mn.now();
    let y = !0;
    j3(n, u, c, d) || (y = !1, (ks.instantAnimations || !p) && g?.($c(n, r, s)), n[0] = n[n.length - 1], Zm(r), r.repeat = 0);
    const T = {
      startTime: o ? this.resolvedAt ? this.resolvedAt - this.createdAt > L3 ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: s,
      ...r,
      keyframes: n
    }, S = y && !h && k3(T), A = T.motionValue?.owner?.current;
    let C;
    if (S)
      try {
        C = new w3({
          ...T,
          element: A
        });
      } catch {
        C = new fl(T);
      }
    else
      C = new fl(T);
    C.finished.then(() => {
      this.notifyFinished();
    }).catch(Jn), this.pendingTimeline && (this.stopTimeline = C.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = C;
  }
  get finished() {
    return this._animation ? this.animation.finished : this._finished;
  }
  then(n, s) {
    return this.finished.finally(n).then(() => {
    });
  }
  get animation() {
    return this._animation || (this.keyframeResolver?.resume(), b3()), this._animation;
  }
  get duration() {
    return this.animation.duration;
  }
  get iterationDuration() {
    return this.animation.iterationDuration;
  }
  get time() {
    return this.animation.time;
  }
  set time(n) {
    this.animation.time = n;
  }
  get speed() {
    return this.animation.speed;
  }
  get state() {
    return this.animation.state;
  }
  set speed(n) {
    this.animation.speed = n;
  }
  get startTime() {
    return this.animation.startTime;
  }
  attachTimeline(n) {
    return this._animation ? this.stopTimeline = this.animation.attachTimeline(n) : this.pendingTimeline = n, () => this.stop();
  }
  play() {
    this.animation.play();
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    this.animation.complete();
  }
  cancel() {
    this._animation && this.animation.cancel(), this.keyframeResolver?.cancel();
  }
}
class V3 {
  constructor(n) {
    this.stop = () => this.runAll("stop"), this.animations = n.filter(Boolean);
  }
  get finished() {
    return Promise.all(this.animations.map((n) => n.finished));
  }
  /**
   * TODO: Filter out cancelled or stopped animations before returning
   */
  getAll(n) {
    return this.animations[0][n];
  }
  setAll(n, s) {
    for (let r = 0; r < this.animations.length; r++)
      this.animations[r][n] = s;
  }
  attachTimeline(n) {
    const s = this.animations.map((r) => r.attachTimeline(n));
    return () => {
      s.forEach((r, o) => {
        r && r(), this.animations[o].stop();
      });
    };
  }
  get time() {
    return this.getAll("time");
  }
  set time(n) {
    this.setAll("time", n);
  }
  get speed() {
    return this.getAll("speed");
  }
  set speed(n) {
    this.setAll("speed", n);
  }
  get state() {
    return this.getAll("state");
  }
  get startTime() {
    return this.getAll("startTime");
  }
  get duration() {
    return Ux(this.animations, "duration");
  }
  get iterationDuration() {
    return Ux(this.animations, "iterationDuration");
  }
  runAll(n) {
    this.animations.forEach((s) => s[n]());
  }
  play() {
    this.runAll("play");
  }
  pause() {
    this.runAll("pause");
  }
  cancel() {
    this.runAll("cancel");
  }
  complete() {
    this.runAll("complete");
  }
}
function Ux(t, n) {
  let s = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r][n];
    o !== null && o > s && (s = o);
  }
  return s;
}
class B3 extends V3 {
  then(n, s) {
    return this.finished.finally(n).then(() => {
    });
  }
}
function R2(t, n, s, r = 0, o = 1) {
  const u = Array.from(t).sort((h, g) => h.sortNodePosition(g)).indexOf(n), c = t.size, d = (c - 1) * r;
  return typeof s == "function" ? s(u, c) : o === 1 ? u * r : d - u * r;
}
const Vx = 30, H3 = (t) => !isNaN(parseFloat(t)), el = {
  current: void 0
};
class Y3 {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(n, s = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (r) => {
      const o = mn.now();
      if (this.updatedAt !== o && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(r), this.current !== this.prev && (this.events.change?.notify(this.current), this.dependents))
        for (const u of this.dependents)
          u.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = s.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = mn.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = H3(this.current));
  }
  setPrevFrameValue(n = this.current) {
    this.prevFrameValue = n, this.prevUpdatedAt = this.updatedAt;
  }
  /**
   * Adds a function that will be notified when the `MotionValue` is updated.
   *
   * It returns a function that, when called, will cancel the subscription.
   *
   * When calling `onChange` inside a React component, it should be wrapped with the
   * `useEffect` hook. As it returns an unsubscribe function, this should be returned
   * from the `useEffect` function to ensure you don't add duplicate subscribers..
   *
   * ```jsx
   * export const MyComponent = () => {
   *   const x = useMotionValue(0)
   *   const y = useMotionValue(0)
   *   const opacity = useMotionValue(1)
   *
   *   useEffect(() => {
   *     function updateOpacity() {
   *       const maxXY = Math.max(x.get(), y.get())
   *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
   *       opacity.set(newOpacity)
   *     }
   *
   *     const unsubscribeX = x.on("change", updateOpacity)
   *     const unsubscribeY = y.on("change", updateOpacity)
   *
   *     return () => {
   *       unsubscribeX()
   *       unsubscribeY()
   *     }
   *   }, [])
   *
   *   return <motion.div style={{ x }} />
   * }
   * ```
   *
   * @param subscriber - A function that receives the latest value.
   * @returns A function that, when called, will cancel this subscription.
   *
   * @deprecated
   */
  onChange(n) {
    return this.on("change", n);
  }
  on(n, s) {
    this.events[n] || (this.events[n] = new kp());
    const r = this.events[n].add(s);
    return n === "change" ? () => {
      r(), re.read(() => {
        this.events.change.getSize() || this.stop();
      });
    } : r;
  }
  clearListeners() {
    for (const n in this.events)
      this.events[n].clear();
  }
  /**
   * Attaches a passive effect to the `MotionValue`.
   */
  attach(n, s) {
    this.passiveEffect = n, this.stopPassiveEffect = s;
  }
  /**
   * Sets the state of the `MotionValue`.
   *
   * @remarks
   *
   * ```jsx
   * const x = useMotionValue(0)
   * x.set(10)
   * ```
   *
   * @param latest - Latest value to set.
   * @param render - Whether to notify render subscribers. Defaults to `true`
   *
   * @public
   */
  set(n) {
    this.passiveEffect ? this.passiveEffect(n, this.updateAndNotify) : this.updateAndNotify(n);
  }
  setWithVelocity(n, s, r) {
    this.set(s), this.prev = void 0, this.prevFrameValue = n, this.prevUpdatedAt = this.updatedAt - r;
  }
  /**
   * Set the state of the `MotionValue`, stopping any active animations,
   * effects, and resets velocity to `0`.
   */
  jump(n, s = !0) {
    this.updateAndNotify(n), this.prev = n, this.prevUpdatedAt = this.prevFrameValue = void 0, s && this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
  dirty() {
    this.events.change?.notify(this.current);
  }
  addDependent(n) {
    this.dependents || (this.dependents = /* @__PURE__ */ new Set()), this.dependents.add(n);
  }
  removeDependent(n) {
    this.dependents && this.dependents.delete(n);
  }
  /**
   * Returns the latest state of `MotionValue`
   *
   * @returns - The latest state of `MotionValue`
   *
   * @public
   */
  get() {
    return el.current && el.current.push(this), this.current;
  }
  /**
   * @public
   */
  getPrevious() {
    return this.prev;
  }
  /**
   * Returns the latest velocity of `MotionValue`
   *
   * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
   *
   * @public
   */
  getVelocity() {
    const n = mn.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Vx)
      return 0;
    const s = Math.min(this.updatedAt - this.prevUpdatedAt, Vx);
    return /* @__PURE__ */ KS(parseFloat(this.current) - parseFloat(this.prevFrameValue), s);
  }
  /**
   * Registers a new animation to control this `MotionValue`. Only one
   * animation can drive a `MotionValue` at one time.
   *
   * ```jsx
   * value.start()
   * ```
   *
   * @param animation - A function that starts the provided animation
   */
  start(n) {
    return this.stop(), new Promise((s) => {
      this.hasAnimated = !0, this.animation = n(s), this.events.animationStart && this.events.animationStart.notify();
    }).then(() => {
      this.events.animationComplete && this.events.animationComplete.notify(), this.clearAnimation();
    });
  }
  /**
   * Stop the currently active animation.
   *
   * @public
   */
  stop() {
    this.animation && (this.animation.stop(), this.events.animationCancel && this.events.animationCancel.notify()), this.clearAnimation();
  }
  /**
   * Returns `true` if this value is currently animating.
   *
   * @public
   */
  isAnimating() {
    return !!this.animation;
  }
  clearAnimation() {
    delete this.animation;
  }
  /**
   * Destroy and clean up subscribers to this `MotionValue`.
   *
   * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
   * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
   * created a `MotionValue` via the `motionValue` function.
   *
   * @public
   */
  destroy() {
    this.dependents?.clear(), this.events.destroy?.notify(), this.clearListeners(), this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
}
function Ls(t, n) {
  return new Y3(t, n);
}
function O2(t, n) {
  if (t?.inherit && n) {
    const { inherit: s, ...r } = t;
    return { ...n, ...r };
  }
  return t;
}
function Fp(t, n) {
  const s = t?.[n] ?? t?.default ?? t;
  return s !== t ? O2(s, t) : s;
}
const G3 = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, q3 = (t) => ({
  type: "spring",
  stiffness: 550,
  damping: t === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), X3 = {
  type: "keyframes",
  duration: 0.8
}, P3 = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, I3 = (t, { keyframes: n }) => n.length > 2 ? X3 : Kr.has(t) ? t.startsWith("scale") ? q3(n[1]) : G3 : P3, F3 = /* @__PURE__ */ new Set([
  "when",
  "delay",
  "delayChildren",
  "staggerChildren",
  "staggerDirection",
  "repeat",
  "repeatType",
  "repeatDelay",
  "from",
  "elapsed"
]);
function $3(t) {
  for (const n in t)
    if (!F3.has(n))
      return !0;
  return !1;
}
const $p = (t, n, s, r = {}, o, u) => (c) => {
  const d = Fp(r, t) || {}, p = d.delay || r.delay || 0;
  let { elapsed: h = 0 } = r;
  h = h - /* @__PURE__ */ Cn(p);
  const g = {
    keyframes: Array.isArray(s) ? s : [null, s],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...d,
    delay: -h,
    onUpdate: (x) => {
      n.set(x), d.onUpdate && d.onUpdate(x);
    },
    onComplete: () => {
      c(), d.onComplete && d.onComplete();
    },
    name: t,
    motionValue: n,
    element: u ? void 0 : o
  };
  $3(d) || Object.assign(g, I3(t, g)), g.duration && (g.duration = /* @__PURE__ */ Cn(g.duration)), g.repeatDelay && (g.repeatDelay = /* @__PURE__ */ Cn(g.repeatDelay)), g.from !== void 0 && (g.keyframes[0] = g.from);
  let y = !1;
  if ((g.type === !1 || g.duration === 0 && !g.repeatDelay) && (Zm(g), g.delay === 0 && (y = !0)), (ks.instantAnimations || ks.skipAnimations || o?.shouldSkipAnimations || d.skipAnimations) && (y = !0, Zm(g), g.delay = 0), g.allowFlatten = !d.type && !d.ease, y && !u && n.get() !== void 0) {
    const x = $c(g.keyframes, d);
    if (x !== void 0) {
      re.update(() => {
        g.onUpdate(x), g.onComplete();
      });
      return;
    }
  }
  return d.isSync ? new fl(g) : new U3(g);
}, K3 = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function Z3(t) {
  const n = K3.exec(t);
  if (!n)
    return [,];
  const [, s, r, o] = n;
  return [`--${s ?? r}`, o];
}
function z2(t, n, s = 1) {
  const [r, o] = Z3(t);
  if (!r)
    return;
  const u = window.getComputedStyle(n).getPropertyValue(r);
  if (u) {
    const c = u.trim();
    return PS(c) ? parseFloat(c) : c;
  }
  return Bp(o) ? z2(o, n, s + 1) : o;
}
function Bx(t) {
  const n = [{}, {}];
  return t?.values.forEach((s, r) => {
    n[0][r] = s.get(), n[1][r] = s.getVelocity();
  }), n;
}
function Kp(t, n, s, r) {
  if (typeof n == "function") {
    const [o, u] = Bx(r);
    n = n(s !== void 0 ? s : t.custom, o, u);
  }
  if (typeof n == "string" && (n = t.variants && t.variants[n]), typeof n == "function") {
    const [o, u] = Bx(r);
    n = n(s !== void 0 ? s : t.custom, o, u);
  }
  return n;
}
function va(t, n, s) {
  const r = t.getProps();
  return Kp(r, n, s !== void 0 ? s : r.custom, t);
}
const k2 = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...$r
]), Qm = (t) => Array.isArray(t);
function Q3(t, n, s) {
  t.hasValue(n) ? t.getValue(n).set(s) : t.addValue(n, Ls(s));
}
function J3(t) {
  return Qm(t) ? t[t.length - 1] || 0 : t;
}
function W3(t, n) {
  const s = va(t, n);
  let { transitionEnd: r = {}, transition: o = {}, ...u } = s || {};
  u = { ...u, ...r };
  for (const c in u) {
    const d = J3(u[c]);
    Q3(t, c, d);
  }
}
const De = (t) => !!(t && t.getVelocity);
function tR(t) {
  return !!(De(t) && t.add);
}
function Jm(t, n) {
  const s = t.getValue("willChange");
  if (tR(s))
    return s.add(n);
  if (!s && ks.WillChange) {
    const r = new ks.WillChange("auto");
    t.addValue("willChange", r), r.add(n);
  }
}
function Zp(t) {
  return t.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const eR = "framerAppearId", L2 = "data-" + Zp(eR);
function U2(t) {
  return t.props[L2];
}
const nR = typeof window < "u";
function iR({ protectedKeys: t, needsAnimating: n }, s) {
  const r = t.hasOwnProperty(s) && n[s] !== !0;
  return n[s] = !1, r;
}
function Qp(t, n, { delay: s = 0, transitionOverride: r, type: o } = {}) {
  let { transition: u, transitionEnd: c, ...d } = n;
  const p = t.getDefaultTransition();
  u = u ? O2(u, p) : p;
  const h = u?.reduceMotion, g = u?.skipAnimations;
  r && (u = r);
  const y = [], x = o && t.animationState && t.animationState.getState()[o], T = u?.path;
  T && T.animateVisualElement(t, d, u, s, y);
  for (const S in d) {
    const A = t.getValue(S, t.latestValues[S] ?? null), C = d[S];
    if (C === void 0 || x && iR(x, S))
      continue;
    const N = {
      delay: s,
      ...Fp(u || {}, S)
    };
    g && (N.skipAnimations = !0);
    const R = A.get();
    if (R !== void 0 && !A.isAnimating() && !Array.isArray(C) && C === R && !N.velocity) {
      re.update(() => A.set(C));
      continue;
    }
    let O = !1;
    if (nR && window.MotionHandoffAnimation) {
      const G = U2(t);
      if (G) {
        const X = window.MotionHandoffAnimation(G, S, re);
        X !== null && (N.startTime = X, O = !0);
      }
    }
    Jm(t, S);
    const k = h ?? t.shouldReduceMotion;
    A.start($p(S, A, C, k && k2.has(S) ? { type: !1 } : N, t, O));
    const H = A.animation;
    H && y.push(H);
  }
  if (c) {
    const S = () => re.update(() => {
      c && W3(t, c);
    });
    y.length ? Promise.all(y).then(S) : S();
  }
  return y;
}
function Wm(t, n, s = {}) {
  const r = va(t, n, s.type === "exit" ? t.presenceContext?.custom : void 0);
  let { transition: o = t.getDefaultTransition() || {} } = r || {};
  s.transitionOverride && (o = s.transitionOverride);
  const u = r ? () => Promise.all(Qp(t, r, s)) : () => Promise.resolve(), c = t.variantChildren && t.variantChildren.size ? (p = 0) => {
    const { delayChildren: h = 0, staggerChildren: g, staggerDirection: y } = o;
    return sR(t, n, p, h, g, y, s);
  } : () => Promise.resolve(), { when: d } = o;
  if (d) {
    const [p, h] = d === "beforeChildren" ? [u, c] : [c, u];
    return p().then(() => h());
  } else
    return Promise.all([u(), c(s.delay)]);
}
function sR(t, n, s = 0, r = 0, o = 0, u = 1, c) {
  const d = [];
  for (const p of t.variantChildren)
    p.notify("AnimationStart", n), d.push(Wm(p, n, {
      ...c,
      delay: s + (typeof r == "function" ? 0 : r) + R2(t.variantChildren, p, r, o, u)
    }).then(() => p.notify("AnimationComplete", n)));
  return Promise.all(d);
}
function aR(t, n, s = {}) {
  t.notify("AnimationStart", n);
  let r;
  if (Array.isArray(n)) {
    const o = n.map((u) => Wm(t, u, s));
    r = Promise.all(o);
  } else if (typeof n == "string")
    r = Wm(t, n, s);
  else {
    const o = typeof n == "function" ? va(t, n, s.custom) : n;
    r = Promise.all(Qp(t, o, s));
  }
  return r.then(() => {
    t.notify("AnimationComplete", n);
  });
}
const rR = {
  test: (t) => t === "auto",
  parse: (t) => t
}, V2 = (t) => (n) => n.test(t), B2 = [Fr, xt, Si, Pi, ON, RN, rR], Hx = (t) => B2.find(V2(t));
function oR(t) {
  return typeof t == "number" ? t === 0 : t !== null ? t === "none" || t === "0" || FS(t) : !0;
}
const lR = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function uR(t) {
  const [n, s] = t.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return t;
  const [r] = s.match(Hp) || [];
  if (!r)
    return t;
  const o = s.replace(r, "");
  let u = lR.has(n) ? 1 : 0;
  return r !== s && (u *= 100), n + "(" + u + o + ")";
}
const cR = /\b([a-z-]*)\(.*?\)/gu, tp = {
  ...ci,
  getAnimatableNone: (t) => {
    const n = t.match(cR);
    return n ? n.map(uR).join(" ") : t;
  }
}, ep = {
  ...ci,
  getAnimatableNone: (t) => {
    const n = ci.parse(t);
    return ci.createTransformer(t)(n.map((r) => typeof r == "number" ? 0 : typeof r == "object" ? { ...r, alpha: 1 } : r));
  }
}, Yx = {
  ...Fr,
  transform: Math.round
}, fR = {
  rotate: Pi,
  /**
   * Internal channel for `transition.path` orientToPath. Composed onto
   * `rotate` at the transform-build sites so the user's `rotate` is
   * never read or overwritten. Not part of `transformPropOrder`.
   */
  pathRotation: Pi,
  rotateX: Pi,
  rotateY: Pi,
  rotateZ: Pi,
  scale: qu,
  scaleX: qu,
  scaleY: qu,
  scaleZ: qu,
  skew: Pi,
  skewX: Pi,
  skewY: Pi,
  distance: xt,
  translateX: xt,
  translateY: xt,
  translateZ: xt,
  x: xt,
  y: xt,
  z: xt,
  perspective: xt,
  transformPerspective: xt,
  opacity: ul,
  originX: _x,
  originY: _x,
  originZ: xt
}, wc = {
  // Border props
  borderWidth: xt,
  borderTopWidth: xt,
  borderRightWidth: xt,
  borderBottomWidth: xt,
  borderLeftWidth: xt,
  borderRadius: xt,
  borderTopLeftRadius: xt,
  borderTopRightRadius: xt,
  borderBottomRightRadius: xt,
  borderBottomLeftRadius: xt,
  // Positioning props
  width: xt,
  maxWidth: xt,
  height: xt,
  maxHeight: xt,
  top: xt,
  right: xt,
  bottom: xt,
  left: xt,
  inset: xt,
  insetBlock: xt,
  insetBlockStart: xt,
  insetBlockEnd: xt,
  insetInline: xt,
  insetInlineStart: xt,
  insetInlineEnd: xt,
  // Spacing props
  padding: xt,
  paddingTop: xt,
  paddingRight: xt,
  paddingBottom: xt,
  paddingLeft: xt,
  paddingBlock: xt,
  paddingBlockStart: xt,
  paddingBlockEnd: xt,
  paddingInline: xt,
  paddingInlineStart: xt,
  paddingInlineEnd: xt,
  margin: xt,
  marginTop: xt,
  marginRight: xt,
  marginBottom: xt,
  marginLeft: xt,
  marginBlock: xt,
  marginBlockStart: xt,
  marginBlockEnd: xt,
  marginInline: xt,
  marginInlineStart: xt,
  marginInlineEnd: xt,
  // Typography
  fontSize: xt,
  // Misc
  backgroundPositionX: xt,
  backgroundPositionY: xt,
  ...fR,
  zIndex: Yx,
  // SVG
  fillOpacity: ul,
  strokeOpacity: ul,
  numOctaves: Yx
}, dR = {
  ...wc,
  // Color props
  color: Le,
  backgroundColor: Le,
  outlineColor: Le,
  fill: Le,
  stroke: Le,
  // Border props
  borderColor: Le,
  borderTopColor: Le,
  borderRightColor: Le,
  borderBottomColor: Le,
  borderLeftColor: Le,
  filter: tp,
  WebkitFilter: tp,
  mask: ep,
  WebkitMask: ep
}, H2 = (t) => dR[t], hR = /* @__PURE__ */ new Set([tp, ep]);
function Y2(t, n) {
  let s = H2(t);
  return hR.has(s) || (s = ci), s.getAnimatableNone ? s.getAnimatableNone(n) : void 0;
}
const mR = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function pR(t, n, s) {
  let r = 0, o;
  for (; r < t.length && !o; ) {
    const u = t[r];
    typeof u == "string" && !mR.has(u) && Vr(u).values.length && (o = t[r]), r++;
  }
  if (o && s)
    for (const u of n)
      t[u] = Y2(s, o);
}
class gR extends Pp {
  constructor(n, s, r, o, u) {
    super(n, s, r, o, u, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: s, name: r } = this;
    if (!s || !s.current)
      return;
    super.readKeyframes();
    for (let g = 0; g < n.length; g++) {
      let y = n[g];
      if (typeof y == "string" && (y = y.trim(), Bp(y))) {
        const x = z2(y, s.current);
        x !== void 0 && (n[g] = x), g === n.length - 1 && (this.finalKeyframe = y);
      }
    }
    if (this.resolveNoneKeyframes(), !k2.has(r) || n.length !== 2)
      return;
    const [o, u] = n, c = Hx(o), d = Hx(u), p = Cx(o), h = Cx(u);
    if (p !== h && Rs[r]) {
      this.needsMeasurement = !0;
      return;
    }
    if (c !== d)
      if (zx(c) && zx(d))
        for (let g = 0; g < n.length; g++) {
          const y = n[g];
          typeof y == "string" && (n[g] = parseFloat(y));
        }
      else Rs[r] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: s } = this, r = [];
    for (let o = 0; o < n.length; o++)
      (n[o] === null || oR(n[o])) && r.push(o);
    r.length && pR(n, r, s);
  }
  measureInitialState() {
    const { element: n, unresolvedKeyframes: s, name: r } = this;
    if (!n || !n.current)
      return;
    r === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Rs[r](n.measureViewportBox(), window.getComputedStyle(n.current)), s[0] = this.measuredOrigin;
    const o = s[s.length - 1];
    o !== void 0 && n.getValue(r, o).jump(o, !1);
  }
  measureEndState() {
    const { element: n, name: s, unresolvedKeyframes: r } = this;
    if (!n || !n.current)
      return;
    const o = n.getValue(s);
    o && o.jump(this.measuredOrigin, !1);
    const u = r.length - 1, c = r[u];
    r[u] = Rs[s](n.measureViewportBox(), window.getComputedStyle(n.current)), c !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = c), this.removedTransforms?.length && this.removedTransforms.forEach(([d, p]) => {
      n.getValue(d).set(p);
    }), this.resolveNoneKeyframes();
  }
}
const Jp = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function Wp(t, n, s) {
  if (t == null)
    return [];
  if (t instanceof EventTarget)
    return [t];
  if (typeof t == "string") {
    let r = document;
    n && (r = n.current);
    const o = s?.[t] ?? r.querySelectorAll(t);
    return o ? Array.from(o) : [];
  }
  return Array.from(t).filter((r) => r != null);
}
const np = (t, n) => n && typeof t == "number" ? n.transform(t) : t;
function yR(t) {
  return IS(t) && "offsetHeight" in t && !("ownerSVGElement" in t);
}
const { schedule: t0 } = /* @__PURE__ */ o2(queueMicrotask, !1), si = {
  x: !1,
  y: !1
};
function G2() {
  return si.x || si.y;
}
function vR(t) {
  return t === "x" || t === "y" ? si[t] ? null : (si[t] = !0, () => {
    si[t] = !1;
  }) : si.x || si.y ? null : (si.x = si.y = !0, () => {
    si.x = si.y = !1;
  });
}
function q2(t, n) {
  const s = Wp(t), r = new AbortController(), o = {
    passive: !0,
    ...n,
    signal: r.signal
  };
  return [s, o, () => r.abort()];
}
function xR(t) {
  return !(t.pointerType === "touch" || G2());
}
function bR(t, n, s = {}) {
  const [r, o, u] = q2(t, s);
  return r.forEach((c) => {
    let d = !1, p = !1, h;
    const g = () => {
      c.removeEventListener("pointerleave", S);
    }, y = (C) => {
      h && (h(C), h = void 0), g();
    }, x = (C) => {
      d = !1, window.removeEventListener("pointerup", x), window.removeEventListener("pointercancel", x), p && (p = !1, y(C));
    }, T = () => {
      d = !0, window.addEventListener("pointerup", x, o), window.addEventListener("pointercancel", x, o);
    }, S = (C) => {
      if (C.pointerType !== "touch") {
        if (d) {
          p = !0;
          return;
        }
        y(C);
      }
    }, A = (C) => {
      if (!xR(C))
        return;
      p = !1;
      const N = n(c, C);
      typeof N == "function" && (h = N, c.addEventListener("pointerleave", S, o));
    };
    c.addEventListener("pointerenter", A, o), c.addEventListener("pointerdown", T, o);
  }), u;
}
const X2 = (t, n) => n ? t === n ? !0 : X2(t, n.parentElement) : !1, e0 = (t) => t.pointerType === "mouse" ? typeof t.button != "number" || t.button <= 0 : t.isPrimary !== !1, TR = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function SR(t) {
  return TR.has(t.tagName) || t.isContentEditable === !0;
}
const MR = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function AR(t) {
  return MR.has(t.tagName) || t.isContentEditable === !0;
}
const ec = /* @__PURE__ */ new WeakSet();
function Gx(t) {
  return (n) => {
    n.key === "Enter" && t(n);
  };
}
function im(t, n) {
  t.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const CR = (t, n) => {
  const s = t.currentTarget;
  if (!s)
    return;
  const r = Gx(() => {
    if (ec.has(s))
      return;
    im(s, "down");
    const o = Gx(() => {
      im(s, "up");
    }), u = () => im(s, "cancel");
    s.addEventListener("keyup", o, n), s.addEventListener("blur", u, n);
  });
  s.addEventListener("keydown", r, n), s.addEventListener("blur", () => s.removeEventListener("keydown", r), n);
};
function qx(t) {
  return e0(t) && !G2();
}
const Xx = /* @__PURE__ */ new WeakSet();
function _R(t, n, s = {}) {
  const [r, o, u] = q2(t, s), c = (d) => {
    const p = d.currentTarget;
    if (!qx(d) || Xx.has(d))
      return;
    ec.add(p), s.stopPropagation && Xx.add(d);
    const h = n(p, d), g = { ...o, capture: !0 }, y = (S, A) => {
      window.removeEventListener("pointerup", x, g), window.removeEventListener("pointercancel", T, g), ec.has(p) && ec.delete(p), qx(S) && typeof h == "function" && h(S, { success: A });
    }, x = (S) => {
      y(S, p === window || p === document || s.useGlobalTarget || X2(p, S.target));
    }, T = (S) => {
      y(S, !1);
    };
    window.addEventListener("pointerup", x, g), window.addEventListener("pointercancel", T, g);
  };
  return r.forEach((d) => {
    (s.useGlobalTarget ? window : d).addEventListener("pointerdown", c, o), yR(d) && (d.addEventListener("focus", (h) => CR(h, o)), !SR(d) && !d.hasAttribute("tabindex") && (d.tabIndex = 0));
  }), u;
}
function Kc(t) {
  return IS(t) && "ownerSVGElement" in t;
}
const nc = /* @__PURE__ */ new WeakMap();
let ic;
const P2 = (t, n, s) => (r, o) => o && o[0] ? o[0][t + "Size"] : Kc(r) && "getBBox" in r ? r.getBBox()[n] : r[s], ER = /* @__PURE__ */ P2("inline", "width", "offsetWidth"), wR = /* @__PURE__ */ P2("block", "height", "offsetHeight");
function DR({ target: t, borderBoxSize: n }) {
  nc.get(t)?.forEach((s) => {
    s(t, {
      get width() {
        return ER(t, n);
      },
      get height() {
        return wR(t, n);
      }
    });
  });
}
function jR(t) {
  t.forEach(DR);
}
function NR() {
  typeof ResizeObserver > "u" || (ic = new ResizeObserver(jR));
}
function RR(t, n) {
  ic || NR();
  const s = Wp(t);
  return s.forEach((r) => {
    let o = nc.get(r);
    o || (o = /* @__PURE__ */ new Set(), nc.set(r, o)), o.add(n), ic?.observe(r);
  }), () => {
    s.forEach((r) => {
      const o = nc.get(r);
      o?.delete(n), o?.size || ic?.unobserve(r);
    });
  };
}
const sc = /* @__PURE__ */ new Set();
let Ar;
function OR() {
  Ar = () => {
    const t = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    sc.forEach((n) => n(t));
  }, window.addEventListener("resize", Ar);
}
function zR(t) {
  return sc.add(t), Ar || OR(), () => {
    sc.delete(t), !sc.size && typeof Ar == "function" && (window.removeEventListener("resize", Ar), Ar = void 0);
  };
}
function Px(t, n) {
  return typeof t == "function" ? zR(t) : RR(t, n);
}
function I2(t) {
  return Kc(t) && t.tagName === "svg";
}
function kR(...t) {
  const n = !Array.isArray(t[0]), s = n ? 0 : -1, r = t[0 + s], o = t[1 + s], u = t[2 + s], c = t[3 + s], d = x2(o, u, c);
  return n ? d(r) : d;
}
function LR(t, n, s = {}) {
  const r = t.get();
  let o = null, u = r, c;
  const d = typeof r == "string" ? r.replace(/[\d.-]/g, "") : void 0, p = () => {
    o && (o.stop(), o = null), t.animation = void 0;
  }, h = () => {
    const y = Ix(t.get()), x = Ix(u);
    if (y === x) {
      p();
      return;
    }
    const T = o ? o.getGeneratorVelocity() : t.getVelocity();
    p(), o = new fl({
      keyframes: [y, x],
      velocity: T,
      // Default to spring if no type specified (matches useSpring behavior)
      type: "spring",
      restDelta: 1e-3,
      restSpeed: 0.01,
      ...s,
      onUpdate: c
    });
  }, g = () => {
    h(), t.animation = o ?? void 0, t.events.animationStart?.notify(), o?.then(() => {
      t.animation = void 0, t.events.animationComplete?.notify();
    });
  };
  if (t.attach((y, x) => {
    u = y, c = (T) => x(sm(T, d)), re.postRender(g);
  }, p), De(n)) {
    let y = s.skipInitialAnimation === !0;
    const x = n.on("change", (S) => {
      y ? (y = !1, t.jump(sm(S, d), !1)) : t.set(sm(S, d));
    }), T = t.on("destroy", x);
    return () => {
      x(), T();
    };
  }
  return p;
}
function sm(t, n) {
  return n ? t + n : t;
}
function Ix(t) {
  return typeof t == "number" ? t : parseFloat(t);
}
const UR = [...B2, Le, ci], VR = (t) => UR.find(V2(t)), Fx = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), Cr = () => ({
  x: Fx(),
  y: Fx()
}), $x = () => ({ min: 0, max: 0 }), ke = () => ({
  x: $x(),
  y: $x()
}), dl = /* @__PURE__ */ new WeakMap();
function Zc(t) {
  return t !== null && typeof t == "object" && typeof t.start == "function";
}
function hl(t) {
  return typeof t == "string" || Array.isArray(t);
}
const n0 = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], i0 = ["initial", ...n0];
function Qc(t) {
  return Zc(t.animate) || i0.some((n) => hl(t[n]));
}
function F2(t) {
  return !!(Qc(t) || t.variants);
}
function BR(t, n, s) {
  for (const r in n) {
    const o = n[r], u = s[r];
    if (De(o))
      t.addValue(r, o);
    else if (De(u))
      t.addValue(r, Ls(o, { owner: t }));
    else if (u !== o)
      if (t.hasValue(r)) {
        const c = t.getValue(r);
        c.liveStyle === !0 ? c.jump(o) : c.hasAnimated || c.set(o);
      } else {
        const c = t.getStaticValue(r);
        t.addValue(r, Ls(c !== void 0 ? c : o, { owner: t }));
      }
  }
  for (const r in s)
    n[r] === void 0 && t.removeValue(r);
  return n;
}
const Dc = { current: null }, s0 = { current: !1 }, HR = typeof window < "u";
function $2() {
  if (s0.current = !0, !!HR)
    if (window.matchMedia) {
      const t = window.matchMedia("(prefers-reduced-motion)"), n = () => Dc.current = t.matches;
      t.addEventListener("change", n), n();
    } else
      Dc.current = !1;
}
const Kx = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let jc = {};
function K2(t) {
  jc = t;
}
function YR() {
  return jc;
}
class Z2 {
  /**
   * This method takes React props and returns found MotionValues. For example, HTML
   * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
   *
   * This isn't an abstract method as it needs calling in the constructor, but it is
   * intended to be one.
   */
  scrapeMotionValuesFromProps(n, s, r) {
    return {};
  }
  constructor({ parent: n, props: s, presenceContext: r, reducedMotionConfig: o, skipAnimations: u, blockInitialAnimation: c, visualState: d }, p = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Pp, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const T = mn.now();
      this.renderScheduledAt < T && (this.renderScheduledAt = T, re.render(this.render, !1, !0));
    };
    const { latestValues: h, renderState: g } = d;
    this.latestValues = h, this.baseTarget = { ...h }, this.initialValues = s.initial ? { ...h } : {}, this.renderState = g, this.parent = n, this.props = s, this.presenceContext = r, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = o, this.skipAnimationsConfig = u, this.options = p, this.blockInitialAnimation = !!c, this.isControllingVariants = Qc(s), this.isVariantNode = F2(s), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: y, ...x } = this.scrapeMotionValuesFromProps(s, {}, this);
    for (const T in x) {
      const S = x[T];
      h[T] !== void 0 && De(S) && S.set(h[T]);
    }
  }
  mount(n) {
    if (this.hasBeenMounted)
      for (const s in this.initialValues)
        this.values.get(s)?.jump(this.initialValues[s]), this.latestValues[s] = this.initialValues[s];
    this.current = n, dl.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((s, r) => this.bindToMotionValue(r, s)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (s0.current || $2(), this.shouldReduceMotion = Dc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, this.parent?.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    this.projection && this.projection.unmount(), Wi(this.notifyUpdate), Wi(this.render), this.valueSubscriptions.forEach((n) => n()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), this.parent?.removeChild(this);
    for (const n in this.events)
      this.events[n].clear();
    for (const n in this.features) {
      const s = this.features[n];
      s && (s.unmount(), s.isMounted = !1);
    }
    this.current = null;
  }
  addChild(n) {
    this.children.add(n), this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set()), this.enteringChildren.add(n);
  }
  removeChild(n) {
    this.children.delete(n), this.enteringChildren && this.enteringChildren.delete(n);
  }
  bindToMotionValue(n, s) {
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), s.accelerate && N2.has(n) && this.current instanceof HTMLElement) {
      const { factory: c, keyframes: d, times: p, ease: h, duration: g } = s.accelerate, y = new D2({
        element: this.current,
        name: n,
        keyframes: d,
        times: p,
        ease: h,
        duration: /* @__PURE__ */ Cn(g)
      }), x = c(y);
      this.valueSubscriptions.set(n, () => {
        x(), y.cancel();
      });
      return;
    }
    const r = Kr.has(n);
    r && this.onBindTransform && this.onBindTransform();
    const o = s.on("change", (c) => {
      this.latestValues[n] = c, this.props.onUpdate && re.preRender(this.notifyUpdate), r && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let u;
    typeof window < "u" && window.MotionCheckAppearSync && (u = window.MotionCheckAppearSync(this, n, s)), this.valueSubscriptions.set(n, () => {
      o(), u && u();
    });
  }
  sortNodePosition(n) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== n.type ? 0 : this.sortInstanceNodePosition(this.current, n.current);
  }
  updateFeatures() {
    let n = "animation";
    for (n in jc) {
      const s = jc[n];
      if (!s)
        continue;
      const { isEnabled: r, Feature: o } = s;
      if (!this.features[n] && o && r(this.props) && (this.features[n] = new o(this)), this.features[n]) {
        const u = this.features[n];
        u.isMounted ? u.update() : (u.mount(), u.isMounted = !0);
      }
    }
  }
  triggerBuild() {
    this.build(this.renderState, this.latestValues, this.props);
  }
  /**
   * Measure the current viewport box with or without transforms.
   * Only measures axis-aligned boxes, rotate and skew must be manually
   * removed with a re-render to work.
   */
  measureViewportBox() {
    return this.current ? this.measureInstanceViewportBox(this.current, this.props) : ke();
  }
  getStaticValue(n) {
    return this.latestValues[n];
  }
  setStaticValue(n, s) {
    this.latestValues[n] = s;
  }
  /**
   * Update the provided props. Ensure any newly-added motion values are
   * added to our map, old ones removed, and listeners updated.
   */
  update(n, s) {
    (n.transformTemplate || this.props.transformTemplate) && this.scheduleRender(), this.prevProps = this.props, this.props = n, this.prevPresenceContext = this.presenceContext, this.presenceContext = s;
    for (let r = 0; r < Kx.length; r++) {
      const o = Kx[r];
      this.propEventSubscriptions[o] && (this.propEventSubscriptions[o](), delete this.propEventSubscriptions[o]);
      const u = "on" + o, c = n[u];
      c && (this.propEventSubscriptions[o] = this.on(o, c));
    }
    this.prevMotionValues = BR(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
  }
  getProps() {
    return this.props;
  }
  /**
   * Returns the variant definition with a given name.
   */
  getVariant(n) {
    return this.props.variants ? this.props.variants[n] : void 0;
  }
  /**
   * Returns the defined default transition on this component.
   */
  getDefaultTransition() {
    return this.props.transition;
  }
  getTransformPagePoint() {
    return this.props.transformPagePoint;
  }
  getClosestVariantNode() {
    return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
  }
  /**
   * Add a child visual element to our set of children.
   */
  addVariantChild(n) {
    const s = this.getClosestVariantNode();
    if (s)
      return s.variantChildren && s.variantChildren.add(n), () => s.variantChildren.delete(n);
  }
  /**
   * Add a motion value and bind it to this visual element.
   */
  addValue(n, s) {
    const r = this.values.get(n);
    s !== r && (r && this.removeValue(n), this.bindToMotionValue(n, s), this.values.set(n, s), this.latestValues[n] = s.get());
  }
  /**
   * Remove a motion value and unbind any active subscriptions.
   */
  removeValue(n) {
    this.values.delete(n);
    const s = this.valueSubscriptions.get(n);
    s && (s(), this.valueSubscriptions.delete(n)), delete this.latestValues[n], this.removeValueFromRenderState(n, this.renderState);
  }
  /**
   * Check whether we have a motion value for this key
   */
  hasValue(n) {
    return this.values.has(n);
  }
  getValue(n, s) {
    if (this.props.values && this.props.values[n])
      return this.props.values[n];
    let r = this.values.get(n);
    return r === void 0 && s !== void 0 && (r = Ls(s === null ? void 0 : s, { owner: this }), this.addValue(n, r)), r;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, s) {
    let r = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return r != null && (typeof r == "string" && (PS(r) || FS(r)) ? r = parseFloat(r) : !VR(r) && ci.test(s) && (r = Y2(n, s)), this.setBaseTarget(n, De(r) ? r.get() : r)), De(r) ? r.get() : r;
  }
  /**
   * Set the base target to later animate back to. This is currently
   * only hydrated on creation and when we first read a value.
   */
  setBaseTarget(n, s) {
    this.baseTarget[n] = s;
  }
  /**
   * Find the base target for a value thats been removed from all animation
   * props.
   */
  getBaseTarget(n) {
    const { initial: s } = this.props;
    let r;
    if (typeof s == "string" || typeof s == "object") {
      const u = Kp(this.props, s, this.presenceContext?.custom);
      u && (r = u[n]);
    }
    if (s && r !== void 0)
      return r;
    const o = this.getBaseTargetFromProps(this.props, n);
    return o !== void 0 && !De(o) ? o : this.initialValues[n] !== void 0 && r === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, s) {
    return this.events[n] || (this.events[n] = new kp()), this.events[n].add(s);
  }
  notify(n, ...s) {
    this.events[n] && this.events[n].notify(...s);
  }
  scheduleRenderMicrotask() {
    t0.render(this.render);
  }
}
class Q2 extends Z2 {
  constructor() {
    super(...arguments), this.KeyframeResolver = gR;
  }
  sortInstanceNodePosition(n, s) {
    return n.compareDocumentPosition(s) & 2 ? 1 : -1;
  }
  getBaseTargetFromProps(n, s) {
    const r = n.style;
    return r ? r[s] : void 0;
  }
  removeValueFromRenderState(n, { vars: s, style: r }) {
    delete s[n], delete r[n];
  }
  handleChildMotionValue() {
    this.childSubscription && (this.childSubscription(), delete this.childSubscription);
    const { children: n } = this.props;
    De(n) && (this.childSubscription = n.on("change", (s) => {
      this.current && (this.current.textContent = `${s}`);
    }));
  }
}
class Hs {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function J2({ top: t, left: n, right: s, bottom: r }) {
  return {
    x: { min: n, max: s },
    y: { min: t, max: r }
  };
}
function GR({ x: t, y: n }) {
  return { top: n.min, right: t.max, bottom: n.max, left: t.min };
}
function qR(t, n) {
  if (!n)
    return t;
  const s = n({ x: t.left, y: t.top }), r = n({ x: t.right, y: t.bottom });
  return {
    top: s.y,
    left: s.x,
    bottom: r.y,
    right: r.x
  };
}
function am(t) {
  return t === void 0 || t === 1;
}
function ip({ scale: t, scaleX: n, scaleY: s }) {
  return !am(t) || !am(n) || !am(s);
}
function ca(t) {
  return ip(t) || W2(t) || t.z || t.rotate || t.rotateX || t.rotateY || t.skewX || t.skewY;
}
function W2(t) {
  return Zx(t.x) || Zx(t.y);
}
function Zx(t) {
  return t && t !== "0%";
}
function Nc(t, n, s) {
  const r = t - s, o = n * r;
  return s + o;
}
function Qx(t, n, s, r, o) {
  return o !== void 0 && (t = Nc(t, o, r)), Nc(t, s, r) + n;
}
function sp(t, n = 0, s = 1, r, o) {
  t.min = Qx(t.min, n, s, r, o), t.max = Qx(t.max, n, s, r, o);
}
function tM(t, { x: n, y: s }) {
  sp(t.x, n.translate, n.scale, n.originPoint), sp(t.y, s.translate, s.scale, s.originPoint);
}
const Jx = 0.999999999999, Wx = 1.0000000000001;
function XR(t, n, s, r = !1) {
  const o = s.length;
  if (!o)
    return;
  n.x = n.y = 1;
  let u, c;
  for (let d = 0; d < o; d++) {
    u = s[d], c = u.projectionDelta;
    const { visualElement: p } = u.options;
    p && p.props.style && p.props.style.display === "contents" || (r && u.options.layoutScroll && u.scroll && u !== u.root && (xi(t.x, -u.scroll.offset.x), xi(t.y, -u.scroll.offset.y)), c && (n.x *= c.x.scale, n.y *= c.y.scale, tM(t, c)), r && ca(u.latestValues) && ac(t, u.latestValues, u.layout?.layoutBox));
  }
  n.x < Wx && n.x > Jx && (n.x = 1), n.y < Wx && n.y > Jx && (n.y = 1);
}
function xi(t, n) {
  t.min += n, t.max += n;
}
function tb(t, n, s, r, o = 0.5) {
  const u = de(t.min, t.max, o);
  sp(t, n, s, u, r);
}
function eb(t, n) {
  return typeof t == "string" ? parseFloat(t) / 100 * (n.max - n.min) : t;
}
function ac(t, n, s) {
  const r = s ?? t;
  tb(t.x, eb(n.x, r.x), n.scaleX, n.scale, n.originX), tb(t.y, eb(n.y, r.y), n.scaleY, n.scale, n.originY);
}
function eM(t, n) {
  return J2(qR(t.getBoundingClientRect(), n));
}
function PR(t, n, s) {
  const r = eM(t, s), { scroll: o } = n;
  return o && (xi(r.x, o.offset.x), xi(r.y, o.offset.y)), r;
}
const IR = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, FR = $r.length;
function $R(t, n, s) {
  let r = "", o = !0;
  for (let c = 0; c < FR; c++) {
    const d = $r[c], p = t[d];
    if (p === void 0)
      continue;
    let h = !0;
    if (typeof p == "number")
      h = p === (d.startsWith("scale") ? 1 : 0);
    else {
      const g = parseFloat(p);
      h = d.startsWith("scale") ? g === 1 : g === 0;
    }
    if (!h || s) {
      const g = np(p, wc[d]);
      if (!h) {
        o = !1;
        const y = IR[d] || d;
        r += `${y}(${g}) `;
      }
      s && (n[d] = g);
    }
  }
  const u = t.pathRotation;
  return u && (o = !1, r += `rotate(${np(u, wc.pathRotation)}) `), r = r.trim(), s ? r = s(n, o ? "" : r) : o && (r = "none"), r;
}
function a0(t, n, s) {
  const { style: r, vars: o, transformOrigin: u } = t;
  let c = !1, d = !1;
  for (const p in n) {
    const h = n[p];
    if (Kr.has(p)) {
      c = !0;
      continue;
    } else if (u2(p)) {
      o[p] = h;
      continue;
    } else {
      const g = np(h, wc[p]);
      p.startsWith("origin") ? (d = !0, u[p] = g) : r[p] = g;
    }
  }
  if (n.transform || (c || s ? r.transform = $R(n, t.transform, s) : r.transform && (r.transform = "none")), d) {
    const { originX: p = "50%", originY: h = "50%", originZ: g = 0 } = u;
    r.transformOrigin = `${p} ${h} ${g}`;
  }
}
function nM(t, { style: n, vars: s }, r, o) {
  const u = t.style;
  let c;
  for (c in n)
    u[c] = n[c];
  o?.applyProjectionStyles(u, r);
  for (c in s)
    u.setProperty(c, s[c]);
}
function nb(t, n) {
  return n.max === n.min ? 0 : t / (n.max - n.min) * 100;
}
const Fo = {
  correct: (t, n) => {
    if (!n.target)
      return t;
    if (typeof t == "string")
      if (xt.test(t))
        t = parseFloat(t);
      else
        return t;
    const s = nb(t, n.target.x), r = nb(t, n.target.y);
    return `${s}% ${r}%`;
  }
}, KR = {
  correct: (t, { treeScale: n, projectionDelta: s }) => {
    const r = t, o = ci.parse(t);
    if (o.length > 5)
      return r;
    const u = ci.createTransformer(t), c = typeof o[0] != "number" ? 1 : 0, d = s.x.scale * n.x, p = s.y.scale * n.y;
    o[0 + c] /= d, o[1 + c] /= p;
    const h = de(d, p, 0.5);
    return typeof o[2 + c] == "number" && (o[2 + c] /= h), typeof o[3 + c] == "number" && (o[3 + c] /= h), u(o);
  }
}, ap = {
  borderRadius: {
    ...Fo,
    applyTo: [...Jp]
  },
  borderTopLeftRadius: Fo,
  borderTopRightRadius: Fo,
  borderBottomLeftRadius: Fo,
  borderBottomRightRadius: Fo,
  boxShadow: KR
};
function iM(t, { layout: n, layoutId: s }) {
  return Kr.has(t) || t.startsWith("origin") || (n || s !== void 0) && (!!ap[t] || t === "opacity");
}
function r0(t, n, s) {
  const r = t.style, o = n?.style, u = {};
  if (!r)
    return u;
  for (const c in r)
    (De(r[c]) || o && De(o[c]) || iM(c, t) || s?.getValue(c)?.liveStyle !== void 0) && (u[c] = r[c]);
  return u;
}
function ZR(t) {
  return window.getComputedStyle(t);
}
class sM extends Q2 {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = nM;
  }
  mount(n) {
    Fc(!!n.style), super.mount(n);
  }
  readValueFromInstance(n, s) {
    if (Kr.has(s))
      return this.projection?.isProjecting ? Pm(s) : p3(n, s);
    {
      const r = ZR(n), o = (u2(s) ? r.getPropertyValue(s) : r[s]) || 0;
      return typeof o == "string" ? o.trim() : o;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: s }) {
    return eM(n, s);
  }
  build(n, s, r) {
    a0(n, s, r.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, s, r) {
    return r0(n, s, r);
  }
}
function QR(t, n) {
  return t in n;
}
class JR extends Z2 {
  constructor() {
    super(...arguments), this.type = "object";
  }
  readValueFromInstance(n, s) {
    if (QR(s, n)) {
      const r = n[s];
      if (typeof r == "string" || typeof r == "number")
        return r;
    }
  }
  getBaseTargetFromProps() {
  }
  removeValueFromRenderState(n, s) {
    delete s.output[n];
  }
  measureInstanceViewportBox() {
    return ke();
  }
  build(n, s) {
    Object.assign(n.output, s);
  }
  renderInstance(n, { output: s }) {
    Object.assign(n, s);
  }
  sortInstanceNodePosition() {
    return 0;
  }
}
const WR = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, tO = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function eO(t, n, s = 1, r = 0, o = !0) {
  t.pathLength = 1;
  const u = o ? WR : tO;
  t[u.offset] = `${-r}`, t[u.array] = `${n} ${s}`;
}
const aM = [
  "transform",
  "opacity",
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function rM(t, {
  attrX: n,
  attrY: s,
  attrScale: r,
  pathLength: o,
  pathSpacing: u = 1,
  pathOffset: c = 0,
  // This is object creation, which we try to avoid per-frame.
  ...d
}, p, h, g) {
  if (a0(t, d, h), p) {
    t.style.viewBox && (t.attrs.viewBox = t.style.viewBox);
    return;
  }
  t.attrs = t.style, t.style = {};
  const { attrs: y, style: x } = t;
  for (const T of aM)
    y[T] !== void 0 && (x[T] = y[T], delete y[T]);
  (x.transform || y.transformOrigin) && (x.transformOrigin = y.transformOrigin ?? "50% 50%", delete y.transformOrigin), x.transform && (x.transformBox = g?.transformBox ?? "fill-box", delete y.transformBox), n !== void 0 && (y.x = n), s !== void 0 && (y.y = s), r !== void 0 && (y.scale = r), o !== void 0 && eO(y, o, u, c, !1);
}
const oM = /* @__PURE__ */ new Set([
  "baseFrequency",
  "diffuseConstant",
  "kernelMatrix",
  "kernelUnitLength",
  "keySplines",
  "keyTimes",
  "limitingConeAngle",
  "markerHeight",
  "markerWidth",
  "numOctaves",
  "targetX",
  "targetY",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "stdDeviation",
  "tableValues",
  "viewBox",
  "gradientTransform",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust"
]), lM = (t) => typeof t == "string" && t.toLowerCase() === "svg";
function nO(t, n, s, r) {
  nM(t, n, void 0, r);
  for (const o in n.attrs)
    t.setAttribute(oM.has(o) ? o : Zp(o), n.attrs[o]);
}
function uM(t, n, s) {
  const r = r0(t, n, s);
  for (const o in t)
    if (De(t[o]) || De(n[o])) {
      const u = $r.indexOf(o) !== -1 ? "attr" + o.charAt(0).toUpperCase() + o.substring(1) : o;
      r[u] = t[o];
    }
  return r;
}
class cM extends Q2 {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = ke;
  }
  getBaseTargetFromProps(n, s) {
    return n[s];
  }
  readValueFromInstance(n, s) {
    if (Kr.has(s)) {
      const r = H2(s);
      return r && r.default || 0;
    }
    if (aM.includes(s)) {
      const o = getComputedStyle(n)[s];
      if (typeof o == "string" && o)
        return o.trim();
    }
    return s = oM.has(s) ? s : Zp(s), n.getAttribute(s);
  }
  scrapeMotionValuesFromProps(n, s, r) {
    return uM(n, s, r);
  }
  build(n, s, r) {
    rM(n, s, this.isSVGTag, r.transformTemplate, r.style);
  }
  renderInstance(n, s, r, o) {
    nO(n, s, r, o);
  }
  mount(n) {
    this.isSVGTag = lM(n.tagName), super.mount(n);
  }
}
const iO = i0.length;
function fM(t) {
  if (!t)
    return;
  if (!t.isControllingVariants) {
    const s = t.parent ? fM(t.parent) || {} : {};
    return t.props.initial !== void 0 && (s.initial = t.props.initial), s;
  }
  const n = {};
  for (let s = 0; s < iO; s++) {
    const r = i0[s], o = t.props[r];
    (hl(o) || o === !1) && (n[r] = o);
  }
  return n;
}
function dM(t, n) {
  if (!Array.isArray(n))
    return !1;
  const s = n.length;
  if (s !== t.length)
    return !1;
  for (let r = 0; r < s; r++)
    if (n[r] !== t[r])
      return !1;
  return !0;
}
const sO = [...n0].reverse(), aO = n0.length;
function rO(t) {
  return (n) => Promise.all(n.map(({ animation: s, options: r }) => aR(t, s, r)));
}
function oO(t) {
  let n = rO(t), s = ib(), r = !0, o = !1;
  const u = (h) => (g, y) => {
    const x = va(t, y, h === "exit" ? t.presenceContext?.custom : void 0);
    if (x) {
      const { transition: T, transitionEnd: S, ...A } = x;
      g = { ...g, ...A, ...S };
    }
    return g;
  };
  function c(h) {
    n = h(t);
  }
  function d(h) {
    const { props: g } = t, y = fM(t.parent) || {}, x = [], T = /* @__PURE__ */ new Set();
    let S = {}, A = 1 / 0;
    for (let N = 0; N < aO; N++) {
      const R = sO[N], O = s[R], k = g[R] !== void 0 ? g[R] : y[R], H = hl(k), G = R === h ? O.isActive : null;
      G === !1 && (A = N);
      let X = k === y[R] && k !== g[R] && H;
      if (X && (r || o) && t.manuallyAnimateOnMount && (X = !1), O.protectedKeys = { ...S }, // If it isn't active and hasn't *just* been set as inactive
      !O.isActive && G === null || // If we didn't and don't have any defined prop for this animation type
      !k && !O.prevProp || // Or if the prop doesn't define an animation
      Zc(k) || typeof k == "boolean")
        continue;
      if (R === "exit" && O.isActive && G !== !0) {
        O.prevResolvedValues && (S = {
          ...S,
          ...O.prevResolvedValues
        });
        continue;
      }
      const Y = lO(O.prevProp, k);
      let Z = Y || // If we're making this variant active, we want to always make it active
      R === h && O.isActive && !X && H || // If we removed a higher-priority variant (i is in reverse order)
      N > A && H, J = !1;
      const W = Array.isArray(k) ? k : [k];
      let ut = W.reduce(u(R), {});
      G === !1 && (ut = {});
      const { prevResolvedValues: lt = {} } = O, dt = {
        ...lt,
        ...ut
      }, ot = (w) => {
        Z = !0, T.has(w) && (J = !0, T.delete(w)), O.needsAnimating[w] = !0;
        const L = t.getValue(w);
        L && (L.liveStyle = !1);
      };
      for (const w in dt) {
        const L = ut[w], U = lt[w];
        if (S.hasOwnProperty(w))
          continue;
        let _ = !1;
        Qm(L) && Qm(U) ? _ = !dM(L, U) || Y : _ = L !== U, _ ? L != null ? ot(w) : T.add(w) : L !== void 0 && T.has(w) ? ot(w) : O.protectedKeys[w] = !0;
      }
      O.prevProp = k, O.prevResolvedValues = ut, O.isActive && (S = { ...S, ...ut }), (r || o) && t.blockInitialAnimation && (Z = !1);
      const D = X && Y;
      Z && (!D || J) && x.push(...W.map((w) => {
        const L = { type: R };
        if (typeof w == "string" && (r || o) && !D && t.manuallyAnimateOnMount && t.parent) {
          const { parent: U } = t, _ = va(U, w);
          if (U.enteringChildren && _) {
            const { delayChildren: V } = _.transition || {};
            L.delay = R2(U.enteringChildren, t, V);
          }
        }
        return {
          animation: w,
          options: L
        };
      }));
    }
    if (T.size) {
      const N = {};
      if (typeof g.initial != "boolean") {
        const R = va(t, Array.isArray(g.initial) ? g.initial[0] : g.initial);
        R && R.transition && (N.transition = R.transition);
      }
      T.forEach((R) => {
        const O = t.getBaseTarget(R), k = t.getValue(R);
        k && (k.liveStyle = !0), N[R] = O ?? null;
      }), x.push({ animation: N });
    }
    let C = !!x.length;
    return r && (g.initial === !1 || g.initial === g.animate) && !t.manuallyAnimateOnMount && (C = !1), r = !1, o = !1, C ? n(x) : Promise.resolve();
  }
  function p(h, g) {
    if (s[h].isActive === g)
      return Promise.resolve();
    t.variantChildren?.forEach((x) => x.animationState?.setActive(h, g)), s[h].isActive = g;
    const y = d(h);
    for (const x in s)
      s[x].protectedKeys = {};
    return y;
  }
  return {
    animateChanges: d,
    setActive: p,
    setAnimateFunction: c,
    getState: () => s,
    reset: () => {
      s = ib(), o = !0;
    }
  };
}
function lO(t, n) {
  return typeof n == "string" ? n !== t : Array.isArray(n) ? !dM(n, t) : !1;
}
function oa(t = !1) {
  return {
    isActive: t,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function ib() {
  return {
    animate: oa(!0),
    whileInView: oa(),
    whileHover: oa(),
    whileTap: oa(),
    whileDrag: oa(),
    whileFocus: oa(),
    exit: oa()
  };
}
function rp(t, n) {
  t.min = n.min, t.max = n.max;
}
function ii(t, n) {
  rp(t.x, n.x), rp(t.y, n.y);
}
function sb(t, n) {
  t.translate = n.translate, t.scale = n.scale, t.originPoint = n.originPoint, t.origin = n.origin;
}
const hM = 1e-4, uO = 1 - hM, cO = 1 + hM, mM = 0.01, fO = 0 - mM, dO = 0 + mM;
function pn(t) {
  return t.max - t.min;
}
function hO(t, n, s) {
  return Math.abs(t - n) <= s;
}
function ab(t, n, s, r = 0.5) {
  t.origin = r, t.originPoint = de(n.min, n.max, t.origin), t.scale = pn(s) / pn(n), t.translate = de(s.min, s.max, t.origin) - t.originPoint, (t.scale >= uO && t.scale <= cO || isNaN(t.scale)) && (t.scale = 1), (t.translate >= fO && t.translate <= dO || isNaN(t.translate)) && (t.translate = 0);
}
function nl(t, n, s, r) {
  ab(t.x, n.x, s.x, r ? r.originX : void 0), ab(t.y, n.y, s.y, r ? r.originY : void 0);
}
function rb(t, n, s, r = 0) {
  const o = r ? de(s.min, s.max, r) : s.min;
  t.min = o + n.min, t.max = t.min + pn(n);
}
function mO(t, n, s, r) {
  rb(t.x, n.x, s.x, r?.x), rb(t.y, n.y, s.y, r?.y);
}
function ob(t, n, s, r = 0) {
  const o = r ? de(s.min, s.max, r) : s.min;
  t.min = n.min - o, t.max = t.min + pn(n);
}
function Rc(t, n, s, r) {
  ob(t.x, n.x, s.x, r?.x), ob(t.y, n.y, s.y, r?.y);
}
function lb(t, n, s, r, o) {
  return t -= n, t = Nc(t, 1 / s, r), o !== void 0 && (t = Nc(t, 1 / o, r)), t;
}
function pO(t, n = 0, s = 1, r = 0.5, o, u = t, c = t) {
  if (Si.test(n) && (n = parseFloat(n), n = de(c.min, c.max, n / 100) - c.min), typeof n != "number")
    return;
  let d = de(u.min, u.max, r);
  t === u && (d -= n), t.min = lb(t.min, n, s, d, o), t.max = lb(t.max, n, s, d, o);
}
function ub(t, n, [s, r, o], u, c) {
  pO(t, n[s], n[r], n[o], n.scale, u, c);
}
const gO = ["x", "scaleX", "originX"], yO = ["y", "scaleY", "originY"];
function cb(t, n, s, r) {
  ub(t.x, n, gO, s ? s.x : void 0, r ? r.x : void 0), ub(t.y, n, yO, s ? s.y : void 0, r ? r.y : void 0);
}
function fb(t) {
  return t.translate === 0 && t.scale === 1;
}
function pM(t) {
  return fb(t.x) && fb(t.y);
}
function db(t, n) {
  return t.min === n.min && t.max === n.max;
}
function vO(t, n) {
  return db(t.x, n.x) && db(t.y, n.y);
}
function hb(t, n) {
  return Math.round(t.min) === Math.round(n.min) && Math.round(t.max) === Math.round(n.max);
}
function gM(t, n) {
  return hb(t.x, n.x) && hb(t.y, n.y);
}
function mb(t) {
  return pn(t.x) / pn(t.y);
}
function pb(t, n) {
  return t.translate === n.translate && t.scale === n.scale && t.originPoint === n.originPoint;
}
function vi(t) {
  return [t("x"), t("y")];
}
function xO(t, n, s) {
  let r = "";
  const o = t.x.translate / n.x, u = t.y.translate / n.y, c = s?.z || 0;
  if ((o || u || c) && (r = `translate3d(${o}px, ${u}px, ${c}px) `), (n.x !== 1 || n.y !== 1) && (r += `scale(${1 / n.x}, ${1 / n.y}) `), s) {
    const { transformPerspective: h, rotate: g, pathRotation: y, rotateX: x, rotateY: T, skewX: S, skewY: A } = s;
    h && (r = `perspective(${h}px) ${r}`), g && (r += `rotate(${g}deg) `), y && (r += `rotate(${y}deg) `), x && (r += `rotateX(${x}deg) `), T && (r += `rotateY(${T}deg) `), S && (r += `skewX(${S}deg) `), A && (r += `skewY(${A}deg) `);
  }
  const d = t.x.scale * n.x, p = t.y.scale * n.y;
  return (d !== 1 || p !== 1) && (r += `scale(${d}, ${p})`), r || "none";
}
const bO = Jp.length, gb = (t) => typeof t == "string" ? parseFloat(t) : t, yb = (t) => typeof t == "number" || xt.test(t);
function TO(t, n, s, r, o, u) {
  o ? (t.opacity = de(0, s.opacity ?? 1, SO(r)), t.opacityExit = de(n.opacity ?? 1, 0, MO(r))) : u && (t.opacity = de(n.opacity ?? 1, s.opacity ?? 1, r));
  for (let c = 0; c < bO; c++) {
    const d = Jp[c];
    let p = vb(n, d), h = vb(s, d);
    if (p === void 0 && h === void 0)
      continue;
    p || (p = 0), h || (h = 0), p === 0 || h === 0 || yb(p) === yb(h) ? (t[d] = Math.max(de(gb(p), gb(h), r), 0), (Si.test(h) || Si.test(p)) && (t[d] += "%")) : t[d] = h;
  }
  (n.rotate || s.rotate) && (t.rotate = de(n.rotate || 0, s.rotate || 0, r));
}
function vb(t, n) {
  return t[n] !== void 0 ? t[n] : t.borderRadius;
}
const SO = /* @__PURE__ */ yM(0, 0.5, e2), MO = /* @__PURE__ */ yM(0.5, 0.95, Jn);
function yM(t, n, s) {
  return (r) => r < t ? 0 : r > n ? 1 : s(/* @__PURE__ */ Ur(t, n, r));
}
function vM(t, n, s) {
  const r = De(t) ? t : Ls(t);
  return r.start($p("", r, n, s)), r.animation;
}
function ml(t, n, s, r = { passive: !0 }) {
  return t.addEventListener(n, s, r), () => t.removeEventListener(n, s, r);
}
const AO = (t, n) => t.depth - n.depth;
class CO {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    zp(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    Lr(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(AO), this.isDirty = !1, this.children.forEach(n);
  }
}
function _O(t, n) {
  const s = mn.now(), r = ({ timestamp: o }) => {
    const u = o - s;
    u >= n && (Wi(r), t(u - n));
  };
  return re.setup(r, !0), () => Wi(r);
}
function rc(t) {
  return De(t) ? t.get() : t;
}
class EO {
  constructor() {
    this.members = [];
  }
  add(n) {
    zp(this.members, n);
    for (let s = this.members.length - 1; s >= 0; s--) {
      const r = this.members[s];
      if (r === n || r === this.lead || r === this.prevLead)
        continue;
      const o = r.instance;
      (!o || o.isConnected === !1) && !r.snapshot && (Lr(this.members, r), r.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (Lr(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
      const s = this.members[this.members.length - 1];
      s && this.promote(s);
    }
  }
  relegate(n) {
    for (let s = this.members.indexOf(n) - 1; s >= 0; s--) {
      const r = this.members[s];
      if (r.isPresent !== !1 && r.instance?.isConnected !== !1)
        return this.promote(r), !0;
    }
    return !1;
  }
  promote(n, s) {
    const r = this.lead;
    if (n !== r && (this.prevLead = r, this.lead = n, n.show(), r)) {
      r.updateSnapshot(), n.scheduleRender();
      const { layoutDependency: o } = r.options, { layoutDependency: u } = n.options;
      (o === void 0 || o !== u) && (n.resumeFrom = r, s && (r.preserveOpacity = !0), r.snapshot && (n.snapshot = r.snapshot, n.snapshot.latestValues = r.animationValues || r.latestValues), n.root?.isUpdating && (n.isLayoutDirty = !0)), n.options.crossfade === !1 && r.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((n) => {
      n.options.onExitComplete?.(), n.resumingFrom?.options.onExitComplete?.();
    });
  }
  scheduleRender() {
    this.members.forEach((n) => n.instance && n.scheduleRender(!1));
  }
  removeLeadSnapshot() {
    this.lead?.snapshot && (this.lead.snapshot = void 0);
  }
}
const oc = {
  /**
   * Global flag as to whether the tree has animated since the last time
   * we resized the window
   */
  hasAnimatedSinceResize: !0,
  /**
   * We set this to true once, on the first update. Any nodes added to the tree beyond that
   * update will be given a `data-projection-id` attribute.
   */
  hasEverUpdated: !1
}, rm = ["", "X", "Y", "Z"], wO = 1e3;
let DO = 0;
function om(t, n, s, r) {
  const { latestValues: o } = n;
  o[t] && (s[t] = o[t], n.setStaticValue(t, 0), r && (r[t] = 0));
}
function xM(t) {
  if (t.hasCheckedOptimisedAppear = !0, t.root === t)
    return;
  const { visualElement: n } = t.options;
  if (!n)
    return;
  const s = U2(n);
  if (window.MotionHasOptimisedAnimation(s, "transform")) {
    const { layout: o, layoutId: u } = t.options;
    window.MotionCancelOptimisedAnimation(s, "transform", re, !(o || u));
  }
  const { parent: r } = t;
  r && !r.hasCheckedOptimisedAppear && xM(r);
}
function bM({ attachResizeListener: t, defaultParent: n, measureScroll: s, checkIsScrollRoot: r, resetTransform: o }) {
  return class {
    constructor(c = {}, d = n?.()) {
      this.id = DO++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(RO), this.nodes.forEach(VO), this.nodes.forEach(BO), this.nodes.forEach(OO);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = c, this.root = d ? d.root || d : this, this.path = d ? [...d.path, d] : [], this.parent = d, this.depth = d ? d.depth + 1 : 0;
      for (let p = 0; p < this.path.length; p++)
        this.path[p].shouldResetTransform = !0;
      this.root === this && (this.nodes = new CO());
    }
    addEventListener(c, d) {
      return this.eventHandlers.has(c) || this.eventHandlers.set(c, new kp()), this.eventHandlers.get(c).add(d);
    }
    notifyListeners(c, ...d) {
      const p = this.eventHandlers.get(c);
      p && p.notify(...d);
    }
    hasListeners(c) {
      return this.eventHandlers.has(c);
    }
    /**
     * Lifecycles
     */
    mount(c) {
      if (this.instance)
        return;
      this.isSVG = Kc(c) && !I2(c), this.instance = c;
      const { layoutId: d, layout: p, visualElement: h } = this.options;
      if (h && !h.current && h.mount(c), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (p || d) && (this.isLayoutDirty = !0), t) {
        let g, y = 0;
        const x = () => this.root.updateBlockedByResize = !1;
        re.read(() => {
          y = window.innerWidth;
        }), t(c, () => {
          const T = window.innerWidth;
          T !== y && (y = T, this.root.updateBlockedByResize = !0, g && g(), g = _O(x, 250), oc.hasAnimatedSinceResize && (oc.hasAnimatedSinceResize = !1, this.nodes.forEach(Tb)));
        });
      }
      d && this.root.registerSharedNode(d, this), this.options.animate !== !1 && h && (d || p) && this.addEventListener("didUpdate", ({ delta: g, hasLayoutChanged: y, hasRelativeLayoutChanged: x, layout: T }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const S = this.options.transition || h.getDefaultTransition() || XO, { onLayoutAnimationStart: A, onLayoutAnimationComplete: C } = h.getProps(), N = !this.targetLayout || !gM(this.targetLayout, T), R = !y && x;
        if (this.options.layoutRoot || this.resumeFrom || R || y && (N || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const O = {
            ...Fp(S, "layout"),
            onPlay: A,
            onComplete: C
          };
          (h.shouldReduceMotion || this.options.layoutRoot) && (O.delay = 0, O.type = !1), this.startAnimation(O), this.setAnimationOrigin(g, R, O.path);
        } else
          y || Tb(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = T;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const c = this.getStack();
      c && c.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Wi(this.updateProjection);
    }
    // only on the root
    blockUpdate() {
      this.updateManuallyBlocked = !0;
    }
    unblockUpdate() {
      this.updateManuallyBlocked = !1;
    }
    isUpdateBlocked() {
      return this.updateManuallyBlocked || this.updateBlockedByResize;
    }
    isTreeAnimationBlocked() {
      return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || !1;
    }
    // Note: currently only running on root node
    startUpdate() {
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(HO), this.animationId++);
    }
    getTransformTemplate() {
      const { visualElement: c } = this.options;
      return c && c.getProps().transformTemplate;
    }
    willUpdate(c = !0) {
      if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && xM(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let g = 0; g < this.path.length; g++) {
        const y = this.path[g];
        y.shouldResetTransform = !0, (typeof y.latestValues.x == "string" || typeof y.latestValues.y == "string") && (y.isLayoutDirty = !0), y.updateScroll("snapshot"), y.options.layoutRoot && y.willUpdate(!1);
      }
      const { layoutId: d, layout: p } = this.options;
      if (d === void 0 && !p)
        return;
      const h = this.getTransformTemplate();
      this.prevTransformTemplateValue = h ? h(this.latestValues, "") : void 0, this.updateSnapshot(), c && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const p = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), p && this.nodes.forEach(kO), this.nodes.forEach(xb);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(bb);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(LO), this.nodes.forEach(UO), this.nodes.forEach(jO), this.nodes.forEach(NO)) : this.nodes.forEach(bb), this.clearAllSnapshots();
      const d = mn.now();
      en.delta = Ai(0, 1e3 / 60, d - en.timestamp), en.timestamp = d, en.isProcessing = !0, Qh.update.process(en), Qh.preRender.process(en), Qh.render.process(en), en.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, t0.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(zO), this.sharedNodes.forEach(YO);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, re.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      re.postRender(() => {
        this.isLayoutDirty ? this.root.didUpdate() : this.root.checkUpdateFailed();
      });
    }
    /**
     * Update measurements
     */
    updateSnapshot() {
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !pn(this.snapshot.measuredBox.x) && !pn(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let p = 0; p < this.path.length; p++)
          this.path[p].updateScroll();
      const c = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = ke()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: d } = this.options;
      d && d.notify("LayoutMeasure", this.layout.layoutBox, c ? c.layoutBox : void 0);
    }
    updateScroll(c = "measure") {
      let d = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === c && (d = !1), d && this.instance) {
        const p = r(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: c,
          isRoot: p,
          offset: s(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : p
        };
      }
    }
    resetTransform() {
      if (!o)
        return;
      const c = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, d = this.projectionDelta && !pM(this.projectionDelta), p = this.getTransformTemplate(), h = p ? p(this.latestValues, "") : void 0, g = h !== this.prevTransformTemplateValue;
      c && this.instance && (d || ca(this.latestValues) || g) && (o(this.instance, h), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(c = !0) {
      const d = this.measurePageBox();
      let p = this.removeElementScroll(d);
      return c && (p = this.removeTransform(p)), PO(p), {
        animationId: this.root.animationId,
        measuredBox: d,
        layoutBox: p,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      const { visualElement: c } = this.options;
      if (!c)
        return ke();
      const d = c.measureViewportBox();
      if (!(this.scroll?.wasRoot || this.path.some(IO))) {
        const { scroll: h } = this.root;
        h && (xi(d.x, h.offset.x), xi(d.y, h.offset.y));
      }
      return d;
    }
    removeElementScroll(c) {
      const d = ke();
      if (ii(d, c), this.scroll?.wasRoot)
        return d;
      for (let p = 0; p < this.path.length; p++) {
        const h = this.path[p], { scroll: g, options: y } = h;
        h !== this.root && g && y.layoutScroll && (g.wasRoot && ii(d, c), xi(d.x, g.offset.x), xi(d.y, g.offset.y));
      }
      return d;
    }
    applyTransform(c, d = !1, p) {
      const h = p || ke();
      ii(h, c);
      for (let g = 0; g < this.path.length; g++) {
        const y = this.path[g];
        !d && y.options.layoutScroll && y.scroll && y !== y.root && (xi(h.x, -y.scroll.offset.x), xi(h.y, -y.scroll.offset.y)), ca(y.latestValues) && ac(h, y.latestValues, y.layout?.layoutBox);
      }
      return ca(this.latestValues) && ac(h, this.latestValues, this.layout?.layoutBox), h;
    }
    removeTransform(c) {
      const d = ke();
      ii(d, c);
      for (let p = 0; p < this.path.length; p++) {
        const h = this.path[p];
        if (!ca(h.latestValues))
          continue;
        let g;
        h.instance && (ip(h.latestValues) && h.updateSnapshot(), g = ke(), ii(g, h.measurePageBox())), cb(d, h.latestValues, h.snapshot?.layoutBox, g);
      }
      return ca(this.latestValues) && cb(d, this.latestValues), d;
    }
    setTargetDelta(c) {
      this.targetDelta = c, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0;
    }
    setOptions(c) {
      this.options = {
        ...this.options,
        ...c,
        crossfade: c.crossfade !== void 0 ? c.crossfade : !0
      };
    }
    clearMeasurements() {
      this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1;
    }
    forceRelativeParentToResolveTarget() {
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== en.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(c = !1) {
      const d = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = d.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = d.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = d.isSharedProjectionDirty);
      const p = !!this.resumingFrom || this !== d;
      if (!(c || p && this.isSharedProjectionDirty || this.isProjectionDirty || this.parent?.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: g, layoutId: y } = this.options;
      if (!this.layout || !(g || y))
        return;
      this.resolvedRelativeTargetAt = en.timestamp;
      const x = this.getClosestProjectingParent();
      x && this.linkedParentVersion !== x.layoutVersion && !x.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && x && x.layout ? this.createRelativeTarget(x, this.layout.layoutBox, x.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = ke(), this.targetWithTransforms = ke()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), mO(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : ii(this.target, this.layout.layoutBox), tM(this.target, this.targetDelta)) : ii(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && x && !!x.resumingFrom == !!this.resumingFrom && !x.options.layoutScroll && x.target && this.animationProgress !== 1 ? this.createRelativeTarget(x, this.target, x.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || ip(this.parent.latestValues) || W2(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(c, d, p) {
      this.relativeParent = c, this.linkedParentVersion = c.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = ke(), this.relativeTargetOrigin = ke(), Rc(this.relativeTargetOrigin, d, p, this.options.layoutAnchor || void 0), ii(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      const c = this.getLead(), d = !!this.resumingFrom || this !== c;
      let p = !0;
      if ((this.isProjectionDirty || this.parent?.isProjectionDirty) && (p = !1), d && (this.isSharedProjectionDirty || this.isTransformDirty) && (p = !1), this.resolvedRelativeTargetAt === en.timestamp && (p = !1), p)
        return;
      const { layout: h, layoutId: g } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(h || g))
        return;
      ii(this.layoutCorrected, this.layout.layoutBox);
      const y = this.treeScale.x, x = this.treeScale.y;
      XR(this.layoutCorrected, this.treeScale, this.path, d), c.layout && !c.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (c.target = c.layout.layoutBox, c.targetWithTransforms = ke());
      const { target: T } = c;
      if (!T) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (sb(this.prevProjectionDelta.x, this.projectionDelta.x), sb(this.prevProjectionDelta.y, this.projectionDelta.y)), nl(this.projectionDelta, this.layoutCorrected, T, this.latestValues), (this.treeScale.x !== y || this.treeScale.y !== x || !pb(this.projectionDelta.x, this.prevProjectionDelta.x) || !pb(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", T));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(c = !0) {
      if (this.options.visualElement?.scheduleRender(), c) {
        const d = this.getStack();
        d && d.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = Cr(), this.projectionDelta = Cr(), this.projectionDeltaWithTransform = Cr();
    }
    setAnimationOrigin(c, d = !1, p) {
      const h = this.snapshot, g = h ? h.latestValues : {}, y = { ...this.latestValues }, x = Cr();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !d;
      const T = ke(), S = h ? h.source : void 0, A = this.layout ? this.layout.source : void 0, C = S !== A, N = this.getStack(), R = !N || N.members.length <= 1, O = !!(C && !R && this.options.crossfade === !0 && !this.path.some(qO));
      this.animationProgress = 0;
      let k;
      const H = p?.interpolateProjection(c);
      this.mixTargetDelta = (G) => {
        const X = G / 1e3, Y = H?.(X);
        Y ? (x.x.translate = Y.x, x.x.scale = de(c.x.scale, 1, X), x.x.origin = c.x.origin, x.x.originPoint = c.x.originPoint, x.y.translate = Y.y, x.y.scale = de(c.y.scale, 1, X), x.y.origin = c.y.origin, x.y.originPoint = c.y.originPoint) : (Sb(x.x, c.x, X), Sb(x.y, c.y, X)), this.setTargetDelta(x), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Rc(T, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), GO(this.relativeTarget, this.relativeTargetOrigin, T, X), k && vO(this.relativeTarget, k) && (this.isProjectionDirty = !1), k || (k = ke()), ii(k, this.relativeTarget)), C && (this.animationValues = y, TO(y, g, this.latestValues, X, O, R)), Y && Y.rotate !== void 0 && (this.animationValues || (this.animationValues = y), this.animationValues.pathRotation = Y.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = X;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(c) {
      this.notifyListeners("animationStart"), this.currentAnimation?.stop(), this.resumingFrom?.currentAnimation?.stop(), this.pendingAnimation && (Wi(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = re.update(() => {
        oc.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = Ls(0)), this.motionValue.jump(0, !1), this.currentAnimation = vM(this.motionValue, [0, 1e3], {
          ...c,
          velocity: 0,
          isSync: !0,
          onUpdate: (d) => {
            this.mixTargetDelta(d), c.onUpdate && c.onUpdate(d);
          },
          onComplete: () => {
            c.onComplete && c.onComplete(), this.completeAnimation();
          }
        }), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
      const c = this.getStack();
      c && c.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(wO), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const c = this.getLead();
      let { targetWithTransforms: d, target: p, layout: h, latestValues: g } = c;
      if (!(!d || !p || !h)) {
        if (this !== c && this.layout && h && TM(this.options.animationType, this.layout.layoutBox, h.layoutBox)) {
          p = this.target || ke();
          const y = pn(this.layout.layoutBox.x);
          p.x.min = c.target.x.min, p.x.max = p.x.min + y;
          const x = pn(this.layout.layoutBox.y);
          p.y.min = c.target.y.min, p.y.max = p.y.min + x;
        }
        ii(d, p), ac(d, g), nl(this.projectionDeltaWithTransform, this.layoutCorrected, d, g);
      }
    }
    registerSharedNode(c, d) {
      this.sharedNodes.has(c) || this.sharedNodes.set(c, new EO()), this.sharedNodes.get(c).add(d);
      const h = d.options.initialPromotionConfig;
      d.promote({
        transition: h ? h.transition : void 0,
        preserveFollowOpacity: h && h.shouldPreserveFollowOpacity ? h.shouldPreserveFollowOpacity(d) : void 0
      });
    }
    isLead() {
      const c = this.getStack();
      return c ? c.lead === this : !0;
    }
    getLead() {
      const { layoutId: c } = this.options;
      return c ? this.getStack()?.lead || this : this;
    }
    getPrevLead() {
      const { layoutId: c } = this.options;
      return c ? this.getStack()?.prevLead : void 0;
    }
    getStack() {
      const { layoutId: c } = this.options;
      if (c)
        return this.root.sharedNodes.get(c);
    }
    promote({ needsReset: c, transition: d, preserveFollowOpacity: p } = {}) {
      const h = this.getStack();
      h && h.promote(this, p), c && (this.projectionDelta = void 0, this.needsReset = !0), d && this.setOptions({ transition: d });
    }
    relegate() {
      const c = this.getStack();
      return c ? c.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: c } = this.options;
      if (!c)
        return;
      let d = !1;
      const { latestValues: p } = c;
      if ((p.z || p.rotate || p.rotateX || p.rotateY || p.rotateZ || p.skewX || p.skewY) && (d = !0), !d)
        return;
      const h = {};
      p.z && om("z", c, h, this.animationValues);
      for (let g = 0; g < rm.length; g++)
        om(`rotate${rm[g]}`, c, h, this.animationValues), om(`skew${rm[g]}`, c, h, this.animationValues);
      c.render();
      for (const g in h)
        c.setStaticValue(g, h[g]), this.animationValues && (this.animationValues[g] = h[g]);
      c.scheduleRender();
    }
    applyProjectionStyles(c, d) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        c.visibility = "hidden";
        return;
      }
      const p = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, c.visibility = "", c.opacity = "", c.pointerEvents = rc(d?.pointerEvents) || "", c.transform = p ? p(this.latestValues, "") : "none";
        return;
      }
      const h = this.getLead();
      if (!this.projectionDelta || !this.layout || !h.target) {
        this.options.layoutId && (c.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, c.pointerEvents = rc(d?.pointerEvents) || ""), this.hasProjected && !ca(this.latestValues) && (c.transform = p ? p({}, "") : "none", this.hasProjected = !1);
        return;
      }
      c.visibility = "";
      const g = h.animationValues || h.latestValues;
      this.applyTransformsToTarget();
      let y = xO(this.projectionDeltaWithTransform, this.treeScale, g);
      p && (y = p(g, y)), c.transform = y;
      const { x, y: T } = this.projectionDelta;
      c.transformOrigin = `${x.origin * 100}% ${T.origin * 100}% 0`, h.animationValues ? c.opacity = h === this ? g.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : g.opacityExit : c.opacity = h === this ? g.opacity !== void 0 ? g.opacity : "" : g.opacityExit !== void 0 ? g.opacityExit : 0;
      for (const S in ap) {
        if (g[S] === void 0)
          continue;
        const { correct: A, applyTo: C, isCSSVariable: N } = ap[S], R = y === "none" ? g[S] : A(g[S], h);
        if (C) {
          const O = C.length;
          for (let k = 0; k < O; k++)
            c[C[k]] = R;
        } else
          N ? this.options.visualElement.renderState.vars[S] = R : c[S] = R;
      }
      this.options.layoutId && (c.pointerEvents = h === this ? rc(d?.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((c) => c.currentAnimation?.stop()), this.root.nodes.forEach(xb), this.root.sharedNodes.clear();
    }
  };
}
function jO(t) {
  t.updateLayout();
}
function NO(t) {
  const n = t.resumeFrom?.snapshot || t.snapshot;
  if (t.isLead() && t.layout && n && t.hasListeners("didUpdate")) {
    const { layoutBox: s, measuredBox: r } = t.layout, { animationType: o } = t.options, u = n.source !== t.layout.source;
    if (o === "size")
      vi((g) => {
        const y = u ? n.measuredBox[g] : n.layoutBox[g], x = pn(y);
        y.min = s[g].min, y.max = y.min + x;
      });
    else if (o === "x" || o === "y") {
      const g = o === "x" ? "y" : "x";
      rp(u ? n.measuredBox[g] : n.layoutBox[g], s[g]);
    } else TM(o, n.layoutBox, s) && vi((g) => {
      const y = u ? n.measuredBox[g] : n.layoutBox[g], x = pn(s[g]);
      y.max = y.min + x, t.relativeTarget && !t.currentAnimation && (t.isProjectionDirty = !0, t.relativeTarget[g].max = t.relativeTarget[g].min + x);
    });
    const c = Cr();
    nl(c, s, n.layoutBox);
    const d = Cr();
    u ? nl(d, t.applyTransform(r, !0), n.measuredBox) : nl(d, s, n.layoutBox);
    const p = !pM(c);
    let h = !1;
    if (!t.resumeFrom) {
      const g = t.getClosestProjectingParent();
      if (g && !g.resumeFrom) {
        const { snapshot: y, layout: x } = g;
        if (y && x) {
          const T = t.options.layoutAnchor || void 0, S = ke();
          Rc(S, n.layoutBox, y.layoutBox, T);
          const A = ke();
          Rc(A, s, x.layoutBox, T), gM(S, A) || (h = !0), g.options.layoutRoot && (t.relativeTarget = A, t.relativeTargetOrigin = S, t.relativeParent = g);
        }
      }
    }
    t.notifyListeners("didUpdate", {
      layout: s,
      snapshot: n,
      delta: d,
      layoutDelta: c,
      hasLayoutChanged: p,
      hasRelativeLayoutChanged: h
    });
  } else if (t.isLead()) {
    const { onExitComplete: s } = t.options;
    s && s();
  }
  t.options.transition = void 0;
}
function RO(t) {
  t.parent && (t.isProjecting() || (t.isProjectionDirty = t.parent.isProjectionDirty), t.isSharedProjectionDirty || (t.isSharedProjectionDirty = !!(t.isProjectionDirty || t.parent.isProjectionDirty || t.parent.isSharedProjectionDirty)), t.isTransformDirty || (t.isTransformDirty = t.parent.isTransformDirty));
}
function OO(t) {
  t.isProjectionDirty = t.isSharedProjectionDirty = t.isTransformDirty = !1;
}
function zO(t) {
  t.clearSnapshot();
}
function xb(t) {
  t.clearMeasurements();
}
function kO(t) {
  t.isLayoutDirty = !0, t.updateLayout();
}
function bb(t) {
  t.isLayoutDirty = !1;
}
function LO(t) {
  t.isAnimationBlocked && t.layout && !t.isLayoutDirty && (t.snapshot = t.layout, t.isLayoutDirty = !0);
}
function UO(t) {
  const { visualElement: n } = t.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), t.resetTransform();
}
function Tb(t) {
  t.finishAnimation(), t.targetDelta = t.relativeTarget = t.target = void 0, t.isProjectionDirty = !0;
}
function VO(t) {
  t.resolveTargetDelta();
}
function BO(t) {
  t.calcProjection();
}
function HO(t) {
  t.resetSkewAndRotation();
}
function YO(t) {
  t.removeLeadSnapshot();
}
function Sb(t, n, s) {
  t.translate = de(n.translate, 0, s), t.scale = de(n.scale, 1, s), t.origin = n.origin, t.originPoint = n.originPoint;
}
function Mb(t, n, s, r) {
  t.min = de(n.min, s.min, r), t.max = de(n.max, s.max, r);
}
function GO(t, n, s, r) {
  Mb(t.x, n.x, s.x, r), Mb(t.y, n.y, s.y, r);
}
function qO(t) {
  return t.animationValues && t.animationValues.opacityExit !== void 0;
}
const XO = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Ab = (t) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(t), Cb = Ab("applewebkit/") && !Ab("chrome/") ? Math.round : Jn;
function _b(t) {
  t.min = Cb(t.min), t.max = Cb(t.max);
}
function PO(t) {
  _b(t.x), _b(t.y);
}
function TM(t, n, s) {
  return t === "position" || t === "preserve-aspect" && !hO(mb(n), mb(s), 0.2);
}
function IO(t) {
  return t !== t.root && t.scroll?.wasRoot;
}
const FO = bM({
  attachResizeListener: (t, n) => ml(t, "resize", n),
  measureScroll: () => ({
    x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
    y: document.documentElement.scrollTop || document.body?.scrollTop || 0
  }),
  checkIsScrollRoot: () => !0
}), lm = {
  current: void 0
}, SM = bM({
  measureScroll: (t) => ({
    x: t.scrollLeft,
    y: t.scrollTop
  }),
  defaultParent: () => {
    if (!lm.current) {
      const t = new FO({});
      t.mount(window), t.setOptions({ layoutScroll: !0 }), lm.current = t;
    }
    return lm.current;
  },
  resetTransform: (t, n) => {
    t.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (t) => window.getComputedStyle(t).position === "fixed"
}), Jc = E.createContext({
  transformPagePoint: (t) => t,
  isStatic: !1,
  reducedMotion: "never"
});
function $O(t = !0) {
  const n = E.useContext(Op);
  if (n === null)
    return [!0, null];
  const { isPresent: s, onExitComplete: r, register: o } = n, u = E.useId();
  E.useEffect(() => {
    if (t)
      return o(u);
  }, [t]);
  const c = E.useCallback(() => t && r && r(u), [u, r, t]);
  return !s && r ? [!1, c] : [!0];
}
const MM = E.createContext({ strict: !1 }), Eb = {
  animation: [
    "animate",
    "variants",
    "whileHover",
    "whileTap",
    "exit",
    "whileInView",
    "whileFocus",
    "whileDrag"
  ],
  exit: ["exit"],
  drag: ["drag", "dragControls"],
  focus: ["whileFocus"],
  hover: ["whileHover", "onHoverStart", "onHoverEnd"],
  tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
  pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
  inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
  layout: ["layout", "layoutId"]
};
let wb = !1;
function KO() {
  if (wb)
    return;
  const t = {};
  for (const n in Eb)
    t[n] = {
      isEnabled: (s) => Eb[n].some((r) => !!s[r])
    };
  K2(t), wb = !0;
}
function AM() {
  return KO(), YR();
}
function ZO(t) {
  const n = AM();
  for (const s in t)
    n[s] = {
      ...n[s],
      ...t[s]
    };
  K2(n);
}
const Wc = /* @__PURE__ */ E.createContext({});
function QO(t, n) {
  if (Qc(t)) {
    const { initial: s, animate: r } = t;
    return {
      initial: s === !1 || hl(s) ? s : void 0,
      animate: hl(r) ? r : void 0
    };
  }
  return t.inherit !== !1 ? n : {};
}
function JO(t) {
  const { initial: n, animate: s } = QO(t, E.useContext(Wc));
  return E.useMemo(() => ({ initial: n, animate: s }), [Db(n), Db(s)]);
}
function Db(t) {
  return Array.isArray(t) ? t.join(" ") : t;
}
const o0 = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function CM(t, n, s) {
  for (const r in n)
    !De(n[r]) && !iM(r, s) && (t[r] = n[r]);
}
function WO({ transformTemplate: t }, n) {
  return E.useMemo(() => {
    const s = o0();
    return a0(s, n, t), Object.assign({}, s.vars, s.style);
  }, [n]);
}
function t5(t, n) {
  const s = t.style || {}, r = {};
  return CM(r, s, t), Object.assign(r, WO(t, n)), r;
}
function e5(t, n) {
  const s = {}, r = t5(t, n);
  return t.drag && t.dragListener !== !1 && (s.draggable = !1, r.userSelect = r.WebkitUserSelect = r.WebkitTouchCallout = "none", r.touchAction = t.drag === !0 ? "none" : `pan-${t.drag === "x" ? "y" : "x"}`), t.tabIndex === void 0 && (t.onTap || t.onTapStart || t.whileTap) && (s.tabIndex = 0), s.style = r, s;
}
const _M = () => ({
  ...o0(),
  attrs: {}
});
function n5(t, n, s, r) {
  const o = E.useMemo(() => {
    const u = _M();
    return rM(u, n, lM(r), t.transformTemplate, t.style), {
      ...u.attrs,
      style: { ...u.style }
    };
  }, [n]);
  if (t.style) {
    const u = {};
    CM(u, t.style, t), o.style = { ...u, ...o.style };
  }
  return o;
}
const i5 = /* @__PURE__ */ new Set([
  "animate",
  "exit",
  "variants",
  "initial",
  "style",
  "values",
  "variants",
  "transition",
  "transformTemplate",
  "custom",
  "inherit",
  "onBeforeLayoutMeasure",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onDragStart",
  "onDrag",
  "onDragEnd",
  "onMeasureDragConstraints",
  "onDirectionLock",
  "onDragTransitionEnd",
  "_dragX",
  "_dragY",
  "onHoverStart",
  "onHoverEnd",
  "onViewportEnter",
  "onViewportLeave",
  "globalTapTarget",
  "propagate",
  "ignoreStrict",
  "viewport"
]);
function Oc(t) {
  return t.startsWith("while") || t.startsWith("drag") && t !== "draggable" || t.startsWith("layout") || t.startsWith("onTap") || t.startsWith("onPan") || t.startsWith("onLayout") || i5.has(t);
}
function s5(t, n) {
  return t.startsWith("on") ? !Oc(t) : n?.(t) ?? !Oc(t);
}
function a5(t, n, s, r) {
  const o = {};
  for (const u in t)
    u === "values" && typeof t.values == "object" || De(t[u]) || (s5(u, r) || s === !0 && Oc(u) || !n && !Oc(u) || // If trying to use native HTML drag events, forward drag listeners
    t.draggable && u.startsWith("onDrag")) && (o[u] = t[u]);
  return o;
}
const r5 = [
  "animate",
  "circle",
  "defs",
  "desc",
  "ellipse",
  "g",
  "image",
  "line",
  "filter",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "switch",
  "symbol",
  "svg",
  "text",
  "tspan",
  "use",
  "view"
];
function l0(t) {
  return (
    /**
     * If it's not a string, it's a custom React component. Currently we only support
     * HTML custom React components.
     */
    typeof t != "string" || /**
     * If it contains a dash, the element is a custom HTML webcomponent.
     */
    t.includes("-") ? !1 : (
      /**
       * If it's in our list of lowercase SVG tags, it's an SVG component
       */
      !!(r5.indexOf(t) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(t))
    )
  );
}
function o5(t, n, s, { latestValues: r }, o, u = !1, c, d) {
  const h = (c ?? l0(t) ? n5 : e5)(n, r, o, t), g = a5(n, typeof t == "string", u, d), y = t !== E.Fragment ? { ...g, ...h, ref: s } : {}, { children: x } = n, T = E.useMemo(() => De(x) ? x.get() : x, [x]);
  return E.createElement(t, {
    ...y,
    children: T
  });
}
function l5({ scrapeMotionValuesFromProps: t, createRenderState: n }, s, r, o) {
  return {
    latestValues: u5(s, r, o, t),
    renderState: n()
  };
}
function u5(t, n, s, r) {
  const o = {}, u = r(t, {});
  for (const x in u)
    o[x] = rc(u[x]);
  let { initial: c, animate: d } = t;
  const p = Qc(t), h = F2(t);
  n && h && !p && t.inherit !== !1 && (c === void 0 && (c = n.initial), d === void 0 && (d = n.animate));
  let g = s ? s.initial === !1 : !1;
  g = g || c === !1;
  const y = g ? d : c;
  if (y && typeof y != "boolean" && !Zc(y)) {
    const x = Array.isArray(y) ? y : [y];
    for (let T = 0; T < x.length; T++) {
      const S = Kp(t, x[T]);
      if (S) {
        const { transitionEnd: A, transition: C, ...N } = S;
        for (const R in N) {
          let O = N[R];
          if (Array.isArray(O)) {
            const k = g ? O.length - 1 : 0;
            O = O[k];
          }
          O !== null && (o[R] = O);
        }
        for (const R in A)
          o[R] = A[R];
      }
    }
  }
  return o;
}
const EM = (t) => (n, s) => {
  const r = E.useContext(Wc), o = E.useContext(Op), u = () => l5(t, n, r, o);
  return s ? u() : Rp(u);
}, c5 = /* @__PURE__ */ EM({
  scrapeMotionValuesFromProps: r0,
  createRenderState: o0
}), f5 = /* @__PURE__ */ EM({
  scrapeMotionValuesFromProps: uM,
  createRenderState: _M
}), d5 = /* @__PURE__ */ Symbol.for("motionComponentSymbol");
function h5(t, n, s) {
  const r = E.useRef(s);
  E.useInsertionEffect(() => {
    r.current = s;
  });
  const o = E.useRef(null);
  return E.useCallback((u) => {
    u && t.onMount?.(u), n && (u ? n.mount(u) : n.unmount());
    const c = r.current;
    if (typeof c == "function")
      if (u) {
        const d = c(u);
        typeof d == "function" && (o.current = d);
      } else o.current ? (o.current(), o.current = null) : c(u);
    else c && (c.current = u);
  }, [n]);
}
const wM = E.createContext({});
function vr(t) {
  return t && typeof t == "object" && Object.prototype.hasOwnProperty.call(t, "current");
}
function m5(t, n, s, r, o, u) {
  const { visualElement: c } = E.useContext(Wc), d = E.useContext(MM), p = E.useContext(Op), h = E.useContext(Jc), g = h.reducedMotion, y = h.skipAnimations, x = E.useRef(null), T = E.useRef(!1);
  r = r || d.renderer, !x.current && r && (x.current = r(t, {
    visualState: n,
    parent: c,
    props: s,
    presenceContext: p,
    blockInitialAnimation: p ? p.initial === !1 : !1,
    reducedMotionConfig: g,
    skipAnimations: y,
    isSVG: u
  }), T.current && x.current && (x.current.manuallyAnimateOnMount = !0));
  const S = x.current, A = E.useContext(wM);
  S && !S.projection && o && (S.type === "html" || S.type === "svg") && p5(x.current, s, o, A);
  const C = E.useRef(!1);
  E.useInsertionEffect(() => {
    S && C.current && S.update(s, p);
  });
  const N = s[L2], R = E.useRef(!!N && typeof window < "u" && !window.MotionHandoffIsComplete?.(N) && window.MotionHasOptimisedAnimation?.(N));
  return XS(() => {
    T.current = !0, S && (C.current = !0, window.MotionIsMounted = !0, S.updateFeatures(), S.scheduleRenderMicrotask(), R.current && S.animationState && S.animationState.animateChanges());
  }), E.useEffect(() => {
    S && (!R.current && S.animationState && S.animationState.animateChanges(), R.current && (queueMicrotask(() => {
      window.MotionHandoffMarkAsComplete?.(N);
    }), R.current = !1), S.enteringChildren = void 0);
  }), S;
}
function p5(t, n, s, r) {
  const { layoutId: o, layout: u, drag: c, dragConstraints: d, layoutScroll: p, layoutRoot: h, layoutAnchor: g, layoutCrossfade: y } = n;
  t.projection = new s(t.latestValues, n["data-framer-portal-id"] ? void 0 : DM(t.parent)), t.projection.setOptions({
    layoutId: o,
    layout: u,
    alwaysMeasureLayout: !!c || d && vr(d),
    visualElement: t,
    /**
     * TODO: Update options in an effect. This could be tricky as it'll be too late
     * to update by the time layout animations run.
     * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
     * ensuring it gets called if there's no potential layout animations.
     *
     */
    animationType: typeof u == "string" ? u : "both",
    initialPromotionConfig: r,
    crossfade: y,
    layoutScroll: p,
    layoutRoot: h,
    layoutAnchor: g
  });
}
function DM(t) {
  if (t)
    return t.options.allowProjection !== !1 ? t.projection : DM(t.parent);
}
function um(t, { forwardMotionProps: n = !1, type: s } = {}, r, o) {
  r && ZO(r);
  const u = s ? s === "svg" : l0(t), c = u ? f5 : c5;
  function d(h, g) {
    let y;
    const x = {
      ...E.useContext(Jc),
      ...h,
      layoutId: g5(h)
    }, { isStatic: T, isValidProp: S } = x, A = JO(h), C = c(h, T);
    if (!T && typeof window < "u") {
      y5();
      const N = v5(x);
      y = N.MeasureLayout, A.visualElement = m5(t, C, x, o, N.ProjectionNode, u);
    }
    return v.jsxs(Wc.Provider, { value: A, children: [y && A.visualElement ? v.jsx(y, { visualElement: A.visualElement, ...x }) : null, o5(t, h, h5(C, A.visualElement, g), C, T, n, u, S)] });
  }
  d.displayName = `motion.${typeof t == "string" ? t : `create(${t.displayName ?? t.name ?? ""})`}`;
  const p = E.forwardRef(d);
  return p[d5] = t, p;
}
function g5({ layoutId: t }) {
  const n = E.useContext(qS).id;
  return n && t !== void 0 ? n + "-" + t : t;
}
function y5(t, n) {
  E.useContext(MM).strict;
}
function v5(t) {
  const n = AM(), { drag: s, layout: r } = n;
  if (!s && !r)
    return {};
  const o = { ...s, ...r };
  return {
    MeasureLayout: s?.isEnabled(t) || r?.isEnabled(t) ? o.MeasureLayout : void 0,
    ProjectionNode: o.ProjectionNode
  };
}
function x5(t, n) {
  if (typeof Proxy > "u")
    return um;
  const s = /* @__PURE__ */ new Map(), r = (u, c) => um(u, c, t, n), o = (u, c) => r(u, c);
  return new Proxy(o, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (u, c) => c === "create" ? r : (s.has(c) || s.set(c, um(c, void 0, t, n)), s.get(c))
  });
}
const b5 = (t, n) => n.isSVG ?? l0(t) ? new cM(n) : new sM(n, {
  allowProjection: t !== E.Fragment
});
class T5 extends Hs {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = oO(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Zc(n) && (this.unmountControls = n.subscribe(this.node));
  }
  /**
   * Subscribe any provided AnimationControls to the component's VisualElement
   */
  mount() {
    this.updateAnimationControlsSubscription();
  }
  update() {
    const { animate: n } = this.node.getProps(), { animate: s } = this.node.prevProps || {};
    n !== s && this.updateAnimationControlsSubscription();
  }
  unmount() {
    this.node.animationState.reset(), this.unmountControls?.();
  }
}
let S5 = 0;
class M5 extends Hs {
  constructor() {
    super(...arguments), this.id = S5++, this.isExitComplete = !1;
  }
  update() {
    if (!this.node.presenceContext)
      return;
    const { isPresent: n, onExitComplete: s } = this.node.presenceContext, { isPresent: r } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || n === r)
      return;
    if (n && r === !1) {
      if (this.isExitComplete) {
        const { initial: u, custom: c } = this.node.getProps();
        if (typeof u == "string" || typeof u == "object" && u !== null && !Array.isArray(u)) {
          const d = va(this.node, u, c);
          if (d) {
            const { transition: p, transitionEnd: h, ...g } = d;
            for (const y in g)
              this.node.getValue(y)?.jump(g[y]);
          }
        }
        this.node.animationState.reset(), this.node.animationState.animateChanges();
      } else
        this.node.animationState.setActive("exit", !1);
      this.isExitComplete = !1;
      return;
    }
    const o = this.node.animationState.setActive("exit", !n);
    s && !n && o.then(() => {
      this.isExitComplete = !0, s(this.id);
    });
  }
  mount() {
    const { register: n, onExitComplete: s } = this.node.presenceContext || {};
    s && s(this.id), n && (this.unmount = n(this.id));
  }
  unmount() {
  }
}
const A5 = {
  animation: {
    Feature: T5
  },
  exit: {
    Feature: M5
  }
};
function Ml(t) {
  return {
    point: {
      x: t.pageX,
      y: t.pageY
    }
  };
}
const C5 = (t) => (n) => e0(n) && t(n, Ml(n));
function il(t, n, s, r) {
  return ml(t, n, C5(s), r);
}
const jM = ({ current: t }) => t ? t.ownerDocument.defaultView : null, jb = (t, n) => Math.abs(t - n);
function _5(t, n) {
  const s = jb(t.x, n.x), r = jb(t.y, n.y);
  return Math.sqrt(s ** 2 + r ** 2);
}
const Nb = /* @__PURE__ */ new Set(["auto", "scroll"]);
class NM {
  constructor(n, s, { transformPagePoint: r, contextWindow: o = window, dragSnapToOrigin: u = !1, distanceThreshold: c = 3, element: d } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (S) => {
      this.handleScroll(S.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Xu(this.lastRawMoveEventInfo, this.transformPagePoint));
      const S = cm(this.lastMoveEventInfo, this.history), A = this.startEvent !== null, C = _5(S.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!A && !C)
        return;
      const { point: N } = S, { timestamp: R } = en;
      this.history.push({ ...N, timestamp: R });
      const { onStart: O, onMove: k } = this.handlers;
      A || (O && O(this.lastMoveEvent, S), this.startEvent = this.lastMoveEvent), k && k(this.lastMoveEvent, S);
    }, this.handlePointerMove = (S, A) => {
      this.lastMoveEvent = S, this.lastRawMoveEventInfo = A, this.lastMoveEventInfo = Xu(A, this.transformPagePoint), re.update(this.updatePoint, !0);
    }, this.handlePointerUp = (S, A) => {
      this.end();
      const { onEnd: C, onSessionEnd: N, resumeAnimation: R } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && R && R(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const O = cm(S.type === "pointercancel" ? this.lastMoveEventInfo : Xu(A, this.transformPagePoint), this.history);
      this.startEvent && C && C(S, O), N && N(S, O);
    }, !e0(n))
      return;
    this.dragSnapToOrigin = u, this.handlers = s, this.transformPagePoint = r, this.distanceThreshold = c, this.contextWindow = o || window;
    const p = Ml(n), h = Xu(p, this.transformPagePoint), { point: g } = h, { timestamp: y } = en;
    this.history = [{ ...g, timestamp: y }];
    const { onSessionStart: x } = s;
    x && x(n, cm(h, this.history));
    const T = { passive: !0, capture: !0 };
    this.removeListeners = bl(il(this.contextWindow, "pointermove", this.handlePointerMove, T), il(this.contextWindow, "pointerup", this.handlePointerUp, T), il(this.contextWindow, "pointercancel", this.handlePointerUp, T)), d && this.startScrollTracking(d);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let s = n.parentElement;
    for (; s; ) {
      const r = getComputedStyle(s);
      (Nb.has(r.overflowX) || Nb.has(r.overflowY)) && this.scrollPositions.set(s, {
        x: s.scrollLeft,
        y: s.scrollTop
      }), s = s.parentElement;
    }
    this.scrollPositions.set(window, {
      x: window.scrollX,
      y: window.scrollY
    }), window.addEventListener("scroll", this.onElementScroll, {
      capture: !0
    }), window.addEventListener("scroll", this.onWindowScroll), this.removeScrollListeners = () => {
      window.removeEventListener("scroll", this.onElementScroll, {
        capture: !0
      }), window.removeEventListener("scroll", this.onWindowScroll);
    };
  }
  /**
   * Handle scroll compensation during drag.
   *
   * For element scroll: adjusts history origin since pageX/pageY doesn't change.
   * For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
   */
  handleScroll(n) {
    const s = this.scrollPositions.get(n);
    if (!s)
      return;
    const r = n === window, o = r ? { x: window.scrollX, y: window.scrollY } : {
      x: n.scrollLeft,
      y: n.scrollTop
    }, u = { x: o.x - s.x, y: o.y - s.y };
    u.x === 0 && u.y === 0 || (r ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += u.x, this.lastMoveEventInfo.point.y += u.y) : this.history.length > 0 && (this.history[0].x -= u.x, this.history[0].y -= u.y), this.scrollPositions.set(n, o), re.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Wi(this.updatePoint);
  }
}
function Xu(t, n) {
  return n ? { point: n(t.point) } : t;
}
function Rb(t, n) {
  return { x: t.x - n.x, y: t.y - n.y };
}
function cm({ point: t }, n) {
  return {
    point: t,
    delta: Rb(t, RM(n)),
    offset: Rb(t, E5(n)),
    velocity: w5(n, 0.1)
  };
}
function E5(t) {
  return t[0];
}
function RM(t) {
  return t[t.length - 1];
}
function w5(t, n) {
  if (t.length < 2)
    return { x: 0, y: 0 };
  let s = t.length - 1, r = null;
  const o = RM(t);
  for (; s >= 0 && (r = t[s], !(o.timestamp - r.timestamp > /* @__PURE__ */ Cn(n))); )
    s--;
  if (!r)
    return { x: 0, y: 0 };
  r === t[0] && t.length > 2 && o.timestamp - r.timestamp > /* @__PURE__ */ Cn(n) * 2 && (r = t[1]);
  const u = /* @__PURE__ */ Qn(o.timestamp - r.timestamp);
  if (u === 0)
    return { x: 0, y: 0 };
  const c = {
    x: (o.x - r.x) / u,
    y: (o.y - r.y) / u
  };
  return c.x === 1 / 0 && (c.x = 0), c.y === 1 / 0 && (c.y = 0), c;
}
function D5(t, { min: n, max: s }, r) {
  return n !== void 0 && t < n ? t = r ? de(n, t, r.min) : Math.max(t, n) : s !== void 0 && t > s && (t = r ? de(s, t, r.max) : Math.min(t, s)), t;
}
function Ob(t, n, s) {
  return {
    min: n !== void 0 ? t.min + n : void 0,
    max: s !== void 0 ? t.max + s - (t.max - t.min) : void 0
  };
}
function j5(t, { top: n, left: s, bottom: r, right: o }) {
  return {
    x: Ob(t.x, s, o),
    y: Ob(t.y, n, r)
  };
}
function zb(t, n) {
  let s = n.min - t.min, r = n.max - t.max;
  return n.max - n.min < t.max - t.min && ([s, r] = [r, s]), { min: s, max: r };
}
function N5(t, n) {
  return {
    x: zb(t.x, n.x),
    y: zb(t.y, n.y)
  };
}
function R5(t, n) {
  let s = 0.5;
  const r = pn(t), o = pn(n);
  return o > r ? s = /* @__PURE__ */ Ur(n.min, n.max - r, t.min) : r > o && (s = /* @__PURE__ */ Ur(t.min, t.max - o, n.min)), Ai(0, 1, s);
}
function O5(t, n) {
  const s = {};
  return n.min !== void 0 && (s.min = n.min - t.min), n.max !== void 0 && (s.max = n.max - t.min), s;
}
const op = 0.35;
function z5(t = op) {
  return t === !1 ? t = 0 : t === !0 && (t = op), {
    x: kb(t, "left", "right"),
    y: kb(t, "top", "bottom")
  };
}
function kb(t, n, s) {
  return {
    min: Lb(t, n),
    max: Lb(t, s)
  };
}
function Lb(t, n) {
  return typeof t == "number" ? t : t[n] || 0;
}
const k5 = /* @__PURE__ */ new WeakMap();
class L5 {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = ke(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: s = !1, distanceThreshold: r } = {}) {
    const { presenceContext: o } = this.visualElement;
    if (o && o.isPresent === !1)
      return;
    const u = (y) => {
      s && this.snapToCursor(Ml(y).point), this.stopAnimation();
    }, c = (y, x) => {
      const { drag: T, dragPropagation: S, onDragStart: A } = this.getProps();
      if (T && !S && (this.openDragLock && this.openDragLock(), this.openDragLock = vR(T), !this.openDragLock))
        return;
      this.latestPointerEvent = y, this.latestPanInfo = x, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), vi((N) => {
        let R = this.getAxisMotionValue(N).get() || 0;
        if (Si.test(R)) {
          const { projection: O } = this.visualElement;
          if (O && O.layout) {
            const k = O.layout.layoutBox[N];
            k && (R = pn(k) * (parseFloat(R) / 100));
          }
        }
        this.originPoint[N] = R;
      }), A && re.update(() => A(y, x), !1, !0), Jm(this.visualElement, "transform");
      const { animationState: C } = this.visualElement;
      C && C.setActive("whileDrag", !0);
    }, d = (y, x) => {
      this.latestPointerEvent = y, this.latestPanInfo = x;
      const { dragPropagation: T, dragDirectionLock: S, onDirectionLock: A, onDrag: C } = this.getProps();
      if (!T && !this.openDragLock)
        return;
      const { offset: N } = x;
      if (S && this.currentDirection === null) {
        this.currentDirection = V5(N), this.currentDirection !== null && A && A(this.currentDirection);
        return;
      }
      this.updateAxis("x", x.point, N), this.updateAxis("y", x.point, N), this.visualElement.render(), C && re.update(() => C(y, x), !1, !0);
    }, p = (y, x) => {
      this.latestPointerEvent = y, this.latestPanInfo = x, this.stop(y, x), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, h = () => {
      const { dragSnapToOrigin: y } = this.getProps();
      (y || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: g } = this.getProps();
    this.panSession = new NM(n, {
      onSessionStart: u,
      onStart: c,
      onMove: d,
      onSessionEnd: p,
      resumeAnimation: h
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: g,
      distanceThreshold: r,
      contextWindow: jM(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(n, s) {
    const r = n || this.latestPointerEvent, o = s || this.latestPanInfo, u = this.isDragging;
    if (this.cancel(), !u || !o || !r)
      return;
    const { velocity: c } = o;
    this.startAnimation(c);
    const { onDragEnd: d } = this.getProps();
    d && re.postRender(() => d(r, o));
  }
  /**
   * @internal
   */
  cancel() {
    this.isDragging = !1;
    const { projection: n, animationState: s } = this.visualElement;
    n && (n.isAnimationBlocked = !1), this.endPanSession();
    const { dragPropagation: r } = this.getProps();
    !r && this.openDragLock && (this.openDragLock(), this.openDragLock = null), s && s.setActive("whileDrag", !1);
  }
  /**
   * Clean up the pan session without modifying other drag state.
   * This is used during unmount to ensure event listeners are removed
   * without affecting projection animations or drag locks.
   * @internal
   */
  endPanSession() {
    this.panSession && this.panSession.end(), this.panSession = void 0;
  }
  updateAxis(n, s, r) {
    const { drag: o } = this.getProps();
    if (!r || !Pu(n, o, this.currentDirection))
      return;
    const u = this.getAxisMotionValue(n);
    let c = this.originPoint[n] + r[n];
    this.constraints && this.constraints[n] && (c = D5(c, this.constraints[n], this.elastic[n])), u.set(c);
  }
  resolveConstraints() {
    const { dragConstraints: n, dragElastic: s } = this.getProps(), r = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : this.visualElement.projection?.layout, o = this.constraints;
    n && vr(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && r ? this.constraints = j5(r.layoutBox, n) : this.constraints = !1, this.elastic = z5(s), o !== this.constraints && !vr(n) && r && this.constraints && !this.hasMutatedConstraints && vi((u) => {
      this.constraints !== !1 && this.getAxisMotionValue(u) && (this.constraints[u] = O5(r.layoutBox[u], this.constraints[u]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: s } = this.getProps();
    if (!n || !vr(n))
      return !1;
    const r = n.current, { projection: o } = this.visualElement;
    if (!o || !o.layout)
      return !1;
    o.root && (o.root.scroll = void 0, o.root.updateScroll());
    const u = PR(r, o.root, this.visualElement.getTransformPagePoint());
    let c = N5(o.layout.layoutBox, u);
    if (s) {
      const d = s(GR(c));
      this.hasMutatedConstraints = !!d, d && (c = J2(d));
    }
    return c;
  }
  startAnimation(n) {
    const { drag: s, dragMomentum: r, dragElastic: o, dragTransition: u, dragSnapToOrigin: c, onDragTransitionEnd: d } = this.getProps(), p = this.constraints || {}, h = vi((g) => {
      if (!Pu(g, s, this.currentDirection))
        return;
      let y = p && p[g] || {};
      (c === !0 || c === g) && (y = { min: 0, max: 0 });
      const x = o ? 200 : 1e6, T = o ? 40 : 1e7, S = {
        type: "inertia",
        velocity: r ? n[g] : 0,
        bounceStiffness: x,
        bounceDamping: T,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...u,
        ...y
      };
      return this.startAxisValueAnimation(g, S);
    });
    return Promise.all(h).then(d);
  }
  startAxisValueAnimation(n, s) {
    const r = this.getAxisMotionValue(n);
    return Jm(this.visualElement, n), r.start($p(n, r, 0, s, this.visualElement, !1));
  }
  stopAnimation() {
    vi((n) => this.getAxisMotionValue(n).stop());
  }
  /**
   * Drag works differently depending on which props are provided.
   *
   * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
   * - Otherwise, we apply the delta to the x/y motion values.
   */
  getAxisMotionValue(n) {
    const s = `_drag${n.toUpperCase()}`, o = this.visualElement.getProps()[s];
    return o || this.visualElement.getValue(n, this.visualElement.latestValues[n] ?? 0);
  }
  snapToCursor(n) {
    vi((s) => {
      const { drag: r } = this.getProps();
      if (!Pu(s, r, this.currentDirection))
        return;
      const { projection: o } = this.visualElement, u = this.getAxisMotionValue(s);
      if (o && o.layout) {
        const { min: c, max: d } = o.layout.layoutBox[s], p = u.get() || 0;
        u.set(n[s] - de(c, d, 0.5) + p);
      }
    });
  }
  /**
   * When the viewport resizes we want to check if the measured constraints
   * have changed and, if so, reposition the element within those new constraints
   * relative to where it was before the resize.
   */
  scalePositionWithinConstraints() {
    if (!this.visualElement.current)
      return;
    const { drag: n, dragConstraints: s } = this.getProps(), { projection: r } = this.visualElement;
    if (!vr(s) || !r || !this.constraints)
      return;
    this.stopAnimation();
    const o = { x: 0, y: 0 };
    vi((c) => {
      const d = this.getAxisMotionValue(c);
      if (d && this.constraints !== !1) {
        const p = d.get();
        o[c] = R5({ min: p, max: p }, this.constraints[c]);
      }
    });
    const { transformTemplate: u } = this.visualElement.getProps();
    this.visualElement.current.style.transform = u ? u({}, "") : "none", r.root && r.root.updateScroll(), r.updateLayout(), this.constraints = !1, this.resolveConstraints(), vi((c) => {
      if (!Pu(c, n, null))
        return;
      const d = this.getAxisMotionValue(c), { min: p, max: h } = this.constraints[c];
      d.set(de(p, h, o[c]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    k5.set(this.visualElement, this);
    const n = this.visualElement.current, s = il(n, "pointerdown", (h) => {
      const { drag: g, dragListener: y = !0 } = this.getProps(), x = h.target, T = x !== n && AR(x);
      g && y && !T && this.start(h);
    });
    let r;
    const o = () => {
      const { dragConstraints: h } = this.getProps();
      vr(h) && h.current && (this.constraints = this.resolveRefConstraints(), r || (r = U5(n, h.current, () => this.scalePositionWithinConstraints())));
    }, { projection: u } = this.visualElement, c = u.addEventListener("measure", o);
    u && !u.layout && (u.root && u.root.updateScroll(), u.updateLayout()), re.read(o);
    const d = ml(window, "resize", () => this.scalePositionWithinConstraints()), p = u.addEventListener("didUpdate", (({ delta: h, hasLayoutChanged: g }) => {
      this.isDragging && g && (vi((y) => {
        const x = this.getAxisMotionValue(y);
        x && (this.originPoint[y] += h[y].translate, x.set(x.get() + h[y].translate));
      }), this.visualElement.render());
    }));
    return () => {
      d(), s(), c(), p && p(), r && r();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: s = !1, dragDirectionLock: r = !1, dragPropagation: o = !1, dragConstraints: u = !1, dragElastic: c = op, dragMomentum: d = !0 } = n;
    return {
      ...n,
      drag: s,
      dragDirectionLock: r,
      dragPropagation: o,
      dragConstraints: u,
      dragElastic: c,
      dragMomentum: d
    };
  }
}
function Ub(t) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    t();
  };
}
function U5(t, n, s) {
  const r = Px(t, Ub(s)), o = Px(n, Ub(s));
  return () => {
    r(), o();
  };
}
function Pu(t, n, s) {
  return (n === !0 || n === t) && (s === null || s === t);
}
function V5(t, n = 10) {
  let s = null;
  return Math.abs(t.y) > n ? s = "y" : Math.abs(t.x) > n && (s = "x"), s;
}
class B5 extends Hs {
  constructor(n) {
    super(n), this.removeGroupControls = Jn, this.removeListeners = Jn, this.controls = new L5(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Jn;
  }
  update() {
    const { dragControls: n } = this.node.getProps(), { dragControls: s } = this.node.prevProps || {};
    n !== s && (this.removeGroupControls(), n && (this.removeGroupControls = n.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const fm = (t) => (n, s) => {
  t && re.update(() => t(n, s), !1, !0);
};
class H5 extends Hs {
  constructor() {
    super(...arguments), this.removePointerDownListener = Jn;
  }
  onPointerDown(n) {
    this.session = new NM(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: jM(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: s, onPan: r, onPanEnd: o } = this.node.getProps();
    return {
      onSessionStart: fm(n),
      onStart: fm(s),
      onMove: fm(r),
      onEnd: (u, c) => {
        delete this.session, o && re.postRender(() => o(u, c));
      }
    };
  }
  mount() {
    this.removePointerDownListener = il(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let dm = !1;
class Y5 extends E.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: s, switchLayoutGroup: r, layoutId: o } = this.props, { projection: u } = n;
    u && (s.group && s.group.add(u), r && r.register && o && r.register(u), dm && u.root.didUpdate(), u.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), u.setOptions({
      ...u.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), oc.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: s, visualElement: r, drag: o, isPresent: u } = this.props, { projection: c } = r;
    return c && (c.isPresent = u, n.layoutDependency !== s && c.setOptions({
      ...c.options,
      layoutDependency: s
    }), dm = !0, o || n.layoutDependency !== s || s === void 0 || n.isPresent !== u ? c.willUpdate() : this.safeToRemove(), n.isPresent !== u && (u ? c.promote() : c.relegate() || re.postRender(() => {
      const d = c.getStack();
      (!d || !d.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: s } = this.props, { projection: r } = n;
    r && (r.options.layoutAnchor = s, r.root.didUpdate(), t0.postRender(() => {
      !r.currentAnimation && r.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: s, switchLayoutGroup: r } = this.props, { projection: o } = n;
    dm = !0, o && (o.scheduleCheckAfterUnmount(), s && s.group && s.group.remove(o), r && r.deregister && r.deregister(o));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function OM(t) {
  const [n, s] = $O(), r = E.useContext(qS);
  return v.jsx(Y5, { ...t, layoutGroup: r, switchLayoutGroup: E.useContext(wM), isPresent: n, safeToRemove: s });
}
const G5 = {
  pan: {
    Feature: H5
  },
  drag: {
    Feature: B5,
    ProjectionNode: SM,
    MeasureLayout: OM
  }
};
function Vb(t, n, s) {
  const { props: r } = t;
  t.animationState && r.whileHover && t.animationState.setActive("whileHover", s === "Start");
  const o = "onHover" + s, u = r[o];
  u && re.postRender(() => u(n, Ml(n)));
}
class q5 extends Hs {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = bR(n, (s, r) => (Vb(this.node, r, "Start"), (o) => Vb(this.node, o, "End"))));
  }
  unmount() {
  }
}
class X5 extends Hs {
  constructor() {
    super(...arguments), this.isActive = !1;
  }
  onFocus() {
    let n = !1;
    try {
      n = this.node.current.matches(":focus-visible");
    } catch {
      n = !0;
    }
    !n || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !0), this.isActive = !0);
  }
  onBlur() {
    !this.isActive || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !1), this.isActive = !1);
  }
  mount() {
    this.unmount = bl(ml(this.node.current, "focus", () => this.onFocus()), ml(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Bb(t, n, s) {
  const { props: r } = t;
  if (t.current instanceof HTMLButtonElement && t.current.disabled)
    return;
  t.animationState && r.whileTap && t.animationState.setActive("whileTap", s === "Start");
  const o = "onTap" + (s === "End" ? "" : s), u = r[o];
  u && re.postRender(() => u(n, Ml(n)));
}
class P5 extends Hs {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: s, propagate: r } = this.node.props;
    this.unmount = _R(n, (o, u) => (Bb(this.node, u, "Start"), (c, { success: d }) => Bb(this.node, c, d ? "End" : "Cancel")), {
      useGlobalTarget: s,
      stopPropagation: r?.tap === !1
    });
  }
  unmount() {
  }
}
const lp = /* @__PURE__ */ new WeakMap(), hm = /* @__PURE__ */ new WeakMap(), I5 = (t) => {
  const n = lp.get(t.target);
  n && n(t);
}, F5 = (t) => {
  t.forEach(I5);
};
function $5({ root: t, ...n }) {
  const s = t || document;
  hm.has(s) || hm.set(s, {});
  const r = hm.get(s), o = JSON.stringify(n);
  return r[o] || (r[o] = new IntersectionObserver(F5, { root: t, ...n })), r[o];
}
function K5(t, n, s) {
  const r = $5(n);
  return lp.set(t, s), r.observe(t), () => {
    lp.delete(t), r.unobserve(t);
  };
}
const Z5 = {
  some: 0,
  all: 1
};
class Q5 extends Hs {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    this.stopObserver?.();
    const { viewport: n = {} } = this.node.getProps(), { root: s, margin: r, amount: o = "some", once: u } = n, c = {
      root: s ? s.current : void 0,
      rootMargin: r,
      threshold: typeof o == "number" ? o : Z5[o]
    }, d = (p) => {
      const { isIntersecting: h } = p;
      if (this.isInView === h || (this.isInView = h, u && !h && this.hasEnteredView))
        return;
      h && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", h);
      const { onViewportEnter: g, onViewportLeave: y } = this.node.getProps(), x = h ? g : y;
      x && x(p);
    };
    this.stopObserver = K5(this.node.current, c, d);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: s } = this.node;
    ["amount", "margin", "root"].some(J5(n, s)) && this.startObserver();
  }
  unmount() {
    this.stopObserver?.(), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function J5({ viewport: t = {} }, { viewport: n = {} } = {}) {
  return (s) => t[s] !== n[s];
}
const W5 = {
  inView: {
    Feature: Q5
  },
  tap: {
    Feature: P5
  },
  focus: {
    Feature: X5
  },
  hover: {
    Feature: q5
  }
}, t4 = {
  layout: {
    ProjectionNode: SM,
    MeasureLayout: OM
  }
}, e4 = {
  ...A5,
  ...W5,
  ...G5,
  ...t4
}, n4 = /* @__PURE__ */ x5(e4, b5);
function tf(t) {
  const n = Rp(() => Ls(t)), { isStatic: s } = E.useContext(Jc);
  if (s) {
    const [, r] = E.useState(t);
    E.useEffect(() => n.on("change", r), []);
  }
  return n;
}
function zM(t, n) {
  const s = tf(n()), r = () => s.set(n());
  return r(), XS(() => {
    const o = () => re.preRender(r, !1, !0), u = t.map((c) => c.on("change", o));
    return () => {
      u.forEach((c) => c()), Wi(r);
    };
  }), s;
}
function i4(t) {
  el.current = [], t();
  const n = zM(el.current, t);
  return el.current = void 0, n;
}
function ba(t, n, s, r) {
  if (typeof t == "function")
    return i4(t);
  const u = typeof n == "function" ? n : kR(n, s, r), c = Array.isArray(t) ? Hb(t, u) : Hb([t], ([p]) => u(p)), d = Array.isArray(t) ? void 0 : t.accelerate;
  return d && !d.isTransformed && typeof n != "function" && Array.isArray(s) && r?.clamp !== !1 && (c.accelerate = {
    ...d,
    times: n,
    keyframes: s,
    isTransformed: !0
  }), c;
}
function Hb(t, n) {
  const s = Rp(() => []);
  return zM(t, () => {
    s.length = 0;
    const r = t.length;
    for (let o = 0; o < r; o++)
      s[o] = t[o].get();
    return n(s);
  });
}
function s4(t, n = {}) {
  const { isStatic: s } = E.useContext(Jc), r = () => De(t) ? t.get() : t;
  if (s)
    return ba(r);
  const o = tf(r());
  return E.useInsertionEffect(() => LR(o, t, n), [o, JSON.stringify(n)]), o;
}
function zn(t, n = {}) {
  return s4(t, { type: "spring", ...n });
}
function ef() {
  !s0.current && $2();
  const [t] = E.useState(Dc.current);
  return t;
}
function u0(t) {
  return typeof t == "object" && !Array.isArray(t);
}
function kM(t, n, s, r) {
  return t == null ? [] : typeof t == "string" && u0(n) ? Wp(t, s, r) : t instanceof NodeList ? Array.from(t) : Array.isArray(t) ? t.filter((o) => o != null) : [t];
}
function a4(t, n, s) {
  return t * (n + 1) + s * n;
}
function Yb(t, n, s, r) {
  return typeof n == "number" ? n : n.startsWith("-") || n.startsWith("+") ? Math.max(0, t + parseFloat(n)) : n === "<" ? s : n.startsWith("<") ? Math.max(0, s + parseFloat(n.slice(1))) : r.get(n) ?? t;
}
function r4(t, n, s) {
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    o.at > n && o.at < s && (Lr(t, o), r--);
  }
}
function o4(t, n, s, r, o, u) {
  r4(t, o, u);
  for (let c = 0; c < n.length; c++)
    t.push({
      value: n[c],
      at: de(o, u, r[c]),
      easing: /* @__PURE__ */ a2(s, c)
    });
}
function l4(t, n, s = 0) {
  const r = n + 1 + n * s;
  for (let o = 0; o < t.length; o++)
    t[o] = t[o] / r;
}
function u4(t, n) {
  return t.at === n.at ? t.value === null ? 1 : n.value === null ? -1 : 0 : t.at - n.at;
}
const c4 = "easeInOut", f4 = 20;
function d4(t, { defaultTransition: n = {}, ...s } = {}, r, o) {
  const u = n.duration || 0.3, c = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map(), p = {}, h = /* @__PURE__ */ new Map();
  let g = 0, y = 0, x = 0;
  for (let T = 0; T < t.length; T++) {
    const S = t[T];
    if (typeof S == "string") {
      h.set(S, y);
      continue;
    } else if (!Array.isArray(S)) {
      h.set(S.name, Yb(y, S.at, g, h));
      continue;
    }
    let [A, C, N = {}] = S;
    N.at !== void 0 && (y = Yb(y, N.at, g, h));
    let R = 0;
    const O = (k, H, G, X = 0, Y = 0) => {
      const Z = h4(k), { delay: J = 0, times: W = T2(Z), type: ut = n.type || "keyframes", repeat: lt, repeatType: dt, repeatDelay: ot = 0, ...D } = H;
      let { ease: q = n.ease || "easeOut", duration: w } = H;
      const L = typeof J == "function" ? J(X, Y) : J, U = Z.length, _ = Ip(ut) ? ut : o?.[ut || "keyframes"];
      if (U <= 2 && _) {
        let rt = 100;
        if (U === 2 && g4(Z)) {
          const Tt = Z[1] - Z[0];
          rt = Math.abs(Tt);
        }
        const st = {
          ...n,
          ...D
        };
        w !== void 0 && (st.duration = /* @__PURE__ */ Cn(w));
        const ft = y2(st, rt, _);
        q = ft.ease, w = ft.duration;
      }
      w ?? (w = u);
      const V = y + L;
      W.length === 1 && W[0] === 0 && (W[1] = 1);
      const nt = W.length - Z.length;
      if (nt > 0 && b2(W, nt), Z.length === 1 && Z.unshift(null), lt && lt < f4) {
        const rt = w > 0 ? ot / w : 0;
        w = a4(w, lt, ot);
        const st = [...Z], ft = [...W];
        q = Array.isArray(q) ? [...q] : [q];
        const Tt = [...q], P = dt === "reverse" || dt === "mirror";
        let ct = st, ht = Tt;
        P && (ct = [...st].reverse(), dt === "reverse" && (ht = [...Tt].reverse().map((I) => typeof I == "function" ? /* @__PURE__ */ Lp(I) : I)));
        for (let I = 0; I < lt; I++) {
          const gt = P && I % 2 === 0, mt = gt ? ct : st, Et = gt ? ht : Tt, St = (I + 1) * (1 + rt);
          rt > 0 && (Z.push(Z[Z.length - 1]), W.push(St), q.push("linear")), Z.push(...mt);
          for (let wt = 0; wt < mt.length; wt++)
            W.push(ft[wt] + St), q.push(wt === 0 ? "linear" : /* @__PURE__ */ a2(Et, wt - 1));
        }
        l4(W, lt, rt);
      }
      const at = V + w;
      o4(G, Z, q, W, V, at), R = Math.max(L + w, R), x = Math.max(at, x);
    };
    if (De(A)) {
      const k = Gb(A, d);
      O(C, N, qb("default", k));
    } else {
      const k = kM(A, C, r, p), H = k.length;
      for (let G = 0; G < H; G++) {
        C = C, N = N;
        const X = k[G], Y = Gb(X, d);
        for (const Z in C)
          O(C[Z], m4(N, Z), qb(Z, Y), G, H);
      }
    }
    g = y, y += R;
  }
  return d.forEach((T, S) => {
    for (const A in T) {
      const C = T[A];
      C.sort(u4);
      const N = [], R = [], O = [];
      for (let X = 0; X < C.length; X++) {
        const { at: Y, value: Z, easing: J } = C[X];
        N.push(Z), R.push(/* @__PURE__ */ Ur(0, x, Y)), O.push(J || "easeOut");
      }
      R[0] !== 0 && (R.unshift(0), N.unshift(N[0]), O.unshift(c4)), R[R.length - 1] !== 1 && (R.push(1), N.push(null)), c.has(S) || c.set(S, {
        keyframes: {},
        transition: {}
      });
      const k = c.get(S);
      k.keyframes[A] = N;
      const { type: H, ...G } = n;
      k.transition[A] = {
        ...G,
        duration: x,
        ease: O,
        times: R,
        ...s
      };
    }
  }), c;
}
function Gb(t, n) {
  return !n.has(t) && n.set(t, {}), n.get(t);
}
function qb(t, n) {
  return n[t] || (n[t] = []), n[t];
}
function h4(t) {
  return Array.isArray(t) ? t : [t];
}
function m4(t, n) {
  return t && t[n] ? {
    ...t,
    ...t[n]
  } : { ...t };
}
const p4 = (t) => typeof t == "number", g4 = (t) => t.every(p4);
function y4(t) {
  const n = {
    presenceContext: null,
    props: {},
    visualState: {
      renderState: {
        transform: {},
        transformOrigin: {},
        style: {},
        vars: {},
        attrs: {}
      },
      latestValues: {}
    }
  }, s = Kc(t) && !I2(t) ? new cM(n) : new sM(n);
  s.mount(t), dl.set(t, s);
}
function v4(t) {
  const n = {
    presenceContext: null,
    props: {},
    visualState: {
      renderState: {
        output: {}
      },
      latestValues: {}
    }
  }, s = new JR(n);
  s.mount(t), dl.set(t, s);
}
function x4(t, n) {
  return De(t) || typeof t == "number" || typeof t == "string" && !u0(n);
}
function LM(t, n, s, r) {
  const o = [];
  if (x4(t, n))
    o.push(vM(t, u0(n) && n.default || n, s && (s.default || s)));
  else {
    if (t == null)
      return o;
    const u = kM(t, n, r), c = u.length;
    for (let d = 0; d < c; d++) {
      const p = u[d], h = p instanceof Element ? y4 : v4;
      dl.has(p) || h(p);
      const g = dl.get(p), y = { ...s };
      "delay" in y && typeof y.delay == "function" && (y.delay = y.delay(d, c)), o.push(...Qp(g, { ...n, transition: y }, {}));
    }
  }
  return o;
}
function b4(t, n, s) {
  const r = [], o = t.map((c) => {
    if (Array.isArray(c) && typeof c[0] == "function") {
      const d = c[0], p = Ls(0);
      return p.on("change", d), c.length === 1 ? [p, [0, 1]] : c.length === 2 ? [p, [0, 1], c[1]] : [p, c[1], c[2]];
    }
    return c;
  });
  return d4(o, n, s, { spring: cl }).forEach(({ keyframes: c, transition: d }, p) => {
    r.push(...LM(p, c, d));
  }), r;
}
function T4(t) {
  return Array.isArray(t) && t.some(Array.isArray);
}
function S4(t = {}) {
  const { scope: n, reduceMotion: s, skipAnimations: r } = t;
  function o(u, c, d) {
    let p = [], h;
    const g = {};
    if (s !== void 0 && (g.reduceMotion = s), r !== void 0 && (g.skipAnimations = r), T4(u)) {
      const { onComplete: x, ...T } = c || {};
      typeof x == "function" && (h = x), p = b4(u, { ...g, ...T }, n);
    } else {
      const { onComplete: x, ...T } = d || {};
      typeof x == "function" && (h = x), p = LM(u, c, { ...g, ...T }, n);
    }
    const y = new B3(p);
    return h && y.finished.then(h), n && (n.animations.push(y), y.finished.then(() => {
      Lr(n.animations, y);
    })), y;
  }
  return o;
}
const Os = S4(), Se = n4, up = 2.2, UM = 280, VM = 0.45, M4 = 30, ui = [0.85, 0, 0.15, 1], sl = 10;
function A4(t) {
  switch (t) {
    case "loading":
      return "loop";
    case "exiting":
      return "exit";
    case "revealingLoading":
      return "enter";
    default:
      return null;
  }
}
function C4(t, n, s, r) {
  const o = tf(0), u = t + sl * 2, c = t + sl, d = ba(o, (h) => h <= 0.5 ? h / 0.5 * u : (1 - (h - 0.5) / 0.5) * u), p = ba(o, (h) => {
    if (h <= 0.5)
      return -sl;
    const g = (h - 0.5) / 0.5;
    return c - (1 - g) * u;
  });
  return E.useEffect(() => {
    if (t <= 0)
      return;
    const h = up / 2;
    let g = !1, y;
    const x = () => {
      g || r?.();
    }, T = (S) => {
      const A = h * ((1 - S) / 0.5);
      y = Os(o, 1, {
        duration: Math.max(A, 0.01),
        ease: [...ui],
        onComplete: x
      });
    };
    if (n === "loop")
      return o.set(0), y = Os(o, 1, {
        duration: up,
        ease: [...ui],
        onComplete: x
      }), () => {
        g = !0, y?.stop();
      };
    if (n === "exit") {
      const S = o.get();
      if (S < 0.5) {
        const A = h * ((0.5 - S) / 0.5);
        y = Os(o, 0.5, {
          duration: Math.max(A, 0.01),
          ease: [...ui],
          onComplete: () => {
            g || T(0.5);
          }
        });
      } else
        T(S);
      return () => {
        g = !0, y?.stop();
      };
    }
    if (n === "enter")
      return o.set(0), y = Os(o, 0.5, {
        duration: h,
        ease: [...ui],
        onComplete: x
      }), () => {
        g = !0, y?.stop();
      };
  }, [t, s, n, r, o]), { clipX: p, clipWidth: d };
}
function BM({
  pathD: t,
  mode: n = "loop",
  loopEpoch: s = 0,
  stroke: r = gn.foreground,
  strokeOpacity: o = 0.5,
  strokeWidth: u = 2.5,
  onCycleComplete: c
}) {
  const { innerWidth: d, innerHeight: p } = Wn(), h = E.useId(), g = `line-loading-clip-${h}`, y = `line-loading-gradient-${h}`, x = Em(Tp(!0)), T = p + sl * 2, { clipX: S, clipWidth: A } = C4(
    d,
    n,
    s,
    c
  );
  return d <= 0 ? null : /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    /* @__PURE__ */ v.jsxs("defs", { children: [
      /* @__PURE__ */ v.jsx("clipPath", { id: g, children: /* @__PURE__ */ v.jsx(
        Se.rect,
        {
          height: T,
          style: { width: A, x: S },
          y: -sl
        }
      ) }),
      /* @__PURE__ */ v.jsx(
        "linearGradient",
        {
          id: y,
          ...wm(d),
          children: x.map((C) => /* @__PURE__ */ v.jsx(
            "stop",
            {
              offset: C.offset,
              stopColor: r,
              stopOpacity: C.opacity
            },
            C.offset
          ))
        }
      )
    ] }),
    /* @__PURE__ */ v.jsx(
      "path",
      {
        clipPath: `url(#${g})`,
        d: t,
        fill: "none",
        opacity: o,
        stroke: `url(#${y})`,
        strokeLinecap: "round",
        strokeWidth: u
      }
    )
  ] });
}
BM.displayName = "LineLoadingPulseStroke";
const _4 = 2, mm = -1, E4 = 2, w4 = 25, D4 = 20, j4 = 80, N4 = 14, R4 = 0.55, O4 = 0.18, z4 = 0.02;
function k4(t) {
  const n = Math.sin(t) * 43758.5453;
  return n - Math.floor(n);
}
function L4(t, n = 0, s = D4, r = j4) {
  const o = r - s;
  return Array.from(
    { length: t },
    (u, c) => s + Math.floor(k4((c + 1) * 12.9898 + n) * o)
  );
}
function U4(t = 17, n = 0.05, s = 0.9) {
  return Array.from({ length: t }, (r, o) => {
    const u = o / (t - 1), c = Math.sin(u * Math.PI) ** 2, d = n + c * (s - n);
    return {
      offset: `${(u * 100).toFixed(0)}%`,
      opacity: Number(d.toFixed(3))
    };
  });
}
function V4({
  chartId: t,
  width: n,
  height: s,
  durationSeconds: r,
  onSweepComplete: o
}) {
  const u = E.useMemo(() => U4(), []), c = E.useRef(mm), d = E.useCallback(
    (p) => {
      const h = typeof p.x == "number" ? p.x : mm;
      h >= 1 && c.current < 1 && o(), c.current = h;
    },
    [o]
  );
  return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    /* @__PURE__ */ v.jsx("linearGradient", { id: `${t}-grad`, x1: "0", x2: "1", y1: "0", y2: "0", children: u.map(({ offset: p, opacity: h }) => /* @__PURE__ */ v.jsx(
      "stop",
      {
        offset: p,
        stopColor: "white",
        stopOpacity: h
      },
      p
    )) }),
    /* @__PURE__ */ v.jsx(
      "pattern",
      {
        height: "1",
        id: `${t}-pattern`,
        patternContentUnits: "objectBoundingBox",
        patternTransform: `rotate(${w4})`,
        patternUnits: "objectBoundingBox",
        width: 3,
        x: "0",
        y: "0",
        children: /* @__PURE__ */ v.jsx(
          Se.rect,
          {
            animate: { x: E4 },
            fill: `url(#${t}-grad)`,
            height: "1",
            initial: { x: mm },
            onUpdate: d,
            transition: {
              duration: r,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop"
            },
            width: "1",
            y: "0"
          }
        )
      }
    ),
    /* @__PURE__ */ v.jsx("mask", { id: `${t}-mask`, maskUnits: "userSpaceOnUse", children: /* @__PURE__ */ v.jsx("rect", { fill: `url(#${t}-pattern)`, height: s, width: n }) })
  ] });
}
function HM({
  curve: t,
  withArea: n = !1,
  mode: s = "loop",
  onTransitionComplete: r,
  stroke: o = gn.foreground,
  strokeOpacity: u = R4,
  strokeWidth: c = 2,
  pointCount: d = N4,
  durationSeconds: p = _4
}) {
  const { innerWidth: h, innerHeight: g } = Wn(), y = ef(), T = `line-sweep-${E.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`, S = s === "loop", [A, C] = E.useState(0), N = E.useCallback(() => {
    S && C((ut) => ut + 1);
  }, [S]), R = E.useMemo(
    () => L4(d, A),
    [d, A]
  );
  if (E.useEffect(() => {
    y && !S && r?.();
  }, [y, S, r]), h <= 0 || g <= 0 || R.length < 2)
    return null;
  const O = kr({
    domain: [0, R.length - 1],
    range: [0, h]
  }), k = kr({ domain: [0, 100], range: [g, 0] }), H = R.map((ut, lt) => ({ index: lt, value: ut })), G = (ut) => O(ut.index), X = (ut) => k(ut.value), Y = /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    n ? /* @__PURE__ */ v.jsx(
      bp,
      {
        curve: t,
        data: H,
        fill: `url(#${T}-area)`,
        x: G,
        y: X,
        yScale: k
      }
    ) : null,
    /* @__PURE__ */ v.jsx(
      sS,
      {
        curve: t,
        data: H,
        fill: "none",
        stroke: o,
        strokeLinecap: "round",
        strokeOpacity: u,
        strokeWidth: c,
        x: G,
        y: X
      }
    )
  ] }), Z = n ? /* @__PURE__ */ v.jsxs("linearGradient", { id: `${T}-area`, x1: "0", x2: "0", y1: "0", y2: "1", children: [
    /* @__PURE__ */ v.jsx(
      "stop",
      {
        offset: "0%",
        stopColor: o,
        stopOpacity: O4
      }
    ),
    /* @__PURE__ */ v.jsx(
      "stop",
      {
        offset: "100%",
        stopColor: o,
        stopOpacity: z4
      }
    )
  ] }) : null;
  if (y)
    return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
      Z ? /* @__PURE__ */ v.jsx("defs", { children: Z }) : null,
      Y
    ] });
  const J = `url(#${T}-mask)`, W = /* @__PURE__ */ v.jsxs("defs", { children: [
    Z,
    /* @__PURE__ */ v.jsx(
      V4,
      {
        chartId: T,
        durationSeconds: p,
        height: g,
        onSweepComplete: N,
        width: h
      }
    )
  ] });
  return S ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    W,
    /* @__PURE__ */ v.jsx("g", { mask: J, children: Y })
  ] }) : /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    W,
    /* @__PURE__ */ v.jsx(
      Se.g,
      {
        animate: { opacity: s === "exit" ? 0 : 1 },
        initial: { opacity: s === "exit" ? 1 : 0 },
        mask: J,
        onAnimationComplete: r,
        transition: {
          duration: VM,
          ease: [...ui]
        },
        children: Y
      }
    )
  ] });
}
HM.displayName = "LineLoadingSweep";
const B4 = { pathD: null, pathLength: 0 };
function H4(t, n) {
  const [s, r] = E.useState(B4);
  return E.useEffect(() => {
    const o = t.current;
    if (!o)
      return;
    const u = o.getAttribute("d"), c = u ? o.getTotalLength() : 0;
    r(
      (d) => d.pathD === u && d.pathLength === c ? d : { pathD: u, pathLength: c }
    );
  }, n), s;
}
function YM(t, n) {
  return t != null && t >= 0 && t < n - 1;
}
function Y4(t, n, s, r) {
  const o = t[n];
  return o ? s(r(o)) ?? 0 : 0;
}
function G4({
  pathD: t,
  pathLength: n,
  dashStartLength: s,
  dashStartX: r,
  innerWidth: o,
  innerHeight: u,
  stroke: c,
  strokeWidth: d,
  dashArray: p
}) {
  const h = E.useId().replace(/:/g, "");
  if (!t || n <= 0 || s >= n)
    return null;
  const g = d * 2, y = Math.max(0, o - r + g);
  return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    /* @__PURE__ */ v.jsx("defs", { children: /* @__PURE__ */ v.jsx("clipPath", { id: h, children: /* @__PURE__ */ v.jsx(
      "rect",
      {
        height: u + g,
        width: y,
        x: r - d,
        y: -d
      }
    ) }) }),
    /* @__PURE__ */ v.jsx(
      "path",
      {
        d: t,
        fill: "none",
        stroke: c,
        strokeDasharray: `${s} ${Math.max(1, n - s)}`,
        strokeLinecap: "round",
        strokeWidth: d
      }
    ),
    /* @__PURE__ */ v.jsx(
      "path",
      {
        clipPath: `url(#${h})`,
        d: t,
        fill: "none",
        stroke: c,
        strokeDasharray: p,
        strokeLinecap: "round",
        strokeWidth: d
      }
    )
  ] });
}
function q4({
  dashFromIndex: t,
  dashArray: n,
  data: s,
  pathD: r,
  pathLength: o,
  innerWidth: u,
  innerHeight: c,
  stroke: d,
  strokeWidth: p,
  xScale: h,
  xAccessor: g
}) {
  const y = YM(t, s.length), x = E.useMemo(() => !y || t == null ? 0 : Y4(s, t, h, g), [y, t, s, h, g]), T = E.useMemo(() => !y || t == null || o <= 0 ? 0 : t / Math.max(1, s.length - 1) * o, [y, t, s.length, o]);
  return !y || t == null || o <= 0 ? null : /* @__PURE__ */ v.jsx(
    G4,
    {
      dashArray: n,
      dashStartLength: T,
      dashStartX: x,
      innerHeight: c,
      innerWidth: u,
      pathD: r,
      pathLength: o,
      stroke: d,
      strokeWidth: p
    }
  );
}
const X4 = E.memo(q4);
function GM({
  pathRef: t,
  visible: n,
  stroke: s,
  strokeWidth: r,
  height: o,
  x: u,
  width: c
}) {
  const d = E.useId();
  return n && t.current ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    /* @__PURE__ */ v.jsx("defs", { children: /* @__PURE__ */ v.jsx("clipPath", { id: d, children: /* @__PURE__ */ v.jsx(Se.rect, { height: o, width: c, x: u, y: 0 }) }) }),
    /* @__PURE__ */ v.jsx(
      Se.path,
      {
        animate: { opacity: 1 },
        clipPath: `url(#${d})`,
        d: t.current.getAttribute("d") || "",
        exit: { opacity: 0 },
        fill: "none",
        initial: { opacity: 0 },
        stroke: s,
        strokeLinecap: "round",
        strokeWidth: r,
        transition: { duration: 0.4, ease: "easeInOut" }
      }
    )
  ] }) : null;
}
GM.displayName = "HighlightSegment";
const zc = {
  tooltipSpring: { stiffness: 300, damping: 30 },
  tooltipBoxSpring: { stiffness: 100, damping: 20 },
  highlightSpring: { stiffness: 180, damping: 28 }
}, P4 = E.createContext(null);
function wa() {
  return E.useContext(P4) ?? zc;
}
const la = zc.tooltipBoxSpring.damping;
function I4(t) {
  if (t === 0)
    return {
      animate: !1,
      springConfig: zc.tooltipBoxSpring
    };
  const n = t ?? la;
  let s = zc.tooltipBoxSpring.stiffness;
  if (n < la) {
    const r = (la - n) / la;
    s += r * 400;
  } else if (n > la) {
    const r = (n - la) / (100 - la);
    s -= r * 85;
  }
  return {
    animate: !0,
    springConfig: {
      stiffness: Math.max(12, Math.round(s)),
      damping: n
    }
  };
}
const lc = {
  x: 0,
  width: 0,
  isActive: !1
};
function F4(t, n, s, r, o) {
  if (t.length === 0)
    return lc;
  if (o?.active) {
    const x = Math.min(o.startX, o.endX), T = Math.abs(o.endX - o.startX);
    return { x, width: T, isActive: !0 };
  }
  if (!r)
    return lc;
  const u = r.index, c = Math.max(0, u - 1), d = Math.min(t.length - 1, u + 1), p = t[c], h = t[d];
  if (!(p && h))
    return lc;
  const g = n(s(p)) ?? 0, y = n(s(h)) ?? 0;
  return { x: g, width: Math.max(0, y - g), isActive: !0 };
}
function $4({
  enabled: t = !0
} = {}) {
  const { data: n, xScale: s, xAccessor: r } = Wn(), { tooltipData: o, selection: u } = xl(), { highlightSpring: c } = wa(), d = E.useMemo(
    () => t ? F4(n, s, r, o, u) : lc,
    [t, n, s, r, o, u]
  ), p = zn(0, c), h = zn(0, c), g = E.useRef(!1);
  return d.isActive && !g.current ? (p.jump(d.x), h.jump(d.width)) : (p.set(d.x), h.set(d.width)), g.current = d.isActive, { xSpring: p, widthSpring: h, isActive: d.isActive };
}
function qM({
  enabled: t,
  height: n,
  pathRef: s,
  stroke: r,
  strokeWidth: o
}) {
  const { isLoaded: u } = Wn(), { xSpring: c, widthSpring: d, isActive: p } = $4({ enabled: t });
  return /* @__PURE__ */ v.jsx(
    GM,
    {
      height: n,
      pathRef: s,
      stroke: r,
      strokeWidth: o,
      visible: t && p && u,
      width: d,
      x: c
    }
  );
}
qM.displayName = "SeriesHighlightLayer";
const K4 = E.createContext(null);
function XM() {
  return E.useContext(K4) ?? {
    hoveredIndex: null,
    setHoveredIndex: () => {
    }
  };
}
function PM({
  enabled: t = !0,
  dimOpacity: n = 0.5,
  durationSec: s = 0.4,
  seriesIndex: r,
  children: o
}) {
  const { tooltipData: u, selection: c } = xl(), { hoveredIndex: d } = XM(), p = u !== null || c?.active === !0, g = t && (p || d !== null && r !== void 0 && d !== r) ? n : 1;
  return /* @__PURE__ */ v.jsx(
    Se.g,
    {
      animate: { opacity: g },
      initial: { opacity: 1 },
      transition: { duration: s, ease: "easeInOut" },
      children: o
    }
  );
}
PM.displayName = "SeriesHoverDim";
const Z4 = "cubic-bezier(0.85, 0, 0.15, 1)", IM = 1100, kc = {
  type: "tween",
  duration: IM / 1e3,
  ease: [0.85, 0, 0.15, 1]
};
function FM(t) {
  return t?.type === "tween" ? {
    ...t,
    ease: t.ease ?? kc.ease
  } : {
    type: "tween",
    duration: typeof t?.duration == "number" ? t.duration : IM / 1e3,
    ease: kc.ease
  };
}
function $M({
  fill: t,
  stroke: n,
  strokeWidth: s,
  ringGap: r,
  outlineWidth: o,
  outlineColor: u,
  radius: c
}) {
  const d = n ?? t ?? "currentColor", p = u ?? d, h = s > 0 ? c + r + s : c, g = o > 0 ? h + o / 2 : 0;
  return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    o > 0 ? /* @__PURE__ */ v.jsx(
      "circle",
      {
        cx: 0,
        cy: 0,
        fill: "none",
        r: g,
        stroke: p,
        strokeWidth: o
      }
    ) : null,
    /* @__PURE__ */ v.jsx("circle", { cx: 0, cy: 0, fill: t, r: c }),
    s > 0 ? /* @__PURE__ */ v.jsx(
      "circle",
      {
        cx: 0,
        cy: 0,
        fill: "none",
        r: c + r + s / 2,
        stroke: d,
        strokeWidth: s
      }
    ) : null
  ] });
}
const KM = E.memo(function({
  cx: n,
  cy: s,
  scale: r = 1,
  fill: o,
  stroke: u,
  strokeWidth: c = 2,
  ringGap: d = 2,
  outlineWidth: p = 0,
  outlineColor: h,
  radius: g = 5
}) {
  return /* @__PURE__ */ v.jsx("g", { transform: `translate(${n}, ${s}) scale(${r})`, children: /* @__PURE__ */ v.jsx(
    $M,
    {
      fill: o,
      outlineColor: h,
      outlineWidth: p,
      radius: g,
      ringGap: d,
      stroke: u,
      strokeWidth: c
    }
  ) });
});
function Q4({
  dataKey: t,
  index: n,
  cx: s,
  cy: r,
  enterBlur: o = 2,
  revealDelay: u,
  revealEpoch: c,
  enterDuration: d,
  fill: p,
  stroke: h,
  strokeWidth: g = 2,
  ringGap: y = 2,
  outlineWidth: x = 0,
  outlineColor: T,
  radius: S = 5
}) {
  const A = {
    hidden: {
      opacity: 0,
      filter: `blur(${o}px)`,
      scale: 1
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        delay: u,
        duration: d,
        ease: kc.ease
      }
    }
  };
  return /* @__PURE__ */ v.jsx("g", { transform: `translate(${s}, ${r})`, children: /* @__PURE__ */ v.jsx(
    Se.g,
    {
      animate: "visible",
      initial: "hidden",
      variants: A,
      children: /* @__PURE__ */ v.jsx(
        $M,
        {
          fill: p,
          outlineColor: T,
          outlineWidth: x,
          radius: S,
          ringGap: y,
          stroke: h,
          strokeWidth: g
        }
      )
    },
    `${t}-${n}-${c}`
  ) });
}
function J4(t) {
  const n = t.radius ?? 5, s = t.strokeWidth ?? 2, r = t.ringGap ?? 2, o = t.outlineWidth ?? 0, u = t.showActiveHighlight ?? !0, c = s > 0 ? r + s : 0, d = o > 0 ? o : 0, p = u ? n * 0.35 : 0;
  return n + c + d + p + 2;
}
function ZM({
  dataKey: t,
  fill: n,
  stroke: s,
  strokeWidth: r = 2,
  ringGap: o = 2,
  outlineWidth: u = 0,
  outlineColor: c,
  radius: d = 5,
  animate: p = !0,
  fadeOnHover: h = !0,
  inactiveOpacity: g = 0.5,
  inactiveBlur: y = 2,
  enterBlur: x = 2,
  showActiveHighlight: T = !0
}) {
  const {
    data: S,
    xScale: A,
    innerWidth: C,
    enterTransition: N,
    animationDuration: R,
    revealEpoch: O,
    isLoaded: k,
    xAccessor: H,
    lines: G
  } = Wn(), X = E.useMemo(() => {
    const V = G.findIndex((nt) => nt.dataKey === t);
    return V >= 0 ? V : 0;
  }, [G, t]), Y = G[X], Z = Np(Y?.yAxisId), J = Zh[X % Zh.length] ?? Zh[0], W = n ?? Y?.stroke ?? J, ut = s ?? W, lt = E.useMemo(
    () => J4({
      radius: d,
      strokeWidth: r,
      ringGap: o,
      outlineWidth: u,
      showActiveHighlight: T
    }),
    [d, r, o, u, T]
  ), dt = FM(N).duration ?? R / 1e3, ot = 0.5, D = p && !k, q = E.useCallback(
    (V) => {
      const nt = V[t];
      return typeof nt == "number" ? Z(nt) ?? 0 : null;
    },
    [t, Z]
  ), w = E.useMemo(
    () => S.flatMap((V, nt) => {
      const at = q(V);
      if (at === null)
        return [];
      const rt = A(H(V)) ?? 0, st = Math.max(0, rt - lt), ft = C > 0 && D ? st / C * dt : 0;
      return [{ index: nt, cx: rt, cy: at, revealDelay: ft }];
    }),
    [
      S,
      q,
      A,
      H,
      C,
      D,
      dt,
      lt
    ]
  ), L = E.useMemo(
    () => ({
      fill: W,
      stroke: ut,
      strokeWidth: r,
      ringGap: o,
      outlineWidth: u,
      outlineColor: c,
      radius: d
    }),
    [
      W,
      ut,
      r,
      o,
      u,
      c,
      d
    ]
  );
  if (D)
    return /* @__PURE__ */ v.jsx("g", { children: w.map((V) => /* @__PURE__ */ v.jsx(
      Q4,
      {
        cx: V.cx,
        cy: V.cy,
        dataKey: t,
        enterBlur: x,
        enterDuration: ot,
        index: V.index,
        revealDelay: V.revealDelay,
        revealEpoch: O ?? 0,
        ...L
      },
      `${t}-${V.index}`
    )) });
  const U = w.map((V) => /* @__PURE__ */ v.jsx(
    KM,
    {
      cx: V.cx,
      cy: V.cy,
      ...L
    },
    `${t}-${V.index}`
  )), _ = T ? 1.35 : 1;
  return /* @__PURE__ */ v.jsxs("g", { children: [
    /* @__PURE__ */ v.jsx(
      W4,
      {
        enabled: h,
        inactiveBlur: y,
        inactiveOpacity: g,
        seriesIndex: X,
        children: U
      }
    ),
    /* @__PURE__ */ v.jsx(
      t6,
      {
        activeScale: _,
        enabled: h,
        markerStyle: L,
        points: w
      }
    )
  ] });
}
ZM.displayName = "SeriesMarkers";
function W4({
  enabled: t,
  inactiveOpacity: n,
  inactiveBlur: s,
  seriesIndex: r,
  children: o
}) {
  const { tooltipData: u } = xl(), { hoveredIndex: c } = XM(), p = t && (u !== null || c !== null && c !== r);
  return /* @__PURE__ */ v.jsx(
    "g",
    {
      opacity: p ? n : 1,
      style: {
        transition: "opacity 0.15s ease-in-out, filter 0.15s ease-in-out",
        filter: p && s > 0 ? `blur(${s}px)` : "none"
      },
      children: o
    }
  );
}
function t6({
  enabled: t,
  points: n,
  markerStyle: s,
  activeScale: r
}) {
  const { tooltipData: o } = xl();
  if (!t || o === null)
    return null;
  const u = n.find((c) => c.index === o.index);
  return u ? /* @__PURE__ */ v.jsx(
    KM,
    {
      cx: u.cx,
      cy: u.cy,
      scale: r,
      ...s
    }
  ) : null;
}
function e6(t, n, s, r) {
  const o = A4(t), u = n === !1 ? null : s ?? (n === !0 ? "loop" : o), c = u != null, d = t === "revealing" || t === "ready" || t === "exitingReady", [p, h] = E.useState(0);
  return {
    handleLoadingPulseComplete: E.useCallback(() => {
      if (u === "loop") {
        window.setTimeout(() => {
          h((y) => y + 1);
        }, UM);
        return;
      }
      r?.();
    }, [r, u]),
    pulseMode: u,
    pulseEpoch: p,
    showLoadingPulse: c,
    showSeriesContent: d
  };
}
function Br({
  dataKey: t,
  yAxisId: n,
  fill: s = gn.linePrimary,
  fillOpacity: r = 0.4,
  stroke: o,
  strokeWidth: u = 2,
  curve: c = eS,
  animate: d = !0,
  showLine: p = !0,
  showHighlight: h = !0,
  gradientToOpacity: g = 0,
  gradientSpan: y = 1,
  fadeEdges: x = !1,
  showMarkers: T = !1,
  markers: S,
  dashFromIndex: A,
  dashArray: C = "6,4",
  loading: N,
  loadingStroke: R = gn.foreground,
  loadingStrokeOpacity: O = 0.5,
  loadingPulseMode: k,
  loadingStyle: H = "pulse"
}) {
  const {
    data: G,
    renderData: X,
    xScale: Y,
    innerHeight: Z,
    innerWidth: J,
    xAccessor: W,
    lines: ut,
    chartPhase: lt,
    notifyLoadingPulseComplete: dt
  } = Wn(), ot = Np(n), {
    handleLoadingPulseComplete: D,
    pulseMode: q,
    pulseEpoch: w,
    showLoadingPulse: L,
    showSeriesContent: U
  } = e6(
    lt,
    N,
    k,
    dt
  ), _ = E.useMemo(() => {
    const Gt = ut.findIndex((zt) => zt.dataKey === t);
    return Gt >= 0 ? Gt : 0;
  }, [ut, t]), V = E.useRef(null), { pathLength: nt, pathD: at } = H4(V, [
    X,
    J,
    A,
    p,
    U,
    L
  ]), rt = E.useId(), st = `area-gradient-${t}-${rt}`, ft = `area-stroke-gradient-${t}-${rt}`, Tt = `area-edge-mask-${t}-${rt}`, P = `${Tt}-gradient`, ct = s.startsWith("url("), ht = ct || r > 0, I = ct ? s : `url(#${st})`, gt = o || (ct ? gn.linePrimary : s), mt = E.useCallback(
    (Gt) => {
      const zt = Gt[t];
      return typeof zt == "number" ? ot(zt) ?? 0 : 0;
    },
    [t, ot]
  ), Et = YM(A, G.length), St = Tp(x), wt = St.any && !ct;
  let Kt = gt;
  !wt && St.any && (Kt = `url(#${ft})`);
  const Ct = h && p && !L && U, Qt = U && p;
  let Jt = "transparent";
  Qt && !Et && (Jt = Kt);
  const ge = p && (U || L), Dt = /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    U && ht ? /* @__PURE__ */ v.jsx(
      bp,
      {
        curve: c,
        data: X,
        fill: I,
        x: (Gt) => Y(W(Gt)) ?? 0,
        y: mt,
        yScale: ot
      }
    ) : null,
    ge ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
      /* @__PURE__ */ v.jsx(
        sS,
        {
          curve: c,
          data: X,
          innerRef: V,
          stroke: Jt,
          strokeLinecap: "round",
          strokeWidth: u,
          x: (Gt) => Y(W(Gt)) ?? 0,
          y: mt
        }
      ),
      Qt ? /* @__PURE__ */ v.jsx(
        X4,
        {
          dashArray: C,
          dashFromIndex: A,
          data: G,
          innerHeight: Z,
          innerWidth: J,
          pathD: at,
          pathLength: nt,
          stroke: Kt,
          strokeWidth: u,
          xAccessor: W,
          xScale: Y
        }
      ) : null
    ] }) : null
  ] }), jt = L && J > 0 && H === "sweep", Ht = L && J > 0 && !jt;
  return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    /* @__PURE__ */ v.jsx(
      bw,
      {
        edgeGradientId: P,
        edgeMaskId: Tt,
        fadeEdges: x,
        fill: s,
        fillOpacity: r,
        gradientId: st,
        gradientSpan: y,
        gradientToOpacity: g,
        innerHeight: Z,
        innerWidth: J,
        isPatternFill: ct,
        resolvedStroke: gt,
        strokeGradientId: ft
      }
    ),
    /* @__PURE__ */ v.jsx(
      PM,
      {
        dimOpacity: 0.6,
        enabled: h,
        seriesIndex: _,
        children: wt ? /* @__PURE__ */ v.jsx("g", { mask: `url(#${Tt})`, children: Dt }) : Dt
      }
    ),
    /* @__PURE__ */ v.jsx(
      qM,
      {
        enabled: Ct,
        height: Z,
        pathRef: V,
        stroke: gt,
        strokeWidth: u
      }
    ),
    T && U ? /* @__PURE__ */ v.jsx(
      ZM,
      {
        animate: d,
        dataKey: t,
        ...S,
        fill: S?.fill ?? gt,
        stroke: S?.stroke ?? S?.fill ?? gt
      }
    ) : null,
    jt ? /* @__PURE__ */ v.jsx(
      HM,
      {
        curve: c,
        mode: q ?? "loop",
        onTransitionComplete: D,
        stroke: R,
        strokeOpacity: O,
        strokeWidth: u,
        withArea: !0
      },
      "loading-sweep"
    ) : null,
    Ht && at ? /* @__PURE__ */ v.jsx(
      BM,
      {
        loopEpoch: w,
        mode: q ?? void 0,
        onCycleComplete: D,
        pathD: at,
        stroke: R,
        strokeOpacity: O,
        strokeWidth: u
      },
      "loading-pulse"
    ) : null
  ] });
}
Br.displayName = "Area";
function n6({
  text: t,
  duration: n = 1,
  isStopped: s = !1,
  paused: r = !1,
  className: o,
  ...u
}) {
  const c = ef(), d = s || r || c === !0, p = E.useCallback(
    (h) => ({
      running: {
        color: ["var(--color)", "var(--shimmering-color)", "var(--color)"],
        transition: {
          duration: n,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          repeatDelay: t.length * 0.05,
          delay: h * n / t.length,
          ease: "easeInOut"
        }
      },
      stopped: {
        color: "var(--color)",
        transition: {
          duration: n * 0.5,
          ease: "easeOut"
        }
      }
    }),
    [n, t.length]
  );
  return /* @__PURE__ */ v.jsxs(
    Se.span,
    {
      className: ma(
        "inline-flex select-none items-center leading-none",
        "[--color:var(--muted-foreground)] [--shimmering-color:var(--foreground)]",
        o
      ),
      ...u,
      children: [
        t.split("").map((h, g) => /* @__PURE__ */ v.jsx(
          Se.span,
          {
            animate: d ? "stopped" : "running",
            "aria-hidden": !0,
            className: "inline-block whitespace-pre leading-none",
            initial: "stopped",
            variants: p(g),
            children: h
          },
          g
        )),
        /* @__PURE__ */ v.jsx("span", { className: "sr-only", children: t })
      ]
    }
  );
}
function i6({
  text: t = "Loading",
  className: n,
  exiting: s = !1
}) {
  return t.trim() ? /* @__PURE__ */ v.jsx(
    Se.div,
    {
      animate: {
        y: s ? M4 : 0,
        opacity: s ? 0 : 1,
        filter: s ? "blur(2px)" : "blur(0px)"
      },
      "aria-live": "polite",
      className: ma(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        n
      ),
      initial: !1,
      role: "status",
      transition: {
        duration: VM,
        ease: [...ui]
      },
      children: /* @__PURE__ */ v.jsx(
        n6,
        {
          className: "font-medium text-sm tracking-wide [--color:var(--muted-foreground)] [--shimmering-color:var(--foreground)]",
          text: t
        }
      )
    }
  ) : null;
}
const QM = "ready", c0 = 500, Xb = 0.02;
function JM(t) {
  return t === "loading" ? "loading" : "ready";
}
function s6(t) {
  return t === "ready";
}
function WM({
  dataKey: t,
  fill: n,
  curve: s = eS
}) {
  const { renderData: r, xScale: o, yScale: u, xAccessor: c } = Wn();
  return /* @__PURE__ */ v.jsx(
    bp,
    {
      curve: s,
      data: r,
      fill: n,
      x: (d) => o(c(d)) ?? 0,
      y: (d) => {
        const p = d[t];
        return typeof p == "number" ? u(p) ?? 0 : 0;
      },
      yScale: u
    }
  );
}
WM.displayName = "PatternArea";
const a6 = "__chartClipPassthrough";
function tA(t) {
  return typeof t == "function" && t[a6] === !0;
}
function eA(t) {
  if (tA(t.type)) {
    const n = t.props.children;
    if (E.isValidElement(n))
      return eA(n);
  }
  return t;
}
const r6 = /* @__PURE__ */ new Set([
  "Background",
  "Grid",
  "XAxis",
  "YAxis",
  "BarXAxis",
  "BarYAxis",
  "LiveXAxis",
  "LiveYAxis"
]), o6 = /* @__PURE__ */ new Set(["ReferenceArea", "BarColumnTrack"]);
function l6(t) {
  const n = t.type;
  if (n.__isChartMarkers || n.__isPostOverlay)
    return !0;
  const s = typeof t.type == "function" && (n.displayName || n.name) || "";
  return s === "ChartMarkers" || s === "MarkerGroup" || s === "ChartBrush";
}
function u6(t) {
  const n = t.type, s = typeof t.type == "function" && (n.displayName || n.name) || "";
  return o6.has(s);
}
function c6(t) {
  const n = t.type, s = typeof t.type == "function" && (n.displayName || n.name) || "";
  return r6.has(s);
}
function nA(t) {
  const n = t.type;
  return typeof t.type == "function" && (n.displayName || n.name) || "";
}
const f6 = /* @__PURE__ */ new Set([
  "Lines",
  "Circles",
  "Waves",
  "Hexagons",
  "Path",
  "Pattern"
]);
function d6(t) {
  const n = nA(t);
  return n.includes("Pattern") || f6.has(n);
}
function h6(t) {
  const n = nA(t);
  return n.includes("Gradient") || n === "LinearGradient" || n === "RadialGradient";
}
const Ta = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
}), m6 = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric"
}), p6 = new Intl.NumberFormat("en-US").format;
function g6({
  clipPathId: t,
  height: n,
  targetWidth: s,
  enterTransition: r,
  revealEpoch: o,
  padding: u = 0,
  animating: c = !0,
  mode: d = "reveal",
  onComplete: p
}) {
  const h = FM(r), g = Math.max(0, s + u * 2), y = n + u * 2;
  if (!c)
    return /* @__PURE__ */ v.jsx("clipPath", { id: t, children: /* @__PURE__ */ v.jsx(
      "rect",
      {
        height: y,
        width: g,
        x: -u,
        y: -u
      }
    ) });
  if (d === "conceal") {
    const x = -u + g;
    return /* @__PURE__ */ v.jsx("clipPath", { id: t, children: /* @__PURE__ */ v.jsx(
      Se.rect,
      {
        animate: { width: 0, x },
        height: y,
        initial: { width: g, x: -u },
        onAnimationComplete: () => p?.(),
        transition: h,
        y: -u
      },
      `conceal-${o}`
    ) });
  }
  return /* @__PURE__ */ v.jsx("clipPath", { id: t, children: /* @__PURE__ */ v.jsx(
    Se.rect,
    {
      animate: { width: g },
      height: y,
      initial: { width: 0 },
      transition: h,
      width: g,
      x: -u,
      y: -u
    },
    `reveal-${o}`
  ) });
}
function y6(t, n, s = []) {
  const r = t.length;
  if (n >= r || n < 3)
    return t;
  const o = (p, h) => {
    if (s.length === 0) {
      for (const x of Object.values(p))
        if (typeof x == "number")
          return x;
      return h;
    }
    let g = 0, y = 0;
    for (const x of s) {
      const T = p[x];
      typeof T == "number" && (g += T, y++);
    }
    return y > 0 ? g / y : h;
  }, u = [t[0]], c = (r - 2) / (n - 2);
  let d = 0;
  for (let p = 0; p < n - 2; p++) {
    const h = Math.floor((p + 1) * c) + 1, g = Math.min(Math.floor((p + 2) * c) + 1, r - 1), y = Math.floor((p + 2) * c) + 1, x = Math.min(Math.floor((p + 3) * c) + 1, r), T = Math.max(0, x - y);
    let S = r - 1, A = o(t[r - 1], r - 1);
    if (T > 0) {
      S = 0, A = 0;
      for (let H = y; H < x; H++)
        S += H, A += o(t[H], H);
      S /= T, A /= T;
    }
    const C = t[d], N = d, R = o(C, d);
    let O = -1, k = h;
    for (let H = h; H < g; H++) {
      const G = Math.abs(
        (N - S) * (o(t[H], H) - R) - (N - H) * (A - R)
      ) * 0.5;
      G > O && (O = G, k = H);
    }
    u.push(t[k]), d = k;
  }
  return u.push(t[r - 1]), u;
}
function v6(t) {
  return Math.max(64, Math.ceil(t * 1.5));
}
function x6(t, n, s) {
  const r = n[0].getTime(), o = n[1].getTime(), u = Math.min(r, o), c = Math.max(r, o);
  return t.filter((d) => {
    const p = s(d).getTime();
    return p >= u && p <= c;
  });
}
const b6 = "value", T6 = 7;
function S6(t = {}) {
  const n = t.dataKey ?? b6, s = t.pointCount ?? T6, r = t.baseDate ?? /* @__PURE__ */ new Date("2025-01-01");
  return Array.from({ length: s }, (o, u) => {
    const c = new Date(r);
    return c.setDate(r.getDate() + u), {
      date: c,
      [n]: Math.round(110 + Math.sin(u * 1.15) * 36 + u * 9)
    };
  });
}
function M6(t, n) {
  return t.map((s, r) => ({
    ...s,
    [n]: Math.round(95 + Math.sin(r * 1.05) * 28 + r * 7)
  }));
}
function A6(t) {
  let n = Number.POSITIVE_INFINITY, s = Number.NEGATIVE_INFINITY;
  for (const r of t)
    for (const o of r)
      o.value < n && (n = o.value), o.value > s && (s = o.value);
  return n === Number.POSITIVE_INFINITY ? null : { minValue: n, maxValue: s };
}
function C6(t) {
  let n = Number.POSITIVE_INFINITY, s = Number.NEGATIVE_INFINITY;
  for (const r of t)
    for (const o of r) {
      const u = o.date.getTime();
      u < n && (n = u), u > s && (s = u);
    }
  return n === Number.POSITIVE_INFINITY ? null : { minTime: n, maxTime: s };
}
function _6(t) {
  const n = t.type;
  return typeof t.type == "function" && (n.displayName || n.name) || "";
}
function E6(t) {
  return _6(t) === "ProjectionLine";
}
function w6(t) {
  return t?.length ? t.map((n) => ({
    date: n.date instanceof Date ? n.date : new Date(n.date),
    value: n.value
  })) : [];
}
function D6(t) {
  const n = [], s = (r) => {
    E.Children.forEach(r, (o) => {
      if (!E.isValidElement(o))
        return;
      if (o.type === E.Fragment) {
        s(o.props.children);
        return;
      }
      if (E6(o)) {
        const c = o.props, d = w6(c?.data);
        d.length >= 2 && n.push({
          yAxisId: vl(c?.yAxisId),
          data: d
        });
        return;
      }
      if (tA(o.type)) {
        s(o.props.children);
        return;
      }
      const u = o.props;
      u?.children && s(u.children);
    });
  };
  return s(t), n;
}
function Pb(t, n, s) {
  const r = n.filter((g) => g.yAxisId === s).map((g) => g.data), o = A6(r);
  if (!o)
    return t;
  const [u, c] = t, d = Math.min(u, o.minValue), p = Math.max(c, o.maxValue);
  if (d >= 0 && u >= 0)
    return [0, p <= 0 ? 100 : p * 1.1];
  const h = (p - d) * 0.05 || 1;
  return [d - h, p + h];
}
function j6(t, n) {
  const s = n.map((o) => o.data), r = C6(s);
  return r ? Math.max(t, r.maxTime) : t;
}
function N6(t) {
  const n = t.type;
  return typeof t.type == "function" && (n.displayName || n.name) || "";
}
function R6(t) {
  return N6(t) === "ReferenceArea";
}
function O6(t) {
  const n = [], s = (r) => {
    E.Children.forEach(r, (o) => {
      if (!E.isValidElement(o))
        return;
      if (R6(o)) {
        const c = o.props;
        c && n.push({
          yAxisId: vl(c.yAxisId),
          y1: c.y1,
          y2: c.y2,
          axisLabelColor: c.axisLabelColor
        });
        return;
      }
      const u = o.props;
      u?.children && s(u.children);
    });
  };
  return s(t), n;
}
const z6 = E.createContext(null);
function k6(t) {
  const {
    innerWidth: n,
    dataLength: s,
    columnWidth: r,
    seriesCount: o,
    composedBarSize: u,
    composedMaxBarSize: c,
    composedBarGap: d = 4,
    stacked: p = !1
  } = t, h = d, g = p ? 1 : Math.max(1, o);
  let y = r;
  y <= 0 && (y = s < 2 ? n : n / (s - 1));
  let x = u ?? Math.min(y * 0.88, c ?? Number.POSITIVE_INFINITY);
  if (c != null && (x = Math.min(x, c)), g > 1) {
    const T = y * 0.92;
    g * x + (g - 1) * h > T && T > 0 && (x = Math.max(4, (T - (g - 1) * h) / g));
  }
  return Math.max(2, x);
}
function L6(t) {
  const { barWidth: n, seriesCount: s, gap: r = 4, stacked: o = !1 } = t;
  if (o || s <= 1)
    return Math.ceil(n / 2);
  const u = s * n + (s - 1) * r;
  return Math.ceil(u / 2);
}
const U6 = E.createContext(!1);
function V6() {
  return E.useContext(U6);
}
function Ib(t) {
  const s = kr({ domain: t, range: [0, 1], nice: !0 }).domain();
  return [s[0] ?? t[0], s[1] ?? t[1]];
}
function Fb(t, n) {
  const s = Math.max(
    Math.abs(n[1] - n[0]),
    Math.abs(t[1] - t[0]),
    1
  ), r = Math.abs(n[0] - t[0]) / s, o = Math.abs(n[1] - t[1]) / s;
  return r >= Xb || o >= Xb;
}
function B6(t) {
  return t === "loading" || t === "revealingLoading";
}
function H6(t) {
  return t === "loading" || t === "exiting" || t === "gridTweenLoading";
}
function Y6(t) {
  return t === "gridTweenLoading" || t === "gridTweenReady";
}
function G6(t, n, s) {
  switch (t) {
    case "loading":
    case "exiting":
    case "gridTweenLoading":
      return n;
    case "exitingReady":
    case "gridTweenReady":
    case "revealing":
    case "ready":
      return s;
    default:
      return s;
  }
}
function $b({
  lines: t,
  resolveDomain: n
}) {
  const s = jp(t), r = {};
  for (const [o, u] of s) {
    const c = u.map((d) => d.dataKey);
    r[vl(o)] = Ib(n(c));
  }
  return r.left || (r.left = Ib([0, 100])), r;
}
function iA(t, n) {
  const s = Object.keys(t), r = Object.keys(n);
  if (s.length !== r.length)
    return !1;
  for (const o of s) {
    const u = t[o], c = n[o];
    if (!(u && c) || u[0] !== c[0] || u[1] !== c[1])
      return !1;
  }
  return !0;
}
function q6(t, n, s) {
  return [
    t[0] + (n[0] - t[0]) * s,
    t[1] + (n[1] - t[1]) * s
  ];
}
function Ds(t, n, s) {
  iA(s.current, t) || (n(t), s.current = t);
}
function Kb({
  destination: t,
  durationMs: n,
  enabled: s,
  reducedMotion: r,
  animatedRef: o,
  setAnimatedByAxis: u,
  onSettled: c
}) {
  if (iA(o.current, t)) {
    c?.();
    return;
  }
  if (!s || r) {
    Ds(t, u, o), c?.();
    return;
  }
  const d = Object.keys(t), p = o.current;
  let h = !1;
  for (const x of d) {
    const T = p[x] ?? t[x] ?? [0, 100], S = t[x] ?? T;
    if (Fb(T, S)) {
      h = !0;
      break;
    }
  }
  if (!h) {
    Ds(t, u, o), c?.();
    return;
  }
  const g = {};
  for (const x of d)
    g[x] = p[x] ?? t[x] ?? [0, 100];
  return Os(0, 1, {
    duration: n / 1e3,
    ease: [...ui],
    onUpdate: (x) => {
      const T = {};
      for (const S of d) {
        const A = g[S] ?? t[S] ?? [0, 100], C = t[S] ?? A;
        T[S] = Fb(A, C) ? q6(A, C, x) : C;
      }
      o.current = T, u(T);
    },
    onComplete: () => {
      Ds(t, u, o), c?.();
    }
  });
}
function X6({
  enabled: t,
  durationMs: n,
  chartPhase: s,
  skeletonByAxis: r,
  targetByAxis: o,
  onSettled: u,
  tweenOnTargetChange: c = !1
}) {
  const d = ef(), p = G6(
    s,
    r,
    o
  ), h = E.useRef(p);
  h.current = p;
  const g = E.useRef(r);
  g.current = r;
  const y = E.useRef(o);
  y.current = o;
  const [x, T] = E.useState(p), S = E.useRef(x), A = E.useRef(s), C = E.useRef(u);
  C.current = u, E.useEffect(() => {
    S.current = x;
  }, [x]), E.useEffect(() => {
    if (A.current === s)
      return;
    A.current = s;
    const O = () => {
      C.current?.();
    };
    if (s === "exiting") {
      Ds(g.current, T, S);
      return;
    }
    if (s === "exitingReady") {
      Ds(y.current, T, S);
      return;
    }
    if (s === "loading") {
      Ds(g.current, T, S);
      return;
    }
    if (s === "revealing" || s === "ready") {
      Ds(y.current, T, S);
      return;
    }
    if (!Y6(s))
      return;
    const k = Kb({
      destination: h.current,
      durationMs: n,
      enabled: t,
      reducedMotion: d,
      animatedRef: S,
      setAnimatedByAxis: T,
      onSettled: O
    });
    return () => k?.stop();
  }, [s, n, t, d]);
  const N = JSON.stringify(o), R = E.useRef(N);
  return E.useEffect(() => {
    if (!(s === "ready" || s === "revealing")) {
      R.current = N;
      return;
    }
    if (R.current !== N) {
      if (R.current = N, c && s === "ready") {
        const k = Kb({
          destination: y.current,
          durationMs: n,
          enabled: t,
          reducedMotion: d,
          animatedRef: S,
          setAnimatedByAxis: T,
          onSettled: () => C.current?.()
        });
        return () => k?.stop();
      }
      Ds(y.current, T, S);
    }
  }, [
    s,
    n,
    t,
    d,
    N,
    c
  ]), x;
}
class Hr {
  x = 0;
  y = 0;
  constructor(n) {
    let {
      x: s = 0,
      y: r = 0
    } = n;
    this.x = s, this.y = r;
  }
  value() {
    return {
      x: this.x,
      y: this.y
    };
  }
  toArray() {
    return [this.x, this.y];
  }
}
function P6(t) {
  return !!t && t instanceof Element;
}
function I6(t) {
  return !!t && (t instanceof SVGElement || "ownerSVGElement" in t);
}
function F6(t) {
  return !!t && "createSVGPoint" in t;
}
function $6(t) {
  return !!t && "getScreenCTM" in t;
}
function K6(t) {
  return !!t && "changedTouches" in t;
}
function Z6(t) {
  return !!t && "clientX" in t;
}
function Q6(t) {
  return !!t && (t instanceof Event || "nativeEvent" in t && t.nativeEvent instanceof Event);
}
const pm = {
  x: 0,
  y: 0
};
function J6(t) {
  if (!t) return {
    ...pm
  };
  if (K6(t))
    return t.changedTouches.length > 0 ? {
      x: t.changedTouches[0].clientX,
      y: t.changedTouches[0].clientY
    } : {
      ...pm
    };
  if (Z6(t))
    return {
      x: t.clientX,
      y: t.clientY
    };
  const n = t?.target, s = n && "getBoundingClientRect" in n ? n.getBoundingClientRect() : null;
  return s ? {
    x: s.x + s.width / 2,
    y: s.y + s.height / 2
  } : {
    ...pm
  };
}
function Zb(t, n) {
  if (!t || !n) return null;
  const s = J6(n), r = I6(t) ? t.ownerSVGElement : t, o = $6(r) ? r.getScreenCTM() : null;
  if (F6(r) && o) {
    let c = r.createSVGPoint();
    return c.x = s.x, c.y = s.y, c = c.matrixTransform(o.inverse()), new Hr({
      x: c.x,
      y: c.y
    });
  }
  const u = t.getBoundingClientRect();
  return new Hr({
    x: s.x - u.left - t.clientLeft,
    y: s.y - u.top - t.clientTop
  });
}
function Qb(t, n) {
  if (P6(t) && n)
    return Zb(t, n);
  if (Q6(t)) {
    const s = t, r = s.target;
    if (r) return Zb(r, s);
  }
  return null;
}
function W6(t) {
  if (typeof t == "object" && t !== null && "index" in t && typeof t.index == "number") {
    const { index: n, x: s } = t;
    return typeof s == "number" ? `${n}:${Math.round(s)}` : String(n);
  }
  return JSON.stringify(t);
}
function tz() {
  const [t, n] = E.useState(null), s = E.useRef(null), r = E.useRef(null), o = E.useRef(null), u = E.useRef(null);
  E.useEffect(() => () => {
    o.current !== null && cancelAnimationFrame(o.current);
  }, []);
  const c = E.useCallback((g, y) => {
    y !== s.current && (s.current = y, n(g));
  }, []), d = E.useCallback(
    (g, y) => {
      const x = y ?? W6(g);
      r.current = g, u.current = x, x !== s.current && o.current === null && (o.current = requestAnimationFrame(() => {
        o.current = null;
        const T = r.current, S = u.current;
        T && S && c(T, S);
      }));
    },
    [c]
  ), p = E.useCallback(() => {
    o.current !== null && (cancelAnimationFrame(o.current), o.current = null), r.current = null, u.current = null, s.current = null, n(null);
  }, []), h = E.useCallback(() => {
    s.current = null;
  }, []);
  return {
    tooltipData: t,
    setTooltipData: n,
    scheduleTooltip: d,
    clearTooltip: p,
    resetTooltipDedupe: h
  };
}
function ez({
  xScale: t,
  yScale: n,
  yScales: s,
  data: r,
  lines: o,
  margin: u,
  xAccessor: c,
  bisectDate: d,
  canInteract: p
}) {
  const [h, g] = E.useState(null), {
    tooltipData: y,
    setTooltipData: x,
    scheduleTooltip: T,
    clearTooltip: S,
    resetTooltipDedupe: A
  } = tz(), C = E.useRef(!1), N = E.useRef(0), R = E.useRef(null), O = E.useCallback(
    (D) => {
      const q = t.invert(D), w = d(r, q, 1), L = r[w - 1], U = r[w];
      if (!L)
        return null;
      let _ = L, V = w - 1;
      if (U) {
        const at = c(L).getTime(), rt = c(U).getTime();
        q.getTime() - at > rt - q.getTime() && (_ = U, V = w);
      }
      const nt = {};
      for (const at of o) {
        const rt = _[at.dataKey];
        if (typeof rt == "number") {
          const st = s[vl(at.yAxisId)] ?? n;
          nt[at.dataKey] = st(rt) ?? 0;
        }
      }
      return {
        point: _,
        index: V,
        x: t(c(_)) ?? 0,
        yPositions: nt
      };
    },
    [t, n, s, r, o, c, d]
  ), k = E.useCallback(
    (D) => {
      const q = t.invert(D), w = d(r, q, 1), L = r[w - 1], U = r[w];
      if (!L)
        return 0;
      if (U) {
        const _ = c(L).getTime(), V = c(U).getTime();
        if (q.getTime() - _ > V - q.getTime())
          return w;
      }
      return w - 1;
    },
    [t, r, c, d]
  ), H = E.useCallback(
    (D, q = 0) => {
      let w = null;
      if ("touches" in D) {
        const L = D.touches[q];
        if (!L)
          return null;
        const U = D.currentTarget.ownerSVGElement;
        if (!U)
          return null;
        w = Qb(U, L);
      } else
        w = Qb(D);
      return w ? w.x - u.left : null;
    },
    [u.left]
  ), G = E.useCallback(
    (D) => {
      const q = H(D);
      if (q === null)
        return;
      if (C.current) {
        const L = Math.min(N.current, q), U = Math.max(N.current, q);
        g({
          startX: L,
          endX: U,
          startIndex: k(L),
          endIndex: k(U),
          active: !0
        });
        return;
      }
      R.current = q;
      const w = O(q);
      w && T(w);
    },
    [H, O, k, T]
  ), X = E.useCallback(() => {
    R.current = null, S(), C.current && (C.current = !1), g(null);
  }, [S]), Y = E.useCallback(
    (D) => {
      const q = H(D);
      q !== null && (C.current = !0, N.current = q, S(), g(null));
    },
    [H, S]
  ), Z = E.useCallback(() => {
    C.current && (C.current = !1), g(null);
  }, []), J = E.useCallback(
    (D) => {
      if (D.touches.length === 1) {
        D.preventDefault();
        const q = H(D, 0);
        if (q === null)
          return;
        R.current = q;
        const w = O(q);
        w && T(w);
      } else if (D.touches.length === 2) {
        D.preventDefault(), A(), S();
        const q = H(D, 0), w = H(D, 1);
        if (q === null || w === null)
          return;
        const L = Math.min(q, w), U = Math.max(q, w);
        g({
          startX: L,
          endX: U,
          startIndex: k(L),
          endIndex: k(U),
          active: !0
        });
      }
    },
    [
      H,
      O,
      k,
      T,
      A,
      S
    ]
  ), W = E.useCallback(
    (D) => {
      if (D.touches.length === 1) {
        D.preventDefault();
        const q = H(D, 0);
        if (q === null)
          return;
        R.current = q;
        const w = O(q);
        w && T(w);
      } else if (D.touches.length === 2) {
        D.preventDefault();
        const q = H(D, 0), w = H(D, 1);
        if (q === null || w === null)
          return;
        const L = Math.min(q, w), U = Math.max(q, w);
        g({
          startX: L,
          endX: U,
          startIndex: k(L),
          endIndex: k(U),
          active: !0
        });
      }
    },
    [H, O, k, T]
  ), ut = E.useCallback(() => {
    S(), g(null);
  }, [S]), lt = E.useCallback(() => {
    g(null);
  }, []);
  return E.useEffect(() => {
    if (!p || R.current === null)
      return;
    const D = O(R.current);
    if (D) {
      T(D, `${D.index}:${Math.round(D.x)}`);
      return;
    }
    S();
  }, [p, S, O, T]), {
    tooltipData: y,
    setTooltipData: x,
    selection: h,
    clearSelection: lt,
    interactionHandlers: p ? {
      onMouseMove: G,
      onMouseLeave: X,
      onMouseDown: Y,
      onMouseUp: Z,
      onTouchStart: J,
      onTouchMove: W,
      onTouchEnd: ut
    } : {},
    interactionStyle: {
      cursor: p ? "crosshair" : "default",
      touchAction: "none"
    }
  };
}
function nz({
  chartStatus: t,
  targetData: n,
  skeletonData: s,
  animationDuration: r,
  yDomainTweenDuration: o,
  revealSignature: u = "",
  skipEnterReveal: c = !1
}) {
  const [d, p] = E.useState(
    () => JM(t)
  ), [h, g] = E.useState(
    () => t === "loading" ? s : n
  ), [y, x] = E.useState(0), [T, S] = E.useState(0), [A, C] = E.useState(() => t === "ready"), N = E.useRef(t), R = E.useRef(d);
  R.current = d, E.useEffect(() => {
    const G = N.current;
    if (G !== t) {
      if (N.current = t, t === "ready" && G === "loading") {
        C(!1), r <= 0 ? o <= 0 ? (g(n), p("revealing")) : p("gridTweenReady") : p("exiting");
        return;
      }
      t === "loading" && G === "ready" && (C(!1), r <= 0 ? o <= 0 ? (g(s), p("loading")) : p("gridTweenLoading") : (S((X) => X + 1), p("exitingReady")));
    }
  }, [
    r,
    t,
    s,
    n,
    o
  ]), E.useEffect(() => {
    c || t === "ready" && R.current === "ready" && (p("revealing"), C(!1));
  }, [r, t, u, c]), E.useEffect(() => {
    switch (d) {
      case "loading":
        t === "loading" && g(s);
        break;
      case "exiting":
        g(s);
        break;
      case "exitingReady":
      case "gridTweenLoading":
      case "gridTweenReady":
      case "revealing":
      case "ready":
        g(n);
        break;
    }
  }, [d, t, s, n]);
  const O = E.useCallback(() => {
    R.current === "exiting" && p("gridTweenReady");
  }, []), k = E.useCallback(() => {
    R.current === "exitingReady" && p("gridTweenLoading");
  }, []), H = E.useCallback(() => {
    if (R.current === "gridTweenLoading") {
      p("loading");
      return;
    }
    R.current === "gridTweenReady" && p("revealing");
  }, []);
  return E.useEffect(() => {
    if (d !== "revealing")
      return;
    if (x((X) => X + 1), r <= 0) {
      p("ready"), C(!0);
      return;
    }
    const G = window.setTimeout(() => {
      p("ready"), C(!0);
    }, r);
    return () => window.clearTimeout(G);
  }, [r, d]), {
    chartPhase: d,
    plotData: h,
    revealEpoch: y,
    concealEpoch: T,
    isLoaded: A,
    notifyLoadingPulseComplete: O,
    notifyRevealConcealComplete: k,
    notifyYDomainTweenComplete: H
  };
}
function iz(t, n) {
  let s = Number.POSITIVE_INFINITY, r = Number.NEGATIVE_INFINITY;
  for (const o of t)
    for (const u of n) {
      const c = o[u];
      typeof c == "number" && (c < s && (s = c), c > r && (r = c));
    }
  return s === Number.POSITIVE_INFINITY ? { minValue: 0, maxValue: 100 } : { minValue: s, maxValue: r };
}
function sz(t, n, s) {
  if (s != null && s > 0)
    return [0, s * 1.1];
  const { minValue: r, maxValue: o } = iz(t, n);
  if (r >= 0)
    return [0, o <= 0 ? 100 : o * 1.1];
  const u = (o - r) * 0.05 || 1;
  return [r - u, o + u];
}
function az(t, n) {
  return t.key != null ? t : E.cloneElement(t, { key: `chart-child-${n}` });
}
function rz(t) {
  const { width: n, height: s } = t;
  return n < 10 || s < 10 ? null : /* @__PURE__ */ v.jsx(oz, { ...t });
}
const oz = E.memo(function({
  width: n,
  height: s,
  data: r,
  xDataKey: o,
  margin: u,
  animationDuration: c,
  animationEasing: d = Z4,
  enterTransition: p,
  revealSignature: h = "",
  children: g,
  containerRef: y,
  lines: x,
  clipPathId: T,
  composedBarDataKeys: S,
  composedBarSize: A,
  composedMaxBarSize: C,
  composedBarGap: N,
  composedStacked: R,
  composedStackOffsets: O,
  composedStackGap: k,
  yScaleDomainMax: H,
  chartStatus: G = QM,
  loadingLabel: X,
  yDomainTween: Y = !0,
  yDomainTweenDuration: Z = c0,
  xDomain: J,
  xDomainSlotCount: W,
  tweenYDomainOnXDomainChange: ut = !1,
  onPhaseChange: lt
}) {
  const dt = V6(), ot = n - u.left - u.right, D = s - u.top - u.bottom, q = E.useCallback(
    (Nt, Yt) => {
      const Ot = jp(x), Vt = Ot.size === 1 && Ot.has(Ns) && H != null ? H : void 0;
      return sz(Nt, Yt, Vt);
    },
    [x, H]
  ), w = E.useMemo(() => {
    const Nt = x[0]?.dataKey ?? "value";
    return r.length === 0 ? S6({ dataKey: Nt }) : M6(r, Nt);
  }, [r, x]), {
    chartPhase: L,
    plotData: U,
    revealEpoch: _,
    concealEpoch: V,
    isLoaded: nt,
    notifyLoadingPulseComplete: at,
    notifyRevealConcealComplete: rt,
    notifyYDomainTweenComplete: st
  } = nz({
    animationDuration: c,
    chartStatus: G,
    revealSignature: h,
    skeletonData: w,
    skipEnterReveal: dt,
    targetData: r,
    yDomainTweenDuration: Z
  });
  E.useEffect(() => {
    lt?.(L);
  }, [L, lt]);
  const ft = E.useCallback(
    (Nt) => {
      const Yt = Nt[o];
      return Yt instanceof Date ? Yt : new Date(Yt);
    },
    [o]
  ), Tt = E.useMemo(
    () => Hc((Nt) => ft(Nt)).left,
    [ft]
  ), P = E.useMemo(() => J ? x6(U, J, ft) : U, [U, J, ft]), ct = E.useMemo(
    () => D6(g),
    [g]
  ), ht = E.useMemo(() => {
    const Nt = J ? J[0].getTime() : I1(U, (Ot) => ft(Ot).getTime())[0] ?? 0;
    let Yt = J ? J[1].getTime() : I1(U, (Ot) => ft(Ot).getTime())[1] ?? Nt;
    return J || (Yt = j6(Yt, ct)), cN({
      range: [0, ot],
      domain: [Nt, Yt]
    });
  }, [ot, U, ct, ft, J]), I = J ? U : P, gt = E.useMemo(() => {
    const Nt = x.map((Yt) => Yt.dataKey);
    return y6(
      I,
      v6(ot),
      Nt
    );
  }, [I, ot, x]), mt = E.useMemo(() => {
    const Nt = J && W != null ? W : P.length;
    return Nt < 2 ? 0 : ot / (Nt - 1);
  }, [ot, P.length, J, W]), Et = E.useMemo(
    () => $b({
      lines: x,
      resolveDomain: (Nt) => q(w, Nt)
    }),
    [x, q, w]
  ), St = E.useMemo(() => {
    const Nt = $b({
      lines: x,
      resolveDomain: (Ot) => q(J ? P : r, Ot)
    });
    if (ct.length === 0)
      return Nt;
    const Yt = { ...Nt };
    for (const Ot of Object.keys(Nt))
      Yt[Ot] = Pb(
        Nt[Ot] ?? [0, 100],
        ct,
        Ot
      );
    for (const Ot of ct)
      Yt[Ot.yAxisId] || (Yt[Ot.yAxisId] = Pb(
        [0, 100],
        ct,
        Ot.yAxisId
      ));
    return Yt;
  }, [
    r,
    x,
    ct,
    q,
    P,
    J
  ]), Kt = X6({
    chartPhase: L,
    durationMs: Z,
    enabled: Y,
    onSettled: st,
    skeletonByAxis: Et,
    targetByAxis: St,
    tweenOnTargetChange: Y || ut && J != null
  }), Ct = E.useMemo(
    () => dN({
      domainsByAxis: Kt,
      innerHeight: D,
      lines: x
    }),
    [Kt, D, x]
  ), Qt = fN(
    Ct,
    kr({ range: [D, 0], domain: [0, 100], nice: !0 })
  ), Jt = E.useMemo(
    () => P.map((Nt) => Ta.format(ft(Nt))),
    [P, ft]
  ), ge = nt && s6(L), {
    tooltipData: Dt,
    setTooltipData: jt,
    selection: Ht,
    clearSelection: Gt,
    interactionHandlers: zt,
    interactionStyle: ye
  } = ez({
    bisectDate: Tt,
    canInteract: ge,
    data: P,
    lines: x,
    margin: u,
    xAccessor: ft,
    xScale: ht,
    yScale: Qt,
    yScales: Ct
  }), me = [], yn = [], rn = [], _n = [], on = [];
  E.Children.forEach(g, (Nt, Yt) => {
    if (!E.isValidElement(Nt))
      return;
    const Ot = az(Nt, Yt), oe = eA(Ot);
    h6(oe) ? me.push(oe) : d6(oe) ? _n.push(oe) : l6(oe) ? on.push(oe) : c6(oe) ? yn.push(oe) : u6(oe) ? rn.push(oe) : _n.push(oe);
  });
  const [Me, Ke] = E.useState(
    () => /* @__PURE__ */ new Map()
  ), Ye = E.useCallback(
    (Nt, Yt) => {
      Ke((Ot) => {
        const oe = Ot.get(Nt);
        if (oe && oe.yAxisId === Yt.yAxisId && oe.y1 === Yt.y1 && oe.y2 === Yt.y2 && oe.axisLabelColor === Yt.axisLabelColor)
          return Ot;
        const Vt = new Map(Ot);
        return Vt.set(Nt, Yt), Vt;
      });
    },
    []
  ), Da = E.useCallback((Nt) => {
    Ke((Yt) => {
      if (!Yt.has(Nt))
        return Yt;
      const Ot = new Map(Yt);
      return Ot.delete(Nt), Ot;
    });
  }, []), Gs = E.useMemo(
    () => ({ registerReferenceArea: Ye, unregisterReferenceArea: Da }),
    [Ye, Da]
  ), ts = E.useMemo(() => {
    const Nt = O6(g), Yt = [...Me.values()];
    return Yt.length === 0 ? Nt : Nt.length === 0 ? Yt : [...Nt, ...Yt];
  }, [g, Me]), es = E.useMemo(
    () => ({
      data: P,
      renderData: gt,
      xScale: ht,
      yScale: Qt,
      yScales: Ct,
      width: n,
      height: s,
      innerWidth: ot,
      innerHeight: D,
      margin: u,
      columnWidth: mt,
      tooltipData: Dt,
      setTooltipData: jt,
      containerRef: y,
      lines: x,
      referenceAreas: ts,
      chartPhase: L,
      chartStatus: G,
      loadingLabel: X,
      yDomainTweenDuration: Z,
      yDomainSkeletonByAxis: Et,
      yDomainTargetByAxis: St,
      isLoaded: nt,
      animationDuration: c,
      animationEasing: d,
      enterTransition: p,
      revealEpoch: _,
      notifyLoadingPulseComplete: at,
      xAccessor: ft,
      dateLabels: Jt,
      xDomain: J,
      xDomainSlotCount: W,
      selection: Ht,
      clearSelection: Gt,
      composedBarDataKeys: S,
      composedBarSize: A,
      composedMaxBarSize: C,
      composedBarGap: N,
      composedStacked: R,
      composedStackOffsets: O,
      composedStackGap: k
    }),
    [
      P,
      gt,
      ht,
      Qt,
      Ct,
      n,
      s,
      ot,
      D,
      u,
      mt,
      Dt,
      jt,
      y,
      x,
      ts,
      L,
      G,
      X,
      Z,
      Et,
      St,
      nt,
      c,
      d,
      p,
      _,
      at,
      ft,
      Jt,
      J,
      W,
      Ht,
      Gt,
      S,
      A,
      C,
      N,
      R,
      O,
      k
    ]
  ), je = !dt && gt.length > 1 && ot > 0 && c > 0, fi = L === "revealing", fn = L === "exitingReady" && c > 0, ns = p ?? {
    ...kc,
    duration: c / 1e3
  }, kn = E.useMemo(() => {
    if (!S?.length)
      return 0;
    const Nt = k6({
      columnWidth: mt,
      composedBarGap: N,
      composedBarSize: A,
      composedMaxBarSize: C,
      dataLength: U.length,
      innerWidth: ot,
      seriesCount: S.length,
      stacked: R
    });
    return L6({
      barWidth: Nt,
      gap: N,
      seriesCount: S.length,
      stacked: R
    });
  }, [
    mt,
    S,
    N,
    A,
    C,
    R,
    ot,
    U.length
  ]);
  return /* @__PURE__ */ v.jsx(
    z6.Provider,
    {
      value: Gs,
      children: /* @__PURE__ */ v.jsx(hN, { value: es, children: /* @__PURE__ */ v.jsxs("svg", { "aria-hidden": "true", height: s, width: n, children: [
        /* @__PURE__ */ v.jsxs("defs", { children: [
          me,
          je ? /* @__PURE__ */ v.jsx(
            g6,
            {
              animating: fi || fn,
              clipPathId: T,
              enterTransition: ns,
              height: D + 20,
              mode: fn ? "conceal" : "reveal",
              onComplete: fn ? rt : void 0,
              padding: kn,
              revealEpoch: fn ? V : _,
              targetWidth: ot
            }
          ) : null
        ] }),
        /* @__PURE__ */ v.jsx("rect", { fill: "transparent", height: s, width: n, x: 0, y: 0 }),
        /* @__PURE__ */ v.jsxs(
          "g",
          {
            ...zt,
            style: ye,
            transform: `translate(${u.left},${u.top})`,
            children: [
              /* @__PURE__ */ v.jsx(
                "rect",
                {
                  fill: "transparent",
                  height: D,
                  width: ot,
                  x: 0,
                  y: 0
                }
              ),
              yn,
              rn,
              je ? /* @__PURE__ */ v.jsx("g", { clipPath: `url(#${T})`, children: _n }) : _n,
              on
            ]
          }
        )
      ] }) })
    }
  );
}), lz = { top: 40, right: 40, bottom: 40, left: 40 };
function uz(t) {
  const n = [];
  return E.Children.forEach(t, (s) => {
    if (!E.isValidElement(s))
      return;
    const r = s.type, o = typeof s.type == "function" && (r.displayName || r.name) || "", u = s.props, c = o === "PatternArea" || s.type === WM;
    (o === "Area" || s.type === Br || u && typeof u.dataKey == "string" && u.dataKey.length > 0 && !c) && u?.dataKey && n.push({
      dataKey: u.dataKey,
      stroke: u.stroke || u.fill || "var(--chart-line-primary)",
      strokeWidth: u.strokeWidth || 2,
      yAxisId: u.yAxisId
    });
  }), n;
}
function cz({
  width: t,
  height: n,
  data: s,
  xDataKey: r,
  margin: o,
  animationDuration: u,
  animationEasing: c,
  enterTransition: d,
  revealSignature: p,
  chartStatus: h,
  loadingLabel: g,
  yDomainTweenDuration: y,
  yDomainTween: x,
  xDomain: T,
  xDomainSlotCount: S,
  tweenYDomainOnXDomainChange: A,
  children: C,
  containerRef: N,
  onPhaseChange: R
}) {
  const O = E.useMemo(() => uz(C), [C]);
  return /* @__PURE__ */ v.jsx(
    rz,
    {
      animationDuration: u,
      animationEasing: c,
      chartStatus: h,
      clipPathId: "chart-area-grow-clip",
      containerRef: N,
      data: s,
      enterTransition: d,
      height: n,
      lines: O,
      loadingLabel: g,
      margin: o,
      onPhaseChange: R,
      revealSignature: p,
      tweenYDomainOnXDomainChange: A,
      width: t,
      xDataKey: r,
      xDomain: T,
      xDomainSlotCount: S,
      yDomainTween: x,
      yDomainTweenDuration: y,
      children: C
    }
  );
}
function sA({
  data: t,
  xDataKey: n = "date",
  margin: s,
  animationDuration: r = 1100,
  animationEasing: o,
  enterTransition: u,
  revealSignature: c,
  aspectRatio: d = "2 / 1",
  className: p = "",
  status: h = QM,
  loadingLabel: g,
  yDomainTweenDuration: y = c0,
  yDomainTween: x = !0,
  xDomain: T,
  xDomainSlotCount: S,
  tweenYDomainOnXDomainChange: A = !1,
  style: C,
  onPhaseChange: N,
  children: R
}) {
  const O = E.useRef(null), k = { ...lz, ...s }, [H, G] = E.useState(
    () => JM(h)
  ), X = E.useCallback(
    (Z) => {
      G(Z), N?.(Z);
    },
    [N]
  ), Y = !!(g?.trim() && (H === "loading" || H === "exiting" || H === "gridTweenReady" || H === "revealingLoading"));
  return /* @__PURE__ */ v.jsxs(
    "div",
    {
      className: ma("relative w-full", p),
      ref: O,
      style: { aspectRatio: d, touchAction: "none", ...C },
      children: [
        /* @__PURE__ */ v.jsx(xE, { debounceTime: 10, children: ({ width: Z, height: J }) => /* @__PURE__ */ v.jsx(
          cz,
          {
            animationDuration: r,
            animationEasing: o,
            chartStatus: h,
            containerRef: O,
            data: t,
            enterTransition: u,
            height: J,
            loadingLabel: g,
            margin: k,
            onPhaseChange: X,
            revealSignature: c,
            tweenYDomainOnXDomainChange: A,
            width: Z,
            xDataKey: n,
            xDomain: T,
            xDomainSlotCount: S,
            yDomainTween: x,
            yDomainTweenDuration: y,
            children: R
          }
        ) }),
        Y ? /* @__PURE__ */ v.jsx(
          i6,
          {
            exiting: H !== "loading",
            text: g
          }
        ) : null
      ]
    }
  );
}
function aA(t) {
  return "bandwidth" in t ? t.bandwidth() : 0;
}
function Jb(t) {
  let {
    top: n = 0,
    left: s = 0,
    scale: r,
    width: o,
    stroke: u = "#eaf0f6",
    strokeWidth: c = 1,
    strokeDasharray: d,
    className: p,
    children: h,
    numTicks: g = 10,
    lineStyle: y,
    offset: x,
    tickValues: T,
    ...S
  } = t;
  const A = T ?? BS(r, g), C = (x ?? 0) + aA(r) / 2, N = A.map((R, O) => {
    const k = (VS(r(R)) ?? 0) + C;
    return {
      index: O,
      from: new Hr({
        x: 0,
        y: k
      }),
      to: new Hr({
        x: o,
        y: k
      })
    };
  });
  return /* @__PURE__ */ v.jsx(nS, {
    className: Xr("visx-rows", p),
    top: n,
    left: s,
    children: h ? h({
      lines: N
    }) : N.map((R) => {
      let {
        from: O,
        to: k,
        index: H
      } = R;
      return /* @__PURE__ */ v.jsx(iS, {
        from: O,
        to: k,
        stroke: u,
        strokeWidth: c,
        strokeDasharray: d,
        style: y,
        ...S
      }, `row-line-${H}`);
    })
  });
}
function fz(t) {
  let {
    top: n = 0,
    left: s = 0,
    scale: r,
    height: o,
    stroke: u = "#eaf0f6",
    strokeWidth: c = 1,
    strokeDasharray: d,
    className: p,
    numTicks: h = 10,
    lineStyle: g,
    offset: y,
    tickValues: x,
    children: T,
    ...S
  } = t;
  const A = x ?? BS(r, h), C = (y ?? 0) + aA(r) / 2, N = A.map((R, O) => {
    const k = (VS(r(R)) ?? 0) + C;
    return {
      index: O,
      from: new Hr({
        x: k,
        y: 0
      }),
      to: new Hr({
        x: k,
        y: o
      })
    };
  });
  return /* @__PURE__ */ v.jsx(nS, {
    className: Xr("visx-columns", p),
    top: n,
    left: s,
    children: T ? T({
      lines: N
    }) : N.map((R) => {
      let {
        from: O,
        to: k,
        index: H
      } = R;
      return /* @__PURE__ */ v.jsx(iS, {
        from: O,
        to: k,
        stroke: u,
        strokeWidth: c,
        strokeDasharray: d,
        style: g,
        ...S
      }, `column-line-${H}`);
    })
  });
}
function dz({
  innerWidth: t,
  shimmer: n,
  shimmerLength: s,
  shimmerSpeed: r,
  shimmerSync: o,
  active: u,
  oneShot: c = !1
}) {
  const d = tf(0), p = ef(), h = up / Math.max(r, 0.1), g = u && n && p !== !0 && t > 0;
  E.useEffect(() => {
    if (!g)
      return;
    let T = !1, S, A;
    const C = () => {
      T || (d.set(0), A = Os(d, 1, {
        duration: h,
        ease: [...ui],
        onComplete: () => {
          T || (S = window.setTimeout(
            C,
            UM
          ));
        }
      }));
    };
    return o && c ? (d.set(0), A = Os(d, 1, {
      duration: h / 2,
      ease: [...ui]
    }), () => A?.stop()) : o ? (C(), () => {
      T = !0, A?.stop(), S !== void 0 && window.clearTimeout(S);
    }) : (d.set(0), A = Os(d, 1, {
      duration: h,
      repeat: Number.POSITIVE_INFINITY,
      ease: [...ui]
    }), () => A?.stop());
  }, [c, d, h, g, o]);
  const y = ba(
    d,
    (T) => -s + T * (t + s * 2)
  ), x = ba(y, (T) => `translate(${T}, 0)`);
  return { shimmerEnabled: g, shimmerTransform: x };
}
const hz = 140, mz = 1, pz = "color-mix(in oklch, var(--foreground) 68%, transparent)";
function rA(t, n) {
  return !n || t.length <= 2 ? t : t.slice(1, -1);
}
function gz(t) {
  const { hideHorizontalEdgeLines: n, numTicksRows: s, rowTickValues: r, yScale: o } = t, u = r ?? (o.ticks ? o.ticks(s) : []), c = rA(u, n);
  if (!(c === u && !r && !n))
    return c.length > 0 ? c : void 0;
}
function f0({
  horizontal: t = !0,
  vertical: n = !1,
  numTicksRows: s = 5,
  numTicksColumns: r = 10,
  rowTickValues: o,
  stroke: u = gn.grid,
  loadingStroke: c,
  strokeOpacity: d = 1,
  strokeWidth: p = 1,
  strokeDasharray: h = "4,4",
  highlightRowValues: g,
  highlightRowStroke: y = gn.foregroundMuted,
  highlightRowStrokeOpacity: x = 1,
  highlightRowStrokeWidth: T = 1,
  highlightRowStrokeDasharray: S = "0",
  fadeHorizontal: A = !0,
  fadeVertical: C = !1,
  hideHorizontalEdgeLines: N = !1,
  hideVerticalEdgeLines: R = !1,
  yAxisId: O,
  shimmer: k = !1,
  shimmerStroke: H = pz,
  shimmerLength: G = hz,
  shimmerSpeed: X = mz,
  shimmerSync: Y = !1
}) {
  const { xScale: Z, innerWidth: J, innerHeight: W, orientation: ut, barScale: lt, chartPhase: dt } = Wn(), ot = Np(O), D = k && B6(dt), q = H6(dt) && c != null ? c : u, { shimmerEnabled: w, shimmerTransform: L } = dz({
    innerWidth: J,
    shimmer: k,
    shimmerLength: G,
    shimmerSpeed: X,
    shimmerSync: Y,
    active: D
  }), _ = ut === "horizontal" && lt ? ot : Z, V = gz({
    hideHorizontalEdgeLines: N,
    numTicksRows: s,
    rowTickValues: o,
    yScale: ot
  }), nt = n && _ && typeof _ == "function" && R ? (() => {
    const ht = _.ticks?.(r) ?? [], I = rA(ht, !0);
    return I.length > 0 ? I : void 0;
  })() : void 0, at = E.useId(), rt = `grid-rows-fade-${at}`, st = `${rt}-gradient`, ft = `grid-shimmer-${at}`, Tt = `grid-cols-fade-${at}`, P = `${Tt}-gradient`, ct = A ? `url(#${rt})` : void 0;
  return /* @__PURE__ */ v.jsxs("g", { className: "chart-grid", children: [
    t && A && /* @__PURE__ */ v.jsxs("defs", { children: [
      /* @__PURE__ */ v.jsxs("linearGradient", { id: st, x1: "0%", x2: "100%", y1: "0%", y2: "0%", children: [
        /* @__PURE__ */ v.jsx("stop", { offset: "0%", style: { stopColor: "white", stopOpacity: 0 } }),
        /* @__PURE__ */ v.jsx("stop", { offset: "10%", style: { stopColor: "white", stopOpacity: 1 } }),
        /* @__PURE__ */ v.jsx("stop", { offset: "90%", style: { stopColor: "white", stopOpacity: 1 } }),
        /* @__PURE__ */ v.jsx(
          "stop",
          {
            offset: "100%",
            style: { stopColor: "white", stopOpacity: 0 }
          }
        )
      ] }),
      /* @__PURE__ */ v.jsx("mask", { id: rt, children: /* @__PURE__ */ v.jsx(
        "rect",
        {
          fill: `url(#${st})`,
          height: W,
          width: J,
          x: "0",
          y: "0"
        }
      ) })
    ] }),
    t && w ? /* @__PURE__ */ v.jsx("defs", { children: /* @__PURE__ */ v.jsxs(
      Se.linearGradient,
      {
        gradientTransform: L,
        gradientUnits: "userSpaceOnUse",
        id: ft,
        x1: 0,
        x2: G,
        y1: 0,
        y2: 0,
        children: [
          /* @__PURE__ */ v.jsx("stop", { offset: "0%", stopColor: H, stopOpacity: 0 }),
          /* @__PURE__ */ v.jsx("stop", { offset: "35%", stopColor: H, stopOpacity: 0.45 }),
          /* @__PURE__ */ v.jsx("stop", { offset: "50%", stopColor: H, stopOpacity: 1 }),
          /* @__PURE__ */ v.jsx("stop", { offset: "65%", stopColor: H, stopOpacity: 0.45 }),
          /* @__PURE__ */ v.jsx("stop", { offset: "100%", stopColor: H, stopOpacity: 0 })
        ]
      }
    ) }) : null,
    n && C && /* @__PURE__ */ v.jsxs("defs", { children: [
      /* @__PURE__ */ v.jsxs("linearGradient", { id: P, x1: "0%", x2: "0%", y1: "0%", y2: "100%", children: [
        /* @__PURE__ */ v.jsx("stop", { offset: "0%", style: { stopColor: "white", stopOpacity: 0 } }),
        /* @__PURE__ */ v.jsx("stop", { offset: "10%", style: { stopColor: "white", stopOpacity: 1 } }),
        /* @__PURE__ */ v.jsx("stop", { offset: "90%", style: { stopColor: "white", stopOpacity: 1 } }),
        /* @__PURE__ */ v.jsx(
          "stop",
          {
            offset: "100%",
            style: { stopColor: "white", stopOpacity: 0 }
          }
        )
      ] }),
      /* @__PURE__ */ v.jsx("mask", { id: Tt, children: /* @__PURE__ */ v.jsx(
        "rect",
        {
          fill: `url(#${P})`,
          height: W,
          width: J,
          x: "0",
          y: "0"
        }
      ) })
    ] }),
    t && /* @__PURE__ */ v.jsxs("g", { mask: ct, children: [
      /* @__PURE__ */ v.jsx(
        Jb,
        {
          numTicks: V ? void 0 : s,
          scale: ot,
          stroke: q,
          strokeDasharray: h,
          strokeOpacity: d,
          strokeWidth: p,
          tickValues: V,
          width: J
        }
      ),
      w ? /* @__PURE__ */ v.jsx(
        Jb,
        {
          numTicks: V ? void 0 : s,
          scale: ot,
          stroke: `url(#${ft})`,
          strokeDasharray: h,
          strokeOpacity: 1,
          strokeWidth: p,
          tickValues: V,
          width: J
        }
      ) : null
    ] }),
    t && g && g.length > 0 ? /* @__PURE__ */ v.jsx("g", { className: "chart-grid-highlight-rows", children: g.map((ht) => {
      const I = ot(ht);
      return I == null || !Number.isFinite(I) ? null : /* @__PURE__ */ v.jsx(
        "line",
        {
          stroke: y,
          strokeDasharray: S,
          strokeOpacity: x,
          strokeWidth: T,
          x1: 0,
          x2: J,
          y1: I,
          y2: I
        },
        ht
      );
    }) }) : null,
    n && _ && typeof _ == "function" && /* @__PURE__ */ v.jsx("g", { mask: C ? `url(#${Tt})` : void 0, children: /* @__PURE__ */ v.jsx(
      fz,
      {
        height: W,
        numTicks: nt ? void 0 : r,
        scale: _,
        stroke: u,
        strokeDasharray: h,
        strokeOpacity: d,
        strokeWidth: p,
        tickValues: nt
      }
    ) })
  ] });
}
f0.displayName = "Grid";
var Lc = ET();
const Wb = 24, yz = 60, vz = E.memo(function({
  currentIndex: n,
  labels: s
}) {
  const r = s[n] ?? s[0] ?? "";
  return /* @__PURE__ */ v.jsx("div", { className: "overflow-hidden rounded-full bg-zinc-900 px-4 py-1 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900", children: /* @__PURE__ */ v.jsx("div", { className: "flex h-6 items-center justify-center", children: /* @__PURE__ */ v.jsx("span", { className: "whitespace-nowrap font-medium text-sm", children: r }) }) });
}), xz = E.memo(function({
  currentIndex: n,
  labels: s
}) {
  const r = E.useMemo(() => s.map((h, g) => {
    const y = h.split(" "), x = y[0] || "", T = y[1] || "";
    return { month: x, day: T, full: h, key: `${h}::${g}` };
  }), [s]), o = E.useMemo(() => {
    const h = [];
    return r.forEach((g, y) => {
      const x = h.at(-1);
      (!x || x.month !== g.month) && h.push({
        month: g.month,
        key: `${g.month}-${y}`,
        startIndex: y
      });
    }), h;
  }, [r]), u = E.useMemo(() => {
    if (n < 0 || n >= r.length)
      return 0;
    for (let h = o.length - 1; h >= 0; h--) {
      const g = o[h];
      if (g && g.startIndex <= n)
        return h;
    }
    return 0;
  }, [n, r.length, o]), c = E.useRef(-1), d = zn(0, { stiffness: 400, damping: 35 }), p = zn(0, { stiffness: 400, damping: 35 });
  if (d.set(-n * Wb), u >= 0) {
    const h = c.current === -1, g = c.current !== u;
    (h || g) && (p.set(-u * Wb), c.current = u);
  }
  return /* @__PURE__ */ v.jsx("div", { className: "overflow-hidden rounded-full bg-zinc-900 px-4 py-1 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900", children: /* @__PURE__ */ v.jsx("div", { className: "relative h-6 overflow-hidden", children: /* @__PURE__ */ v.jsxs("div", { className: "flex items-center justify-center gap-1", children: [
    /* @__PURE__ */ v.jsx("div", { className: "relative h-6 overflow-hidden", children: /* @__PURE__ */ v.jsx(Se.div, { className: "flex flex-col", style: { y: p }, children: o.map((h) => /* @__PURE__ */ v.jsx(
      "div",
      {
        className: "flex h-6 shrink-0 items-center justify-center",
        children: /* @__PURE__ */ v.jsx("span", { className: "whitespace-nowrap font-medium text-sm", children: h.month })
      },
      h.key
    )) }) }),
    /* @__PURE__ */ v.jsx("div", { className: "relative h-6 overflow-hidden", children: /* @__PURE__ */ v.jsx(Se.div, { className: "flex flex-col", style: { y: d }, children: r.map((h) => /* @__PURE__ */ v.jsx(
      "div",
      {
        className: "flex h-6 shrink-0 items-center justify-center",
        children: /* @__PURE__ */ v.jsx("span", { className: "whitespace-nowrap font-medium text-sm", children: h.day })
      },
      h.key
    )) }) })
  ] }) }) });
});
function oA({ currentIndex: t, labels: n, visible: s }) {
  return !s || n.length === 0 ? null : n.length > yz ? /* @__PURE__ */ v.jsx(vz, { currentIndex: t, labels: n }) : /* @__PURE__ */ v.jsx(xz, { currentIndex: t, labels: n });
}
oA.displayName = "DateTicker";
function lA(t) {
  const [n, s] = E.useState(!1);
  E.useEffect(() => {
    s(!0);
  }, []);
  const r = t.containerRef.current;
  return !(n && r) || !t.visible ? null : /* @__PURE__ */ v.jsx(bz, { ...t, container: r });
}
function bz({
  x: t,
  y: n,
  containerWidth: s,
  containerHeight: r,
  offset: o = 16,
  className: u = "",
  children: c,
  left: d,
  top: p,
  flipped: h,
  springConfig: g,
  animate: y = !0,
  entrance: x = !0,
  panelStyle: T,
  backgroundColor: S = gn.tooltipBackground,
  container: A
}) {
  const { tooltipBoxSpring: C } = wa(), N = g ?? C, R = E.useRef(null), O = E.useRef(180), k = E.useRef(80), [H, G] = E.useState({ left: t, top: n }), X = O.current, Y = k.current, Z = t + X + o > s, J = Z ? t - o - X : t + o, W = Math.max(
    o,
    Math.min(n - Y / 2, r - Y - o)
  ), ut = zn(J, N), lt = zn(W, N);
  y && d === void 0 && ut.set(J), y && p === void 0 && lt.set(W), E.useLayoutEffect(() => {
    if (!R.current)
      return;
    const nt = R.current, at = nt.offsetWidth, rt = nt.offsetHeight;
    at > 0 && (O.current = at), rt > 0 && (k.current = rt);
    const st = O.current, ft = k.current, P = t + st + o > s ? t - o - st : t + o, ct = Math.max(
      o,
      Math.min(n - ft / 2, r - ft - o)
    );
    if (!y) {
      G({ left: P, top: ct });
      return;
    }
    d === void 0 && ut.set(P), p === void 0 && lt.set(ct);
  }, [
    t,
    n,
    s,
    r,
    o,
    d,
    p,
    y,
    ut,
    lt
  ]);
  const dt = E.useRef(Z), [ot, D] = E.useState(0);
  E.useEffect(() => {
    dt.current !== Z && (D((nt) => nt + 1), dt.current = Z);
  }, [Z]);
  const q = y ? d ?? ut : H.left, w = y ? p ?? lt : H.top, L = h ?? Z, U = L ? "right top" : "left top", _ = ma(
    "min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg",
    T?.backgroundColor === void 0 && S === gn.tooltipBackground && "bg-chart-tooltip-background",
    T?.backdropFilter === void 0 && "backdrop-blur-md"
  ), V = {
    transformOrigin: U,
    ...T?.backgroundColor === void 0 && {
      backgroundColor: S
    },
    ...T
  };
  return x ? Lc.createPortal(
    /* @__PURE__ */ v.jsx(
      Se.div,
      {
        animate: { opacity: 1 },
        className: ma("pointer-events-none absolute z-50", u),
        exit: { opacity: 0 },
        initial: { opacity: 0 },
        ref: R,
        style: { left: q, top: w },
        transition: { duration: 0.1 },
        children: /* @__PURE__ */ v.jsx(
          Se.div,
          {
            animate: { scale: 1, opacity: 1, x: 0 },
            className: _,
            initial: { scale: 0.85, opacity: 0, x: L ? 20 : -20 },
            style: V,
            transition: { type: "spring", stiffness: 300, damping: 25 },
            children: c
          },
          ot
        )
      }
    ),
    A
  ) : Lc.createPortal(
    /* @__PURE__ */ v.jsx(
      "div",
      {
        className: ma("pointer-events-none absolute z-50", u),
        ref: R,
        style: { left: H.left, top: H.top },
        children: /* @__PURE__ */ v.jsx("div", { className: _, style: V, children: c })
      }
    ),
    A
  );
}
lA.displayName = "TooltipBox";
function uA({ title: t, rows: n, children: s }) {
  return /* @__PURE__ */ v.jsx("div", { className: "overflow-hidden", children: /* @__PURE__ */ v.jsxs("div", { className: "px-3 py-2.5", children: [
    t && /* @__PURE__ */ v.jsx("div", { className: "mb-2 text-left font-medium text-chart-tooltip-foreground text-xs", children: t }),
    /* @__PURE__ */ v.jsx("div", { className: "space-y-1.5", children: n.map((r) => /* @__PURE__ */ v.jsxs(
      "div",
      {
        className: "flex items-center justify-between gap-4",
        children: [
          /* @__PURE__ */ v.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ v.jsx(
              "span",
              {
                className: "h-2.5 w-2.5 shrink-0 rounded-full",
                style: { backgroundColor: r.color }
              }
            ),
            /* @__PURE__ */ v.jsx("span", { className: "text-chart-tooltip-muted text-sm", children: r.label })
          ] }),
          /* @__PURE__ */ v.jsx("span", { className: "font-medium text-chart-tooltip-foreground text-sm tabular-nums", children: typeof r.value == "number" ? p6(r.value) : r.value })
        ]
      },
      `${r.label}-${r.color}`
    )) }),
    s && /* @__PURE__ */ v.jsx("div", { className: "mt-2 transition-opacity duration-200 ease-out", children: s })
  ] }) });
}
uA.displayName = "TooltipContent";
function cA(t, n) {
  return t * 2 * Math.max(0, Math.min(0.5, n));
}
function Tz({
  x: t,
  y: n,
  halfExtent: s,
  cornerRadiusFraction: r,
  fill: o,
  stroke: u,
  strokeWidth: c,
  springConfig: d
}) {
  const { tooltipSpring: p } = wa(), h = d ?? p, g = zn(t, h), y = zn(n, h), x = s * 2, T = cA(s, r), S = ba(g, (C) => C - s), A = ba(y, (C) => C - s);
  return g.set(t), y.set(n), /* @__PURE__ */ v.jsx(
    Se.rect,
    {
      fill: o,
      height: x,
      rx: T,
      ry: T,
      stroke: u,
      strokeWidth: c,
      width: x,
      x: S,
      y: A
    }
  );
}
function fA({
  x: t,
  y: n,
  visible: s,
  color: r,
  size: o = 5,
  strokeColor: u = gn.background,
  strokeWidth: c = 2,
  variant: d = "dot",
  cornerRadiusFraction: p = 0.25,
  springConfig: h,
  animate: g = !0
}) {
  const { tooltipSpring: y } = wa(), x = h ?? y, T = zn(t, x), S = zn(n, x), A = d === "ring", C = A ? "transparent" : r, N = A ? r : u, R = A ? c ?? 1.5 : c;
  if (g && !A && (T.set(t), S.set(n)), !s)
    return null;
  if (A) {
    if (g)
      return /* @__PURE__ */ v.jsx(
        Tz,
        {
          cornerRadiusFraction: p,
          fill: C,
          halfExtent: o,
          springConfig: h,
          stroke: N,
          strokeWidth: R,
          x: t,
          y: n
        }
      );
    const O = o * 2, k = cA(o, p);
    return /* @__PURE__ */ v.jsx(
      "rect",
      {
        fill: C,
        height: O,
        rx: k,
        ry: k,
        stroke: N,
        strokeWidth: R,
        width: O,
        x: t - o,
        y: n - o
      }
    );
  }
  return g ? /* @__PURE__ */ v.jsx(
    Se.circle,
    {
      cx: T,
      cy: S,
      fill: C,
      r: o,
      stroke: N,
      strokeWidth: R
    }
  ) : /* @__PURE__ */ v.jsx(
    "circle",
    {
      cx: t,
      cy: n,
      fill: C,
      r: o,
      stroke: N,
      strokeWidth: R
    }
  );
}
fA.displayName = "TooltipDot";
function Sz(t) {
  return t === !1 || t === "none" ? { top: !1, bottom: !1, any: !1 } : t === !0 || t === "both" ? { top: !0, bottom: !0, any: !0 } : t === "top" ? { top: !0, bottom: !1, any: !0 } : { top: !1, bottom: !0, any: !0 };
}
function Mz(t, n = 10) {
  const s = Math.min(40, Math.max(2, n)), r = 100 - s;
  return t.any ? t.top && t.bottom ? [
    { offset: "0%", opacity: 0 },
    { offset: `${s}%`, opacity: 1 },
    { offset: "50%", opacity: 1 },
    { offset: `${r}%`, opacity: 1 },
    { offset: "100%", opacity: 0 }
  ] : t.top ? [
    { offset: "0%", opacity: 0 },
    { offset: `${s}%`, opacity: 1 },
    { offset: "100%", opacity: 1 }
  ] : [
    { offset: "0%", opacity: 1 },
    { offset: `${r}%`, opacity: 1 },
    { offset: "100%", opacity: 0 }
  ] : [{ offset: "0%", opacity: 1 }];
}
function Az(t) {
  if (typeof t == "number")
    return t;
  switch (t) {
    case "line":
      return 1;
    case "thin":
      return 2;
    case "medium":
      return 4;
    case "thick":
      return 8;
    default:
      return 1;
  }
}
function dA(t) {
  return t.visible ? /* @__PURE__ */ v.jsx(Cz, { ...t }) : null;
}
function Cz({
  x: t,
  visible: n,
  height: s,
  width: r = "line",
  span: o,
  columnWidth: u,
  colorEdge: c = gn.crosshair,
  colorMid: d = gn.crosshair,
  fadeEdges: p = "both",
  fadeLength: h = 10,
  animate: g = !0,
  gradientId: y = "tooltip-indicator-gradient",
  springConfig: x,
  strokeDasharray: T
}) {
  const { tooltipSpring: S } = wa(), A = x ?? S, C = o !== void 0 && u !== void 0 ? o * u : Az(r), N = t - C / 2, R = t, O = zn(N, A), k = zn(R, A);
  g && (O.set(N), k.set(R)), E.useEffect(() => {
    O.set(N), k.set(R);
  }, [k, O, R, N, n]);
  const H = d || c, G = Sz(p);
  if (!!T) {
    const Z = Math.max(1, C);
    return g ? /* @__PURE__ */ v.jsx(
      Se.line,
      {
        stroke: H,
        strokeDasharray: T,
        strokeWidth: Z,
        x1: k,
        x2: k,
        y1: 0,
        y2: s
      }
    ) : /* @__PURE__ */ v.jsx(
      "line",
      {
        stroke: H,
        strokeDasharray: T,
        strokeWidth: Z,
        x1: R,
        x2: R,
        y1: 0,
        y2: s
      }
    );
  }
  if (!G.any)
    return g ? /* @__PURE__ */ v.jsx(
      Se.rect,
      {
        fill: H,
        height: s,
        width: C,
        x: O,
        y: 0
      }
    ) : /* @__PURE__ */ v.jsx(
      "rect",
      {
        fill: H,
        height: s,
        width: C,
        x: N,
        y: 0
      }
    );
  const Y = Mz(G, h);
  return /* @__PURE__ */ v.jsxs("g", { children: [
    /* @__PURE__ */ v.jsx("defs", { children: /* @__PURE__ */ v.jsx("linearGradient", { id: y, x1: "0%", x2: "0%", y1: "0%", y2: "100%", children: Y.map((Z) => /* @__PURE__ */ v.jsx(
      "stop",
      {
        offset: Z.offset,
        style: { stopColor: H, stopOpacity: Z.opacity }
      },
      Z.offset
    )) }) }),
    g ? /* @__PURE__ */ v.jsx(
      Se.rect,
      {
        fill: `url(#${y})`,
        height: s,
        width: C,
        x: O,
        y: 0
      }
    ) : /* @__PURE__ */ v.jsx(
      "rect",
      {
        fill: `url(#${y})`,
        height: s,
        width: C,
        x: N,
        y: 0
      }
    )
  ] });
}
dA.displayName = "TooltipIndicator";
const _z = E.memo(function({
  showDatePill: n = !0,
  showCrosshair: s = !0,
  showDots: r = !0,
  dotVariant: o = "dot",
  dotSize: u = 5,
  dotRadiusFraction: c,
  dotScale: d = 1,
  dotStrokeWidth: p,
  indicatorColor: h,
  content: g,
  rows: y,
  dotColor: x,
  children: T,
  className: S = "",
  container: A,
  springConfig: C,
  matchCrosshair: N = !1,
  damping: R,
  indicatorDasharray: O,
  indicatorFadeEdges: k,
  indicatorFadeLength: H,
  boxSpringConfig: G,
  panelStyle: X,
  backgroundColor: Y
}) {
  const {
    tooltipData: Z,
    width: J,
    height: W,
    innerHeight: ut,
    margin: lt,
    columnWidth: dt,
    lines: ot,
    xAccessor: D,
    dateLabels: q,
    containerRef: w,
    orientation: L,
    barXAccessor: U,
    bandWidth: _,
    squareSnap: V
  } = GS(), { tooltipSpring: nt } = wa(), at = L === "horizontal", rt = q.length > 60, st = E.useMemo(() => {
    if (o !== "ring" || !_ || ot.length === 0)
      return u * d;
    const Ct = ot.length, Qt = V?.groupGap ?? (Ct > 1 ? 4 : 0);
    return (_ - Qt * (Ct - 1)) / Ct / 2 * d;
  }, [
    _,
    d,
    u,
    o,
    ot.length,
    V?.groupGap
  ]), ft = E.useMemo(() => G ? {
    animate: !rt,
    springConfig: G
  } : N ? {
    animate: !rt,
    springConfig: C ?? nt
  } : I4(R), [
    G,
    R,
    rt,
    N,
    C,
    nt
  ]), Tt = Z !== null, P = Z?.x ?? 0, ct = P + lt.left, ht = ot[0]?.dataKey, gt = (ht ? Z?.yPositions[ht] ?? 0 : 0) + lt.top, mt = E.useMemo(() => Z ? y ? y(Z.point) : ot.map((Ct) => ({
    color: Ct.stroke,
    label: Ct.dataKey,
    value: Z.point[Ct.dataKey] ?? 0
  })) : [], [Z, ot, y]), Et = E.useMemo(() => (Ct, Qt) => {
    if (y && mt[Qt]?.color)
      return mt[Qt].color;
    if (x != null) {
      if (typeof x == "function" && Z)
        return x(Z.point, Ct);
      if (typeof x == "string")
        return x;
    }
    return Ct.stroke;
  }, [x, y, Z, mt]), St = E.useMemo(() => h == null ? gn.crosshair : typeof h == "function" ? Z ? h(Z.point) : gn.crosshair : h, [h, Z]), wt = E.useMemo(() => {
    if (Z)
      return U ? U(Z.point) : m6.format(D(Z.point));
  }, [Z, U, D]), Kt = /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
    s && /* @__PURE__ */ v.jsx(
      "svg",
      {
        "aria-hidden": "true",
        className: "pointer-events-none absolute inset-0",
        height: "100%",
        width: "100%",
        children: /* @__PURE__ */ v.jsx("g", { transform: `translate(${lt.left},${lt.top})`, children: /* @__PURE__ */ v.jsx(
          dA,
          {
            animate: !rt,
            colorEdge: St,
            colorMid: St,
            columnWidth: dt,
            fadeEdges: O ? "none" : k ?? "both",
            fadeLength: H,
            height: ut,
            springConfig: C,
            strokeDasharray: O,
            visible: Tt,
            width: "line",
            x: P
          }
        ) })
      }
    ),
    r && Tt && !at && /* @__PURE__ */ v.jsx(
      "svg",
      {
        "aria-hidden": "true",
        className: "pointer-events-none absolute inset-0",
        height: "100%",
        width: "100%",
        children: /* @__PURE__ */ v.jsx("g", { transform: `translate(${lt.left},${lt.top})`, children: ot.map((Ct, Qt) => /* @__PURE__ */ v.jsx(
          fA,
          {
            color: Et(Ct, Qt),
            cornerRadiusFraction: o === "ring" ? c : void 0,
            size: st,
            springConfig: C,
            strokeColor: gn.background,
            strokeWidth: o === "ring" ? p : void 0,
            variant: o,
            visible: Tt,
            x: Z?.xPositions?.[Ct.dataKey] ?? P,
            y: Z?.yPositions[Ct.dataKey] ?? 0
          },
          Ct.dataKey
        )) })
      }
    ),
    /* @__PURE__ */ v.jsx(
      lA,
      {
        animate: ft.animate,
        backgroundColor: Y,
        className: S,
        containerHeight: W,
        containerRef: w,
        containerWidth: J,
        panelStyle: X,
        springConfig: ft.springConfig,
        top: at ? void 0 : lt.top,
        visible: Tt,
        x: ct,
        y: at ? gt : lt.top,
        children: g && Z ? g({
          point: Z.point,
          index: Z.index
        }) : !g && /* @__PURE__ */ v.jsx(uA, { rows: mt, title: wt, children: T })
      }
    ),
    /* @__PURE__ */ v.jsx(
      Ez,
      {
        currentIndex: Z?.index ?? 0,
        discreteInteraction: rt,
        enabled: n && !at,
        labels: q,
        springConfig: C,
        visible: Tt,
        xWithMargin: ct
      }
    )
  ] });
  return Lc.createPortal(Kt, A);
});
function d0(t) {
  const { containerRef: n } = Wn(), [s, r] = E.useState(!1);
  E.useEffect(() => {
    r(!0);
  }, []);
  const o = n.current;
  return s && o ? /* @__PURE__ */ v.jsx(_z, { ...t, container: o }) : null;
}
d0.displayName = "ChartTooltip";
function Ez(t) {
  return t.enabled && t.visible && t.labels.length > 0 ? /* @__PURE__ */ v.jsx(wz, { ...t }) : null;
}
function wz({
  labels: t,
  currentIndex: n,
  xWithMargin: s,
  discreteInteraction: r,
  springConfig: o,
  visible: u
}) {
  const { tooltipSpring: c } = wa(), p = zn(s, o ?? c);
  return r || p.set(s), E.useEffect(() => {
    p.set(s);
  }, [p, u]), /* @__PURE__ */ v.jsx(
    Se.div,
    {
      className: "pointer-events-none absolute z-50",
      style: {
        left: r ? s : p,
        transform: "translateX(-50%)",
        bottom: 4
      },
      children: /* @__PURE__ */ v.jsx(
        oA,
        {
          currentIndex: n,
          labels: t,
          visible: u
        }
      )
    }
  );
}
const Dz = c0;
function jz({
  label: t,
  x: n,
  crosshairX: s,
  hoveredLabel: r,
  isHovering: o,
  tickerHalfWidth: u,
  animatePosition: c
}) {
  const p = u + 20;
  let h = 1;
  if (o && s !== null) {
    const g = Math.abs(n - s);
    g < u || r && t === r ? h = 0 : g < p && (h = (g - u) / 20);
  }
  return /* @__PURE__ */ v.jsx(
    "div",
    {
      className: "absolute",
      style: {
        left: n,
        bottom: 12,
        width: 0,
        display: "flex",
        justifyContent: "center",
        transition: c ? `left ${Dz}ms cubic-bezier(${ui.join(", ")})` : void 0
      },
      children: /* @__PURE__ */ v.jsx(
        "span",
        {
          className: ma("whitespace-nowrap text-chart-label text-xs"),
          style: {
            opacity: h,
            transition: "opacity 0.4s ease-in-out"
          },
          children: t
        }
      )
    }
  );
}
const Nz = 400;
function Rz(t, n) {
  if (n < 0 || n > t)
    return 0;
  let s = 1;
  for (let r = 0; r < n; r++)
    s = s * (t - r) / (r + 1);
  return s;
}
function hA(t, n) {
  if (n === 1)
    return t >= 1 ? [[t]] : [];
  const s = [];
  for (let r = 1; r <= t - (n - 1); r++)
    for (const o of hA(t - r, n - 1))
      s.push([r, ...o]);
  return s;
}
function Oz(t) {
  const n = [0];
  let s = 0;
  for (const r of t)
    s += r, n.push(s);
  return n;
}
function mA(t, n) {
  const s = t - 1;
  if (s <= 0)
    return [0];
  const r = Array.from(
    { length: n },
    (u, c) => Math.round(c / (n - 1) * s)
  ), o = [...new Set(r)].sort((u, c) => u - c);
  return o[0] !== 0 && o.unshift(0), o.at(-1) !== s && o.push(s), [...new Set(o)].sort((u, c) => u - c);
}
function zz(t, n) {
  const s = t - 1;
  if (s <= 0)
    return [[0]];
  const r = n - 1;
  return r <= 0 ? [[0]] : Rz(s - 1, r - 1) > Nz ? [mA(t, n)] : hA(s, r).map(Oz);
}
function kz(t, n, s, r) {
  const o = /* @__PURE__ */ new Set(), u = [];
  for (const c of t) {
    const d = n[c];
    if (!d)
      continue;
    const p = s[c] ?? Ta.format(r(d));
    o.has(p) || (o.add(p), u.push(c));
  }
  return u;
}
function pA(t) {
  const n = [];
  for (let s = 1; s < t.length; s++) {
    const r = t[s], o = t[s - 1];
    r == null || o == null || n.push(r - o);
  }
  return n;
}
function Lz(t) {
  const n = pA(t), s = Math.min(...n), r = n.indexOf(s);
  return r === n.length - 1 ? 0 : r === 0 ? 1 : 2;
}
function tT(t, n, s) {
  if (t.length < 2)
    return {
      score: Number.POSITIVE_INFINITY,
      symmetryPenalty: Number.POSITIVE_INFINITY,
      countDistance: Number.POSITIVE_INFINITY,
      edgePreference: Number.POSITIVE_INFINITY
    };
  const r = [];
  for (let S = 1; S < t.length; S++) {
    const A = t[S], C = t[S - 1];
    A == null || C == null || r.push(n(A) - n(C));
  }
  const o = Math.min(...r), u = Math.max(...r), c = r.reduce((S, A) => S + A, 0) / r.length, d = c > 0 ? (u - o) / c : u - o, p = Math.abs(t.length - s), h = pA(t), g = Math.min(...h), y = h.indexOf(g), x = y > 0 && y < h.length - 1 ? 0.08 : 0, T = h.reduce((S, A, C) => S + Math.abs(A - (h.at(-1 - C) ?? A)), 0) / h.length;
  return {
    score: d + 0.1 * p + x + T * 0.02,
    symmetryPenalty: T,
    countDistance: p,
    edgePreference: Lz(t)
  };
}
function Uz(t, n, s, r) {
  return t.score < n.score - 1e-6 ? !0 : Math.abs(t.score - n.score) > 1e-6 ? !1 : s < r ? !0 : s > r ? !1 : t.symmetryPenalty < n.symmetryPenalty - 1e-6 ? !0 : t.symmetryPenalty > n.symmetryPenalty + 1e-6 ? !1 : t.edgePreference < n.edgePreference;
}
function Vz(t, n, s) {
  if (t <= 0)
    return [];
  if (t === 1)
    return [0];
  if (t <= n)
    return Array.from({ length: t }, (h, g) => g);
  const r = s?.resolveXPx ?? ((h) => h), o = Math.max(2, n - 1), u = Math.min(t, n + 1);
  let c = mA(t, n), d = tT(c, r, n), p = d.countDistance;
  for (let h = o; h <= u; h++)
    for (const g of zz(t, h)) {
      const y = s?.data && s.dateLabels && s.xAccessor ? kz(
        g,
        s.data,
        s.dateLabels,
        s.xAccessor
      ) : g;
      if (y.length < 2)
        continue;
      const x = tT(y, r, n), T = Math.abs(y.length - n);
      Uz(
        x,
        d,
        T,
        p
      ) && (c = y, d = x, p = T);
    }
  return c;
}
function Bz({
  data: t,
  dateLabels: n,
  marginLeft: s,
  targetTickCount: r,
  xAccessor: o,
  xScale: u
}) {
  const c = /* @__PURE__ */ new Set(), d = [], p = (h) => {
    const g = t[h];
    return g ? u(o(g)) ?? 0 : h;
  };
  for (const h of Vz(t.length, r, {
    data: t,
    dateLabels: n,
    resolveXPx: p,
    xAccessor: o
  })) {
    const g = t[h];
    if (!g)
      continue;
    const y = o(g), x = n[h] ?? Ta.format(y);
    c.has(x) || (c.add(x), d.push({
      date: y,
      label: x,
      x: (u(y) ?? 0) + s
    }));
  }
  return d;
}
function eT({
  marginLeft: t,
  numTicks: n,
  xScale: s
}) {
  const r = s.domain(), o = r[0], u = r[1];
  if (!(o && u))
    return [];
  const c = o.getTime(), p = u.getTime() - c, h = Math.max(2, n), g = /* @__PURE__ */ new Set(), y = [];
  for (let x = 0; x < h; x++) {
    const T = x / (h - 1), S = new Date(c + T * p), A = Ta.format(S);
    g.has(A) || (g.add(A), y.push({
      date: S,
      label: A,
      x: (s(S) ?? 0) + t
    }));
  }
  return y;
}
function Hz(t, n, s) {
  if (t.length === 0)
    return !1;
  const r = s.domain()[1], o = t.at(-1);
  return r && o ? r.getTime() > n(o).getTime() : !1;
}
function Yz(t, n, s, r, o, u) {
  if (n.length === 0 || u <= 0)
    return t;
  const c = n.at(-1), d = r.domain()[1];
  if (!(c && d))
    return t;
  const h = s(c).getTime(), g = d.getTime();
  if (g <= h)
    return t;
  const y = new Set(t.map((A) => A.label)), x = [], T = Math.min(u, 3);
  for (let A = 1; A <= T; A++) {
    const C = new Date(
      h + A / (T + 1) * (g - h)
    ), N = Ta.format(C);
    y.has(N) || (y.add(N), x.push({
      date: C,
      label: N,
      x: (r(C) ?? 0) + o
    }));
  }
  const S = Ta.format(d);
  return y.has(S) || x.push({
    date: d,
    label: S,
    x: (r(d) ?? 0) + o
  }), x.length === 0 ? t : [...t, ...x].sort((A, C) => A.x - C.x);
}
function h0(t) {
  const { containerRef: n } = Wn(), [s, r] = E.useState(!1);
  E.useEffect(() => {
    r(!0);
  }, []);
  const o = n.current;
  return s && o ? /* @__PURE__ */ v.jsx(Gz, { ...t, container: o }) : null;
}
const Gz = E.memo(function({
  numTicks: n = 5,
  tickerHalfWidth: s = 50,
  tickMode: r = "data",
  container: o
}) {
  const { xScale: u, margin: c, tooltipData: d, data: p, xAccessor: h, dateLabels: g, xDomain: y } = GS(), x = E.useMemo(() => {
    const C = r === "data" && Hz(p, h, u);
    if (r === "domain")
      return eT({
        marginLeft: c.left,
        numTicks: n,
        xScale: u
      });
    if (C && y == null)
      return eT({
        marginLeft: c.left,
        numTicks: n,
        xScale: u
      });
    const N = Bz({
      data: p,
      dateLabels: g,
      marginLeft: c.left,
      targetTickCount: n,
      xAccessor: h,
      xScale: u
    });
    return C && y != null ? Yz(
      N,
      p,
      h,
      u,
      c.left,
      Math.max(1, n - N.length + 1)
    ) : N;
  }, [
    r,
    y,
    p,
    g,
    h,
    u,
    c.left,
    n
  ]), T = d !== null, S = d ? d.x + c.left : null, A = T && d ? g[d.index] ?? Ta.format(h(d.point)) : null;
  return Lc.createPortal(
    /* @__PURE__ */ v.jsx("div", { className: "pointer-events-none absolute inset-0", children: x.map((C) => /* @__PURE__ */ v.jsx(
      jz,
      {
        animatePosition: y == null,
        crosshairX: S,
        hoveredLabel: A,
        isHovering: T,
        label: C.label,
        tickerHalfWidth: s,
        x: C.x
      },
      `${C.date.getTime()}-${C.x}`
    )) }),
    o
  );
});
h0.displayName = "XAxis";
const Ys = typeof window < "u", gm = Ys ? (
  /** @type {AnimeJSWindow} */
  /** @type {unknown} */
  window
) : null, pl = Ys ? document : null, Te = {
  OBJECT: 0,
  ATTRIBUTE: 1,
  CSS: 2,
  TRANSFORM: 3,
  CSS_VAR: 4
}, Ft = {
  NUMBER: 0,
  UNIT: 1,
  COLOR: 2,
  COMPLEX: 3
}, Kn = {
  NONE: 0,
  AUTO: 1,
  FORCE: 2
}, hn = {
  replace: 0,
  none: 1,
  blend: 2
}, nT = /* @__PURE__ */ Symbol(), Yr = /* @__PURE__ */ Symbol(), gA = /* @__PURE__ */ Symbol(), nf = /* @__PURE__ */ Symbol(), qz = /* @__PURE__ */ Symbol(), fe = 1e-11, cp = 1e12, Gr = 1e3, fp = 240, Sa = "", Xz = "var(", Iu = [], yA = /* @__PURE__ */ (() => {
  const t = /* @__PURE__ */ new Map();
  return t.set("x", "translateX"), t.set("y", "translateY"), t.set("z", "translateZ"), t;
})(), Uc = [
  "perspective",
  "translateX",
  "translateY",
  "translateZ",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "skew",
  "skewX",
  "skewY"
], Pz = /* @__PURE__ */ Uc.reduce((t, n) => ({ ...t, [n]: n + "(" }), {}), $n = () => {
}, Iz = (t) => t, Fz = /\)\s*[-.\d]/, $z = /(^#([\da-f]{3}){1,2}$)|(^#([\da-f]{4}){1,2}$)/i, Kz = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i, Zz = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+|-?\d*.\d+)\s*\)/i, Qz = /hsl\(\s*(-?\d+|-?\d*.\d+)\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)%\s*\)/i, Jz = /hsla\(\s*(-?\d+|-?\d*.\d+)\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)\s*\)/i, iT = /[-+]?\d*\.?\d+(?:e[-+]?\d)?/gi, vA = /^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)([a-z]+|%)$/i, Wz = /([a-z])([A-Z])/g, tk = /(\*=|\+=|-=)/, ek = /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/;
const Vc = {
  id: null,
  keyframes: null,
  playbackEase: null,
  playbackRate: 1,
  frameRate: fp,
  loop: 0,
  reversed: !1,
  alternate: !1,
  autoplay: !0,
  persist: !1,
  duration: Gr,
  delay: 0,
  loopDelay: 0,
  ease: "out(2)",
  composition: hn.replace,
  modifier: Iz,
  onBegin: $n,
  onBeforeUpdate: $n,
  onUpdate: $n,
  onLoop: $n,
  onPause: $n,
  onComplete: $n,
  onRender: $n
}, nk = {
  /** @type {Document|DOMTarget} */
  root: pl
}, nn = {
  /** @type {DefaultsParams} */
  defaults: Vc,
  /** @type {Number} */
  precision: 4,
  /** @type {Number} equals 1 in ms mode, 0.001 in s mode */
  timeScale: 1,
  /** @type {Number} */
  tickThreshold: 200
}, xA = { version: "4.5.0", engine: null };
Ys && (gm.AnimeJS || (gm.AnimeJS = []), gm.AnimeJS.push(xA));
const bA = (t) => t.replace(Wz, "$1-$2").toLowerCase(), Zi = (t, n) => t.indexOf(n) === 0, qr = Date.now, Qi = Array.isArray, ym = (t) => t && t.constructor === Object, Ii = (t) => typeof t == "number" && !isNaN(t), Ma = (t) => typeof t == "string", Aa = (t) => typeof t == "function", Zt = (t) => typeof t > "u", Dr = (t) => Zt(t) || t === null, TA = (t) => Ys && t instanceof SVGElement, SA = (t) => $z.test(t), MA = (t) => Zi(t, "rgb"), AA = (t) => Zi(t, "hsl"), ik = (t) => SA(t) || (MA(t) || AA(t)) && (t[t.length - 1] === ")" || !Fz.test(t)), uc = (t) => !nn.defaults.hasOwnProperty(t), sk = ["opacity", "rotate", "overflow", "color"], ak = (t, n) => {
  if (sk.includes(n)) return !1;
  if (t.getAttribute(n) || n in t) {
    if (n === "scale") {
      const s = (
        /** @type {SVGGeometryElement} */
        /** @type {DOMTarget} */
        t.parentNode
      );
      return s && s.tagName === "filter";
    }
    return !0;
  }
}, vm = (t) => Ma(t) ? parseFloat(
  /** @type {String} */
  t
) : (
  /** @type {Number} */
  t
), xr = Math.pow, dp = Math.sqrt, rk = Math.sin, ok = Math.cos, Fu = Math.abs, Qo = Math.floor, lk = Math.asin, m0 = Math.PI, sT = Math.round, li = (t, n, s) => t < n ? n : t > s ? s : t, pe = (t, n) => {
  if (n < 0) return t;
  if (!n) return sT(t);
  const s = 10 ** n;
  return sT(t * s) / s;
}, cc = (t, n, s) => s === 1 ? n : s === 0 ? t : t + (n - t) * s, p0 = (t) => t === 1 / 0 ? cp : t === -1 / 0 ? -cp : t, al = (t) => t <= fe ? fe : p0(pe(t, 11)), un = (t) => Qi(t) ? [...t] : t, uk = (t, n) => {
  const s = (
    /** @type {T & U} */
    { ...t }
  );
  for (let r in n) {
    const o = (
      /** @type {T & U} */
      t[r]
    );
    s[r] = Zt(o) ? (
      /** @type {T & U} */
      n[r]
    ) : o;
  }
  return s;
}, Be = (t, n, s, r = "_prev", o = "_next") => {
  let u = t._head, c = o;
  for (s && (u = t._tail, c = r); u; ) {
    const d = u[c];
    n(u), u = d;
  }
}, Jo = (t, n, s = "_prev", r = "_next") => {
  const o = n[s], u = n[r];
  o ? o[r] = u : t._head = u, u ? u[s] = o : t._tail = o, n[s] = null, n[r] = null;
}, _r = (t, n, s, r = "_prev", o = "_next") => {
  let u = t._tail;
  for (; u && s && s(u, n); ) u = u[r];
  const c = u ? u[o] : t._head;
  u ? u[o] = n : t._head = n, c ? c[r] = n : t._tail = n, n[r] = u, n[o] = c;
};
const ck = (t, n, s) => {
  const r = t.style.transform;
  if (r) {
    const o = t[nf];
    let u = 0;
    const c = r.length;
    let d;
    for (; u < c; ) {
      for (; u < c && r.charCodeAt(u) === 32; ) u++;
      if (u >= c) break;
      const h = u;
      for (; u < c && r.charCodeAt(u) !== 40; ) u++;
      if (u >= c) break;
      const g = r.substring(h, u);
      let y = 1;
      const x = u + 1;
      let T = -1, S = -1;
      for (u++; u < c && y > 0; ) {
        const C = r.charCodeAt(u);
        C === 40 ? y++ : C === 41 ? y-- : C === 44 && y === 1 && (T === -1 ? T = u : S === -1 && (S = u)), u++;
      }
      const A = u - 1;
      g === "translate" || g === "translate3d" ? (T === -1 ? o.translateX = r.substring(x, A).trim() : (o.translateX = r.substring(x, T).trim(), S === -1 ? o.translateY = r.substring(T + 1, A).trim() : (o.translateY = r.substring(T + 1, S).trim(), o.translateZ = r.substring(S + 1, A).trim())), d = r.substring(x, A)) : g === "scale" || g === "scale3d" ? T === -1 ? o.scale = r.substring(x, A).trim() : (o.scaleX = r.substring(x, T).trim(), S === -1 ? o.scaleY = r.substring(T + 1, A).trim() : (o.scaleY = r.substring(T + 1, S).trim(), o.scaleZ = r.substring(S + 1, A).trim())) : o[g] = r.substring(x, A);
    }
    if (n === "translate3d" && d)
      return s && (s[n] = d), d;
    const p = o[n];
    if (!Zt(p))
      return s && (s[n] = p), p;
  }
  return n === "translate3d" ? "0px, 0px, 0px" : n === "rotate3d" ? "0, 0, 0, 0deg" : Zi(n, "scale") ? "1" : Zi(n, "rotate") || Zi(n, "skew") ? "0deg" : "0px";
}, CA = (t) => {
  let n = Sa;
  for (let s = 0, r = Uc.length; s < r; s++) {
    const o = Uc[s], u = t[o];
    if (u !== void 0) {
      if (o === "translateX") {
        const c = t.translateY;
        if (c !== void 0) {
          const d = t.translateZ;
          d !== void 0 ? (n += `translate3d(${u},${c},${d}) `, s += 2) : (n += `translate(${u},${c}) `, s += 1);
          continue;
        }
      }
      if (o === "scaleX" && t.scale === void 0) {
        const c = t.scaleY;
        if (c !== void 0) {
          const d = t.scaleZ;
          d !== void 0 ? (n += `scale3d(${u},${c},${d}) `, s += 2) : (n += `scale(${u},${c}) `, s += 1);
          continue;
        }
      }
      n += `${Pz[o]}${u}) `;
    }
    o === "rotateZ" && t.rotate3d !== void 0 && (n += `rotate3d(${t.rotate3d}) `);
  }
  return t.matrix !== void 0 && (n += `matrix(${t.matrix}) `), t.matrix3d !== void 0 && (n += `matrix3d(${t.matrix3d}) `), n;
};
const xm = (
  /** @type {Adapter[]} */
  []
);
function _A(t, n) {
  if (!t) return null;
  const s = xm.length;
  t: for (let r = 0; r < s; r++) {
    const o = xm[r];
    if (o.detect && !o.detect(t)) continue;
    const u = o.targetAdapters;
    for (let c = 0, d = u.length; c < d; c++) {
      const p = u[c];
      if (p.detect(t)) {
        const h = p.props[n];
        if (h && (!h.gate || h.gate(t))) return h;
        break t;
      }
    }
  }
  for (let r = 0; r < s; r++) {
    const o = xm[r];
    if (o.detect && !o.detect(t)) continue;
    const u = o.propertyResolvers;
    for (let c = 0, d = u.length; c < d; c++) {
      const p = u[c](t, n);
      if (p) return p;
    }
  }
  return null;
}
const fk = (t) => {
  const n = Kz.exec(t) || Zz.exec(t), s = Zt(n[4]) ? 1 : +n[4];
  return [
    +n[1],
    +n[2],
    +n[3],
    s
  ];
}, dk = (t) => {
  const n = t.length, s = n === 4 || n === 5;
  return [
    +("0x" + t[1] + t[s ? 1 : 2]),
    +("0x" + t[s ? 2 : 3] + t[s ? 2 : 4]),
    +("0x" + t[s ? 3 : 5] + t[s ? 3 : 6]),
    n === 5 || n === 9 ? +(+("0x" + t[s ? 4 : 7] + t[s ? 4 : 8]) / 255).toFixed(3) : 1
  ];
}, bm = (t, n, s) => (s < 0 && (s += 1), s > 1 && (s -= 1), s < 1 / 6 ? t + (n - t) * 6 * s : s < 1 / 2 ? n : s < 2 / 3 ? t + (n - t) * (2 / 3 - s) * 6 : t), hk = (t) => {
  const n = Qz.exec(t) || Jz.exec(t), s = +n[1] / 360, r = +n[2] / 100, o = +n[3] / 100, u = Zt(n[4]) ? 1 : +n[4];
  let c, d, p;
  if (r === 0)
    c = d = p = o;
  else {
    const h = o < 0.5 ? o * (1 + r) : o + r - o * r, g = 2 * o - h;
    c = pe(bm(g, h, s + 1 / 3) * 255, 0), d = pe(bm(g, h, s) * 255, 0), p = pe(bm(g, h, s - 1 / 3) * 255, 0);
  }
  return [c, d, p, u];
}, mk = (t) => MA(t) ? fk(t) : SA(t) ? dk(t) : AA(t) ? hk(t) : [0, 0, 0, 1];
const sn = (t, n) => Zt(t) ? n : t, aT = (t, n) => {
  const s = t.match(ek), r = n[Yr] ? n : document.documentElement;
  let o = getComputedStyle(
    /** @type {HTMLElement} */
    r
  )?.getPropertyValue(s[1]);
  return (!o || o.trim() === Sa) && s[2] && (o = s[2].trim()), o || 0;
}, Xi = (t, n, s, r, o, u) => {
  if (Aa(t)) {
    if (!o) {
      const d = (
        /** @type {Function} */
        t(n, s, r, u)
      );
      return isNaN(+d) ? d || 0 : +d;
    }
    const c = () => {
      const d = (
        /** @type {Function} */
        t(n, s, r, u)
      );
      return isNaN(+d) ? d || 0 : +d;
    };
    return o.func = c, c();
  }
  if (Ma(t) && Zi(t, Xz)) {
    if (!o) return aT(
      /** @type {String} */
      t,
      n
    );
    const c = () => aT(
      /** @type {String} */
      t,
      n
    );
    return o.func = c, c();
  }
  return t;
}, EA = (t, n) => t[Yr] ? (
  // Handle SVG attributes
  t[gA] && ak(t, n) ? Te.ATTRIBUTE : (
    // Handle CSS Transform properties differently than CSS to allow individual animations
    Uc.includes(n) || yA.get(n) ? Te.TRANSFORM : (
      // CSS variables
      Zi(n, "--") ? Te.CSS_VAR : (
        // All other CSS properties
        n in /** @type {DOMTarget} */
        t.style ? Te.CSS : (
          // Handle other DOM Attributes
          n in t ? Te.OBJECT : Te.ATTRIBUTE
        )
      )
    )
  )
) : Te.OBJECT, rT = (t, n, s) => {
  const r = t.style[n];
  r && s && (s[n] = r);
  const o = r || getComputedStyle(t[qz] || t).getPropertyValue(n);
  return o === "auto" ? "0" : o;
}, br = (t, n, s, r) => {
  const o = Zt(s) ? EA(t, n) : s, u = _A(t, n);
  if (u) {
    const c = u.get(t);
    return c && r && (r[n] = c), c ?? 0;
  }
  if (o === Te.OBJECT) {
    const c = t[n];
    return c && r && (r[n] = c), c || 0;
  }
  if (o === Te.ATTRIBUTE) {
    const c = (
      /** @type {DOMTarget} */
      t.getAttribute(n)
    );
    return c && r && (r[n] = c), c;
  }
  return o === Te.TRANSFORM ? ck(
    /** @type {DOMTarget} */
    t,
    n,
    r
  ) : o === Te.CSS_VAR ? rT(
    /** @type {DOMTarget} */
    t,
    n,
    r
  ).trimStart() : rT(
    /** @type {DOMTarget} */
    t,
    n,
    r
  );
}, fc = (t, n, s) => s === "-" ? t - n : s === "+" ? t + n : t * n, g0 = () => ({
  /** @type {valueTypes} */
  t: Ft.NUMBER,
  n: 0,
  u: null,
  o: null,
  d: null,
  s: null
}), In = (t, n) => {
  if (n.t = Ft.NUMBER, n.n = 0, n.u = null, n.o = null, n.d = null, n.s = null, !t) return n;
  const s = +t;
  if (!isNaN(s))
    return n.n = s, n;
  let r = (
    /** @type {String} */
    t
  );
  r[1] === "=" && (n.o = r[0], r = r.slice(2));
  const o = r.includes(" ") ? !1 : vA.exec(r);
  if (o)
    return n.t = Ft.UNIT, n.n = +o[1], n.u = o[2], n;
  if (n.o)
    return n.n = +r, n;
  if (ik(r))
    return n.t = Ft.COLOR, n.d = mk(r), n;
  {
    const u = r.match(iT);
    return n.t = Ft.COMPLEX, n.d = u ? u.map(Number) : [], n.s = r.split(iT) || [], n;
  }
}, oT = (t, n) => (n.t = t._valueType, n.n = t._toNumber, n.u = t._unit, n.o = null, n.d = un(t._toNumbers), n.s = un(t._strings), n), ai = g0(), wA = (t, n, s) => {
  const r = t._modifier, o = t._fromNumbers, u = t._toNumbers, c = t._strings;
  let d = c[0];
  for (let p = 0, h = u.length; p < h; p++) {
    const g = (
      /** @type {Number} */
      r(pe(cc(o[p], u[p], n), s))
    ), y = c[p + 1];
    d += `${y ? g + y : g}`, t._numbers[p] = g;
  }
  return d;
};
const dc = (t, n, s, r, o) => {
  const u = t.parent, c = t.duration, d = t.completed, p = t.iterationDuration, h = t.iterationCount, g = t._currentIteration, y = t._loopDelay, x = t._reversed, T = t._alternate, S = t._hasChildren, A = t._delay, C = t._currentTime, N = A + p, R = n - A, O = li(C, -A, c), k = li(R, -A, c), H = R - C, G = k > 0, X = k >= c, Y = c <= fe, Z = o === Kn.FORCE;
  let J = 0, W = R, ut = 0;
  if (h > 1) {
    const q = p + (X ? 0 : y), w = ~~(k / q);
    t._currentIteration = li(w, 0, h), X && t._currentIteration--, J = t._currentIteration % 2, W = k - w * q || 0;
  }
  const lt = x ^ (T && J), dt = (
    /** @type {Renderable} */
    t._ease
  );
  let ot = X ? lt ? 0 : c : lt ? p - W : W;
  dt && (ot = p * dt(ot / p) || 0);
  const D = (u ? u.backwards : R < C) ? !lt : !!lt;
  if (t._currentTime = R, t._iterationTime = ot, t.backwards = D, G && !t.began ? (t.began = !0, !s && !(u && (D || !u.began)) && t.onBegin(
    /** @type {CallbackArgument} */
    t
  )) : R <= 0 && (t.began = !1), !s && !S && G && t._currentIteration !== g && t.onLoop(
    /** @type {CallbackArgument} */
    t
  ), Z || o === Kn.AUTO && // Timeline children render from their offset instead of their delay so the gap left by a truncated sibling is covered on seek.
  (n >= (u && A > 0 ? 0 : A) && n <= N || // Normal render
  n <= A && O > A || // Playhead is before the animation start time so make sure the animation is at its initial state
  n >= N && O !== c) || ot >= N && O !== c || // iterationTime is per-iteration, compared to the delay to catch a backward seek into a looped iteration's delay region. Exclude the final settled end, where iterationTime clamps to duration and would falsely match the delay region when the delay exceeds the duration.
  ot <= A && O > 0 && !X || n <= O && O === c && d || // Force a render if a seek occurs on an completed animation
  X && !d && Y) {
    if (G && (t.computeDeltaTime(O), s || t.onBeforeUpdate(
      /** @type {CallbackArgument} */
      t
    )), !S) {
      const q = Z || (D ? H * -1 : H) >= nn.tickThreshold, w = pe(t._offset + (u ? u._offset : 0) + A + ot, 12);
      let L = (
        /** @type {Tween} */
        /** @type {JSAnimation} */
        t._head
      ), U, _, V, nt, at = 0;
      for (; L; ) {
        const rt = L._composition, st = L._currentTime, ft = L._changeDuration, Tt = L._absoluteStartTime + L._changeDuration, P = L._nextRep, ct = L._prevRep, ht = rt !== hn.none, I = ct ? ct._absoluteStartTime + ct._changeDuration : 0, gt = ct && ct.parent !== L.parent, mt = !P || P._isOverridden ? Tt : P.parent === L.parent ? Tt + P._delay : P._absoluteStartTime < P._absoluteUpdateStartTime ? P._absoluteStartTime : P._absoluteUpdateStartTime;
        if ((q || // Tail keyframes always re-evaluate the gate so an earlier keyframe cannot leave the target stale by writing past its own range after a backward seek.
        (st !== ft || w <= mt || ct && !gt && (!P || P.parent !== L.parent)) && // A cross parent tween re-renders its from value from the previous sibling truncated end so the handoff gap holds.
        // A keyframe re-renders its from revert while the next keyframe time is stale so a backward jump over its range cannot leave the next value in place.
        (st !== 0 || w >= L._absoluteStartTime || gt && !L._hasFromValue && !ct._isOverridden && w >= I || P && !P._isOverridden && P.parent === L.parent && P._currentTime !== 0 && ot < P._startTime)) && // Non-first keyframes wait until the iteration reaches their own start before rendering, so the previous keyframe can handle the from-revert when scrubbed backward past this tween's range.
        (!ct || gt || ot >= L._startTime) && (!ht || !L._isOverridden && (!L._isOverlapped || w <= Tt) && // The next sibling owns the value past its takeover point, so yielding there keeps writes single owner in both directions.
        (!P || P._isOverridden || w <= mt) && // The previous sibling owns the value up to its truncated end.
        // Cross parent tweens take over the hold from that point, explicit from values wait for their own start.
        (!ct || ct._isOverridden || (gt ? w >= L._absoluteStartTime || !L._hasFromValue && w >= I : w >= I + L._delay)))) {
          const Et = L._currentTime = li(ot - L._startTime, 0, ft), St = L._ease(Et / L._updateDuration), wt = L._modifier, Kt = L._valueType, Ct = L._tweenType, Qt = Ct === Te.OBJECT, Jt = Kt === Ft.NUMBER, ge = Jt && Qt || St === 0 || St === 1 ? -1 : nn.precision;
          let Dt, jt;
          if (Jt)
            Dt = jt = /** @type {Number} */
            wt(pe(cc(L._fromNumber, L._toNumber, St), ge));
          else if (Kt === Ft.UNIT)
            jt = /** @type {Number} */
            wt(pe(cc(L._fromNumber, L._toNumber, St), ge)), Dt = `${jt}${L._unit}`;
          else if (Kt === Ft.COLOR) {
            const Ht = L._numbers, Gt = L._fromNumbers, zt = L._toNumbers, ye = 1 - St, me = Gt[0], yn = Gt[1], rn = Gt[2], _n = zt[0], on = zt[1], Me = zt[2];
            Ht[0] = /** @type {Number} */
            wt(Math.sqrt(me * me * ye + _n * _n * St)), Ht[1] = /** @type {Number} */
            wt(Math.sqrt(yn * yn * ye + on * on * St)), Ht[2] = /** @type {Number} */
            wt(Math.sqrt(rn * rn * ye + Me * Me * St)), Ht[3] = /** @type {Number} */
            wt(cc(Gt[3], zt[3], St)), (!L._setter || r) && (Dt = `rgba(${pe(Ht[0], 0)},${pe(Ht[1], 0)},${pe(Ht[2], 0)},${Ht[3]})`);
          } else Kt === Ft.COMPLEX && (Dt = wA(L, St, ge));
          if (ht && (L._number = jt), !r && rt !== hn.blend) {
            const Ht = L.property;
            U = L.target, L._setter ? L._setter(U, jt, L) : Qt ? U[Ht] = Dt : Ct === Te.ATTRIBUTE ? U.setAttribute(
              Ht,
              /** @type {String} */
              Dt
            ) : (_ = /** @type {DOMTarget} */
            U.style, Ct === Te.TRANSFORM ? (U !== V && (V = U, nt = U[nf]), nt[Ht] = Dt, at = 1) : Ct === Te.CSS ? _[Ht] = Dt : Ct === Te.CSS_VAR && _.setProperty(
              Ht,
              /** @type {String} */
              Dt
            )), G && (ut = 1);
          } else
            L._value = Dt;
        } else st && ct && !gt && ot < L._startTime && (L._currentTime = 0);
        at && L._renderTransforms && (_.transform = CA(nt), at = 0), L = L._next;
      }
      !s && ut && t.onRender(
        /** @type {JSAnimation} */
        t
      );
    }
    !s && G && t.onUpdate(
      /** @type {CallbackArgument} */
      t
    );
  }
  return u && Y ? !s && // (tickableAbsoluteTime > 0 instead) of (tickableAbsoluteTime >= duration) to prevent floating point precision issues
  // see: https://github.com/juliangarnier/anime/issues/1088
  (u.began && !D && R > 0 && !d || D && R <= fe && d) && (t.onComplete(
    /** @type {CallbackArgument} */
    t
  ), t.completed = !D) : G && X ? h === 1 / 0 ? t._startTime += t.duration : t._currentIteration >= h - 1 && (t.paused = !0, !d && !S && (t.completed = !0, !s && !(u && (D || !u.began)) && (t.onComplete(
    /** @type {CallbackArgument} */
    t
  ), t._resolve(
    /** @type {CallbackArgument} */
    t
  )))) : t.completed = !1, ut;
}, Tr = (t, n, s, r, o) => {
  const u = t._currentIteration;
  if (dc(t, n, s, r, o), t._hasChildren) {
    const c = (
      /** @type {Timeline} */
      t
    ), d = c.backwards, p = r ? n : c._iterationTime, h = qr();
    let g = 0, y = !0;
    if (!r && c._currentIteration !== u) {
      const x = c.iterationDuration;
      Be(c, (T) => {
        if (!d)
          !T.completed && !T.backwards && T._currentTime < T.iterationDuration && dc(T, x, s, 1, Kn.FORCE), T.began = !1, T.completed = !1;
        else {
          const S = T.duration, A = T._offset + T._delay, C = A + S;
          !s && S <= fe && (!A || C === x) && T.onComplete(T);
        }
      }), s || c.onLoop(
        /** @type {CallbackArgument} */
        c
      );
    }
    Be(c, (x) => {
      const T = pe((p - x._offset) * x._speed, 12);
      if (d && T > x._delay + x.duration) return;
      const S = x._fps < c._fps ? x.requestTick(h) : o;
      g += dc(x, T, s, r, S), !x.completed && y && (y = !1);
    }, d), !s && g && c.onRender(
      /** @type {CallbackArgument} */
      c
    ), (y || d) && c._currentTime >= c.duration && (c.paused = !0, c.completed || (c.completed = !0, s || (c.onComplete(
      /** @type {CallbackArgument} */
      c
    ), c._resolve(
      /** @type {CallbackArgument} */
      c
    ))));
  }
};
const lT = {}, pk = (t, n, s) => {
  if (s === Te.TRANSFORM) {
    const r = yA.get(t);
    return r || t;
  } else if (s === Te.CSS || // Handle special cases where properties like "strokeDashoffset" needs to be set as "stroke-dashoffset"
  // but properties like "baseFrequency" should stay in lowerCamelCase
  s === Te.ATTRIBUTE && TA(n) && t in /** @type {DOMTarget} */
  n.style) {
    const r = lT[t];
    if (r)
      return r;
    {
      const o = t && bA(t);
      return lT[t] = o, o;
    }
  } else
    return t;
}, DA = (t, n = !1) => {
  if (t._hasChildren)
    Be(t, (s) => DA(s, n), !0);
  else {
    const s = (
      /** @type {JSAnimation} */
      t
    );
    s.pause(), Be(s, (r) => {
      const o = r.property, u = r.target, c = r._tweenType, d = r._inlineValue, p = Dr(d) || d === Sa;
      if (r._setter) {
        if (!n && !p) {
          if (In(d, ai), ai.d) {
            const h = ai.d, g = r._numbers;
            for (let y = 0, x = h.length; y < x; y++) g[y] = h[y];
          } else
            r._number = ai.n;
          r._setter(r.target, r._number, r);
        }
      } else if (c === Te.OBJECT)
        !n && !p && (u[o] = d);
      else if (u[Yr])
        if (c === Te.ATTRIBUTE)
          n || (p ? u.removeAttribute(o) : u.setAttribute(
            o,
            /** @type {String} */
            d
          ));
        else {
          const h = (
            /** @type {DOMTarget} */
            u.style
          );
          if (c === Te.TRANSFORM) {
            const g = u[nf];
            p ? delete g[o] : g[o] = d, r._renderTransforms && (Object.keys(g).length ? h.transform = CA(g) : h.removeProperty("transform"));
          } else
            p ? h.removeProperty(bA(o)) : h[o] = d;
        }
      u[Yr] && s._tail === r && s.targets.forEach((h) => {
        h.getAttribute && h.getAttribute("style") === Sa && h.removeAttribute("style");
      });
    });
  }
  return t;
};
class jA {
  /** @param {Number} [initTime] */
  constructor(n = 0) {
    this.deltaTime = 0, this._currentTime = n, this._lastTickTime = n, this._startTime = n, this._lastTime = n, this._frameDuration = Gr / fp, this._fps = fp, this._speed = 1, this._hasChildren = !1, this._head = null, this._tail = null;
  }
  get fps() {
    return this._fps;
  }
  set fps(n) {
    const s = +n, r = s < fe ? fe : s, o = Gr / r;
    r > Vc.frameRate && (Vc.frameRate = r), this._fps = r, this._frameDuration = o;
  }
  get speed() {
    return this._speed;
  }
  set speed(n) {
    const s = +n;
    this._speed = s < fe ? fe : s;
  }
  /**
   * @param  {Number} time
   * @return {tickModes}
   */
  requestTick(n) {
    const s = this._frameDuration, r = n - this._lastTickTime, o = s * 0.25, u = o < 4 ? o : 4;
    return r + u < s ? Kn.NONE : (this._lastTickTime = r >= s ? n - r % s : n, Kn.AUTO);
  }
  /**
   * @param  {Number} time
   * @return {Number}
   */
  computeDeltaTime(n) {
    const s = n - this._lastTime;
    return this.deltaTime = s, this._lastTime = n, s;
  }
}
const jr = {
  animation: null,
  update: $n
}, gk = (t) => {
  let n = jr.animation;
  return n || (n = {
    duration: fe,
    computeDeltaTime: $n,
    _offset: 0,
    _delay: 0,
    _head: null,
    _tail: null
  }, jr.animation = n, jr.update = () => {
    t.forEach((s) => {
      for (let r in s) {
        const o = s[r], u = o._head;
        if (u) {
          const c = u._valueType, d = c === Ft.COMPLEX || c === Ft.COLOR ? un(u._fromNumbers) : null;
          let p = u._fromNumber, h = o._tail;
          for (; h && h !== u; ) {
            if (d)
              for (let g = 0, y = h._numbers.length; g < y; g++) d[g] += h._numbers[g];
            else
              p += h._number;
            h = h._prevAdd;
          }
          u._toNumber = p, u._toNumbers = d;
        }
      }
    }), dc(n, 1, 1, 0, Kn.FORCE);
  }), n;
};
const NA = Ys ? requestAnimationFrame : setImmediate, yk = Ys ? cancelAnimationFrame : clearImmediate;
class vk extends jA {
  /** @param {Number} [initTime] */
  constructor(n) {
    super(n), this.useDefaultMainLoop = !0, this.pauseOnDocumentHidden = !0, this.defaults = Vc, this.paused = !0, this.reqId = 0;
  }
  update() {
    const n = this._currentTime = qr();
    if (this.requestTick(n)) {
      this.computeDeltaTime(n);
      const s = this._speed, r = this._fps;
      let o = (
        /** @type {Tickable} */
        this._head
      );
      for (; o; ) {
        const u = o._next;
        o.paused ? (Jo(this, o), this._hasChildren = !!this._tail, o._running = !1, o.completed && !o._cancelled && o.cancel()) : Tr(
          o,
          (n - o._startTime) * o._speed * s,
          0,
          // !muteCallbacks
          0,
          // !internalRender
          o._fps < r ? o.requestTick(n) : Kn.AUTO
        ), o = u;
      }
      jr.update();
    }
  }
  wake() {
    return this.useDefaultMainLoop && !this.reqId && (this.requestTick(qr()), this.reqId = NA(RA)), this;
  }
  pause() {
    if (this.reqId)
      return this.paused = !0, xk();
  }
  resume() {
    if (this.paused)
      return this.paused = !1, Be(this, (n) => n.resetTime()), this.wake();
  }
  // Getter and setter for speed
  get speed() {
    return this._speed * (nn.timeScale === 1 ? 1 : Gr);
  }
  set speed(n) {
    const s = n * nn.timeScale;
    this._speed !== s && (this._speed = s, Be(this, (r) => r.speed = r._speed));
  }
  // Getter and setter for timeUnit
  get timeUnit() {
    return nn.timeScale === 1 ? "ms" : "s";
  }
  set timeUnit(n) {
    const r = n === "s", o = r ? 1e-3 : 1;
    if (nn.timeScale !== o) {
      nn.timeScale = o, nn.tickThreshold = 200 * o;
      const u = r ? 1e-3 : Gr;
      this.defaults.duration *= u, this._speed *= u;
    }
  }
  // Getter and setter for precision
  get precision() {
    return nn.precision;
  }
  set precision(n) {
    nn.precision = n;
  }
}
const cn = /* @__PURE__ */ (() => {
  const t = new vk(qr());
  return Ys && (xA.engine = t, pl.addEventListener("visibilitychange", () => {
    t.pauseOnDocumentHidden && (pl.hidden ? t.pause() : t.resume());
  })), t;
})(), RA = () => {
  cn._head ? (cn.reqId = NA(RA), cn.update()) : cn.reqId = 0;
}, xk = () => (yk(
  /** @type {NodeJS.Immediate & Number} */
  cn.reqId
), cn.reqId = 0, cn);
const Bc = {
  /** @type {TweenReplaceLookups} */
  _rep: /* @__PURE__ */ new WeakMap(),
  /** @type {TweenAdditiveLookups} */
  _add: /* @__PURE__ */ new Map()
}, y0 = (t, n, s = "_rep") => {
  const r = Bc[s];
  let o = r.get(t);
  return o || (o = {}, r.set(t, o)), o[n] ? o[n] : o[n] = {
    _head: null,
    _tail: null
  };
}, bk = (t, n) => t._isOverridden || t._absoluteStartTime > n._absoluteStartTime, hc = (t) => {
  t._isOverlapped = 1, t._isOverridden = 1, t._changeDuration = fe, t._currentTime = fe;
}, OA = (t, n) => {
  const s = t._composition;
  if (s === hn.replace) {
    const r = t._absoluteStartTime;
    _r(n, t, bk, "_prevRep", "_nextRep");
    const o = t._prevRep;
    if (o) {
      const u = o.parent, c = o._absoluteEndTime;
      if (
        // Check if the previous tween is from a different animation
        t.parent.id !== u.id && // Check if the animation has loops
        u.iterationCount > 1 && // Check if _absoluteChangeEndTime of last loop overlaps the current tween
        c + (u.duration - u.iterationDuration) > r
      ) {
        hc(o);
        let h = o._prevRep;
        for (; h && h.parent.id === u.id; )
          hc(h), h = h._prevRep;
      }
      const d = t._absoluteUpdateStartTime;
      if (c > d) {
        const h = o._startTime, g = c - (h + o._updateDuration), y = pe(d - g - h, 12);
        o._changeDuration = y, o._currentTime = y, o._isOverlapped = 1, y < fe && hc(o);
      }
      const p = t.parent.parent;
      if (!p || p !== u.parent) {
        let h = !0;
        if (Be(u, (g) => {
          g._isOverlapped || (h = !1);
        }), h) {
          const g = u.parent;
          if (g) {
            let y = !0;
            Be(g, (x) => {
              x !== u && Be(x, (T) => {
                T._isOverlapped || (y = !1);
              });
            }), y && g.cancel();
          } else
            u.cancel();
        }
      }
    }
  } else if (s === hn.blend) {
    const r = y0(t.target, t.property, "_add"), o = gk(Bc._add);
    let u = r._head;
    u || (u = { ...t }, u._composition = hn.replace, u._updateDuration = fe, u._startTime = 0, u._numbers = un(t._fromNumbers), u._number = 0, u._next = null, u._prev = null, _r(r, u), _r(o, u));
    const c = t._toNumber;
    if (t._fromNumber = u._fromNumber - c, t._toNumber = 0, t._numbers = un(t._fromNumbers), t._number = 0, u._fromNumber = c, t._toNumbers.length) {
      const d = un(t._toNumbers);
      d.forEach((p, h) => {
        t._fromNumbers[h] = u._fromNumbers[h] - p, t._toNumbers[h] = 0;
      }), u._fromNumbers = d;
    }
    _r(r, t, null, "_prevAdd", "_nextAdd");
  }
  return t;
}, Tk = (t) => {
  const n = t._composition;
  if (n !== hn.none) {
    const s = t.target, r = t.property, c = Bc._rep.get(s)[r];
    if (Jo(c, t, "_prevRep", "_nextRep"), n === hn.blend) {
      const d = Bc._add, p = d.get(s);
      if (!p) return;
      const h = p[r], g = jr.animation;
      Jo(h, t, "_prevAdd", "_nextAdd");
      const y = h._head;
      if (y && y === h._tail) {
        Jo(h, y, "_prevAdd", "_nextAdd"), Jo(g, y);
        let x = !0;
        for (let T in p)
          if (p[T]._head) {
            x = !1;
            break;
          }
        x && d.delete(s);
      }
    }
  }
  return t;
};
const uT = (t) => (t.paused = !0, t.began = !1, t.completed = !1, t), hp = (t) => (t._cancelled && (t._hasChildren ? Be(t, hp) : Be(t, (n) => {
  n._composition !== hn.none && OA(n, y0(n.target, n.property));
}), t._cancelled = 0), t);
let cT = 0;
const Sk = (t, n) => t._priority > n._priority;
class Mk extends jA {
  /**
   * @param {TimerParams} [parameters]
   * @param {Timeline} [parent]
   * @param {Number} [parentPosition]
   */
  constructor(n = {}, s = null, r = 0) {
    super(0), ++cT;
    const {
      id: o,
      delay: u,
      duration: c,
      reversed: d,
      alternate: p,
      loop: h,
      loopDelay: g,
      autoplay: y,
      frameRate: x,
      playbackRate: T,
      priority: S,
      onComplete: A,
      onLoop: C,
      onPause: N,
      onBegin: R,
      onBeforeUpdate: O,
      onUpdate: k
    } = n, H = s ? 0 : cn._lastTickTime, G = s ? s.defaults : nn.defaults, X = (
      /** @type {Number} */
      Aa(u) || Zt(u) ? G.delay : +u
    ), Y = Aa(c) || Zt(c) ? 1 / 0 : +c, Z = sn(h, G.loop), J = sn(g, G.loopDelay);
    let W = Z === !0 || Z === 1 / 0 || /** @type {Number} */
    Z < 0 ? 1 / 0 : (
      /** @type {Number} */
      Z + 1
    ), ut = 0;
    s ? ut = r : (cn.reqId || cn.requestTick(qr()), ut = (cn._lastTickTime - cn._startTime) * nn.timeScale), this.id = Zt(o) ? cT : o, this.parent = s, this.duration = p0((Y + J) * W - J) || fe, this.backwards = !1, this.paused = !0, this.began = !1, this.completed = !1, this.onBegin = R || G.onBegin, this.onBeforeUpdate = O || G.onBeforeUpdate, this.onUpdate = k || G.onUpdate, this.onLoop = C || G.onLoop, this.onPause = N || G.onPause, this.onComplete = A || G.onComplete, this.iterationDuration = Y, this.iterationCount = W, this._autoplay = s ? !1 : sn(y, G.autoplay), this._offset = ut, this._delay = X, this._loopDelay = J, this._iterationTime = 0, this._currentIteration = 0, this._resolve = $n, this._running = !1, this._reversed = +sn(d, G.reversed), this._reverse = this._reversed, this._cancelled = 0, this._alternate = sn(p, G.alternate), this._prev = null, this._next = null, this._lastTickTime = H, this._startTime = H, this._lastTime = H, this._fps = sn(x, G.frameRate), this._speed = sn(T, G.playbackRate), this._priority = +sn(S, 1);
  }
  get cancelled() {
    return !!this._cancelled;
  }
  set cancelled(n) {
    n ? this.cancel() : this.reset(!0).play();
  }
  get currentTime() {
    return li(pe(this._currentTime, nn.precision), -this._delay, this.duration);
  }
  set currentTime(n) {
    const s = this.paused;
    this.pause().seek(+n), s || this.resume();
  }
  get iterationCurrentTime() {
    return li(pe(this._iterationTime, nn.precision), 0, this.iterationDuration);
  }
  set iterationCurrentTime(n) {
    this.currentTime = this.iterationDuration * this._currentIteration + n;
  }
  get progress() {
    return li(pe(this._currentTime / this.duration, 10), 0, 1);
  }
  set progress(n) {
    this.currentTime = this.duration * n;
  }
  get iterationProgress() {
    return li(pe(this._iterationTime / this.iterationDuration, 10), 0, 1);
  }
  set iterationProgress(n) {
    const s = this.iterationDuration;
    this.currentTime = s * this._currentIteration + s * n;
  }
  get currentIteration() {
    return this._currentIteration;
  }
  set currentIteration(n) {
    this.currentTime = this.iterationDuration * li(+n, 0, this.iterationCount - 1);
  }
  get reversed() {
    return !!this._reversed;
  }
  set reversed(n) {
    n ? this.reverse() : this.play();
  }
  get speed() {
    return super.speed;
  }
  set speed(n) {
    super.speed = n, this.resetTime();
  }
  /**
   * @param  {Boolean} [softReset]
   * @return {this}
   */
  reset(n = !1) {
    return hp(this), this._reversed && !this._reverse && (this.reversed = !1), this._iterationTime = this.iterationDuration, Tr(this, 0, 1, ~~n, Kn.FORCE), uT(this), this._hasChildren && Be(this, uT), this;
  }
  /**
   * @param  {Boolean} internalRender
   * @return {this}
   */
  init(n = !1) {
    this.fps = this._fps, this.speed = this._speed, !n && this._hasChildren && Tr(this, this.duration, 1, ~~n, Kn.FORCE), this.reset(n);
    const s = this._autoplay;
    return s === !0 ? this.resume() : s && !Zt(
      /** @type {ScrollObserver} */
      s.linked
    ) && s.link(this), this;
  }
  /** @return {this} */
  resetTime() {
    const n = 1 / (this._speed * cn._speed);
    return this._startTime = qr() - (this._currentTime + this._delay) * n, this;
  }
  /** @return {this} */
  pause() {
    return this.paused ? this : (this.paused = !0, this.onPause(this), this);
  }
  /** @return {this} */
  resume() {
    return this.paused ? (this.paused = !1, this.duration <= fe && !this._hasChildren ? Tr(this, fe, 0, 0, Kn.FORCE) : (this._running || (_r(cn, this, Sk), cn._hasChildren = !0, this._running = !0), this.resetTime(), this._startTime -= 12, cn.wake()), this) : this;
  }
  /** @return {this} */
  restart() {
    return this.reset().resume();
  }
  /**
   * @param  {Number} time
   * @param  {Boolean|Number} [muteCallbacks]
   * @param  {Boolean|Number} [internalRender]
   * @return {this}
   */
  seek(n, s = 0, r = 0) {
    hp(this), this.completed = !1;
    const o = this.paused;
    return this.paused = !0, Tr(this, n + this._delay, ~~s, ~~r, Kn.AUTO), o ? this : this.resume();
  }
  /** @return {this} */
  alternate() {
    const n = this._reversed, s = this.iterationCount, r = this.iterationDuration, o = s === 1 / 0 ? Qo(cp / r) : s;
    return this._reversed = +(this._alternate && !(o % 2) ? n : !n), s === 1 / 0 ? this.iterationProgress = this._reversed ? 1 - this.iterationProgress : this.iterationProgress : this.seek(r * o - this._currentTime), this.resetTime(), this;
  }
  /** @return {this} */
  play() {
    return this._reversed && this.alternate(), this.resume();
  }
  /** @return {this} */
  reverse() {
    return this._reversed || this.alternate(), this.resume();
  }
  // TODO: Move all the animation / tweens / children related code to Animation / Timeline
  /** @return {this} */
  cancel() {
    return this._hasChildren ? Be(this, (n) => n.cancel(), !0) : Be(this, Tk), this._cancelled = 1, this.pause();
  }
  /**
   * @param  {Number} newDuration
   * @return {this}
   */
  stretch(n) {
    const s = this.duration, r = al(n);
    if (s === r) return this;
    const o = n / s, u = n <= fe;
    return this.duration = u ? fe : r, this.iterationDuration = u ? fe : al(this.iterationDuration * o), this._offset *= o, this._delay *= o, this._loopDelay *= o, this;
  }
  /**
    * Cancels the timer by seeking it back to 0 and reverting the attached scroller if necessary
    * @return {this}
    */
  revert() {
    Tr(this, 0, 1, 0, Kn.AUTO);
    const n = (
      /** @type {ScrollObserver} */
      this._autoplay
    );
    return n && n.linked && n.linked === this && n.revert(), this.cancel();
  }
  /**
    * Imediatly completes the timer, cancels it and triggers the onComplete callback
    * @param  {Boolean|Number} [muteCallbacks]
    * @return {this}
    */
  complete(n = 0) {
    return this.seek(this.duration, n).cancel();
  }
  /**
   * @typedef {this & {then: null}} ResolvedTimer
   */
  /**
   * @param  {Callback<ResolvedTimer>} [callback]
   * @return Promise<this>
   */
  then(n = $n) {
    const s = this.then, r = () => {
      this.then = null, n(
        /** @type {ResolvedTimer} */
        this
      ), this.then = s, this._resolve = $n;
    };
    return new Promise((o) => (this._resolve = () => o(r()), this.completed && this._resolve(), this));
  }
}
function fT(t) {
  const n = Ma(t) ? nk.root.querySelectorAll(t) : t;
  if (n instanceof NodeList || n instanceof HTMLCollection) return n;
}
function Ak(t) {
  if (Dr(t)) return (
    /** @type {TargetsArray} */
    []
  );
  if (!Ys) return (
    /** @type {JSTargetsArray} */
    Qi(t) && t.flat(1 / 0) || [t]
  );
  if (Qi(t)) {
    const s = t.flat(1 / 0), r = [];
    for (let o = 0, u = s.length; o < u; o++) {
      const c = s[o];
      if (!Dr(c)) {
        const d = fT(c);
        if (d)
          for (let p = 0, h = d.length; p < h; p++) {
            const g = d[p];
            if (!Dr(g)) {
              let y = !1;
              for (let x = 0, T = r.length; x < T; x++)
                if (r[x] === g) {
                  y = !0;
                  break;
                }
              y || r.push(g);
            }
          }
        else {
          let p = !1;
          for (let h = 0, g = r.length; h < g; h++)
            if (r[h] === c) {
              p = !0;
              break;
            }
          p || r.push(c);
        }
      }
    }
    return r;
  }
  const n = fT(t);
  return n ? (
    /** @type {DOMTargetsArray} */
    Array.from(n)
  ) : (
    /** @type {TargetsArray} */
    [t]
  );
}
function zA(t) {
  const n = Ak(t), s = n.length;
  for (let r = 0; r < s; r++) {
    const o = n[r];
    if (!o[nT]) {
      o[nT] = !0;
      const u = TA(o);
      /** @type {DOMTarget} */
      (o.nodeType || u) && (o[Yr] = !0, o[gA] = u, o[nf] = {});
    }
  }
  return n;
}
const Tm = { deg: 1, rad: 180 / m0, turn: 360 }, dT = {}, hT = (t, n, s, r = !1) => {
  const o = n.u, u = n.n;
  if (n.t === Ft.UNIT && o === s)
    return n;
  const c = u + o + s, d = dT[c];
  if (!Zt(d) && !r)
    n.n = d;
  else {
    let p;
    if (o in Tm)
      p = u * Tm[o] / Tm[s];
    else {
      const g = (
        /** @type {DOMTarget} */
        t.cloneNode()
      ), y = t.parentNode, x = y && y !== pl ? y : pl.body;
      x.appendChild(g);
      const T = g.style;
      T.width = 100 + o;
      const S = (
        /** @type {HTMLElement} */
        g.offsetWidth || 100
      );
      T.width = 100 + s;
      const A = (
        /** @type {HTMLElement} */
        g.offsetWidth || 100
      ), C = S / A;
      x.removeChild(g), p = C * u;
    }
    n.n = p, dT[c] = p;
  }
  return n.t, Ft.UNIT, n.u = s, n;
};
const Us = (t) => t;
const $o = (t = 1.68) => (n) => xr(n, +t), mp = {
  in: (t) => (n) => t(n),
  out: (t) => (n) => 1 - t(1 - n),
  inOut: (t) => (n) => n < 0.5 ? t(n * 2) / 2 : 1 - t(n * -2 + 2) / 2,
  outIn: (t) => (n) => n < 0.5 ? (1 - t(1 - n * 2)) / 2 : (t(n * 2 - 1) + 1) / 2
}, Ck = m0 / 2, mT = m0 * 2, pT = {
  [Sa]: $o,
  Quad: $o(2),
  Cubic: $o(3),
  Quart: $o(4),
  Quint: $o(5),
  /** @type {EasingFunction} */
  Sine: (t) => 1 - ok(t * Ck),
  /** @type {EasingFunction} */
  Circ: (t) => 1 - dp(1 - t * t),
  /** @type {EasingFunction} */
  Expo: (t) => t ? xr(2, 10 * t - 10) : 0,
  /** @type {EasingFunction} */
  Bounce: (t) => {
    let n, s = 4;
    for (; t < ((n = xr(2, --s)) - 1) / 11; ) ;
    return 1 / xr(4, 3 - s) - 7.5625 * xr((n * 3 - 2) / 22 - t, 2);
  },
  /** @type {BackEasing} */
  Back: (t = 1.7) => (n) => (+t + 1) * n * n * n - +t * n * n,
  /** @type {ElasticEasing} */
  Elastic: (t = 1, n = 0.3) => {
    const s = li(+t, 1, 10), r = li(+n, fe, 2), o = r / mT * lk(1 / s), u = mT / r;
    return (c) => c === 0 || c === 1 ? c : -s * xr(2, -10 * (1 - c)) * rk((1 - c - o) * u);
  }
}, Sm = /* @__PURE__ */ (() => {
  const t = { linear: Us, none: Us };
  for (let n in mp)
    for (let s in pT) {
      const r = pT[s], o = mp[n];
      t[n + s] = /** @type {EasingFunctionWithParams|EasingFunction} */
      s === Sa || s === "Back" || s === "Elastic" ? (u, c) => o(
        /** @type {EasingFunctionWithParams} */
        r(u, c)
      ) : o(
        /** @type {EasingFunction} */
        r
      );
    }
  return (
    /** @type {EasesFunctions} */
    t
  );
})(), $u = { linear: Us, none: Us }, _k = (t) => {
  if ($u[t]) return $u[t];
  if (t.indexOf("(") <= -1) {
    const s = (
      /** @type {EasingFunction} */
      mp[t] || t.includes("Back") || t.includes("Elastic") ? (
        /** @type {EasingFunctionWithParams} */
        Sm[t]()
      ) : Sm[t]
    );
    return s ? $u[t] = s : Us;
  } else {
    const n = t.slice(0, -1).split("("), s = (
      /** @type {EasingFunctionWithParams} */
      Sm[n[0]]
    );
    return s ? $u[t] = s(...n[1].split(",")) : Us;
  }
}, gT = ["steps(", "irregular(", "linear(", "cubicBezier("], pp = (t) => {
  if (Ma(t)) {
    for (let s = 0, r = gT.length; s < r; s++)
      if (Zi(t, gT[s]))
        return console.warn(`String syntax for \`ease: "${t}"\` has been removed from the core and replaced by importing and passing the easing function directly: \`ease: ${t}\``), Us;
  }
  return Aa(t) ? t : Ma(t) ? _k(
    /** @type {String} */
    t
  ) : Us;
};
const _t = g0(), Ut = g0(), pr = {}, Ku = { func: null }, Zu = { func: null }, Qu = [null], gr = [null, null], Ju = { to: null };
let Ek = 0, yT = 0, ws, yi;
const wk = (t, n) => {
  const s = {};
  if (Qi(t)) {
    const r = [].concat(.../** @type {DurationKeyframes} */
    t.map((o) => Object.keys(o))).filter(uc);
    for (let o = 0, u = r.length; o < u; o++) {
      const c = r[o], d = (
        /** @type {DurationKeyframes} */
        t.map((p) => {
          const h = {};
          for (let g in p) {
            const y = (
              /** @type {TweenPropValue} */
              p[g]
            );
            uc(g) ? g === c && (h.to = y) : h[g] = y;
          }
          return h;
        })
      );
      s[c] = /** @type {ArraySyntaxValue} */
      d;
    }
  } else {
    const r = (
      /** @type {Number} */
      sn(n.duration, nn.defaults.duration)
    );
    Object.keys(t).map((u) => ({ o: parseFloat(u) / 100, p: t[u] })).sort((u, c) => u.o - c.o).forEach((u) => {
      const c = u.o, d = u.p;
      for (let p in d)
        if (uc(p)) {
          let h = (
            /** @type {Array} */
            s[p]
          );
          h || (h = s[p] = []);
          const g = c * r;
          let y = h.length, x = h[y - 1];
          const T = { to: d[p] };
          let S = 0;
          for (let A = 0; A < y; A++)
            S += h[A].duration;
          y === 1 && (T.from = x.to), d.ease && (T.ease = d.ease), T.duration = g - (y ? S : 0), h.push(T);
        }
      return u;
    });
    for (let u in s) {
      const c = (
        /** @type {Array} */
        s[u]
      );
      let d;
      for (let p = 0, h = c.length; p < h; p++) {
        const g = c[p], y = g.ease;
        g.ease = d || void 0, d = y;
      }
      c[0].duration || c.shift();
    }
  }
  return s;
};
class Dk extends Mk {
  /**
   * @param {TargetsParam} targets
   * @param {AnimationParams} parameters
   * @param {Timeline} [parent]
   * @param {Number} [parentPosition]
   * @param {Boolean} [fastSet=false]
   * @param {Number} [index=0]
   * @param {TargetsArray} [allTargets]
   */
  constructor(n, s, r, o, u = !1, c = 0, d) {
    super(
      /** @type {TimerParams & AnimationParams} */
      s,
      r,
      o
    ), this._head, this._tail, ++yT;
    const p = zA(n), h = p.length, g = (
      /** @type {AnimationParams} */
      s.keyframes
    ), y = (
      /** @type {AnimationParams} */
      g ? uk(wk(
        /** @type {DurationKeyframes} */
        g,
        s
      ), s) : s
    ), {
      id: x,
      delay: T,
      duration: S,
      ease: A,
      playbackEase: C,
      modifier: N,
      composition: R,
      onRender: O
    } = y, k = r ? r.defaults : nn.defaults, H = sn(A, k.ease), G = sn(C, k.playbackEase), X = G ? pp(G) : null, Y = !Zt(
      /** @type {Spring} */
      H.ease
    ), Z = Y ? (
      /** @type {Spring} */
      H.ease
    ) : sn(A, X ? "linear" : k.ease), J = Y ? (
      /** @type {Spring} */
      H.settlingDuration
    ) : sn(S, k.duration), W = sn(T, k.delay), ut = N || k.modifier, lt = Zt(R) && h >= Gr ? hn.none : Zt(R) ? k.composition : R, dt = this._offset + (r ? r._offset : 0);
    Y && (H.parent = this);
    let ot = NaN, D = NaN, q = 0, w = 0;
    for (let L = 0; L < h; L++) {
      const U = p[L], _ = c || L, V = d || p;
      let nt = NaN, at = NaN;
      for (let rt in y)
        if (uc(rt)) {
          const st = EA(U, rt), ft = _A(U, rt), Tt = pk(rt, U, st);
          let P = y[rt];
          const ct = Qi(P);
          if (u && !ct && (gr[0] = P, gr[1] = P, P = gr), ct) {
            const St = (
              /** @type {Array} */
              P.length
            ), wt = !ym(P[0]);
            St === 2 && wt ? (Ju.to = /** @type {TweenParamValue} */
            /** @type {unknown} */
            P, Qu[0] = Ju, ws = Qu) : St > 2 && wt ? (ws = [], P.forEach((Kt, Ct) => {
              Ct ? Ct === 1 ? (gr[1] = Kt, ws.push(gr)) : ws.push(Kt) : gr[0] = Kt;
            })) : ws = /** @type {Array.<TweenKeyValue>} */
            P;
          } else
            Qu[0] = P, ws = Qu;
          let ht = null, I = null, gt = NaN, mt = 0, Et = 0;
          for (let St = ws.length; Et < St; Et++) {
            const wt = ws[Et];
            ym(wt) ? yi = wt : (Ju.to = /** @type {TweenParamValue} */
            wt, yi = Ju), Ku.func = null, Zu.func = null;
            const Kt = Xi(sn(yi.composition, lt), U, _, V, null, null), Ct = Ii(Kt) ? Kt : hn[Kt];
            !ht && Ct !== hn.none && (ht = y0(U, Tt));
            const Qt = ht ? ht._tail : null, Jt = r && Qt && Qt.parent.parent === r ? Qt : I, ge = Xi(yi.to, U, _, V, Ku, Jt);
            let Dt;
            ym(ge) && !Zt(ge.to) ? (yi = ge, Dt = ge.to) : Dt = ge;
            const jt = Xi(yi.from, U, _, V, Zu, Jt), Ht = yi.ease || Z, Gt = Xi(Ht, U, _, V, null, Jt), zt = Aa(Gt) || Ma(Gt) ? Gt : Ht, ye = !Zt(zt) && !Zt(
              /** @type {Spring} */
              zt.ease
            ), me = ye ? (
              /** @type {Spring} */
              zt.ease
            ) : zt, yn = ye ? (
              /** @type {Spring} */
              zt.settlingDuration
            ) : Xi(sn(yi.duration, St > 1 ? Xi(J, U, _, V, null, Jt) / St : J), U, _, V, null, Jt), rn = Xi(sn(yi.delay, Et ? 0 : W), U, _, V, null, Jt), _n = yi.modifier || ut, on = !Zt(jt), Me = !Zt(Dt), Ke = Qi(Dt), Ye = Ke || on && Me, Da = I ? mt : 0, Gs = I ? mt + rn : rn, ts = pe(dt + Gs, 12), es = pe(dt + Da, 12);
            !w && (on || Ke) && (w = 1);
            let je = I;
            if (Ct !== hn.none) {
              let Vt = ht._head;
              for (; Vt && Vt._absoluteStartTime <= ts; )
                if (Vt._isOverridden || (je = Vt), Vt = Vt._nextRep, Vt && Vt._absoluteStartTime >= ts)
                  for (; Vt; )
                    hc(Vt), Vt = Vt._nextRep;
            }
            if (Ye) {
              In(Ke ? Xi(Dt[0], U, _, V, Zu, Jt) : jt, _t), In(Ke ? Xi(Dt[1], U, _, V, Ku, Jt) : Dt, Ut);
              const Vt = br(U, Tt, st, pr);
              _t.t === Ft.NUMBER && (je ? je._valueType === Ft.UNIT && (_t.t = Ft.UNIT, _t.u = je._unit) : (In(
                Vt,
                ai
              ), ai.t === Ft.UNIT && (_t.t = Ft.UNIT, _t.u = ai.u)));
            } else
              Me ? In(Dt, Ut) : I ? oT(I, Ut) : In(r && je && je.parent.parent === r ? je._value : br(U, Tt, st, pr), Ut), on ? In(jt, _t) : I ? oT(I, _t) : In(r && je && je.parent.parent === r ? je._value : br(U, Tt, st, pr), _t);
            if (_t.o && (_t.n = fc(
              je ? je._toNumber : In(
                br(U, Tt, st, pr),
                ai
              ).n,
              _t.n,
              _t.o
            )), Ut.o && (Ut.n = fc(_t.n, Ut.n, Ut.o)), _t.t !== Ut.t) {
              if (_t.t === Ft.COMPLEX || Ut.t === Ft.COMPLEX) {
                const Vt = _t.t === Ft.COMPLEX ? _t : Ut, Ge = _t.t === Ft.COMPLEX ? Ut : _t;
                Ge.t = Ft.COMPLEX, Ge.s = un(Vt.s), Ge.d = Vt.d.map(() => Ge.n);
              } else if (_t.t === Ft.UNIT || Ut.t === Ft.UNIT) {
                const Vt = _t.t === Ft.UNIT ? _t : Ut, Ge = _t.t === Ft.UNIT ? Ut : _t;
                Ge.t = Ft.UNIT, Ge.u = Vt.u;
              } else if (_t.t === Ft.COLOR || Ut.t === Ft.COLOR) {
                const Vt = _t.t === Ft.COLOR ? _t : Ut, Ge = _t.t === Ft.COLOR ? Ut : _t;
                Ge.t = Ft.COLOR, Ge.d = Vt.d.map(() => 0);
              }
            }
            if (_t.u !== Ut.u) {
              let Vt = Ut.u ? _t : Ut;
              Vt = hT(
                /** @type {DOMTarget} */
                U,
                Vt,
                Ut.u ? Ut.u : _t.u,
                !1
              );
            }
            if (Ut.d && _t.d && Ut.d.length !== _t.d.length) {
              const Vt = _t.d.length > Ut.d.length ? _t : Ut, Ge = Vt === _t ? Ut : _t;
              Ge.d = Vt.d.map((sf, Zr) => Zt(Ge.d[Zr]) ? 0 : Ge.d[Zr]), Ge.s = un(Vt.s);
            }
            const fi = pe(+yn || fe, 12);
            let fn = pr[Tt];
            Dr(fn) || (pr[Tt] = null);
            const ns = ft ? ft.set : null;
            mt = pe(Gs + fi, 12);
            const kn = _t.d, Nt = Ut.d, Yt = Ut.s, Ot = {
              parent: this,
              id: Ek++,
              property: Tt,
              target: U,
              _value: null,
              _toFunc: Ku.func,
              _fromFunc: Zu.func,
              _ease: pp(me),
              _fromNumbers: kn ? un(kn) : Iu,
              _toNumbers: Nt ? un(Nt) : Iu,
              _strings: Yt ? un(Yt) : Iu,
              _fromNumber: _t.n,
              _toNumber: Ut.n,
              _numbers: kn ? un(kn) : Iu,
              // For additive tween and animatables
              _number: _t.n,
              // For additive tween and animatables
              _unit: Ut.u,
              _modifier: _n,
              _currentTime: 0,
              _startTime: Gs,
              _delay: +rn,
              _updateDuration: fi,
              _changeDuration: fi,
              _absoluteStartTime: ts,
              _absoluteUpdateStartTime: es,
              _absoluteEndTime: pe(dt + mt, 12),
              _hasFromValue: on || Ke ? 1 : 0,
              // NOTE: Investigate bit packing to stores ENUM / BOOL
              _tweenType: st,
              _setter: ns,
              _valueType: Ut.t,
              _composition: Ct,
              _isOverlapped: 0,
              _isOverridden: 0,
              _renderTransforms: 0,
              _inlineValue: fn,
              _prevRep: null,
              // For replaced tween
              _nextRep: null,
              // For replaced tween
              _prevAdd: null,
              // For additive tween
              _nextAdd: null,
              // For additive tween
              _prev: null,
              _next: null
            };
            Ct !== hn.none && OA(Ot, ht);
            const oe = Ot._valueType;
            if (oe === Ft.COMPLEX)
              Ot._value = wA(Ot, 1, -1);
            else if (oe === Ft.UNIT)
              Ot._value = `${_n(Ot._toNumber)}${Ot._unit}`;
            else if (oe === Ft.COLOR) {
              const Vt = Ut.d;
              Ot._value = `rgba(${pe(Vt[0], 0)},${pe(Vt[1], 0)},${pe(Vt[2], 0)},${Vt[3]})`;
            } else
              Ot._value = _n(Ot._toNumber);
            isNaN(gt) && (gt = Ot._startTime), I = Ot, q++, _r(this, Ot);
          }
          (isNaN(D) || gt < D) && (D = gt), (isNaN(ot) || mt > ot) && (ot = mt), st === Te.TRANSFORM && (nt = q - Et, at = q);
        }
      if (!isNaN(nt)) {
        let rt = 0;
        Be(this, (st) => {
          rt >= nt && rt < at && (st._renderTransforms = 1, st._composition === hn.blend && Be(jr.animation, (ft) => {
            ft.id === st.id && (ft._renderTransforms = 1);
          })), rt++;
        });
      }
    }
    h || console.warn("No target found. Make sure the element you're trying to animate is accessible before creating your animation."), D ? (Be(this, (L) => {
      L._startTime - L._delay || (L._delay -= D), L._startTime -= D;
    }), ot -= D) : D = 0, ot || (ot = fe, this.iterationCount = 0), this.targets = p, this.id = Zt(x) ? yT : x, this.duration = ot === fe ? fe : p0((ot + this._loopDelay) * this.iterationCount - this._loopDelay) || fe, this.onRender = O || k.onRender, this._ease = X, this._delay = D, this.iterationDuration = ot, !this._autoplay && w && this.onRender(this);
  }
  /**
   * @param  {Number} newDuration
   * @return {this}
   */
  stretch(n) {
    const s = this.duration;
    if (s === al(n)) return this;
    const r = n / s;
    return Be(this, (o) => {
      o._updateDuration = al(o._updateDuration * r), o._changeDuration = al(o._changeDuration * r), o._currentTime *= r, o._delay *= r, o._startTime *= r, o._absoluteStartTime *= r, o._absoluteUpdateStartTime *= r, o._absoluteEndTime *= r;
    }), super.stretch(n);
  }
  /**
   * @return {this}
   */
  refresh() {
    return Be(this, (n) => {
      const s = n._toFunc, r = n._fromFunc;
      (s || r) && (r ? (In(r(), _t), _t.u !== n._unit && n.target[Yr] && hT(
        /** @type {DOMTarget} */
        n.target,
        _t,
        n._unit,
        !0
      ), n._fromNumbers = un(_t.d), n._fromNumber = _t.n) : s && (In(br(n.target, n.property, n._tweenType), ai), n._fromNumbers = un(ai.d), n._fromNumber = ai.n), s && (In(s(), Ut), n._toNumbers = un(Ut.d), n._strings = un(Ut.s), n._toNumber = Ut.o ? fc(n._fromNumber, Ut.n, Ut.o) : Ut.n));
    }), this.duration === fe && this.restart(), this;
  }
  /**
   * Cancel the animation and revert all the values affected by this animation to their original state
   * @return {this}
   */
  revert() {
    return super.revert(), DA(this);
  }
  /**
   * @typedef {this & {then: null}} ResolvedJSAnimation
   */
  /**
   * @param  {Callback<ResolvedJSAnimation>} [callback]
   * @return Promise<this>
   */
  then(n) {
    return super.then(n);
  }
}
const vT = (t, n) => new Dk(t, n, null, 0, !1).init();
const jk = (t, n) => {
  if (Zi(n, "<")) {
    const s = n[1] === "<", r = (
      /** @type {Tickable} */
      t._tail
    ), o = r ? r._offset + r._delay : 0;
    return s ? o : o + r.duration;
  }
}, Nk = (t, n) => {
  let s = t.iterationDuration;
  if (s === fe && (s = 0), Zt(n)) return s;
  if (Ii(+n)) return +n;
  const r = (
    /** @type {String} */
    n
  ), o = t ? t.labels : null, u = !Dr(o), c = jk(t, r), d = !Zt(c), p = tk.exec(r);
  if (p) {
    const h = p[0], g = r.split(h), y = u && g[0] ? o[g[0]] : s, x = d ? c : u ? y : s, T = +g[1];
    return fc(x, T, h[0]);
  } else
    return d ? c : u ? Zt(o[r]) ? s : o[r] : s;
};
const kA = (t = 0, n = 1, s = 0) => {
  const r = 10 ** s;
  return Math.floor((Math.random() * (n - t + 1 / r) + t) * r) / r;
};
let Rk = 0;
const Ok = (t, n = 0, s = 1, r = 0) => {
  let o = t === void 0 ? Rk++ : t;
  return (u = n, c = s, d = r) => {
    o += 1831565813, o = Math.imul(o ^ o >>> 15, o | 1), o ^= o + Math.imul(o ^ o >>> 7, o | 61);
    const p = 10 ** d;
    return Math.floor((((o ^ o >>> 14) >>> 0) / 4294967296 * (c - u + 1 / p) + u) * p) / p;
  };
}, zk = (t, n = kA) => {
  let s = t.length, r, o;
  for (; s; )
    o = n(0, --s), r = t[s], t[s] = t[o], t[o] = r;
  return t;
};
const xT = (t, n = {}) => {
  let s = [], r = 0, o, u = null;
  const c = n.from, d = n.reversed, p = n.ease, h = !Zt(p), y = h && !Zt(
    /** @type {Spring} */
    p.ease
  ) ? (
    /** @type {Spring} */
    p.ease
  ) : h ? pp(p) : null, x = n.grid, T = x === !0, S = n.axis, A = n.total, C = Zt(c) || c === 0 || c === "first", N = c === "center", R = c === "last", O = c === "random", k = Qi(c), H = Qi(t), G = n.use, X = vm(H ? t[0] : t), Y = H ? vm(t[1]) : 0, Z = vA.exec((H ? t[1] : t) + Sa), J = n.start || 0 + (H ? X : 0), W = n.seed, lt = !Zt(W) && W !== !1 ? Ok(W === !0 ? 0 : (
    /** @type {Number} */
    W
  )) : kA, dt = n.jitter, ot = !Zt(dt), D = Qi(dt), q = D ? (
    /** @type {[Number,Number]} */
    dt[0]
  ) : (
    /** @type {Number} */
    dt || 0
  ), w = D ? (
    /** @type {[Number,Number]} */
    dt[1]
  ) : (
    /** @type {Number} */
    dt || 0
  );
  let L = C ? 0 : Ii(c) ? c : 0;
  return (U, _, V, nt, at) => {
    const [rt] = zA(U), st = Zt(A) ? V.length : A, ft = Zt(G) ? !1 : Aa(G) ? G(rt, _, st) : br(rt, G), Tt = Ii(ft) || Ma(ft) && Ii(+ft) ? +ft : _, P = Tt >= 0 && Tt < st ? Tt : _;
    if (N && (L = (st - 1) / 2), R && (L = st - 1), !s.length) {
      if (T) {
        let I = !0, gt = !1, mt = 1 / 0, Et = 1 / 0, St = 1 / 0, wt = -1 / 0, Kt = -1 / 0, Ct = -1 / 0;
        const Qt = [], Jt = [], ge = [];
        for (let Dt = 0; Dt < st; Dt++) {
          const jt = V[Dt];
          let Ht = 0, Gt = 0, zt = 0, ye = !1;
          if (jt && Aa(jt.getBoundingClientRect)) {
            const me = jt.getBoundingClientRect();
            Ht = me.left + me.width / 2, Gt = me.top + me.height / 2, ye = !0;
          } else {
            const me = (
              /** @type {JSTarget} */
              jt
            );
            me && Ii(me.x) && Ii(me.y) && (Ht = me.x, Gt = me.y, Ii(me.z) && (zt = me.z, gt = !0), ye = !0);
          }
          if (!ye) {
            I = !1;
            break;
          }
          Qt.push(Ht), Jt.push(Gt), ge.push(zt), Ht < mt && (mt = Ht), Gt < Et && (Et = Gt), zt < St && (St = zt), Ht > wt && (wt = Ht), Gt > Kt && (Kt = Gt), zt > Ct && (Ct = zt);
        }
        if (I) {
          let Dt = Qt[0], jt = Jt[0], Ht = ge[0];
          k ? (Dt = mt + c[0] * (wt - mt), jt = Et + c[1] * (Kt - Et), Ht = gt ? St + (c.length >= 3 ? c[2] : 0.5) * (Ct - St) : 0) : N ? (Dt = (mt + wt) / 2, jt = (Et + Kt) / 2, Ht = (St + Ct) / 2) : R ? (Dt = Qt[st - 1], jt = Jt[st - 1], Ht = ge[st - 1]) : Ii(c) && (Dt = Qt[c], jt = Jt[c], Ht = ge[c]);
          for (let zt = 0; zt < st; zt++) {
            const ye = Dt - Qt[zt], me = jt - Jt[zt], yn = Ht - ge[zt];
            let rn = dp(ye * ye + me * me + (gt ? yn * yn : 0));
            S === "x" && (rn = -ye), S === "y" && (rn = -me), S === "z" && (rn = -yn), s.push(rn);
          }
          let Gt = 1 / 0;
          for (let zt = 0; zt < st; zt++) {
            const ye = Fu(s[zt]);
            ye > 0 && ye < Gt && (Gt = ye);
          }
          if (Gt > 0 && Gt < 1 / 0)
            for (let zt = 0; zt < st; zt++)
              s[zt] = s[zt] / Gt;
        } else
          for (let Dt = 0; Dt < st; Dt++)
            s.push(Fu(L - Dt));
      } else
        for (let I = 0; I < st; I++)
          if (!x)
            s.push(Fu(L - I));
          else {
            const gt = x.length, mt = x[0] * x[1];
            let Et, St, wt;
            k ? (Et = c[0] * (x[0] - 1), St = c[1] * (x[1] - 1), wt = gt === 3 ? (c.length >= 3 ? c[2] : 0.5) * (x[2] - 1) : 0) : N ? (Et = (x[0] - 1) / 2, St = (x[1] - 1) / 2, wt = gt === 3 ? (x[2] - 1) / 2 : 0) : (Et = L % x[0], St = Qo(L / x[0]) % x[1], wt = gt === 3 ? Qo(L / mt) : 0);
            const Kt = I % x[0], Ct = Qo(I / x[0]) % x[1], Qt = gt === 3 ? Qo(I / mt) : 0, Jt = Et - Kt, ge = St - Ct, Dt = wt - Qt;
            let jt = dp(Jt * Jt + ge * ge + (gt === 3 ? Dt * Dt : 0));
            S === "x" && (jt = -Jt), S === "y" && (jt = -ge), S === "z" && (jt = -Dt), s.push(jt);
          }
      r = s[0];
      for (let I = 1; I < st; I++) s[I] > r && (r = s[I]);
      if (y || d)
        for (let I = 0; I < st; I++) {
          let gt = s[I];
          y && (gt = y(gt / r) * r), d && (gt = S ? -gt : Fu(r - gt)), s[I] = gt;
        }
      if (ot) {
        u = new Array(st);
        for (let I = 0; I < st; I++) u[I] = lt(-1, 1, 4);
      }
      O && (s = zk(s, lt));
    }
    const ct = H ? (Y - X) / r : X;
    Zt(o) && (o = at ? Nk(at, Zt(n.start) ? at.iterationDuration : J) : (
      /** @type {Number} */
      J
    ));
    let ht = o + (ct * pe(s[P], 2) || 0);
    if (ot) {
      const I = r ? s[P] / r : 0, gt = q + (w - q) * I;
      ht = /** @type {Number} */
      ht + u[P] * gt;
    }
    return n.modifier && (ht = n.modifier(
      /** @type {Number} */
      ht
    )), Z && (ht = `${ht}${Z[2]}`), ht;
  };
};
const LA = (...t) => t.filter((n, s, r) => !!n && n.trim() !== "" && r.indexOf(n) === s).join(" ").trim();
const kk = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const Lk = (t) => t.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, s, r) => r ? r.toUpperCase() : s.toLowerCase()
);
const bT = (t) => {
  const n = Lk(t);
  return n.charAt(0).toUpperCase() + n.slice(1);
};
var Mm = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const Uk = (t) => {
  for (const n in t)
    if (n.startsWith("aria-") || n === "role" || n === "title")
      return !0;
  return !1;
}, Vk = E.createContext({}), Bk = () => E.useContext(Vk), Hk = E.forwardRef(
  ({ color: t, size: n, strokeWidth: s, absoluteStrokeWidth: r, className: o = "", children: u, iconNode: c, ...d }, p) => {
    const {
      size: h = 24,
      strokeWidth: g = 2,
      absoluteStrokeWidth: y = !1,
      color: x = "currentColor",
      className: T = ""
    } = Bk() ?? {}, S = r ?? y ? Number(s ?? g) * 24 / Number(n ?? h) : s ?? g;
    return E.createElement(
      "svg",
      {
        ref: p,
        ...Mm,
        width: n ?? h ?? Mm.width,
        height: n ?? h ?? Mm.height,
        stroke: t ?? x,
        strokeWidth: S,
        className: LA("lucide", T, o),
        ...!u && !Uk(d) && { "aria-hidden": "true" },
        ...d
      },
      [
        ...c.map(([A, C]) => E.createElement(A, C)),
        ...Array.isArray(u) ? u : [u]
      ]
    );
  }
);
const an = (t, n) => {
  const s = E.forwardRef(
    ({ className: r, ...o }, u) => E.createElement(Hk, {
      ref: u,
      iconNode: n,
      className: LA(
        `lucide-${kk(bT(t))}`,
        `lucide-${t}`,
        r
      ),
      ...o
    })
  );
  return s.displayName = bT(t), s;
};
const Yk = [
  ["path", { d: "m7 7 10 10", key: "1fmybs" }],
  ["path", { d: "M17 7v10H7", key: "6fjiku" }]
], Gk = an("arrow-down-right", Yk);
const qk = [
  ["path", { d: "M7 7h10v10", key: "1tivn9" }],
  ["path", { d: "M7 17 17 7", key: "1vkiza" }]
], mc = an("arrow-up-right", qk);
const Xk = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
  [
    "path",
    {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
      key: "11g9vi"
    }
  ]
], Pk = an("bell", Xk);
const Ik = [
  ["path", { d: "M8 2v3", key: "1ioesn" }],
  ["path", { d: "M16 2v3", key: "otl347" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", key: "h1oib" }],
  ["path", { d: "M3 9h18", key: "1pudct" }],
  ["path", { d: "M8 13h.01", key: "1sbv64" }],
  ["path", { d: "M12 13h.01", key: "y0uutt" }],
  ["path", { d: "M16 13h.01", key: "wip0gl" }],
  ["path", { d: "M8 17h.01", key: "p3bg7i" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }],
  ["path", { d: "M16 17h.01", key: "ql8jdd" }]
], Fk = an("calendar-days", Ik);
const $k = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]], Kk = an("chevron-down", $k);
const Zk = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], TT = an("chevron-right", Zk);
const Qk = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", key: "1h4pet" }],
  ["path", { d: "M12 18V6", key: "zqpxq5" }]
], Jk = an("circle-dollar-sign", Qk);
const Wk = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 6v6h4", key: "135r8i" }]
], tL = an("clock-3", Wk);
const eL = [
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54", key: "1djwo0" }],
  [
    "path",
    {
      d: "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",
      key: "1tzkfa"
    }
  ],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05", key: "14pb5j" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
], nL = an("earth", eL);
const iL = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
], sL = an("file-text", iL);
const aL = [
  ["path", { d: "M10 18v-7", key: "wt116b" }],
  [
    "path",
    {
      d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
      key: "yxxwt6"
    }
  ],
  ["path", { d: "M14 18v-7", key: "vav6t3" }],
  ["path", { d: "M18 18v-7", key: "aexdmj" }],
  ["path", { d: "M3 22h18", key: "8prr45" }],
  ["path", { d: "M6 18v-7", key: "1ivflk" }]
], rL = an("landmark", aL);
const oL = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
], lL = an("layout-dashboard", oL);
const uL = [
  ["path", { d: "m16 17 5-5-5-5", key: "1bji2h" }],
  ["path", { d: "M21 12H9", key: "dn1m92" }],
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }]
], cL = an("log-out", uL);
const fL = [
  ["path", { d: "M13 16H8", key: "wsln4y" }],
  ["path", { d: "M14 8H8", key: "1l3xfs" }],
  ["path", { d: "M16 12H8", key: "1fr5h0" }],
  [
    "path",
    {
      d: "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
      key: "ycz6yz"
    }
  ]
], dL = an("receipt-text", fL);
const hL = [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
], mL = an("refresh-cw", hL);
const pL = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
], v0 = an("shield-check", pL);
const gL = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], yL = an("x", gL), yr = [
  { key: "overview", label: "Overview", icon: lL },
  { key: "ar", label: "Accounts receivable", icon: rL },
  { key: "ap", label: "Accounts payable", icon: dL },
  { key: "tax", label: "Tax", icon: v0 },
  { key: "invoicing", label: "Invoicing", icon: sL },
  { key: "fx", label: "FX exposure", icon: nL }
], vL = [
  { key: "mtd", label: "MTD" },
  { key: "qtd", label: "QTD" },
  { key: "ytd", label: "YTD" },
  { key: "12m", label: "12M" }
], xL = ["net-cash", "collection-rate", "overdue-ar", "due-30-days", "tax-liability"], bL = [
  {
    label: "Revenue performance",
    description: "Billing, cash conversion, and invoice quality",
    ids: ["billed-revenue", "collected-revenue", "collection-rate", "billing-backlog", "invoice-accuracy"]
  },
  {
    label: "Working capital",
    description: "Customer and supplier balances, timing, and pressure",
    ids: ["outstanding-ar", "overdue-ar", "dso", "outstanding-ap", "overdue-ap", "due-30-days", "dpo"]
  },
  {
    label: "Outlook & risk",
    description: "Liquidity, obligations, disputes, and currency impact",
    ids: ["working-capital", "net-cash", "tax-liability", "disputes", "fx-impact"]
  }
];
function ae(t, n = "USD", s = !0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: n,
    maximumFractionDigits: 0,
    notation: s ? "compact" : "standard"
  }).format(t);
}
function Fn(t) {
  return t.value.kind === "currency" ? ae(t.value.amount, t.value.currency) : t.value.kind === "percent" ? `${t.value.amount.toFixed(1)}%` : t.value.kind === "days" ? `${t.value.amount} days` : new Intl.NumberFormat("en-US").format(t.value.amount);
}
function TL(t) {
  const n = Math.max(1, Math.round(((/* @__PURE__ */ new Date("2026-08-28T10:30:00.000Z")).getTime() - new Date(t).getTime()) / 6e4));
  return n < 60 ? `${n}m ago` : `${Math.round(n / 60)}h ago`;
}
function SL(t, n) {
  switch (n) {
    case "revenue":
      return {
        columns: ["Period", "Billed", "Collected"],
        rows: t.revenueTrend.map((s) => [s.label, ae(s.billed), ae(s.collected)])
      };
    case "ar":
      return {
        columns: ["Customer", "Exposure", "Overdue"],
        rows: t.topCustomers.map((s) => [s.name, ae(s.amount), `${s.daysOverdue} days`])
      };
    case "ap":
      return {
        columns: ["Vendor", "Obligation", "Due"],
        rows: t.topVendors.map((s) => [s.name, ae(s.amount), new Date(s.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })])
      };
    case "cash":
      return {
        columns: ["Week", "Inflow", "Outflow"],
        rows: t.cashForecast.slice(0, 6).map((s) => [s.week, ae(s.inflow), ae(s.outflow)])
      };
    case "tax":
      return {
        columns: ["Obligation", "Jurisdiction", "Amount"],
        rows: t.taxCompliance.map((s) => [s.obligation, s.jurisdiction, ae(s.amount)])
      };
    case "invoicing":
      return {
        columns: ["Status", "Items", "Amount"],
        rows: t.invoiceStatus.map((s) => [s.status, String(s.count), ae(s.amount)])
      };
    case "fx":
      return {
        columns: ["Currency", "Receivable", "Payable"],
        rows: t.fxExposure.map((s) => [s.currency, ae(s.receivable), ae(s.payable)])
      };
  }
}
function ST({ points: t, tone: n = "light" }) {
  const s = Math.max(...t, 1), r = t.map((o, u) => `${u * (100 / Math.max(t.length - 1, 1))},${38 - o / s * 32}`).join(" ");
  return /* @__PURE__ */ v.jsxs("svg", { viewBox: "0 0 100 42", preserveAspectRatio: "none", className: "h-16 w-full", "aria-hidden": "true", children: [
    /* @__PURE__ */ v.jsx("polyline", { points: r, fill: "none", stroke: n === "dark" ? "rgba(255,255,255,.82)" : "rgba(18,18,16,.72)", strokeWidth: "1.5", vectorEffect: "non-scaling-stroke" }),
    t.map((o, u) => /* @__PURE__ */ v.jsx("circle", { cx: u * (100 / Math.max(t.length - 1, 1)), cy: 38 - o / s * 32, r: "1.1", fill: u === t.length - 1 ? "#64d2ff" : n === "dark" ? "#fff" : "#1d1d1f" }, u))
  ] });
}
function UA({
  data: t,
  primaryKey: n,
  primaryLabel: s,
  secondaryKey: r,
  secondaryLabel: o,
  signature: u
}) {
  return /* @__PURE__ */ v.jsxs("div", { className: "cfo-decision-chart", children: [
    /* @__PURE__ */ v.jsxs(
      sA,
      {
        animationDuration: 760,
        aspectRatio: "2.35 / 1",
        data: t,
        margin: { top: 18, right: 18, bottom: 40, left: 18 },
        revealSignature: u,
        children: [
          /* @__PURE__ */ v.jsx(f0, { fadeHorizontal: !0, hideHorizontalEdgeLines: !0, stroke: "var(--chart-grid)" }),
          /* @__PURE__ */ v.jsx(Br, { dataKey: n, fadeEdges: !0, fill: "#0071e3", fillOpacity: 0.18, stroke: "#0071e3", strokeWidth: 2.25 }),
          r && /* @__PURE__ */ v.jsx(Br, { dataKey: r, fadeEdges: !0, fill: "#64d2ff", fillOpacity: 0.1, stroke: "#64d2ff", strokeWidth: 2 }),
          /* @__PURE__ */ v.jsx(h0, { numTicks: Math.min(6, t.length) }),
          /* @__PURE__ */ v.jsx(
            d0,
            {
              rows: (c) => [
                { color: "#0071e3", label: s, value: ae(Number(c[n] ?? 0)) },
                ...r && o ? [{ color: "#64d2ff", label: o, value: ae(Number(c[r] ?? 0)) }] : []
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-legend", children: [
      /* @__PURE__ */ v.jsxs("span", { children: [
        /* @__PURE__ */ v.jsx("i", {}),
        s
      ] }),
      r && o && /* @__PURE__ */ v.jsxs("span", { children: [
        /* @__PURE__ */ v.jsx("i", {}),
        o
      ] })
    ] })
  ] });
}
function gp({ kpi: t, index: n, onOpen: s, compact: r = !1 }) {
  const o = ["coral", "paper", "soft", "paper", "ink"], u = o[n % o.length], c = t.trend.direction === (t.id.includes("overdue") || t.id === "dso" || t.id === "billing-backlog" || t.id === "disputes" ? "down" : "up");
  return /* @__PURE__ */ v.jsxs("button", { className: `cfo-kpi cfo-kpi-${u}${r ? " cfo-kpi-compact" : ""}`, type: "button", onClick: s, "aria-label": `Open details for ${t.label}`, children: [
    /* @__PURE__ */ v.jsx("span", { className: "cfo-kpi-label", children: t.label }),
    /* @__PURE__ */ v.jsx("strong", { children: Fn(t) }),
    /* @__PURE__ */ v.jsxs("span", { className: `cfo-kpi-trend ${c ? "is-positive" : ""}`, children: [
      t.trend.direction === "up" ? /* @__PURE__ */ v.jsx(mc, {}) : /* @__PURE__ */ v.jsx(Gk, {}),
      t.trend.value,
      "% ",
      t.trend.label
    ] })
  ] });
}
function ML({ data: t, kpi: n, onClose: s }) {
  const r = E.useRef(null), o = SL(t, n.detailKey), u = n.sources.map((c) => t.sources.find((d) => d.id === c)?.name).filter(Boolean);
  return E.useEffect(() => {
    r.current?.focus();
    const c = (d) => {
      d.key === "Escape" && s();
    };
    return document.addEventListener("keydown", c), () => document.removeEventListener("keydown", c);
  }, [s]), /* @__PURE__ */ v.jsx("div", { className: "cfo-drawer-backdrop", onMouseDown: (c) => c.target === c.currentTarget && s(), children: /* @__PURE__ */ v.jsxs("aside", { className: "cfo-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "cfo-detail-title", children: [
    /* @__PURE__ */ v.jsxs("div", { className: "cfo-drawer-head", children: [
      /* @__PURE__ */ v.jsxs("div", { children: [
        /* @__PURE__ */ v.jsx("p", { children: "Decision detail" }),
        /* @__PURE__ */ v.jsx("h2", { id: "cfo-detail-title", children: n.label })
      ] }),
      /* @__PURE__ */ v.jsx("button", { ref: r, type: "button", onClick: s, "aria-label": "Close metric details", children: /* @__PURE__ */ v.jsx(yL, {}) })
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "cfo-drawer-value", children: [
      /* @__PURE__ */ v.jsx("strong", { children: Fn(n) }),
      /* @__PURE__ */ v.jsxs("span", { children: [
        n.trend.value,
        "% ",
        n.trend.label
      ] })
    ] }),
    /* @__PURE__ */ v.jsxs("section", { children: [
      /* @__PURE__ */ v.jsx("h3", { children: "How this is calculated" }),
      /* @__PURE__ */ v.jsx("p", { children: n.definition })
    ] }),
    /* @__PURE__ */ v.jsxs("section", { children: [
      /* @__PURE__ */ v.jsx("h3", { children: "Contributing teams" }),
      /* @__PURE__ */ v.jsx("div", { className: "cfo-source-list", children: u.map((c) => /* @__PURE__ */ v.jsx("span", { children: c }, c)) })
    ] }),
    /* @__PURE__ */ v.jsxs("section", { children: [
      /* @__PURE__ */ v.jsx("h3", { children: "Supporting detail" }),
      /* @__PURE__ */ v.jsx("div", { className: "cfo-table-wrap", children: /* @__PURE__ */ v.jsxs("table", { children: [
        /* @__PURE__ */ v.jsx("thead", { children: /* @__PURE__ */ v.jsx("tr", { children: o.columns.map((c) => /* @__PURE__ */ v.jsx("th", { children: c }, c)) }) }),
        /* @__PURE__ */ v.jsx("tbody", { children: o.rows.map((c, d) => /* @__PURE__ */ v.jsx("tr", { children: c.map((p, h) => /* @__PURE__ */ v.jsx("td", { children: p }, h)) }, d)) })
      ] }) })
    ] })
  ] }) });
}
function Ko({ columns: t, rows: n }) {
  return /* @__PURE__ */ v.jsx("div", { className: "cfo-module-table-wrap", children: /* @__PURE__ */ v.jsxs("table", { children: [
    /* @__PURE__ */ v.jsx("thead", { children: /* @__PURE__ */ v.jsx("tr", { children: t.map((s) => /* @__PURE__ */ v.jsx("th", { children: s }, s)) }) }),
    /* @__PURE__ */ v.jsx("tbody", { children: n.map((s, r) => /* @__PURE__ */ v.jsx("tr", { children: s.map((o, u) => /* @__PURE__ */ v.jsx("td", { children: o }, u)) }, r)) })
  ] }) });
}
function AL({ data: t, module: n, onOpen: s }) {
  const r = n === "ar" ? ["ar", "revenue"] : [n], o = t.kpis.filter((u) => r.includes(u.detailKey)).slice(0, 6);
  return /* @__PURE__ */ v.jsx("div", { className: "cfo-module-kpis", children: o.map((u, c) => /* @__PURE__ */ v.jsx(gp, { kpi: u, index: c, onOpen: () => s(u) }, u.id)) });
}
function CL({ module: t, data: n, onOpen: s }) {
  const r = {
    ar: ["Accounts receivable", "Collection health and customer risk", "See aging concentration, collection momentum, and the balances most likely to affect cash."],
    ap: ["Accounts payable", "Supplier obligations and timing", "Balance payment discipline with upcoming cash requirements and critical vendor exposure."],
    tax: ["Tax", "Compliance readiness by jurisdiction", "Track liabilities, due dates, and the filing packages that need management attention."],
    invoicing: ["Invoicing", "Billing quality and release velocity", "Monitor invoice accuracy, approval backlog, disputes, and value waiting to be billed."],
    fx: ["FX exposure", "Currency position in USD", "Understand net receivable and payable exposure and its translation impact by currency."]
  }[t];
  return /* @__PURE__ */ v.jsxs("div", { className: `cfo-deep-dive cfo-deep-dive-${t}`, children: [
    /* @__PURE__ */ v.jsxs("header", { className: "cfo-module-hero", children: [
      /* @__PURE__ */ v.jsxs("div", { children: [
        /* @__PURE__ */ v.jsx("p", { children: r[0] }),
        /* @__PURE__ */ v.jsx("h2", { children: r[1] }),
        /* @__PURE__ */ v.jsx("span", { children: r[2] })
      ] }),
      /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-orbit", "aria-hidden": "true", children: [
        /* @__PURE__ */ v.jsx("i", {}),
        /* @__PURE__ */ v.jsx("i", {}),
        /* @__PURE__ */ v.jsx("b", {})
      ] })
    ] }),
    /* @__PURE__ */ v.jsx(AL, { data: n, module: t, onOpen: s }),
    t === "ar" && /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-grid", children: [
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-accent", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Age profile" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Receivables aging" })
          ] }),
          /* @__PURE__ */ v.jsx("span", { children: ae(n.arAging.reduce((o, u) => o + u.amount, 0)) })
        ] }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-aging-detail", children: n.arAging.map((o) => /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("span", { children: o.bucket }),
          /* @__PURE__ */ v.jsx("i", { children: /* @__PURE__ */ v.jsx("b", { style: { width: `${o.share}%` } }) }),
          /* @__PURE__ */ v.jsxs("strong", { children: [
            o.share,
            "%"
          ] })
        ] }, o.bucket)) })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Collection movement" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Billed vs collected" })
        ] }) }),
        /* @__PURE__ */ v.jsx(
          UA,
          {
            data: n.revenueTrend.map((o, u) => ({
              date: new Date(2026, u, 1),
              billed: o.billed,
              collected: o.collected
            })),
            primaryKey: "billed",
            primaryLabel: "Billed",
            secondaryKey: "collected",
            secondaryLabel: "Collected",
            signature: `ar-${n.period.key}`
          }
        )
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Customer risk" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Top overdue customers" })
          ] }),
          /* @__PURE__ */ v.jsxs("span", { children: [
            n.topCustomers.length,
            " priorities"
          ] })
        ] }),
        /* @__PURE__ */ v.jsx(Ko, { columns: ["Customer", "Exposure", "Currency", "Days overdue"], rows: n.topCustomers.map((o) => [o.name, ae(o.amount), o.currency, String(o.daysOverdue)]) })
      ] })
    ] }),
    t === "ap" && /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-grid", children: [
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-accent", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Payment horizon" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Obligation schedule" })
        ] }) }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-schedule-detail", children: n.apSchedule.map((o) => /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("span", { children: o.window }),
          /* @__PURE__ */ v.jsx("i", { style: { height: `${Math.max(18, o.amount / Math.max(...n.apSchedule.map((u) => u.amount)) * 100)}%` } }),
          /* @__PURE__ */ v.jsx("strong", { children: ae(o.amount) })
        ] }, o.window)) })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Payment strategy" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Working-capital posture" })
        ] }) }),
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-big-number", children: [
          Fn(n.kpis.find((o) => o.id === "dpo")),
          /* @__PURE__ */ v.jsx("small", { children: "Days payable outstanding" })
        ] }),
        /* @__PURE__ */ v.jsx("p", { className: "cfo-module-note", children: "Two additional days of payment leverage without increasing overdue supplier risk." })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Vendor commitments" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Largest upcoming obligations" })
          ] }),
          /* @__PURE__ */ v.jsx("span", { children: "Next 30 days" })
        ] }),
        /* @__PURE__ */ v.jsx(Ko, { columns: ["Vendor", "Amount", "Currency", "Due date"], rows: n.topVendors.map((o) => [o.name, ae(o.amount), o.currency, new Date(o.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })]) })
      ] })
    ] }),
    t === "tax" && /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-grid", children: [
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-accent", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Readiness" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Compliance position" })
          ] }),
          /* @__PURE__ */ v.jsx(v0, {})
        ] }),
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-readiness-ring", children: [
          /* @__PURE__ */ v.jsx("strong", { children: "75%" }),
          /* @__PURE__ */ v.jsx("span", { children: "filings ready" })
        ] })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Risk watch" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Open tax actions" })
        ] }) }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-alerts", children: n.exceptions.filter((o) => o.owner === "Tax").map((o) => /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("i", {}),
          /* @__PURE__ */ v.jsx("span", { children: o.title }),
          /* @__PURE__ */ v.jsx("strong", { children: ae(o.amount) })
        ] }, o.title)) })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Jurisdictions" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Upcoming obligations" })
          ] }),
          /* @__PURE__ */ v.jsx("span", { children: "USD consolidated" })
        ] }),
        /* @__PURE__ */ v.jsx(Ko, { columns: ["Obligation", "Jurisdiction", "Due date", "Amount", "Status"], rows: n.taxCompliance.map((o) => [o.obligation, o.jurisdiction, new Date(o.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }), ae(o.amount), o.status]) })
      ] })
    ] }),
    t === "invoicing" && /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-grid", children: [
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-accent", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Quality signal" }),
          /* @__PURE__ */ v.jsx("h3", { children: "First-time accuracy" })
        ] }) }),
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-readiness-ring cfo-readiness-ring-dark", children: [
          /* @__PURE__ */ v.jsx("strong", { children: "98.6%" }),
          /* @__PURE__ */ v.jsx("span", { children: "issued cleanly" })
        ] })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Release pipeline" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Invoice status mix" })
        ] }) }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-status-stack", children: n.invoiceStatus.map((o) => /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("span", { children: o.status }),
          /* @__PURE__ */ v.jsx("i", { children: /* @__PURE__ */ v.jsx("b", { style: { width: `${Math.max(8, o.count / Math.max(...n.invoiceStatus.map((u) => u.count)) * 100)}%` } }) }),
          /* @__PURE__ */ v.jsx("strong", { children: o.count })
        ] }, o.status)) })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Billing operations" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Status and value" })
          ] }),
          /* @__PURE__ */ v.jsxs("span", { children: [
            n.invoiceStatus.reduce((o, u) => o + u.count, 0),
            " items"
          ] })
        ] }),
        /* @__PURE__ */ v.jsx(Ko, { columns: ["Status", "Items", "Value"], rows: n.invoiceStatus.map((o) => [o.status, String(o.count), ae(o.amount)]) })
      ] })
    ] }),
    t === "fx" && /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-grid", children: [
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-accent cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-module-card-head", children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("p", { children: "Net currency position" }),
            /* @__PURE__ */ v.jsx("h3", { children: "Receivables less payables" })
          ] }),
          /* @__PURE__ */ v.jsx("span", { children: "USD reporting base" })
        ] }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-fx-detail", children: n.fxExposure.map((o) => {
          const u = o.receivable - o.payable;
          return /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsx("strong", { children: o.currency }),
            /* @__PURE__ */ v.jsx("i", { children: /* @__PURE__ */ v.jsx("b", { style: { width: `${Math.min(100, Math.abs(u) / 12e4 * 100)}%` } }) }),
            /* @__PURE__ */ v.jsx("span", { children: ae(u) }),
            /* @__PURE__ */ v.jsx("small", { children: o.impact ? `${ae(o.impact)} impact` : "Base currency" })
          ] }, o.currency);
        }) })
      ] }),
      /* @__PURE__ */ v.jsxs("section", { className: "cfo-module-card cfo-module-card-wide", children: [
        /* @__PURE__ */ v.jsx("div", { className: "cfo-module-card-head", children: /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("p", { children: "Exposure ledger" }),
          /* @__PURE__ */ v.jsx("h3", { children: "Currency detail" })
        ] }) }),
        /* @__PURE__ */ v.jsx(Ko, { columns: ["Currency", "Receivable", "Payable", "Translation impact"], rows: n.fxExposure.map((o) => [o.currency, ae(o.receivable), ae(o.payable), ae(o.impact)]) })
      ] })
    ] })
  ] });
}
function _L({ user: t }) {
  const [n, s] = E.useState("mtd"), [r, o] = E.useState(null), [u, c] = E.useState(""), [d, p] = E.useState(!0), [h, g] = E.useState(0), [y, x] = E.useState("overview"), [T, S] = E.useState(null), [A, C] = E.useState(!1), [N, R] = E.useState(!1), [O, k] = E.useState(!1), H = E.useRef(null), G = E.useRef(null);
  E.useEffect(() => {
    const w = new AbortController();
    return S(null), p(!0), c(""), fetch(`/api/finance/dashboard?period=${n}&reportingCurrency=USD`, { signal: w.signal }).then(async (L) => {
      const U = await L.json();
      if (!L.ok) throw new Error(U.error?.message || "Finance data could not be loaded.");
      return U;
    }).then(o).catch((L) => {
      L.name !== "AbortError" && c(L.message);
    }).finally(() => p(!1)), () => w.abort();
  }, [n, h]), E.useEffect(() => {
    if (!H.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const w = H.current.querySelectorAll([
      ".cfo-bento > *",
      ".cfo-kpi-section",
      ".cfo-exceptions",
      ".cfo-deep-dive > *"
    ].join(","));
    w.length && vT(w, {
      opacity: { from: 0 },
      translateY: { from: 18 },
      scale: { from: 0.992 },
      delay: xT(48),
      duration: 460,
      ease: "out(3)"
    });
  }, [y, r?.period.key]), E.useEffect(() => {
    if (!A || !G.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const w = G.current.querySelectorAll(".cfo-kpi-library-group, .cfo-kpi");
    vT(w, {
      opacity: { from: 0 },
      translateY: { from: 10 },
      delay: xT(28),
      duration: 360,
      ease: "out(3)"
    });
  }, [A]);
  const X = E.useMemo(() => new Map(r?.kpis.map((w) => [w.id, w]) ?? []), [r]), Y = X.get("billed-revenue"), Z = X.get("collected-revenue"), J = X.get("working-capital"), W = X.get("net-cash"), ut = X.get("outstanding-ar"), lt = X.get("outstanding-ap"), dt = X.get("tax-liability"), ot = xL.map((w) => X.get(w)).filter((w) => !!w);
  async function D() {
    k(!0);
    try {
      if (!(await fetch("/api/logout", { method: "POST" })).ok) throw new Error("Sign out could not be completed.");
      window.dispatchEvent(new CustomEvent("lexflow:cfo-logout"));
    } catch (w) {
      c(w instanceof Error ? w.message : "Sign out could not be completed."), k(!1);
    }
  }
  function q(w) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(w.key)) return;
    w.preventDefault();
    const L = yr.findIndex((V) => V.key === y), U = w.key === "Home" ? 0 : w.key === "End" ? yr.length - 1 : (L + (w.key === "ArrowRight" ? 1 : -1) + yr.length) % yr.length, _ = yr[U];
    x(_.key), window.requestAnimationFrame(() => document.querySelector(`#cfo-module-tab-${_.key}`)?.focus());
  }
  return /* @__PURE__ */ v.jsxs("div", { className: "cfo-workspace", children: [
    /* @__PURE__ */ v.jsxs("header", { className: "cfo-header", children: [
      /* @__PURE__ */ v.jsxs("div", { className: "cfo-brand", children: [
        /* @__PURE__ */ v.jsx("span", { "aria-hidden": "true", children: "L" }),
        /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("strong", { children: "LexFlow" }),
          /* @__PURE__ */ v.jsx("small", { children: "Finance command" })
        ] })
      ] }),
      /* @__PURE__ */ v.jsxs("div", { className: "cfo-header-center", children: [
        /* @__PURE__ */ v.jsxs("span", { className: "cfo-demo-pill", children: [
          /* @__PURE__ */ v.jsx("i", {}),
          " Sample finance data"
        ] }),
        /* @__PURE__ */ v.jsx("div", { className: "cfo-periods", "aria-label": "Reporting period", children: vL.map((w) => /* @__PURE__ */ v.jsx("button", { type: "button", className: n === w.key ? "active" : "", onClick: () => s(w.key), children: w.label }, w.key)) })
      ] }),
      /* @__PURE__ */ v.jsxs("div", { className: "cfo-header-actions", children: [
        /* @__PURE__ */ v.jsx("button", { type: "button", className: "cfo-round-action", "aria-label": "Finance notifications", children: /* @__PURE__ */ v.jsx(Pk, {}) }),
        /* @__PURE__ */ v.jsxs("div", { className: "cfo-account", children: [
          /* @__PURE__ */ v.jsx("button", { type: "button", className: "cfo-avatar", "aria-expanded": N, "aria-haspopup": "menu", onClick: () => R((w) => !w), children: t.initials }),
          N && /* @__PURE__ */ v.jsxs("div", { className: "cfo-account-menu", role: "menu", children: [
            /* @__PURE__ */ v.jsxs("div", { children: [
              /* @__PURE__ */ v.jsx("strong", { children: t.name }),
              /* @__PURE__ */ v.jsxs("small", { children: [
                "CFO · ",
                t.department
              ] })
            ] }),
            /* @__PURE__ */ v.jsxs("button", { type: "button", role: "menuitem", disabled: O, onClick: D, children: [
              /* @__PURE__ */ v.jsx(cL, {}),
              O ? "Signing out…" : "Sign out"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ v.jsxs("main", { className: "cfo-main", children: [
      /* @__PURE__ */ v.jsx("section", { className: "cfo-intro", children: /* @__PURE__ */ v.jsxs("div", { className: "cfo-asof", children: [
        /* @__PURE__ */ v.jsx(Fk, {}),
        /* @__PURE__ */ v.jsxs("span", { children: [
          /* @__PURE__ */ v.jsx("small", { children: "Reporting window" }),
          /* @__PURE__ */ v.jsx("strong", { children: r?.period.label ?? "Loading…" })
        ] })
      ] }) }),
      /* @__PURE__ */ v.jsx("div", { className: "cfo-module-tabs", role: "tablist", "aria-label": "Finance modules", onKeyDown: q, children: yr.map((w) => {
        const L = w.icon;
        return /* @__PURE__ */ v.jsxs(
          "button",
          {
            id: `cfo-module-tab-${w.key}`,
            type: "button",
            role: "tab",
            "aria-selected": y === w.key,
            "aria-controls": "cfo-module-panel",
            tabIndex: y === w.key ? 0 : -1,
            className: y === w.key ? "active" : "",
            onClick: () => x(w.key),
            children: [
              /* @__PURE__ */ v.jsx(L, { "aria-hidden": "true" }),
              /* @__PURE__ */ v.jsx("span", { children: w.label })
            ]
          },
          w.key
        );
      }) }),
      u && /* @__PURE__ */ v.jsxs("div", { className: "cfo-error", role: "alert", children: [
        u,
        /* @__PURE__ */ v.jsx("button", { type: "button", onClick: () => g((w) => w + 1), children: "Try again" })
      ] }),
      d && !r && /* @__PURE__ */ v.jsxs("div", { className: "cfo-loading", role: "status", children: [
        /* @__PURE__ */ v.jsx(mL, {}),
        " Loading the finance command center…"
      ] }),
      r && /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
        /* @__PURE__ */ v.jsx("section", { className: "cfo-sources", "aria-label": "Finance source freshness", children: r.sources.map((w) => /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsxs("span", { children: [
            /* @__PURE__ */ v.jsx("i", {}),
            w.name
          ] }),
          /* @__PURE__ */ v.jsxs("small", { children: [
            w.records,
            " records · ",
            TL(w.lastUpdatedAt)
          ] })
        ] }, w.id)) }),
        /* @__PURE__ */ v.jsx(
          "div",
          {
            ref: H,
            id: "cfo-module-panel",
            className: "cfo-module-panel",
            role: "tabpanel",
            "aria-labelledby": `cfo-module-tab-${y}`,
            children: y === "overview" ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
              /* @__PURE__ */ v.jsxs("section", { className: "cfo-bento", "aria-label": "Executive financial overview", children: [
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-posture", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Financial posture" }),
                    /* @__PURE__ */ v.jsx(Jk, {})
                  ] }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-posture-copy", children: [
                    /* @__PURE__ */ v.jsx("small", { children: "Forecast net cash" }),
                    /* @__PURE__ */ v.jsx("strong", { children: W ? Fn(W) : "—" }),
                    /* @__PURE__ */ v.jsx("p", { children: "Positive thirteen-week position with tax and supplier obligations included." })
                  ] }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-orbit", "aria-hidden": "true", children: [
                    /* @__PURE__ */ v.jsx("i", {}),
                    /* @__PURE__ */ v.jsx("i", {}),
                    /* @__PURE__ */ v.jsx("i", {}),
                    /* @__PURE__ */ v.jsx("b", {})
                  ] }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-posture-foot", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Working capital" }),
                    /* @__PURE__ */ v.jsx("strong", { children: J ? Fn(J) : "—" })
                  ] })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-revenue-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Revenue & collections" }),
                    /* @__PURE__ */ v.jsx(mc, {})
                  ] }),
                  /* @__PURE__ */ v.jsx("strong", { className: "cfo-hero-value", children: Y ? Fn(Y) : "—" }),
                  /* @__PURE__ */ v.jsxs("small", { children: [
                    "Billed · ",
                    Z ? `${Fn(Z)} collected` : ""
                  ] }),
                  /* @__PURE__ */ v.jsx(ST, { points: r.revenueTrend.map((w) => w.collected), tone: "dark" }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-foot", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Collection velocity" }),
                    /* @__PURE__ */ v.jsx("strong", { children: X.get("collection-rate") ? Fn(X.get("collection-rate")) : "—" })
                  ] })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-ar-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Receivables health" }),
                    /* @__PURE__ */ v.jsx(mc, {})
                  ] }),
                  /* @__PURE__ */ v.jsx("strong", { className: "cfo-hero-value", children: ut ? Fn(ut) : "—" }),
                  /* @__PURE__ */ v.jsx("small", { children: "Outstanding AR" }),
                  /* @__PURE__ */ v.jsx("div", { className: "cfo-aging-bars", children: r.arAging.map((w) => /* @__PURE__ */ v.jsx("i", { style: { height: `${Math.max(18, w.share * 1.8)}%` }, title: `${w.bucket}: ${w.share}%` }, w.bucket)) }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-foot", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "90+ day exposure" }),
                    /* @__PURE__ */ v.jsxs("strong", { children: [
                      r.arAging.at(-1)?.share,
                      "%"
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-ap-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Payables runway" }),
                    /* @__PURE__ */ v.jsx(tL, {})
                  ] }),
                  /* @__PURE__ */ v.jsx("strong", { className: "cfo-hero-value", children: lt ? Fn(lt) : "—" }),
                  /* @__PURE__ */ v.jsx("small", { children: "Total supplier obligations" }),
                  /* @__PURE__ */ v.jsx(ST, { points: r.apSchedule.map((w) => w.amount) }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-foot", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Due in 30 days" }),
                    /* @__PURE__ */ v.jsx("strong", { children: X.get("due-30-days") ? Fn(X.get("due-30-days")) : "—" })
                  ] })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-cash-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "13-week cash outlook" }),
                    /* @__PURE__ */ v.jsx(mc, {})
                  ] }),
                  /* @__PURE__ */ v.jsx(
                    UA,
                    {
                      data: r.cashForecast.map((w, L) => ({
                        date: new Date(2026, 7, 31 + L * 7),
                        inflow: w.inflow,
                        outflow: w.outflow
                      })),
                      primaryKey: "inflow",
                      primaryLabel: "Inflows",
                      secondaryKey: "outflow",
                      secondaryLabel: "Outflows",
                      signature: `cash-${r.period.key}`
                    }
                  )
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-tax-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Tax & compliance" }),
                    /* @__PURE__ */ v.jsx(v0, {})
                  ] }),
                  /* @__PURE__ */ v.jsx("strong", { className: "cfo-hero-value", children: dt ? Fn(dt) : "—" }),
                  /* @__PURE__ */ v.jsx("small", { children: "Current estimated liability" }),
                  /* @__PURE__ */ v.jsx("div", { className: "cfo-compliance-list", children: r.taxCompliance.slice(0, 3).map((w) => /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsxs("span", { children: [
                      /* @__PURE__ */ v.jsx("i", { className: w.status }),
                      w.jurisdiction
                    ] }),
                    /* @__PURE__ */ v.jsx("strong", { children: ae(w.amount) })
                  ] }, `${w.jurisdiction}-${w.obligation}`)) })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-invoice-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Invoice control" }),
                    /* @__PURE__ */ v.jsx(TT, {})
                  ] }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-ring", style: { "--progress": "98.6%" }, children: [
                    /* @__PURE__ */ v.jsx("strong", { children: "98.6%" }),
                    /* @__PURE__ */ v.jsx("small", { children: "accuracy" })
                  ] }),
                  /* @__PURE__ */ v.jsx("div", { className: "cfo-invoice-stats", children: r.invoiceStatus.slice(1).map((w) => /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsx("span", { children: w.status }),
                    /* @__PURE__ */ v.jsx("strong", { children: w.count })
                  ] }, w.status)) })
                ] }),
                /* @__PURE__ */ v.jsxs("article", { className: "cfo-tile cfo-fx-tile", children: [
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-tile-heading", children: [
                    /* @__PURE__ */ v.jsx("span", { children: "Currency exposure" }),
                    /* @__PURE__ */ v.jsx("span", { children: "USD base" })
                  ] }),
                  /* @__PURE__ */ v.jsx("div", { className: "cfo-fx-grid", children: r.fxExposure.map((w) => /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsx("strong", { children: w.currency }),
                    /* @__PURE__ */ v.jsx("span", { children: ae(w.receivable - w.payable) }),
                    /* @__PURE__ */ v.jsx("small", { children: w.impact ? ae(w.impact) : "Base" })
                  ] }, w.currency)) })
                ] })
              ] }),
              /* @__PURE__ */ v.jsxs("section", { className: "cfo-kpi-section", "aria-labelledby": "cfo-kpi-title", children: [
                /* @__PURE__ */ v.jsxs("div", { className: "cfo-section-heading cfo-kpi-heading", children: [
                  /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsx("p", { children: "Executive signals" }),
                    /* @__PURE__ */ v.jsx("h2", { id: "cfo-kpi-title", children: "Five numbers to run the day" }),
                    /* @__PURE__ */ v.jsx("span", { children: "Cash, collections, obligations, and risk—everything else stays one click away." })
                  ] }),
                  /* @__PURE__ */ v.jsxs("div", { className: "cfo-kpi-heading-actions", children: [
                    /* @__PURE__ */ v.jsxs("small", { children: [
                      ot.length,
                      " priority · ",
                      r.kpis.length,
                      " total"
                    ] }),
                    /* @__PURE__ */ v.jsxs(
                      "button",
                      {
                        type: "button",
                        "aria-expanded": A,
                        "aria-controls": "cfo-metric-library",
                        onClick: () => C((w) => !w),
                        children: [
                          A ? "Hide full library" : "View all metrics",
                          /* @__PURE__ */ v.jsx(Kk, { "aria-hidden": "true" })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ v.jsx("div", { className: "cfo-kpi-grid cfo-kpi-priority-grid", children: ot.map((w, L) => /* @__PURE__ */ v.jsx(gp, { kpi: w, index: L, onOpen: () => S(w) }, w.id)) }),
                A && /* @__PURE__ */ v.jsx("div", { ref: G, id: "cfo-metric-library", className: "cfo-kpi-library", children: bL.map((w) => {
                  const L = w.ids.map((U) => X.get(U)).filter((U) => !!U);
                  return /* @__PURE__ */ v.jsxs("section", { className: "cfo-kpi-library-group", "aria-label": w.label, children: [
                    /* @__PURE__ */ v.jsxs("header", { children: [
                      /* @__PURE__ */ v.jsxs("div", { children: [
                        /* @__PURE__ */ v.jsx("h3", { children: w.label }),
                        /* @__PURE__ */ v.jsx("p", { children: w.description })
                      ] }),
                      /* @__PURE__ */ v.jsx("span", { children: L.length })
                    ] }),
                    /* @__PURE__ */ v.jsx("div", { className: "cfo-kpi-library-grid", children: L.map((U, _) => /* @__PURE__ */ v.jsx(gp, { kpi: U, index: _, compact: !0, onOpen: () => S(U) }, U.id)) })
                  ] }, w.label);
                }) })
              ] }),
              /* @__PURE__ */ v.jsxs("section", { className: "cfo-exceptions", "aria-labelledby": "cfo-exceptions-title", children: [
                /* @__PURE__ */ v.jsxs("div", { className: "cfo-section-heading", children: [
                  /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsx("p", { children: "Decision queue" }),
                    /* @__PURE__ */ v.jsx("h2", { id: "cfo-exceptions-title", children: "Items needing attention" })
                  ] }),
                  /* @__PURE__ */ v.jsxs("span", { children: [
                    "As of ",
                    new Date(r.asOf).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                  ] })
                ] }),
                /* @__PURE__ */ v.jsx("div", { className: "cfo-exception-list", children: r.exceptions.map((w) => /* @__PURE__ */ v.jsxs("article", { children: [
                  /* @__PURE__ */ v.jsx("i", { className: w.severity }),
                  /* @__PURE__ */ v.jsxs("div", { children: [
                    /* @__PURE__ */ v.jsx("strong", { children: w.title }),
                    /* @__PURE__ */ v.jsx("span", { children: w.owner })
                  ] }),
                  /* @__PURE__ */ v.jsx("b", { children: ae(w.amount) }),
                  /* @__PURE__ */ v.jsx(TT, {})
                ] }, w.title)) })
              ] })
            ] }) : /* @__PURE__ */ v.jsx(CL, { module: y, data: r, onOpen: S })
          }
        )
      ] })
    ] }),
    r && T && /* @__PURE__ */ v.jsx(ML, { data: r, kpi: T, onClose: () => S(null) })
  ] });
}
function MT(t) {
  return [t.getFullYear(), t.getMonth() + 1, t.getDate()].join("-");
}
function EL(t) {
  const n = t.map((u) => new Date(u.receivedAt)).filter((u) => !Number.isNaN(u.getTime())), s = n.length ? new Date(Math.max(...n.map((u) => u.getTime()))) : /* @__PURE__ */ new Date();
  s.setHours(0, 0, 0, 0);
  const r = Array.from({ length: 7 }, (u, c) => {
    const d = new Date(s);
    return d.setDate(s.getDate() - (6 - c)), { date: d, received: 0, completed: 0 };
  }), o = new Map(r.map((u) => [MT(u.date), u]));
  for (const u of t) {
    const c = new Date(u.receivedAt);
    if (Number.isNaN(c.getTime())) continue;
    const d = o.get(MT(c));
    d && (d.received += 1, u.status === "completed" && (d.completed += 1));
  }
  return r;
}
function wL() {
  const t = window, [n, s] = E.useState(() => t.__lexflowEmails ?? []);
  E.useEffect(() => {
    const c = (d) => {
      const p = d.detail;
      s(Array.isArray(p) ? p : []);
    };
    return window.addEventListener("lexflow:emails", c), s(t.__lexflowEmails ?? []), () => window.removeEventListener("lexflow:emails", c);
  }, []);
  const r = E.useMemo(() => EL(n), [n]), o = E.useMemo(() => ({
    received: r.reduce((c, d) => c + d.received, 0),
    completed: r.reduce((c, d) => c + d.completed, 0)
  }), [r]), u = o.received ? Math.round(o.completed / o.received * 100) : 0;
  return /* @__PURE__ */ v.jsxs("section", { className: "overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(29,29,31,0.03)]", children: [
    /* @__PURE__ */ v.jsxs("header", { className: "flex flex-wrap items-end justify-between gap-3 border-b border-black/8 px-5 py-4", children: [
      /* @__PURE__ */ v.jsxs("div", { children: [
        /* @__PURE__ */ v.jsx("p", { className: "text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500", children: "Seven-day movement" }),
        /* @__PURE__ */ v.jsx("h2", { className: "mt-1 text-lg font-semibold tracking-[-0.035em] text-neutral-950", children: "Email flow trend" })
      ] }),
      /* @__PURE__ */ v.jsxs("div", { className: "flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-600", "aria-label": "Chart legend", children: [
        /* @__PURE__ */ v.jsxs("span", { className: "rounded-full bg-[#f5f5f7] px-3 py-1.5 text-neutral-800", children: [
          u,
          "% completion"
        ] }),
        /* @__PURE__ */ v.jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ v.jsx("i", { className: "size-2 rounded-full bg-[#0071e3]" }),
          "Received ",
          o.received
        ] }),
        /* @__PURE__ */ v.jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ v.jsx("i", { className: "size-2 rounded-full bg-[#5856d6]" }),
          "Completed ",
          o.completed
        ] })
      ] })
    ] }),
    /* @__PURE__ */ v.jsx("div", { className: "min-h-[205px] px-3 py-3 sm:px-5", children: /* @__PURE__ */ v.jsxs(
      sA,
      {
        animationDuration: 900,
        aspectRatio: "4 / 1",
        data: r,
        margin: { top: 20, right: 24, bottom: 42, left: 24 },
        revealSignature: `${o.received}:${o.completed}`,
        children: [
          /* @__PURE__ */ v.jsx(f0, { fadeHorizontal: !0, hideHorizontalEdgeLines: !0, stroke: "var(--chart-grid)" }),
          /* @__PURE__ */ v.jsx(Br, { dataKey: "received", fadeEdges: !0, fill: "#0071e3", fillOpacity: 0.18, stroke: "#0071e3", strokeWidth: 2.25 }),
          /* @__PURE__ */ v.jsx(Br, { dataKey: "completed", fadeEdges: !0, fill: "#5856d6", fillOpacity: 0.12, stroke: "#5856d6", strokeWidth: 2 }),
          /* @__PURE__ */ v.jsx(h0, { numTicks: 7 }),
          /* @__PURE__ */ v.jsx(
            d0,
            {
              rows: (c) => [
                { color: "#0071e3", label: "Received", value: String(c.received ?? 0) },
                { color: "#5856d6", label: "Completed", value: String(c.completed ?? 0) }
              ]
            }
          )
        ]
      }
    ) })
  ] });
}
const AT = document.querySelector("#workflow-chart-root");
AT && wT.createRoot(AT).render(/* @__PURE__ */ v.jsx(wL, {}));
function DL() {
  const t = window, [n, s] = E.useState(() => t.__lexflowCfoUser ?? null);
  return E.useEffect(() => {
    const r = (u) => {
      s(u.detail.user);
    }, o = () => s(null);
    return window.addEventListener("lexflow:cfo-session", r), window.addEventListener("lexflow:cfo-logout", o), s(t.__lexflowCfoUser ?? null), () => {
      window.removeEventListener("lexflow:cfo-session", r), window.removeEventListener("lexflow:cfo-logout", o);
    };
  }, []), n ? /* @__PURE__ */ v.jsx(_L, { user: n }) : null;
}
const CT = document.querySelector("#cfo-dashboard-root");
CT && wT.createRoot(CT).render(/* @__PURE__ */ v.jsx(DL, {}));
