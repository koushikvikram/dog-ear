/* @ds-bundle: {"format":4,"namespace":"DogEar","components":[{"name":"Icon"},{"name":"AppShell"},{"name":"Container"},{"name":"ScrollArea"},{"name":"AppBody"},{"name":"Wordmark"},{"name":"Button"},{"name":"IconButton"},{"name":"TextButton"},{"name":"MicButton"},{"name":"MicPill"},{"name":"Fab"},{"name":"SegmentedControl"},{"name":"Tab"},{"name":"Tabs"},{"name":"BottomTabBar"},{"name":"Chip"},{"name":"Dot"},{"name":"Badge"},{"name":"Field"},{"name":"TextInput"},{"name":"Select"},{"name":"TextArea"},{"name":"SearchField"},{"name":"Honeypot"},{"name":"ErrorText"},{"name":"Eyebrow"},{"name":"EmptyState"},{"name":"AuthCard"},{"name":"Panel"},{"name":"FeatureTile"},{"name":"SuccessDisc"},{"name":"BookCover"},{"name":"BookCard"},{"name":"AddBookCard"},{"name":"RequestRow"},{"name":"WordEntry"},{"name":"WordCard"},{"name":"Suggestion"},{"name":"Note"},{"name":"HighlightRow"},{"name":"HighlightCard"},{"name":"SwatchRow"},{"name":"Scrim"},{"name":"Drawer"},{"name":"DrawerHeader"},{"name":"DrawerBody"},{"name":"Sheet"},{"name":"SheetHeader"},{"name":"Dialog"},{"name":"Toast"},{"name":"AccountButton"},{"name":"Menu"},{"name":"MenuItem"},{"name":"Popover"},{"name":"SyncStatus"},{"name":"HintBar"},{"name":"ActionBanner"},{"name":"SelectionBar"},{"name":"AppHeader"},{"name":"GraphCanvas"},{"name":"CharacterNode"},{"name":"NodePill"},{"name":"TieLabel"},{"name":"CanvasToolbar"},{"name":"GraphControls"}]} */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };

  // ds/src/components.jsx
  var components_exports = {};
  __export(components_exports, {
    AccountButton: () => AccountButton,
    ActionBanner: () => ActionBanner,
    AddBookCard: () => AddBookCard,
    AppBody: () => AppBody,
    AppHeader: () => AppHeader,
    AppShell: () => AppShell,
    AuthCard: () => AuthCard,
    Badge: () => Badge,
    BookCard: () => BookCard,
    BookCover: () => BookCover,
    BottomTabBar: () => BottomTabBar,
    Button: () => Button,
    CanvasToolbar: () => CanvasToolbar,
    CharacterNode: () => CharacterNode,
    Chip: () => Chip,
    Container: () => Container,
    Dialog: () => Dialog,
    Dot: () => Dot,
    Drawer: () => Drawer,
    DrawerBody: () => DrawerBody,
    DrawerHeader: () => DrawerHeader,
    EmptyState: () => EmptyState,
    ErrorText: () => ErrorText,
    Eyebrow: () => Eyebrow,
    Fab: () => Fab,
    FeatureTile: () => FeatureTile,
    Field: () => Field,
    GraphCanvas: () => GraphCanvas,
    GraphControls: () => GraphControls,
    HighlightCard: () => HighlightCard,
    HighlightRow: () => HighlightRow,
    HintBar: () => HintBar,
    Honeypot: () => Honeypot,
    IconButton: () => IconButton,
    Menu: () => Menu,
    MenuItem: () => MenuItem,
    MicButton: () => MicButton,
    MicPill: () => MicPill,
    NodePill: () => NodePill,
    Note: () => Note,
    Panel: () => Panel,
    Popover: () => Popover,
    RequestRow: () => RequestRow,
    Scrim: () => Scrim,
    ScrollArea: () => ScrollArea,
    SearchField: () => SearchField,
    SegmentedControl: () => SegmentedControl,
    Select: () => Select,
    SelectionBar: () => SelectionBar,
    Sheet: () => Sheet,
    SheetHeader: () => SheetHeader,
    SuccessDisc: () => SuccessDisc,
    Suggestion: () => Suggestion,
    SwatchRow: () => SwatchRow,
    SyncStatus: () => SyncStatus,
    Tab: () => Tab,
    Tabs: () => Tabs,
    TextArea: () => TextArea,
    TextButton: () => TextButton,
    TextInput: () => TextInput,
    TieLabel: () => TieLabel,
    Toast: () => Toast,
    WordCard: () => WordCard,
    WordEntry: () => WordEntry,
    Wordmark: () => Wordmark
  });

  // ds/src/icons.jsx
  var React = window.React, R = "round", ICONS = {
    logo: { vb: 20, sw: 1.6, cap: null, join: R, d: ["M4 3h8l4 4v10H4z", "M12 3v4h4"] },
    lexicon: { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 4h9a3 3 0 013 3v9H7a3 3 0 01-3-3z", "M7 8h6"] },
    graph: { vb: 20, sw: 1.6, cap: R, join: R, circles: [[5, 6, 2], [15, 6, 2], [10, 15, 2]], d: ["M7 6h6M6 8l3 5M14 8l-3 5"] },
    highlight: { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 15l1-4 8-8 3 3-8 8z", "M11 5l3 3"] },
    "highlight-tab": { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 15l1-4 8-8 3 3-8 8z"] },
    pencil: { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 16l1-4 8-8 3 3-8 8z"] },
    trash: { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10M9 9v4M11 9v4"] },
    "trash-simple": { vb: 20, sw: 1.6, cap: R, join: R, d: ["M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"] },
    search: { vb: 20, sw: 1.6, cap: R, join: null, circles: [[9, 9, 5.5]], d: ["M13.2 13.2L17 17"] },
    plus: { vb: 16, sw: 1.6, cap: R, join: null, d: ["M8 3v10M3 8h10"] },
    close: { vb: 16, sw: 1.6, cap: R, join: null, d: ["M4 4l8 8M12 4l-8 8"] },
    back: { vb: 16, sw: 1.6, cap: R, join: R, d: ["M10 3L5 8l5 5"] },
    "chevron-down": { vb: 12, sw: 1.6, cap: R, join: R, d: ["M3 4.5l3 3 3-3"] },
    "chevron-down-wide": { vb: 12, sw: 1.6, cap: R, join: R, d: ["M2.5 4.5L6 8l3.5-3.5"] },
    mic: { vb: 20, sw: 1.7, cap: R, join: R, rects: [[7, 2.5, 6, 10, 3]], d: ["M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5"] },
    "mic-sm": { vb: 16, sw: 1.6, cap: R, join: null, rects: [[5.5, 1.5, 5, 8, 2.5]], d: ["M3 7.5a5 5 0 0010 0M8 12.5v2"] },
    mail: { vb: 20, sw: 1.8, cap: R, join: R, rects: [[3, 5, 14, 10, 2]], d: ["M3.5 6l6.5 5 6.5-5"] },
    check: { vb: 20, sw: 1.8, cap: R, join: R, d: ["M4 10l4 4 8-8"] },
    "arrow-right": { vb: 14, sw: 1.8, cap: R, join: R, d: ["M2 7h9M7.5 3.5L11 7l-3.5 3.5"] },
    eye: { vb: 20, sw: 1.6, cap: R, join: R, circles: [[10, 10, 2.2]], d: ["M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"], circlesAfter: !0 }
  }, ICON_NAMES = Object.keys(ICONS);
  function Icon({ name, size, stroke = "currentColor", strokeWidth, style, className }) {
    let ic = ICONS[name];
    if (!ic) return null;
    let s = size || ic.vb, kids = [], circles = (ic.circles || []).map((c, i) => /* @__PURE__ */ React.createElement("circle", { key: "c" + i, cx: c[0], cy: c[1], r: c[2] })), rects = (ic.rects || []).map((r, i) => /* @__PURE__ */ React.createElement("rect", { key: "r" + i, x: r[0], y: r[1], width: r[2], height: r[3], rx: r[4] })), paths = ic.d.map((d, i) => /* @__PURE__ */ React.createElement("path", { key: "p" + i, d }));
    ic.circlesAfter ? kids.push(...rects, ...paths, ...circles) : kids.push(...circles, ...rects, ...paths);
    let p = { width: s, height: s, viewBox: `0 0 ${ic.vb} ${ic.vb}`, fill: "none", stroke, strokeWidth: strokeWidth || ic.sw, "aria-hidden": "true" };
    return ic.cap && (p.strokeLinecap = ic.cap), ic.join && (p.strokeLinejoin = ic.join), style && (p.style = style), className && (p.className = className), /* @__PURE__ */ React.createElement("svg", { ...p }, kids);
  }

  // ds/src/components.jsx
  var React2 = window.React, cx = (...a) => a.filter(Boolean).join(" ");
  function AppShell({ platform = "desktop", minHeight, className, style, children, ...rest }) {
    let st = minHeight && platform === "desktop" ? { minHeight, ...style } : style;
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-shell", platform === "mobile" && "de-shell--mobile", className), style: st }, children);
  }
  function Container({ width = "default", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-container", width === "wide" && "de-container--wide", width === "narrow" && "de-container--narrow", className) }, children);
  }
  function ScrollArea({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-scroll", className) }, children);
  }
  function AppBody({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-appbody", className) }, children);
  }
  function Wordmark({ admin, className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-wordmark", admin && "de-wordmark--admin", className) }, /* @__PURE__ */ React2.createElement(Icon, { name: "logo", size: 20 }), "Dog-Ear", admin ? /* @__PURE__ */ React2.createElement(Badge, { tone: "neutral" }, "Admin") : null);
  }
  function Button({ variant = "primary", platform = "desktop", size, block, compact, on, tone, href, icon, className, children, ...rest }) {
    let c = cx("de-btn", "de-btn--" + variant, platform === "mobile" && "de-btn--mobile", size === "sm" && "de-btn--sm", block && "de-btn--block", compact && "de-btn--compact", on && "de-btn--on", tone === "danger" && "de-btn--danger-tone", className), kids = icon ? [/* @__PURE__ */ React2.createElement(Icon, { key: "i", name: icon, size: 16 }), " ", children] : children;
    return href !== void 0 ? /* @__PURE__ */ React2.createElement("a", { ...rest, href, className: c }, kids) : /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: c }, kids);
  }
  function IconButton({ label, platform = "desktop", muted, icon, iconSize = 14, className, children, ...rest }) {
    let c = platform === "mobile" ? cx("de-ib", muted && "de-ib--muted", className) : cx("de-iconbtn", className);
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": label, ...rest, className: c }, children || /* @__PURE__ */ React2.createElement(Icon, { name: icon || "close", size: iconSize }));
  }
  function TextButton({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: cx("de-textbtn", className) }, children);
  }
  function MicButton({ on, label, size = "md", className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-pressed": on, "aria-label": label || (on ? "Stop dictation" : "Dictate"), ...rest, className: cx("de-mic", on && "de-mic--on", className) }, /* @__PURE__ */ React2.createElement(Icon, { name: "mic", size: 20 }));
  }
  function MicPill({ recording, className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-pressed": recording, ...rest, className: cx("de-micpill", recording && "de-micpill--rec", className) }, /* @__PURE__ */ React2.createElement(Icon, { name: "mic-sm", size: 14 }), children || (recording ? "Listening. Tap to stop" : "Dictate"));
  }
  function Fab({ label = "Add", className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": label, ...rest, className: cx("de-fab", className) }, /* @__PURE__ */ React2.createElement(Icon, { name: "plus", size: 22, strokeWidth: 1.8 }));
  }
  function SegmentedControl({ label = "Choose an option", items = [], className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "tablist", "aria-label": label, ...rest, className: cx("de-segmented", className) }, items.map((it, i) => /* @__PURE__ */ React2.createElement("button", { key: i, type: "button", role: "tab", className: cx("de-segtab", it.selected && "de-segtab--on"), "aria-selected": !!it.selected, onClick: it.onClick }, it.label)));
  }
  function Tab({ selected, count, className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-pressed": !!selected, ...rest, className: cx("de-tab", selected && "de-tab--on", className) }, children, count !== void 0 ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, " ", /* @__PURE__ */ React2.createElement("span", { className: "de-tabcount" }, count)) : null);
  }
  function Tabs({ label = "Sections", items = [], className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "group", "aria-label": label, ...rest, className: cx("de-tabs", className) }, items.map((it, i) => /* @__PURE__ */ React2.createElement(Tab, { key: i, selected: it.selected, count: it.count, onClick: it.onClick }, it.label)));
  }
  function BottomTabBar({ label = "Sections", items = [], className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "group", "aria-label": label, ...rest, className: cx("de-tabbar", className) }, items.map((it, i) => /* @__PURE__ */ React2.createElement("button", { key: i, type: "button", className: cx("de-tabbar__item", it.selected && "de-tabbar__item--on"), "aria-pressed": !!it.selected, onClick: it.onClick }, /* @__PURE__ */ React2.createElement(Icon, { name: it.icon, size: 22 }), it.label)));
  }
  function Chip({ selected, size = "md", dot, count, add, className, children, ...rest }) {
    let touch = size === "touch";
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-pressed": add ? void 0 : !!selected, ...rest, className: cx("de-chip", size === "lg" && "de-chip--lg", touch && "de-chip--touch", selected && "de-chip--on", add && "de-chip--add", className) }, dot ? /* @__PURE__ */ React2.createElement(Dot, { color: dot, size: touch ? 8 : 10 }) : null, children, count !== void 0 ? /* @__PURE__ */ React2.createElement("span", { className: "de-chip__count" }, count) : null);
  }
  function Dot({ color, size = 10, style, className }) {
    return size === 10 ? /* @__PURE__ */ React2.createElement("span", { className: cx("de-dot", className), style: { background: color, ...style } }) : /* @__PURE__ */ React2.createElement("span", { className, style: { width: size + "px", height: size + "px", borderRadius: "50%", background: color, ...style } });
  }
  function Badge({ tone = "neutral", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("span", { ...rest, className: cx("de-badge", "de-badge--" + tone, className) }, children);
  }
  function Field({ label, platform = "desktop", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("label", { ...rest, className: cx("de-field", platform === "mobile" && "de-field--mobile", className) }, label, children);
  }
  function TextInput({ as = "input", ground = "card", size = "md", invalid, pageNumber, className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement(as, { ...rest, className: cx("de-input", ground === "page" && "de-input--page", size === "lg" && "de-input--lg", invalid && "de-input--invalid", pageNumber && "de-input--page-num", className) }, children);
  }
  function Select({ children, ...rest }) {
    return /* @__PURE__ */ React2.createElement(TextInput, { as: "select", ...rest }, children);
  }
  function TextArea({ size = "md", className, ...rest }) {
    return /* @__PURE__ */ React2.createElement("textarea", { ...rest, className: cx("de-textarea", size === "lg" && "de-textarea--lg", className) });
  }
  function SearchField({ size = "md", placeholder, label, value, onChange, inputProps, trailing, className, style, iconStyle }) {
    let ip = { "aria-label": label || placeholder, placeholder, value, onChange, ...inputProps };
    return /* @__PURE__ */ React2.createElement("div", { className: cx("de-search", size === "lg" && "de-search--lg", size === "touch" && "de-search--touch", className), style }, size === "touch" ? /* @__PURE__ */ React2.createElement(Icon, { name: "search", size: 18, stroke: "var(--text-muted)", style: { flex: "none", ...iconStyle } }) : /* @__PURE__ */ React2.createElement(Icon, { name: "search", size: 18 }), /* @__PURE__ */ React2.createElement("input", { ...ip, className: "de-search__input" }), trailing);
  }
  function Honeypot() {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-honeypot", "aria-hidden": "true" }, /* @__PURE__ */ React2.createElement("label", null, "Leave this empty", /* @__PURE__ */ React2.createElement("input", { tabIndex: -1, autoComplete: "off" })));
  }
  function ErrorText({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "alert", ...rest, className: cx("de-error", className) }, children);
  }
  function Eyebrow({ as = "div", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement(as, { ...rest, className: cx("de-eyebrow", className) }, children);
  }
  function EmptyState({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("p", { ...rest, className: cx("de-empty", className) }, children);
  }
  function AuthCard({ platform = "desktop", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-authcard", platform === "mobile" && "de-authcard--mobile", className) }, children);
  }
  function Panel({ platform = "desktop", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-panel", platform === "mobile" && "de-panel--mobile", className) }, children);
  }
  function FeatureTile({ icon, color, title, children }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-feature" }, /* @__PURE__ */ React2.createElement(Icon, { name: icon, size: 22, stroke: color }), /* @__PURE__ */ React2.createElement("div", { className: "de-feature__title" }, title), /* @__PURE__ */ React2.createElement("div", { className: "de-feature__text" }, children));
  }
  function SuccessDisc({ icon = "check" }) {
    return /* @__PURE__ */ React2.createElement("span", { "aria-hidden": "true", className: "de-successdisc" }, /* @__PURE__ */ React2.createElement(Icon, { name: icon, size: 18, strokeWidth: 1.8 }));
  }
  function BookCover({ color, initial }) {
    return /* @__PURE__ */ React2.createElement("span", { "aria-hidden": "true", className: "de-cover", style: { background: color } }, initial);
  }
  function BookCard({ title, author, color, status, statusColor, opened, lastHighlight, counts, href, onEdit, onDelete }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-bookcard" }, /* @__PURE__ */ React2.createElement("a", { className: "de-bookcard__link", href, "aria-label": "Open " + title }, /* @__PURE__ */ React2.createElement("span", { style: { display: "flex", gap: "16px", alignItems: "flex-start" } }, /* @__PURE__ */ React2.createElement(BookCover, { color, initial: title.charAt(0) }), /* @__PURE__ */ React2.createElement("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "19px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25, paddingRight: "84px" } }, title), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "14px", color: "var(--text-muted)", marginTop: "-2px" } }, author || "No author yet"), /* @__PURE__ */ React2.createElement("span", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)" } }, /* @__PURE__ */ React2.createElement(Dot, { size: 8, color: statusColor }), status, /* @__PURE__ */ React2.createElement("span", { "aria-hidden": "true" }, "\xB7"), opened))), /* @__PURE__ */ React2.createElement("span", { style: { display: "flex", flexDirection: "column", gap: "4px", paddingTop: "14px", borderTop: "1px solid var(--divider)", marginTop: "auto" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "14px", color: "var(--text)" } }, lastHighlight), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "13px", color: "var(--text-muted)" } }, counts.chars, " characters \xB7 ", counts.ties, " ties \xB7 ", counts.hl, " highlights \xB7 ", counts.words, " words"))), /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-bookcard__edit", "aria-label": "Edit details of " + title, onClick: onEdit }, /* @__PURE__ */ React2.createElement(Icon, { name: "pencil", size: 18 })), /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-bookcard__del", "aria-label": "Delete " + title, onClick: onDelete }, /* @__PURE__ */ React2.createElement(Icon, { name: "trash", size: 18 })));
  }
  function AddBookCard({ children = "Add your first book", ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: "de-addbook" }, /* @__PURE__ */ React2.createElement(Icon, { name: "plus", size: 16 }), " ", children);
  }
  function RequestRow({ email, status, statusLabel, note, when, actions }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-reqrow" }, /* @__PURE__ */ React2.createElement("div", { style: { flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" } }, /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "16px", fontWeight: 700, wordBreak: "break-all" } }, email), /* @__PURE__ */ React2.createElement(Badge, { tone: status }, statusLabel)), /* @__PURE__ */ React2.createElement("div", { style: { fontSize: "14px", lineHeight: 1.5, color: "var(--text-secondary)" } }, note), /* @__PURE__ */ React2.createElement("div", { style: { fontSize: "12px", color: "var(--text-muted)" } }, "Requested ", when)), actions);
  }
  function WordEntry({ word, pos, definition, onRemove }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-entry" }, /* @__PURE__ */ React2.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "19px", fontWeight: 700 } }, word), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "13px", color: "var(--text-muted)" } }, pos)), /* @__PURE__ */ React2.createElement("div", { style: { marginTop: "6px", fontSize: "15px", lineHeight: 1.55, color: "var(--text-secondary)" } }, definition)), /* @__PURE__ */ React2.createElement(IconButton, { label: "Remove " + word, onClick: onRemove }));
  }
  function WordCard({ word, definition, onRemove }) {
    return /* @__PURE__ */ React2.createElement(Panel, { platform: "mobile", style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React2.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React2.createElement("div", { style: { fontWeight: 700, fontSize: "16px" } }, word), /* @__PURE__ */ React2.createElement("div", { style: { fontSize: "13px", lineHeight: 1.5, color: "var(--text-muted)" } }, definition)), /* @__PURE__ */ React2.createElement(IconButton, { platform: "mobile", muted: !0, label: "Remove " + word, onClick: onRemove }, /* @__PURE__ */ React2.createElement(Icon, { name: "trash-simple", size: 16 })));
  }
  function Suggestion({ word, pos, definition, badge, hot, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: cx("de-sug", hot && "de-sug--hot") }, /* @__PURE__ */ React2.createElement("span", { style: { display: "flex", alignItems: "baseline", gap: "10px" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontWeight: 700, fontSize: "16px" } }, word), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "12px", color: "var(--text-muted)" } }, pos), /* @__PURE__ */ React2.createElement("span", { style: { marginLeft: "auto", fontSize: "12px", color: "var(--accent)", fontWeight: 700 } }, badge)), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "14px", color: "var(--text-suggestion)", lineHeight: 1.5 } }, definition));
  }
  function Note({ children }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-note" }, children);
  }
  function HighlightRow({ page, label, labelColor, quote, note, mentions, onOpen }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onOpen, style: { display: "flex", gap: "20px", width: "100%", padding: "20px 0", borderBottom: "1px solid var(--divider)" } }, /* @__PURE__ */ React2.createElement("span", { style: { flex: "none", width: "76px" } }, /* @__PURE__ */ React2.createElement("span", { style: { display: "block", fontSize: "12px", color: "var(--text-muted)" } }, "Page"), /* @__PURE__ */ React2.createElement("span", { style: { display: "block", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em" } }, page)), /* @__PURE__ */ React2.createElement("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" } }, /* @__PURE__ */ React2.createElement("span", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" } }, /* @__PURE__ */ React2.createElement(Dot, { color: labelColor }), /* @__PURE__ */ React2.createElement("span", { style: { fontWeight: 700, color: "var(--text)" } }, label)), quote ? /* @__PURE__ */ React2.createElement("span", { style: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "17px", lineHeight: 1.6, color: "var(--text-quote)" } }, "\u201C", quote, "\u201D") : null, note ? /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "15px", lineHeight: 1.55, color: "var(--text-secondary)" } }, note) : null, mentions ? /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "13px", color: "var(--palette-blue)" } }, mentions) : null));
  }
  function HighlightCard({ page, label, labelColor, quote, note, names, onOpen, onRemove }) {
    return /* @__PURE__ */ React2.createElement(Panel, { platform: "mobile", style: { display: "flex", flexDirection: "column", gap: "4px", padding: "6px 6px 14px 16px" } }, /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "13px", fontWeight: 700 } }, "p. ", page), /* @__PURE__ */ React2.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" } }, /* @__PURE__ */ React2.createElement(Dot, { size: 8, color: labelColor }), label), /* @__PURE__ */ React2.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React2.createElement(IconButton, { platform: "mobile", muted: !0, label: "Remove highlight on page " + page, onClick: onRemove }, /* @__PURE__ */ React2.createElement(Icon, { name: "trash-simple", size: 16 }))), /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onOpen, "aria-label": "Edit highlight on page " + page, style: { display: "flex", flexDirection: "column", gap: "6px", width: "100%", paddingRight: "10px" } }, quote ? /* @__PURE__ */ React2.createElement("span", { style: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "16px", lineHeight: 1.55, color: "var(--text-quote)" } }, "\u201C", quote, "\u201D") : null, note ? /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "15px", lineHeight: 1.55 } }, note) : null, names ? /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "12px", color: "var(--text-muted)" } }, names) : null));
  }
  function SwatchRow({ platform = "desktop", color, name, count, onCycle, onRename, onRemove, inputLabel = "Name", removeLabel, leading, swatchSize = 22 }) {
    return platform === "mobile" ? /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: leading ? "4px" : "6px" } }, leading, /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-ib", "aria-label": "Change colour of " + name, onClick: onCycle }, /* @__PURE__ */ React2.createElement("span", { style: { width: swatchSize + "px", height: swatchSize + "px", borderRadius: "50%", background: color, display: "block" } })), /* @__PURE__ */ React2.createElement(TextInput, { ground: "page", size: "lg", style: { flex: 1, minWidth: 0 }, value: name, "aria-label": inputLabel, onChange: onRename }), count !== void 0 ? /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "12px", color: "var(--text-muted)", width: "26px", textAlign: "right" } }, count) : null, /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-ib de-ib--muted", "aria-label": removeLabel || "Delete " + name, onClick: onRemove }, "\xD7")) : /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 0", borderBottom: "1px solid var(--divider)" } }, /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onCycle, "aria-label": "Change colour of " + name + ": pick the next colour", className: "de-iconbtn", style: { width: "44px" } }, /* @__PURE__ */ React2.createElement("span", { style: { width: "22px", height: "22px", borderRadius: "50%", background: color, display: "block" } })), /* @__PURE__ */ React2.createElement(TextInput, { value: name, onChange: onRename, "aria-label": inputLabel, style: { flex: 1, minWidth: 0, minHeight: "40px" } }), /* @__PURE__ */ React2.createElement("span", { style: { fontSize: "12px", color: "var(--text-muted)", width: "40px", textAlign: "right" } }, count), /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-iconbtn", "aria-label": removeLabel || "Delete " + name, onClick: onRemove }, "\xD7"));
  }
  function Scrim({ label = "Close", ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-scrim", "aria-label": label, ...rest });
  }
  function Drawer({ placement = "right", className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-drawer", placement === "bottom" && "de-drawer--bottom", className) }, children);
  }
  function DrawerHeader({ title, onClose, style }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-drawer__head", style }, /* @__PURE__ */ React2.createElement("div", { className: "de-drawer__title" }, title), /* @__PURE__ */ React2.createElement(IconButton, { label: "Close", onClick: onClose }));
  }
  function DrawerBody({ className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-drawer__body", className) }, children);
  }
  function Sheet({ label, className, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "dialog", "aria-label": label, ...rest, className: cx("de-sheet", className) }, children);
  }
  function SheetHeader({ title, onClose, actions, style }) {
    return /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", ...style } }, /* @__PURE__ */ React2.createElement("div", { className: "de-sheet__title" }, title), actions, onClose ? /* @__PURE__ */ React2.createElement(IconButton, { platform: "mobile", label: "Close", onClick: onClose }) : null);
  }
  function Dialog({ title, titleId = "dlg-title", children, actions, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-dialog", role: "alertdialog", "aria-labelledby": titleId, ...rest }, /* @__PURE__ */ React2.createElement("div", { id: titleId, className: "de-dialog__title" }, title), /* @__PURE__ */ React2.createElement("div", { className: "de-dialog__body" }, children), /* @__PURE__ */ React2.createElement("div", { className: "de-dialog__actions" }, actions));
  }
  function Toast({ message, placement = "fixed", actionLabel = "Undo", onAction, onDismiss }) {
    return /* @__PURE__ */ React2.createElement("div", { className: cx("de-toast", placement === "mobile" && "de-toast--mobile", placement === "tabbar" && "de-toast--tabbar"), role: "status" }, /* @__PURE__ */ React2.createElement("span", null, message), onAction ? /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onAction }, actionLabel) : null, /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-toast__x", "aria-label": "Dismiss", onClick: onDismiss }, "\xD7"));
  }
  function AccountButton({ initial = "Y", email, expanded, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", className: "de-acct", "aria-haspopup": "menu", "aria-expanded": !!expanded, ...rest }, /* @__PURE__ */ React2.createElement("span", { "aria-hidden": "true", className: "de-acct__avatar" }, initial), email, /* @__PURE__ */ React2.createElement(Icon, { name: "chevron-down", size: 12 }));
  }
  function Menu({ header, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-menu", role: "menu", ...rest }, header ? /* @__PURE__ */ React2.createElement("div", { className: "de-menu__head" }, header) : null, children);
  }
  function MenuItem({ href, children, ...rest }) {
    return href !== void 0 ? /* @__PURE__ */ React2.createElement("a", { role: "menuitem", className: "de-menuitem", href, ...rest }, children) : /* @__PURE__ */ React2.createElement("button", { type: "button", role: "menuitem", className: "de-menuitem", ...rest }, children);
  }
  function Popover({ label, style, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "dialog", "aria-label": label, className: "de-popover", style, ...rest }, children);
  }
  function SyncStatus({ offline, platform = "desktop", children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Sync status", ...rest, className: cx("de-sync", platform === "mobile" && "de-sync--mobile", offline && "de-sync--off") }, /* @__PURE__ */ React2.createElement("span", { className: "de-sync__dot" }), children);
  }
  function HintBar({ platform = "desktop", onDismiss, children }) {
    return /* @__PURE__ */ React2.createElement("div", { className: cx("de-hint", platform === "mobile" && "de-hint--mobile"), role: "note" }, /* @__PURE__ */ React2.createElement("span", { style: { flex: 1 } }, children), /* @__PURE__ */ React2.createElement(IconButton, { platform, label: "Dismiss tip", onClick: onDismiss }));
  }
  function ActionBanner({ children, action, style }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-banner", style }, /* @__PURE__ */ React2.createElement("span", { style: { flex: 1 } }, children), action);
  }
  function SelectionBar({ children }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-selbar" }, children);
  }
  function AppHeader({ title, backHref, backLabel = "Back", trailing }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-appheader" }, /* @__PURE__ */ React2.createElement("a", { className: "de-ib", href: backHref, "aria-label": backLabel }, /* @__PURE__ */ React2.createElement(Icon, { name: "back", size: 18, strokeWidth: 1.7 })), /* @__PURE__ */ React2.createElement("div", { className: "de-appheader__title" }, title), trailing);
  }
  function GraphCanvas({ framed, className, style, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("div", { ...rest, className: cx("de-canvas", framed && "de-canvas--framed", className), style }, children);
  }
  function CharacterNode({ x, y, name, first, job, initial, avatar, ring, opacity = 1, nodeProps, handleProps }) {
    return /* @__PURE__ */ React2.createElement("div", { style: { position: "absolute", left: x + "px", top: y + "px", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", zIndex: 3, opacity } }, /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": name, ...nodeProps, className: "de-node", style: { borderColor: ring } }, /* @__PURE__ */ React2.createElement("span", { className: "de-node__avatar", style: { background: avatar } }, initial), /* @__PURE__ */ React2.createElement("span", { className: "de-node__text" }, /* @__PURE__ */ React2.createElement("span", { className: "de-node__name" }, first), /* @__PURE__ */ React2.createElement("span", { className: "de-node__job" }, job))), /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Draw a tie from " + first + ": drag to another character, or press Enter to choose one", ...handleProps, className: "de-node__handle" }, /* @__PURE__ */ React2.createElement("span", null, /* @__PURE__ */ React2.createElement(Icon, { name: "arrow-right", size: 14 }))));
  }
  function NodePill({ x, y, ring, opacity = 1, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: "de-nodepill", style: { left: x + "px", top: y + "px", border: "2px solid " + ring, opacity } }, children);
  }
  function TieLabel({ x, y, color, opacity = 1, children, ...rest }) {
    return /* @__PURE__ */ React2.createElement("button", { type: "button", ...rest, className: "de-tielabel", style: { left: x, top: y, borderColor: color, opacity } }, children);
  }
  function CanvasToolbar({ zoom, onZoomIn, onZoomOut, onFit, onArrange }) {
    return /* @__PURE__ */ React2.createElement("div", { role: "toolbar", "aria-label": "Canvas view", className: "de-canvasbar" }, /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onZoomOut, "aria-label": "Zoom out", className: "de-iconbtn", style: { fontSize: "22px", textAlign: "center" } }, "\u2212"), /* @__PURE__ */ React2.createElement("span", { "aria-live": "polite", className: "de-canvasbar__zoom" }, zoom), /* @__PURE__ */ React2.createElement("button", { type: "button", onClick: onZoomIn, "aria-label": "Zoom in", className: "de-iconbtn", style: { fontSize: "22px", textAlign: "center" } }, "+"), /* @__PURE__ */ React2.createElement(Button, { variant: "subtle", onClick: onFit, style: { minHeight: "40px" } }, "Fit"), /* @__PURE__ */ React2.createElement(Button, { variant: "subtle", onClick: onArrange, style: { minHeight: "40px" } }, "Auto-arrange"));
  }
  function GraphControls({ hiddenDot, onTypes, onZoomIn, onZoomOut, onFit, onArrange }) {
    return /* @__PURE__ */ React2.createElement("div", { className: "de-graphctl" }, /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Tie types and visibility", onClick: onTypes, style: { fontSize: "12px", position: "relative" } }, "Ties", hiddenDot ? /* @__PURE__ */ React2.createElement("span", { "aria-hidden": "true", style: { position: "absolute", right: "5px", top: "5px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)" } }) : null), /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Zoom in", onClick: onZoomIn }, "+"), /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Zoom out", onClick: onZoomOut }, "\u2212"), /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Fit all characters", onClick: onFit, style: { fontSize: "12px" } }, "Fit"), /* @__PURE__ */ React2.createElement("button", { type: "button", "aria-label": "Auto-arrange", onClick: onArrange, style: { fontSize: "12px" } }, "Auto"));
  }

  // ds/src/index.js
  var api = Object.assign({}, components_exports, { Icon, ICONS, ICON_NAMES });
  window.DogEar = Object.assign(window.DogEar || {}, api);
})();
