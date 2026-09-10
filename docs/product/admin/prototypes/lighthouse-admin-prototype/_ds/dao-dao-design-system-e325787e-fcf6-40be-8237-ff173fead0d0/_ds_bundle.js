/* @ds-bundle: {"format":3,"namespace":"DaoDaoDesignSystem_e32578","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CheckInButton","sourcePath":"components/core/CheckInButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"PlanCard","sourcePath":"components/core/PlanCard.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"2bf0569e148f","components/core/Button.jsx":"53c81bed1e3f","components/core/Card.jsx":"7d41dd4afaf6","components/core/CheckInButton.jsx":"b2a8ed09874e","components/core/Input.jsx":"0f3468a1e1f5","components/core/PlanCard.jsx":"a6d26a08c064","components/core/ProgressBar.jsx":"97e72011ee1a","components/core/Tag.jsx":"065688c18126","ui_kits/app/Frame.jsx":"f5055d59704d","ui_kits/app/Screens.jsx":"c78bb5d063be","ui_kits/landing/Sections.jsx":"80874ed761f1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DaoDaoDesignSystem_e32578 = window.DaoDaoDesignSystem_e32578 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular avatar with island-colored fallback initials.
 */
function Avatar({
  src = null,
  name = "島民",
  size = 44,
  tone = "teal",
  style = {},
  ...rest
}) {
  const tones = {
    teal: "var(--dd-teal)",
    yellow: "var(--dd-yellow)",
    orange: "var(--dd-orange)",
    blue: "var(--dd-blue-light)"
  };
  const bg = tones[tone] || tones.teal;
  const fg = tone === "yellow" || tone === "blue" ? "var(--dd-ink)" : "#fff";
  const initial = (name || "?").trim().slice(0, 1);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-pill)",
      background: bg,
      color: fg,
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-black)",
      fontSize: size * 0.42,
      overflow: "hidden",
      boxShadow: "inset 0 0 0 2px rgba(255,255,255,.6)",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initial);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dao Dao primary control. Rounded "pill" shape echoing the island dome.
 */
function Button({
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 16px",
      fontSize: "14px",
      height: 36
    },
    md: {
      padding: "11px 22px",
      fontSize: "16px",
      height: 44
    },
    lg: {
      padding: "15px 30px",
      fontSize: "18px",
      height: 54
    }
  };
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--brand-active)",
      border: "1.5px solid var(--border-brand)"
    },
    accent: {
      background: "var(--dd-yellow)",
      color: "var(--text-on-yellow)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    dark: {
      background: "var(--surface-ink)",
      color: "var(--text-on-brand)",
      border: "1px solid transparent"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      lineHeight: 1,
      whiteSpace: "nowrap",
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      width: full ? "100%" : "auto",
      transition: "transform var(--dur-fast) var(--ease-out), filter var(--dur-fast), box-shadow var(--dur-base)",
      padding: s.padding,
      fontSize: s.fontSize,
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.96)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.filter = "none";
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(1.04)";
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Soft, dome-cornered surface container. The workhorse Dao Dao card.
 */
function Card({
  pad = "lg",
  tone = "white",
  interactive = false,
  children,
  style = {},
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "16px",
    md: "20px",
    lg: "24px",
    xl: "32px"
  };
  const tones = {
    white: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-soft)"
    },
    alt: {
      background: "var(--surface-alt)",
      border: "1px solid transparent"
    },
    teal: {
      background: "var(--surface-teal-soft)",
      border: "1px solid transparent"
    },
    blue: {
      background: "var(--surface-blue-soft)",
      border: "1px solid transparent"
    },
    ink: {
      background: "var(--surface-ink)",
      border: "1px solid transparent",
      color: "var(--text-on-brand)"
    }
  };
  const t = tones[tone] || tones.white;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius-xl)",
      padding: pads[pad] ?? pads.lg,
      boxShadow: "var(--shadow-sm)",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)",
      cursor: interactive ? "pointer" : "default",
      ...t,
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/CheckInButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The signature Dao Dao "打卡" (check-in) button. Round dome stamp that
 * fills and lifts once today's learning is logged.
 */
function CheckInButton({
  checked = false,
  day = null,
  label,
  onClick,
  size = 96,
  style = {},
  ...rest
}) {
  const text = label || (checked ? "已打卡" : "打卡");
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    style: {
      width: size,
      height: size,
      flex: "none",
      borderRadius: "var(--radius-pill)",
      border: checked ? "none" : "2.5px dashed var(--border-brand)",
      background: checked ? "var(--brand)" : "var(--surface-teal-soft)",
      color: checked ? "#fff" : "var(--brand-active)",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-black)",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "2px",
      boxShadow: checked ? "var(--glow-teal)" : "none",
      transform: checked ? "scale(1)" : "scale(1)",
      transition: "transform var(--dur-base) var(--ease-bounce), background var(--dur-base), box-shadow var(--dur-base)",
      ...style
    },
    onMouseDown: e => {
      e.currentTarget.style.transform = "scale(0.92)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size * 0.26,
      lineHeight: 1
    }
  }, checked ? "✓" : "○"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size * 0.16,
      lineHeight: 1
    }
  }, text), day != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size * 0.12,
      opacity: 0.85,
      fontFamily: "var(--font-mono)",
      fontWeight: 500
    }
  }, "Day ", day));
}
Object.assign(__ds_scope, { CheckInButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CheckInButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input with label + optional hint, in the soft Dao Dao style.
 */
function Input({
  label = "",
  hint = "",
  error = "",
  value,
  onChange,
  placeholder = "",
  type = "text",
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? "var(--danger)" : focused ? "var(--border-brand)" : "var(--border-base)";
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontFamily: "var(--font-body)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "14px",
      fontWeight: "var(--fw-bold)",
      color: "var(--text-strong)",
      marginBottom: "6px"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "var(--font-body)",
      fontSize: "16px",
      color: "var(--text-strong)",
      padding: "12px 16px",
      borderRadius: "var(--radius-md)",
      border: `1.5px solid ${borderColor}`,
      background: "var(--surface-card)",
      outline: "none",
      boxShadow: focused ? "var(--ring-focus)" : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "13px",
      marginTop: "6px",
      color: error ? "var(--danger)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rounded progress track for learning-plan completion / check-in streaks.
 */
function ProgressBar({
  value = 0,
  max = 100,
  tone = "teal",
  height = 12,
  showLabel = false,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const tones = {
    teal: "var(--dd-teal)",
    yellow: "var(--dd-yellow)",
    orange: "var(--dd-orange)"
  };
  const fill = tones[tone] || tones.teal;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height,
      background: "var(--surface-sunken)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: fill,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  })), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "13px",
      fontWeight: "var(--fw-medium)",
      color: "var(--text-muted)",
      flex: "none"
    }
  }, value, "/", max));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small rounded label for categories, topics and statuses.
 */
function Tag({
  tone = "teal",
  soft = true,
  size = "md",
  children,
  style = {},
  ...rest
}) {
  const tones = {
    teal: {
      solid: "var(--dd-teal)",
      soft: "var(--surface-teal-soft)",
      ink: "var(--dd-teal-700)"
    },
    yellow: {
      solid: "var(--dd-yellow)",
      soft: "var(--surface-yellow-soft)",
      ink: "#8a7400"
    },
    orange: {
      solid: "var(--dd-orange)",
      soft: "var(--surface-orange-soft)",
      ink: "var(--dd-orange-600)"
    },
    blue: {
      solid: "var(--dd-blue-light)",
      soft: "var(--surface-blue-soft)",
      ink: "var(--dd-teal-700)"
    },
    gray: {
      solid: "var(--dd-gray-300)",
      soft: "var(--surface-alt)",
      ink: "var(--text-muted)"
    }
  };
  const t = tones[tone] || tones.teal;
  const pad = size === "sm" ? "3px 9px" : "5px 13px";
  const fs = size === "sm" ? "11px" : "13px";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      fontSize: fs,
      lineHeight: 1.2,
      padding: pad,
      borderRadius: "var(--radius-pill)",
      background: soft ? t.soft : t.solid,
      color: soft ? t.ink : tone === "yellow" || tone === "blue" ? "var(--dd-ink)" : "#fff",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/PlanCard.jsx
try { (() => {
/**
 * Learning-plan card — the core content unit across Dao Dao. Shows the plan
 * topic, duration, an island-colored cover band, progress and learners.
 */
function PlanCard({
  title = "學習計畫",
  topic = "自主學習",
  tone = "teal",
  days = 30,
  current = null,
  learners = 0,
  cover = null,
  onClick,
  style = {}
}) {
  const bands = {
    teal: "var(--dd-teal)",
    yellow: "var(--dd-yellow)",
    orange: "var(--dd-orange)",
    blue: "var(--dd-blue-light)"
  };
  const band = bands[tone] || bands.teal;
  const inProgress = current != null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-soft)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
      cursor: onClick ? "pointer" : "default",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)",
      ...style
    },
    onMouseEnter: onClick ? e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
    } : undefined,
    onMouseLeave: onClick ? e => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
    } : undefined
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 96,
      background: band,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }
  }, cover ? /*#__PURE__*/React.createElement("img", {
    src: cover,
    alt: "",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120,
      height: 70,
      background: "rgba(255,255,255,.4)",
      borderRadius: "var(--radius-dome)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px 20px",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: tone,
    size: "sm"
  }, topic), /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "gray",
    size: "sm"
  }, days, " \u5929")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-black)",
      fontSize: "19px",
      color: "var(--text-strong)",
      lineHeight: 1.3,
      marginBottom: "14px"
    }
  }, title), inProgress ? /*#__PURE__*/React.createElement(__ds_scope.ProgressBar, {
    value: current,
    max: days,
    tone: tone,
    showLabel: true
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "var(--text-muted)",
      fontSize: "14px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "\u5CF6",
    tone: tone,
    size: 26
  }), learners.toLocaleString(), " \u4F4D\u5CF6\u6C11\u6B63\u5728\u5B78")));
}
Object.assign(__ds_scope, { PlanCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PlanCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Frame.jsx
try { (() => {
// Shared phone frame + helpers for the Dao Dao app UI kit.
function PhoneFrame({
  children,
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 800,
      flex: "none",
      background: dark ? "var(--surface-ink)" : "var(--surface-page)",
      borderRadius: 44,
      border: "10px solid #0f3036",
      boxShadow: "var(--shadow-xl)",
      overflow: "hidden",
      position: "relative",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 26px",
      fontSize: 13,
      fontWeight: 700,
      color: dark ? "#fff" : "var(--text-strong)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11
    }
  }, "5G"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 11,
      border: "1.5px solid currentColor",
      borderRadius: 3,
      display: "inline-block",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 1.5,
      right: 5,
      background: "currentColor",
      borderRadius: 1
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 756,
      overflow: "hidden",
      position: "relative"
    }
  }, children));
}
function TabBar({
  active = "home",
  onNav
}) {
  const tabs = [{
    id: "home",
    label: "今天",
    icon: "◐"
  }, {
    id: "explore",
    label: "探索",
    icon: "○○"
  }, {
    id: "community",
    label: "島民",
    icon: "♡"
  }, {
    id: "me",
    label: "我的",
    icon: "◑"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 72,
      background: "rgba(255,255,255,.92)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid var(--border-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      paddingBottom: 14
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => onNav && onNav(t.id),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      color: active === t.id ? "var(--brand)" : "var(--text-soft)",
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      lineHeight: 1
    }
  }, t.icon), t.label)));
}
Object.assign(window, {
  PhoneFrame,
  TabBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Screens.jsx
try { (() => {
// Dao Dao app screens. Each exported to window for the index orchestrator.
const {
  Button,
  Tag,
  Card,
  Avatar,
  ProgressBar,
  Input,
  CheckInButton,
  PlanCard
} = window.DaoDaoDesignSystem_e32578;

/* ---------------- Login / Onboarding ---------------- */
function LoginScreen({
  onLogin
}) {
  return /*#__PURE__*/React.createElement(PhoneFrame, {
    dark: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "0 28px",
      color: "#fff",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-vertical-white-zh.png",
    alt: "\u5CF6\u5CF6\u963F\u5B78",
    style: {
      height: 200
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "var(--dd-blue-light)",
      fontSize: 16,
      lineHeight: 1.7,
      margin: 0,
      maxWidth: 260
    }
  }, "\u81EA\u5DF1\u6C7A\u5B9A\u8981\u5B78\u4EC0\u9EBC\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u548C\u4E00\u7FA4\u5CF6\u6C11\uFF0C\u6BCF\u5929\u524D\u9032\u4E00\u9EDE\u9EDE\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    full: true,
    onClick: onLogin
  }, "\u958B\u59CB\u6211\u7684\u5B78\u7FD2\u65C5\u7A0B"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    full: true,
    style: {
      color: "var(--dd-blue-light)"
    },
    onClick: onLogin
  }, "\u6211\u5DF2\u7D93\u6709\u5E33\u865F\u4E86"))));
}

/* ---------------- Home / Today ---------------- */
function HomeScreen({
  checked,
  onCheck,
  onNav,
  onOpenPlan
}) {
  return /*#__PURE__*/React.createElement(PhoneFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      overflowY: "auto",
      paddingBottom: 84
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 22px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      fontWeight: 700
    }
  }, "\u65E9\u5B89\uFF0C\u5C0F\u5CF6 \u2600"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 24,
      color: "var(--text-strong)"
    }
  }, "\u4ECA\u5929\u60F3\u524D\u9032\u4E00\u9EDE\u55CE\uFF1F")), /*#__PURE__*/React.createElement(Avatar, {
    name: "\u5C0F\u5CF6",
    tone: "orange",
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-teal-soft)",
      borderRadius: "var(--radius-xl)",
      padding: 22,
      display: "flex",
      alignItems: "center",
      gap: 18,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(CheckInButton, {
    checked: checked,
    day: 7,
    onClick: onCheck,
    size: 92
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: "teal",
    size: "sm"
  }, "\u9032\u884C\u4E2D"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 18,
      color: "var(--text-strong)",
      margin: "8px 0 6px"
    }
  }, "\u6BCF\u5929\u8B80\u4E00\u7BC7\u8AD6\u6587"), /*#__PURE__*/React.createElement(ProgressBar, {
    value: checked ? 7 : 6,
    max: 21,
    tone: "teal",
    showLabel: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, checked ? "今天完成了！連續 5 天 🔥" : "點一下圓圈完成今天的打卡"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 18,
      color: "var(--text-strong)"
    }
  }, "\u7E7C\u7E8C\u4F60\u7684\u8A08\u756B"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav("explore"),
    style: {
      background: "none",
      border: "none",
      color: "var(--text-link)",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "\u63A2\u7D22\u66F4\u591A \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(PlanCard, {
    title: "30 \u5929\u82F1\u6587\u807D\u529B\u7FD2\u6163",
    topic: "\u8A9E\u8A00",
    tone: "orange",
    days: 30,
    current: 12,
    onClick: onOpenPlan
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u8A8D\u8B58\u81EA\u5DF1\u7684\u5B78\u7FD2 DNA",
    topic: "\u81EA\u6211\u63A2\u7D22",
    tone: "yellow",
    days: 7,
    current: 3,
    onClick: onOpenPlan
  })))), /*#__PURE__*/React.createElement(TabBar, {
    active: "home",
    onNav: onNav
  }));
}

/* ---------------- Explore ---------------- */
function ExploreScreen({
  onNav,
  onOpenPlan
}) {
  const cats = ["全部", "語言", "閱讀", "自我探索", "技能", "研究"];
  return /*#__PURE__*/React.createElement(PhoneFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      overflowY: "auto",
      paddingBottom: 84
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 22px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 24,
      color: "var(--text-strong)",
      marginBottom: 14
    }
  }, "\u63A2\u7D22\u5B78\u7FD2\u8A08\u756B"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u60F3\u5B78\u9EDE\u4EC0\u9EBC\u5462\uFF1F",
    value: "",
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      overflowX: "auto",
      margin: "16px 0 18px",
      paddingBottom: 4
    }
  }, cats.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: i === 0 ? "teal" : "gray",
    soft: i !== 0
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(PlanCard, {
    title: "30 \u5929\u82F1\u6587\u807D\u529B\u7FD2\u6163",
    topic: "\u8A9E\u8A00",
    tone: "orange",
    days: 30,
    learners: 1280,
    onClick: onOpenPlan
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u6BCF\u5929\u8B80 10 \u9801\u66F8",
    topic: "\u95B1\u8B80",
    tone: "teal",
    days: 21,
    learners: 864,
    onClick: onOpenPlan
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u8A8D\u8B58\u81EA\u5DF1\u7684\u5B78\u7FD2 DNA",
    topic: "\u81EA\u6211\u63A2\u7D22",
    tone: "yellow",
    days: 7,
    learners: 2310,
    onClick: onOpenPlan
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u5BEB\u7A0B\u5F0F\u65E5\u8A18 30 \u5929",
    topic: "\u6280\u80FD",
    tone: "blue",
    days: 30,
    learners: 540,
    onClick: onOpenPlan
  })))), /*#__PURE__*/React.createElement(TabBar, {
    active: "explore",
    onNav: onNav
  }));
}

/* ---------------- Plan detail ---------------- */
function PlanDetailScreen({
  onBack,
  onJoin,
  joined
}) {
  return /*#__PURE__*/React.createElement(PhoneFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      overflowY: "auto",
      paddingBottom: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 200,
      background: "var(--dd-orange)",
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      position: "absolute",
      top: 14,
      left: 18,
      width: 38,
      height: 38,
      borderRadius: 999,
      border: "none",
      background: "rgba(255,255,255,.85)",
      cursor: "pointer",
      fontSize: 18,
      fontWeight: 800,
      color: "var(--text-strong)"
    }
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      height: 92,
      background: "rgba(255,255,255,.4)",
      borderRadius: "var(--radius-dome)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 22px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: "orange"
  }, "\u8A9E\u8A00"), /*#__PURE__*/React.createElement(Tag, {
    tone: "gray",
    size: "md"
  }, "30 \u5929"), /*#__PURE__*/React.createElement(Tag, {
    tone: "gray",
    size: "md"
  }, "\u6BCF\u5929 15 \u5206\u9418")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 26,
      color: "var(--text-strong)",
      lineHeight: 1.3,
      marginBottom: 12
    }
  }, "30 \u5929\u82F1\u6587\u807D\u529B\u7FD2\u6163"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.7,
      color: "var(--text-body)",
      margin: "0 0 18px"
    }
  }, "\u6BCF\u5929\u82B1 15 \u5206\u9418\uFF0C\u8DDF\u8457\u7CBE\u9078\u7684 podcast \u6BB5\u843D\u7DF4\u7FD2\u807D\u529B\u3002\u4E0D\u7528\u8003\u8A66\u3001\u4E0D\u7528\u6BD4\u8F03\uFF0C\u91CD\u9EDE\u662F\u8B93\u300C\u807D\u82F1\u6587\u300D\u8B8A\u6210\u751F\u6D3B\u7684\u4E00\u90E8\u5206\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["teal", "yellow", "orange", "blue"].map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginLeft: i ? -10 : 0
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "\u5CF6",
    tone: t,
    size: 32,
    style: {
      boxShadow: "0 0 0 2px #fff"
    }
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, "1,280 \u4F4D\u5CF6\u6C11\u6B63\u5728\u5B78")), /*#__PURE__*/React.createElement(Card, {
    tone: "alt",
    pad: "md",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color: "var(--text-strong)",
      marginBottom: 10
    }
  }, "\u9019\u8D9F\u65C5\u7A0B\u6703\u50CF\u9019\u6A23"), [["Day 1–7", "熟悉每日聽力節奏"], ["Day 8–21", "挑戰不看字幕"], ["Day 22–30", "用英文寫下心得"]].map(([d, t]) => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      display: "flex",
      gap: 12,
      padding: "8px 0",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--dd-orange-600)",
      fontWeight: 600,
      width: 72,
      flex: "none"
    }
  }, d), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, t)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: "14px 22px 26px",
      background: "linear-gradient(180deg, transparent, var(--surface-page) 30%)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: joined ? "secondary" : "primary",
    size: "lg",
    full: true,
    onClick: onJoin
  }, joined ? "✓ 已加入，明天見！" : "加入這個計畫")));
}
Object.assign(window, {
  LoginScreen,
  HomeScreen,
  ExploreScreen,
  PlanDetailScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Sections.jsx
try { (() => {
// Dao Dao marketing landing — section components.
const {
  Button,
  Tag,
  Card,
  Avatar,
  PlanCard
} = window.DaoDaoDesignSystem_e32578;
function Nav() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 10,
      background: "rgba(243,253,255,.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      padding: "14px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-dark-zh.png",
    alt: "\u5CF6\u5CF6\u963F\u5B78",
    style: {
      height: 40
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 28
    }
  }, ["關於我們", "學習計畫", "島民故事", "常見問題"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: "var(--text-body)",
      textDecoration: "none",
      fontWeight: 700,
      fontSize: 15
    }
  }, l)), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "\u514D\u8CBB\u52A0\u5165"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      padding: "80px 32px 96px",
      display: "grid",
      gridTemplateColumns: "1.05fr .95fr",
      gap: 48,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, {
    tone: "yellow"
  }, "\u81EA\u4E3B\u5B78\u7FD2\u793E\u7FA4 \xB7 2020 \u8D77\u822A"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 54,
      lineHeight: 1.12,
      letterSpacing: "-0.01em",
      color: "var(--text-strong)",
      margin: "20px 0 18px"
    }
  }, "\u5B78\u7FD2\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u5F9E\u81EA\u5DF1\u6C7A\u5B9A\u65B9\u5411\u958B\u59CB"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 19,
      lineHeight: 1.7,
      color: "var(--text-body)",
      margin: "0 0 32px",
      maxWidth: 460
    }
  }, "\u5CF6\u5CF6\u963F\u5B78\u966A\u4F60\u628A\u300C\u60F3\u5B78\u7684\u4E8B\u300D\u8B8A\u6210\u6BCF\u5929\u7684\u7FD2\u6163\u3002\u8A2D\u5B9A\u4E00\u500B 7\u201330 \u5929\u7684\u5C0F\u8A08\u756B\uFF0C\u6BCF\u5929\u6253\u5361\uFF0C\u548C\u4E00\u7FA4\u5CF6\u6C11\u4E00\u8D77\u524D\u9032\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "\u958B\u59CB\u6211\u7684\u8A08\u756B"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "\u770B\u770B\u5225\u4EBA\u600E\u9EBC\u5B78")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["teal", "yellow", "orange", "blue"].map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginLeft: i ? -10 : 0
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "\u5CF6",
    tone: t,
    size: 34,
    style: {
      boxShadow: "0 0 0 3px var(--surface-page)"
    }
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, "\u5DF2\u6709 12,000+ \u4F4D\u5CF6\u6C11\u6B63\u5728\u5B78\u7FD2"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 360,
      height: 360,
      background: "var(--dd-blue-light)",
      borderRadius: 999,
      filter: "blur(8px)",
      opacity: .5,
      top: 20
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-square.png",
    alt: "",
    style: {
      width: 340,
      position: "relative",
      borderRadius: "var(--radius-2xl)",
      boxShadow: "var(--shadow-lg)"
    }
  }))));
}
function Features() {
  const items = [{
    tone: "teal",
    icon: "◐",
    t: "自己設定計畫",
    d: "從 7 到 30 天，挑一個你真正想做的目標，節奏由你決定。"
  }, {
    tone: "yellow",
    icon: "✓",
    t: "每天打卡前進",
    d: "一個小小的儀式，讓學習慢慢長成習慣，不靠意志力硬撐。"
  }, {
    tone: "orange",
    icon: "♡",
    t: "和島民同行",
    d: "在社群裡互相鼓勵、分享心得，學習路上不再一個人。"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      padding: "88px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: "teal"
  }, "\u70BA\u4EC0\u9EBC\u662F\u5CF6\u5CF6"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 38,
      color: "var(--text-strong)",
      margin: "16px 0 0"
    }
  }, "\u628A\u5B78\u7FD2\u8B8A\u6210\u559C\u6B61\u7684\u4E8B")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24
    }
  }, items.map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.t,
    tone: "white",
    pad: "xl",
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-dome)",
      background: `var(--dd-${it.tone})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
      color: it.tone === "yellow" ? "var(--dd-ink)" : "#fff",
      marginBottom: 18
    }
  }, it.icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 21,
      color: "var(--text-strong)",
      margin: "0 0 10px"
    }
  }, it.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15.5,
      lineHeight: 1.7,
      color: "var(--text-body)",
      margin: 0
    }
  }, it.d))))));
}
function PlansShowcase() {
  return /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      padding: "88px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, {
    tone: "orange"
  }, "\u71B1\u9580\u8A08\u756B"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 38,
      color: "var(--text-strong)",
      margin: "16px 0 0"
    }
  }, "\u5CF6\u6C11\u5011\u6B63\u5728\u5B78\u4EC0\u9EBC")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "\u700F\u89BD\u5168\u90E8\u8A08\u756B \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(PlanCard, {
    title: "30 \u5929\u82F1\u6587\u807D\u529B\u7FD2\u6163",
    topic: "\u8A9E\u8A00",
    tone: "orange",
    days: 30,
    learners: 1280,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u6BCF\u5929\u8B80 10 \u9801\u66F8",
    topic: "\u95B1\u8B80",
    tone: "teal",
    days: 21,
    learners: 864,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u8A8D\u8B58\u5B78\u7FD2 DNA",
    topic: "\u81EA\u6211\u63A2\u7D22",
    tone: "yellow",
    days: 7,
    learners: 2310,
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(PlanCard, {
    title: "\u5BEB\u7A0B\u5F0F\u65E5\u8A18",
    topic: "\u6280\u80FD",
    tone: "blue",
    days: 30,
    learners: 540,
    onClick: () => {}
  }))));
}
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-ink)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-narrow)",
      margin: "0 auto",
      padding: "88px 32px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/mark-islands.png",
    alt: "",
    style: {
      height: 96,
      marginBottom: 24
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 40,
      margin: "0 0 16px"
    }
  }, "\u6E96\u5099\u597D\u51FA\u767C\u4E86\u55CE\uFF1F"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.7,
      color: "var(--dd-blue-light)",
      margin: "0 0 32px"
    }
  }, "\u6311\u4E00\u4EF6\u4F60\u4E00\u76F4\u60F3\u5B78\u7684\u4E8B\uFF0C\u4ECA\u5929\u5C31\u8E0F\u51FA\u7B2C\u4E00\u6B65\u3002\u52A0\u5165\u5CF6\u5CF6\u963F\u5B78\uFF0C\u6C38\u9060\u514D\u8CBB\u3002"), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg"
  }, "\u514D\u8CBB\u5EFA\u7ACB\u6211\u7684\u5B78\u7FD2\u8A08\u756B")));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      padding: "40px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-dark-en.png",
    alt: "Dao Dao",
    style: {
      height: 32
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: "var(--text-muted)"
    }
  }, "\xA9 2020\u20132026 \u5CF6\u5CF6\u963F\u5B78 Dao Dao \xB7 \u4E00\u500B\u958B\u6E90\u7684\u81EA\u4E3B\u5B78\u7FD2\u793E\u7FA4")));
}
Object.assign(window, {
  Nav,
  Hero,
  Features,
  PlansShowcase,
  CTA,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CheckInButton = __ds_scope.CheckInButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.PlanCard = __ds_scope.PlanCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Tag = __ds_scope.Tag;

})();
