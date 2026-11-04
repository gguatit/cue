// src/timeline.ts
var e = (e, t, n) => Math.min(n, Math.max(t, e));
function t(t, n, r) {
	let i = Math.max(0, Math.floor(t));
	if (i === 0) return [];
	let a = e(e(n, 600, 8e3) / i, 70, 260), o = e(Math.floor(r), 1, 4);
	return Array.from({ length: i }, (e, t) => {
		let n = t * a;
		return {
			index: t,
			cursor: t % o,
			moveStart: n,
			moveEnd: n + a * .55,
			boxStart: n + a * .4,
			textStart: n + a * .65
		};
	});
}
var n = (t) => 1 - (1 - e(t, 0, 1)) ** 3, r = (e, t, n) => e + (t - e) * n, i = "\n.replay-root {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n  pointer-events: none;\n  background: var(--cr-surface);\n  opacity: 0;\n}\n.replay-root.fixed {\n  position: fixed;\n  z-index: 2147483000;\n}\n.replay-layer {\n  position: absolute;\n  box-sizing: border-box;\n  will-change: clip-path, opacity;\n}\n.replay-layer.rect {\n  z-index: 1;\n  background: var(--cr-fill);\n}\n.replay-layer.image {\n  z-index: 2;\n}\n.replay-layer.text {\n  z-index: 3;\n  overflow: hidden;\n  white-space: pre-wrap;\n  color: var(--cr-ink);\n  word-break: break-word;\n}\n.replay-layer.text::after {\n  content: '';\n  display: inline-block;\n  width: 1.5px;\n  height: 1em;\n  margin-left: 1px;\n  background: var(--cr-color);\n  vertical-align: -0.14em;\n  animation: replay-caret 0.8s steps(1) infinite;\n}\n.replay-layer.image {\n  overflow: hidden;\n}\n.replay-layer.image img,\n.replay-layer.image svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  object-position: top center;\n}\n.replay-cursor {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 22px;\n  height: 24px;\n  will-change: transform;\n  filter: drop-shadow(0 2px 3px rgb(28 25 23 / 22%));\n  z-index: 4;\n}\n.replay-cursor svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n  overflow: visible;\n}\n.replay-badge {\n  position: absolute;\n  left: 0;\n  top: 0;\n  padding: 3px 7px;\n  border: 1px solid var(--cr-color);\n  border-radius: 5px;\n  background: var(--cr-ink);\n  color: var(--cr-surface);\n  font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  white-space: nowrap;\n  opacity: 0;\n  transform: translate(18px, 18px);\n  z-index: 5;\n}\n@keyframes replay-caret {\n  50% { opacity: 0; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .replay-layer.text::after { display: none; }\n}\n", a = [
	"#ff4d6d",
	"#ffb703",
	"#2ec4b6",
	"#7b61ff",
	"#00a8e8",
	"#ff8a00",
	"#8bc34a",
	"#e84a9a"
];
function o() {
	if (typeof document > "u") return null;
	let e = document.createElement("div");
	e.dataset.cursorReplay = "", e.setAttribute("aria-hidden", "true");
	let t = e.attachShadow({ mode: "open" }), n = document.createElement("style");
	return n.textContent = i, t.appendChild(n), {
		host: e,
		shadow: t
	};
}
function s(e) {
	let t = e.match(/rgba?\(([^)]+)\)/i);
	if (!t) return null;
	let n = t[1].split(/[,\s/]+/).filter(Boolean), r = Number(n[0]), i = Number(n[1]), a = Number(n[2]), o = n[3] === void 0 ? 1 : n[3].endsWith("%") ? Number(n[3].slice(0, -1)) / 100 : Number(n[3]);
	return [
		r,
		i,
		a,
		o
	].some((e) => !Number.isFinite(e)) ? null : {
		r,
		g: i,
		b: a,
		a: o
	};
}
function c(e) {
	let t = [];
	for (let n of Array.from(e.childNodes)) {
		if (n.nodeType !== Node.TEXT_NODE) continue;
		let e = (n.textContent ?? "").replace(/\s+/g, " ").trim();
		if (!e) continue;
		let r = document.createRange();
		r.selectNodeContents(n);
		let i = r.getBoundingClientRect();
		i.width < 4 || i.height < 4 || t.push({
			text: e.slice(0, 120),
			rect: i
		});
	}
	if (t.length === 0 && e.childElementCount === 0) {
		let n = (e.textContent ?? "").replace(/\s+/g, " ").trim(), r = e.getBoundingClientRect();
		n && r.width >= 4 && r.height >= 4 && t.push({
			text: n.slice(0, 120),
			rect: r
		});
	}
	return t;
}
function l(e) {
	let t = e.getBoundingClientRect();
	return t.width >= 8 && t.height >= 6 ? t : null;
}
function u(t, n = 80, r = t === document.body) {
	if (typeof window > "u") return [];
	let i = {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight
	}, a = r ? i : t.getBoundingClientRect();
	if (a.right - a.left < 20 || a.bottom - a.top < 20) return [];
	let o = [], u = Array.from(t.querySelectorAll("*"));
	for (let e of u) {
		if (e.closest("[data-cursor-replay]")) continue;
		let t = e.tagName.toLowerCase();
		if ([
			"script",
			"style",
			"noscript",
			"template",
			"head",
			"meta",
			"link",
			"br"
		].includes(t)) continue;
		let n = window.getComputedStyle(e);
		if (n.display === "none" || n.visibility === "hidden" || n.opacity === "0") continue;
		let r = l(e);
		if (!r || r.right < i.left - 20 || r.bottom < i.top - 20 || r.left > a.right + 20 || r.top > a.bottom + 20) continue;
		let u = r.left - a.left, d = r.top - a.top;
		if (u < -8 || d < -8 || u > a.right - a.left || d > a.bottom - a.top) continue;
		let f = s(n.backgroundColor)?.a ?? 0, p = parseFloat(n.borderTopWidth) > 0 || parseFloat(n.borderRightWidth) > 0 || parseFloat(n.borderBottomWidth) > 0 || parseFloat(n.borderLeftWidth) > 0, m = n.boxShadow !== "none", h = c(e), g = t === "img" || t === "svg" || t === "button" || t === "input";
		if (!(f < .04 && !p && !m && h.length === 0 && !g)) {
			if (f >= .04 || p || m) {
				let e = p ? `${n.borderTopWidth} ${n.borderTopStyle} ${n.borderTopColor}` : void 0;
				o.push({
					kind: "rect",
					x: u,
					y: d,
					width: r.width,
					height: r.height,
					fill: f >= .04 ? n.backgroundColor : "transparent",
					border: e,
					radius: n.borderRadius === "0px" ? void 0 : n.borderRadius
				});
			}
			for (let e of h) o.push({
				kind: "text",
				x: e.rect.left - a.left,
				y: e.rect.top - a.top,
				width: e.rect.width,
				height: e.rect.height,
				text: e.text,
				font: n.fontFamily,
				fontSize: parseFloat(n.fontSize) || 16,
				fontWeight: n.fontWeight,
				lineHeight: n.lineHeight === "normal" ? void 0 : n.lineHeight,
				letterSpacing: n.letterSpacing === "normal" ? void 0 : n.letterSpacing,
				textAlign: n.textAlign,
				color: n.color
			});
			if (t === "img") {
				let t = e;
				o.push({
					kind: "image",
					x: u,
					y: d,
					width: r.width,
					height: r.height,
					src: t.currentSrc || t.src,
					radius: n.borderRadius === "0px" ? void 0 : n.borderRadius
				});
			} else t === "svg" && o.push({
				kind: "image",
				x: u,
				y: d,
				width: r.width,
				height: r.height,
				svg: e.outerHTML
			});
		}
	}
	let d = (e) => (e.kind === "image" ? 3 : e.kind === "text" ? 2 : 1) * 1e5 + e.width * e.height;
	return o.sort((e, t) => d(t) - d(e)).slice(0, e(n, 8, 120)).sort((e, t) => e.y - t.y || e.x - t.x);
}
function d(e) {
	return e === "cross" ? "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3V21M3 12H21\" stroke=\"#fffdf8\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M12 3V21M3 12H21\" stroke=\"var(--cr-color)\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>" : e === "ibeam" ? "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8 4H10.5Q12 4 12 5.5Q12 4 13.5 4H16M12 5.5V18.5M8 20H10.5Q12 20 12 18.5Q12 20 13.5 20H16\" fill=\"none\" stroke=\"#fffdf8\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><path d=\"M8 4H10.5Q12 4 12 5.5Q12 4 13.5 4H16M12 5.5V18.5M8 20H10.5Q12 20 12 18.5Q12 20 13.5 20H16\" fill=\"none\" stroke=\"var(--cr-color)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>" : "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 2.5L20 11L11.5 12.4L14.5 21L10.7 22.2L7.8 13.5L4 16.5Z\" fill=\"var(--cr-color)\" stroke=\"#fffdf8\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/></svg>";
}
function f(e) {
	return e.kind === "text" ? "ibeam" : e.kind === "rect" || e.kind === "image" ? "cross" : "arrow";
}
function p(t = document.body, i = {}) {
	let s = i.fullscreen ?? t === document.body, c = e(i.duration ?? 6500, 1800, 2e4), l = e(Math.floor(i.cursors ?? 6), 2, 10), p = i.colors?.length ? i.colors : a, h = i.ink ?? "#1c1917", g = i.surface ?? "#fffaf0", _ = i.reducedMotion ?? "auto", v = null, y = null, b = 0, x = !1, S = !1, C = null, w = null, T = "", E = !1, D = "", O = "", k = !1, A = [], j = [], M = [], N = [], P = 0, F = 0, I = {
		x: 0,
		y: 0
	}, L = null, R = () => {
		b && cancelAnimationFrame(b), b = 0, L && window.removeEventListener("keydown", L, !0), L = null, v?.host.remove(), v = null, y = null, j = [], M = [], N = [], A = [], k &&= (document.documentElement.style.overflow = D, document.body.style.pointerEvents = O, !1), E &&= (t.style.position = T, !1), x = !1;
	}, z = () => {
		R();
		let e = C;
		C = null, w = null;
		try {
			i.onComplete?.();
		} finally {
			e?.();
		}
	}, B = () => {
		if (!x) return;
		cancelAnimationFrame(b), b = 0, R();
		let e = C;
		C = null, w = null, e?.();
	};
	return {
		get playing() {
			return x;
		},
		play: () => {
			if (S) return Promise.resolve();
			if (w) return w;
			if (_ !== "play" && (_ === "skip" || m())) return Promise.resolve();
			let a = u(t, i.maxTargets, s);
			if (a.length === 0 || (s || window.getComputedStyle(t).position === "static" && (T = t.style.position, t.style.position = "relative", E = !0), s && (D = document.documentElement.style.overflow, O = document.body.style.pointerEvents, document.documentElement.style.overflow = "hidden", document.body.style.pointerEvents = "none", k = !0), v = o(), !v)) return Promise.resolve();
			y = document.createElement("div"), y.className = `replay-root${s ? " fixed" : ""}`, y.style.setProperty("--cr-surface", g), y.style.setProperty("--cr-ink", h), v.shadow.appendChild(y), s ? document.body.appendChild(v.host) : t.appendChild(v.host);
			let R = s ? {
				left: 0,
				top: 0,
				width: window.innerWidth,
				height: window.innerHeight
			} : t.getBoundingClientRect();
			I = {
				x: R.width / 2,
				y: R.height / 2
			};
			let V = (e) => {
				let t = [...e].sort((e, t) => e.y - t.y || e.x - t.x), n = Math.max(1, Math.ceil(t.length / l)), r = Array.from({ length: l }, () => []);
				t.forEach((e, t) => {
					r[Math.min(l - 1, Math.floor(t / n))].push(e);
				});
				let i = [];
				for (let e = 0; i.length < t.length; e++) for (let t of r) t[e] && i.push(t[e]);
				return i;
			}, H = a.filter((e) => e.kind === "rect" || e.kind === "image"), U = a.filter((e) => e.kind === "text"), W = [...V(H), ...V(U)];
			j = W.map((e, t) => {
				let n = document.createElement("div");
				if (n.className = `replay-layer ${e.kind}`, n.style.left = `${e.x}px`, n.style.top = `${e.y}px`, n.style.width = `${e.width}px`, n.style.height = `${e.height}px`, n.style.setProperty("--cr-color", p[t % p.length]), e.radius && (n.style.borderRadius = e.radius), e.kind === "rect") n.style.setProperty("--cr-fill", e.fill ?? "transparent"), e.border && (n.style.border = e.border), n.style.outline = `1.5px solid ${p[t % p.length]}`, n.style.outlineOffset = "0", n.style.clipPath = "inset(0 100% 100% 0)";
				else if (e.kind === "image") {
					if (e.svg) n.innerHTML = e.svg;
					else if (e.src) {
						let t = document.createElement("img");
						t.src = e.src, t.alt = "", t.loading = "eager", n.appendChild(t);
					}
					n.style.opacity = "0";
				} else n.style.fontFamily = e.font ?? "inherit", n.style.fontSize = `${e.fontSize ?? 16}px`, n.style.fontWeight = e.fontWeight ?? "400", e.lineHeight && (n.style.lineHeight = e.lineHeight), e.letterSpacing && (n.style.letterSpacing = e.letterSpacing), e.textAlign && (n.style.textAlign = e.textAlign), n.style.color = e.color ?? h, n.style.opacity = "0";
				return y?.appendChild(n), n;
			}), M = Array.from({ length: l }, (e, t) => {
				let n = document.createElement("div");
				return n.className = "replay-cursor", n.style.setProperty("--cr-color", p[t % p.length]), n.style.opacity = "0", y?.appendChild(n), n;
			}), N = Array.from({ length: l }, () => {
				let e = document.createElement("div");
				return e.className = "replay-badge", y?.appendChild(e), e;
			});
			let G = Math.ceil(W.length / l), K = e((c - 800 - 600) / Math.max(1, G), 220, 560);
			F = 800, P = F + G * K + 600, A = W.map((e, t) => {
				let n = F + Math.floor(t / l) * K;
				return {
					layer: e,
					cursor: t % l,
					start: n,
					moveEnd: n + K * .36,
					actionStart: n + K * .36,
					actionEnd: n + K * .9
				};
			}), L = (e) => {
				e.key === "Escape" && B();
			}, window.addEventListener("keydown", L, !0);
			let q = (t, i) => {
				let a = t / l * Math.PI * 2, o = {
					x: I.x + Math.cos(a) * 54,
					y: I.y + Math.sin(a) * 40
				};
				if (i < F) {
					let t = e(i / F, 0, 1);
					return {
						x: I.x + Math.cos(a + t * Math.PI * 1.5) * (18 + t * 36),
						y: I.y + Math.sin(a + t * Math.PI * 1.5) * (12 + t * 28)
					};
				}
				let s = o;
				for (let a of A) {
					if (a.cursor !== t) continue;
					if (i < a.start) break;
					let o = a.layer, c = n(e((i - a.start) / Math.max(1, a.moveEnd - a.start), 0, 1));
					if (s = {
						x: r(s.x, o.x, c),
						y: r(s.y, o.y, c)
					}, i < a.moveEnd) break;
				}
				return s;
			}, J = (e, t) => {
				let n = null;
				for (let r of A) if (r.cursor === e) {
					if (t < r.actionStart) break;
					if (t <= r.actionEnd) {
						n = r;
						break;
					}
				}
				return n;
			}, Y = performance.now();
			y.style.opacity = "0", i.onStart?.(), x = !0;
			let X = (t) => {
				if (!y) return;
				let n = e(t - Y, 0, P), r = e(n / 250, 0, 1), i = 1 - e((n - (P - 500)) / 500, 0, 1);
				y.style.opacity = String(Math.min(r, i)), A.forEach((t, r) => {
					let i = j[r], a = t.layer, o = e((n - t.actionStart) / Math.max(1, t.actionEnd - t.actionStart), 0, 1);
					if (!(n < t.actionStart)) {
						if (a.kind === "text") {
							let e = a.text ?? "";
							i.textContent = e.slice(0, Math.floor(e.length * o)), i.style.opacity = "1";
						} else a.kind === "image" ? (i.style.opacity = String(o), i.style.clipPath = `inset(0 0 ${100 - o * 100}% 0)`) : (i.style.clipPath = `inset(0 ${100 - o * 100}% ${100 - o * 100}% 0)`, o >= 1 && (i.style.outline = "none"));
					}
				}), M.forEach((t, r) => {
					let i = q(r, n), a = J(r, n), o = a ? f(a.layer) : "arrow";
					t.dataset.shape !== o && (t.dataset.shape = o, t.innerHTML = d(o)), t.style.transform = `translate3d(${i.x}px, ${i.y}px, 0)`, t.style.opacity = n < F ? String(e(n / 180, 0, 1)) : "1";
					let s = N[r];
					a && a.layer.kind !== "text" ? (s.textContent = `${Math.round(a.layer.width)} × ${Math.round(a.layer.height)}`, s.style.transform = `translate(${i.x + 18}px, ${i.y + 18}px)`, s.style.opacity = "1") : s.style.opacity = "0";
				}), n >= P ? z() : b = requestAnimationFrame(X);
			};
			return w = new Promise((e) => {
				C = e, b = requestAnimationFrame(X);
			}), w;
		},
		cancel: B,
		destroy: () => {
			S = !0, B(), R();
		}
	};
}
function m() {
	return typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export { n as a, e as i, p as n, r as o, t as r, u as t };

//# sourceMappingURL=chunk-replay.js.map