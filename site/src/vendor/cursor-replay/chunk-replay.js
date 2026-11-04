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
var n = (t) => 1 - (1 - e(t, 0, 1)) ** 3, r = (t) => {
	let n = e(t, 0, 1);
	return n < .5 ? 4 * n * n * n : 1 - (-2 * n + 2) ** 3 / 2;
}, i = (e, t, n) => e + (t - e) * n, a = "\n.replay-root {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n  pointer-events: none;\n  background: var(--cr-surface);\n  opacity: 0;\n}\n.replay-root.fixed {\n  position: fixed;\n  z-index: 2147483000;\n}\n.replay-root.anchored {\n  position: absolute;\n  inset: auto;\n  z-index: 2147483000;\n}\n.replay-layer {\n  position: absolute;\n  box-sizing: border-box;\n  will-change: clip-path, opacity;\n}\n.replay-layer.rect {\n  z-index: 1;\n  background: var(--cr-fill);\n}\n.replay-layer.image {\n  z-index: 2;\n}\n.replay-layer.text {\n  z-index: 3;\n  overflow: hidden;\n  white-space: pre-wrap;\n  color: var(--cr-ink);\n  word-break: break-word;\n}\n.replay-layer.text::after {\n  content: '';\n  display: inline-block;\n  width: 1.5px;\n  height: 1em;\n  margin-left: 1px;\n  background: var(--cr-color);\n  vertical-align: -0.14em;\n  animation: replay-caret 1.1s ease-in-out infinite;\n}\n.replay-layer.image {\n  overflow: hidden;\n}\n.replay-layer.image img,\n.replay-layer.image svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  object-position: top center;\n}\n.replay-cursor {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 22px;\n  height: 24px;\n  will-change: transform;\n  filter: drop-shadow(0 2px 3px rgb(28 25 23 / 22%));\n  z-index: 4;\n}\n.replay-cursor svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n  overflow: visible;\n}\n.replay-badge {\n  position: absolute;\n  left: 0;\n  top: 0;\n  padding: 3px 7px;\n  border: 1px solid var(--cr-color);\n  border-radius: 5px;\n  background: var(--cr-ink);\n  color: var(--cr-surface);\n  font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  white-space: nowrap;\n  opacity: 0;\n  transform: translate(18px, 18px);\n  z-index: 5;\n}\n@keyframes replay-caret {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.18; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .replay-layer.text::after { display: none; }\n}\n", o = [
	"#ff4d6d",
	"#ffb703",
	"#2ec4b6",
	"#7b61ff",
	"#00a8e8",
	"#ff8a00",
	"#8bc34a",
	"#e84a9a"
];
function s() {
	if (typeof document > "u") return null;
	let e = document.createElement("div");
	e.dataset.cursorReplay = "", e.setAttribute("aria-hidden", "true");
	let t = e.attachShadow({ mode: "open" }), n = document.createElement("style");
	return n.textContent = a, t.appendChild(n), {
		host: e,
		shadow: t
	};
}
function c(e) {
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
function l(e) {
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
function u(e) {
	let t = e.getBoundingClientRect();
	return t.width >= 8 && t.height >= 6 ? t : null;
}
function d(t, n = 80, r = t === document.body) {
	if (typeof window > "u") return [];
	let i = {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight
	}, a = r ? i : t.getBoundingClientRect();
	if (a.right - a.left < 20 || a.bottom - a.top < 20) return [];
	let o = [], s = Array.from(t.querySelectorAll("*"));
	for (let e of s) {
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
		let r = u(e);
		if (!r || r.width >= (a.right - a.left) * .96 && r.height >= (a.bottom - a.top) * .96 || r.right < i.left - 20 || r.bottom < i.top - 20 || r.left > a.right + 20 || r.top > a.bottom + 20) continue;
		let s = r.left - a.left, d = r.top - a.top;
		if (s < -8 || d < -8 || s > a.right - a.left || d > a.bottom - a.top) continue;
		let f = c(n.backgroundColor)?.a ?? 0, p = parseFloat(n.borderTopWidth) > 0 || parseFloat(n.borderRightWidth) > 0 || parseFloat(n.borderBottomWidth) > 0 || parseFloat(n.borderLeftWidth) > 0, m = n.boxShadow !== "none", h = l(e), g = t === "img" || t === "svg" || t === "button" || t === "input";
		if (!(f < .04 && !p && !m && h.length === 0 && !g)) {
			if (f >= .04 || p || m) {
				let e = p ? `${n.borderTopWidth} ${n.borderTopStyle} ${n.borderTopColor}` : void 0;
				o.push({
					kind: "rect",
					x: s,
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
					x: s,
					y: d,
					width: r.width,
					height: r.height,
					src: t.currentSrc || t.src,
					radius: n.borderRadius === "0px" ? void 0 : n.borderRadius
				});
			} else t === "svg" && o.push({
				kind: "image",
				x: s,
				y: d,
				width: r.width,
				height: r.height,
				svg: e.outerHTML
			});
		}
	}
	let d = (e) => (e.kind === "image" ? 3 : e.kind === "text" ? 2 : 1) * 1e5 + e.width * e.height;
	return o.sort((e, t) => d(t) - d(e)).slice(0, e(n, 8, 240)).sort((e, t) => e.y - t.y || e.x - t.x);
}
function f(e) {
	return e === "cross" ? "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3V21M3 12H21\" stroke=\"#fffdf8\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M12 3V21M3 12H21\" stroke=\"var(--cr-color)\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>" : e === "ibeam" ? "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8 4H10.5Q12 4 12 5.5Q12 4 13.5 4H16M12 5.5V18.5M8 20H10.5Q12 20 12 18.5Q12 20 13.5 20H16\" fill=\"none\" stroke=\"#fffdf8\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><path d=\"M8 4H10.5Q12 4 12 5.5Q12 4 13.5 4H16M12 5.5V18.5M8 20H10.5Q12 20 12 18.5Q12 20 13.5 20H16\" fill=\"none\" stroke=\"var(--cr-color)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>" : "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 2.5L20 11L11.5 12.4L14.5 21L10.7 22.2L7.8 13.5L4 16.5Z\" fill=\"var(--cr-color)\" stroke=\"#fffdf8\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/></svg>";
}
function p(e) {
	return e.kind === "text" ? "ibeam" : e.kind === "rect" || e.kind === "image" ? "cross" : "arrow";
}
function m(t = document.body, a = {}) {
	let c = a.fullscreen ?? t === document.body, l = c && (a.anchor ?? "fixed") === "viewport", u = e(a.duration ?? 6500, 1800, 2e4), m = e(Math.floor(a.cursors ?? 6), 2, 10), g = a.colors?.length ? a.colors : o, _ = a.ink ?? "#1c1917", v = a.surface ?? "#fffaf0", y = a.reducedMotion ?? "auto", b = null, x = null, S = 0, C = !1, w = !1, T = null, E = null, D = "", O = !1, k = "", A = "", j = !1, M = [], N = [], P = [], F = [], I = 0, L = 0, R = {
		x: 0,
		y: 0
	}, z = null, B = () => {
		S && cancelAnimationFrame(S), S = 0, z && window.removeEventListener("keydown", z, !0), z = null, b?.host.remove(), b = null, x = null, N = [], P = [], F = [], M = [], j &&= (document.documentElement.style.overflow = k, document.body.style.pointerEvents = A, !1), O &&= (t.style.position = D, !1), C = !1;
	}, V = () => {
		B();
		let e = T;
		T = null, E = null;
		try {
			a.onComplete?.();
		} finally {
			e?.();
		}
	}, H = () => {
		if (!C) return;
		cancelAnimationFrame(S), S = 0, B();
		let e = T;
		T = null, E = null, e?.();
	};
	return {
		get playing() {
			return C;
		},
		play: () => {
			if (w) return Promise.resolve();
			if (E) return E;
			if (y !== "play" && (y === "skip" || h())) return Promise.resolve();
			let o = d(t, a.maxTargets, c);
			if (o.length === 0 || (c || window.getComputedStyle(t).position === "static" && (D = t.style.position, t.style.position = "relative", O = !0), c && a.lockScroll && (k = document.documentElement.style.overflow, A = document.body.style.pointerEvents, document.documentElement.style.overflow = "hidden", document.body.style.pointerEvents = "none", j = !0), b = s(), !b)) return Promise.resolve();
			x = document.createElement("div"), x.className = `replay-root${c ? l ? " anchored" : " fixed" : ""}`, l && (x.style.top = `${window.scrollY}px`, x.style.left = "0", x.style.width = "100vw", x.style.height = "100vh"), x.style.setProperty("--cr-surface", v), x.style.setProperty("--cr-ink", _), b.shadow.appendChild(x), c ? document.body.appendChild(b.host) : t.appendChild(b.host);
			let B = c ? {
				left: 0,
				top: 0,
				width: window.innerWidth,
				height: window.innerHeight
			} : t.getBoundingClientRect();
			R = {
				x: B.width / 2,
				y: B.height / 2
			};
			let U = [...o].sort((e, t) => t.width * t.height - e.width * e.height);
			N = U.map((e, t) => {
				let n = document.createElement("div");
				if (n.className = `replay-layer ${e.kind}`, n.style.left = `${e.x}px`, n.style.top = `${e.y}px`, n.style.width = `${e.width}px`, n.style.height = `${e.height}px`, n.style.setProperty("--cr-color", g[t % g.length]), e.radius && (n.style.borderRadius = e.radius), e.kind === "rect") n.style.setProperty("--cr-fill", e.fill ?? "transparent"), e.border && (n.style.border = e.border), n.style.outline = `1.5px solid ${g[t % g.length]}`, n.style.outlineOffset = "0", n.style.clipPath = "inset(0 100% 100% 0)";
				else if (e.kind === "image") {
					if (e.svg) n.innerHTML = e.svg;
					else if (e.src) {
						let t = document.createElement("img");
						t.src = e.src, t.alt = "", t.loading = "eager", n.appendChild(t);
					}
					n.style.opacity = "0";
				} else n.textContent = e.text ?? "", n.style.fontFamily = e.font ?? "inherit", n.style.fontSize = `${e.fontSize ?? 16}px`, n.style.fontWeight = e.fontWeight ?? "400", e.lineHeight && (n.style.lineHeight = e.lineHeight), e.letterSpacing && (n.style.letterSpacing = e.letterSpacing), e.textAlign && (n.style.textAlign = e.textAlign), n.style.color = e.color ?? _, n.style.opacity = "0", n.style.clipPath = "inset(0 100% 0 0)";
				return x?.appendChild(n), n;
			}), P = Array.from({ length: m }, (e, t) => {
				let n = document.createElement("div");
				return n.className = "replay-cursor", n.style.setProperty("--cr-color", g[t % g.length]), n.style.opacity = "0", x?.appendChild(n), n;
			}), F = Array.from({ length: m }, () => {
				let e = document.createElement("div");
				return e.className = "replay-badge", x?.appendChild(e), e;
			});
			let W = Math.ceil(U.length / m), G = e((u - 800 - 600) / Math.max(1, W), 180, 900);
			L = 700, M = U.map((e, t) => {
				let n = t % m, r = Math.floor(t / m), i = n / m * G * .7, a = L + r * G + i;
				return {
					layer: e,
					cursor: n,
					start: a,
					moveEnd: a + G * .7,
					actionStart: a + G * .22,
					actionEnd: a + G * .88
				};
			}), I = M.reduce((e, t) => Math.max(e, t.actionEnd), L) + 900, z = (e) => {
				e.key === "Escape" && H();
			}, window.addEventListener("keydown", z, !0);
			let K = (t, n) => {
				let a = t / m * Math.PI * 2, o = {
					x: R.x + Math.cos(a) * 54,
					y: R.y + Math.sin(a) * 40
				};
				if (n < L) {
					let t = e(n / L, 0, 1);
					return {
						x: R.x + Math.cos(a + t * Math.PI * 1.5) * (18 + t * 36),
						y: R.y + Math.sin(a + t * Math.PI * 1.5) * (12 + t * 28)
					};
				}
				let s = o;
				for (let a of M) {
					if (a.cursor !== t) continue;
					if (n < a.start) break;
					let o = a.layer, c = r(e((n - a.start) / Math.max(1, a.moveEnd - a.start), 0, 1));
					if (s = {
						x: i(s.x, o.x, c),
						y: i(s.y, o.y, c)
					}, n < a.moveEnd) break;
				}
				return s;
			}, q = (e, t) => {
				let n = null;
				for (let r of M) if (r.cursor === e) {
					if (t < r.actionStart) break;
					if (t <= r.actionEnd) {
						n = r;
						break;
					}
				}
				return n;
			}, J = performance.now();
			x.style.opacity = "0", a.onStart?.(), C = !0;
			let Y = (t) => {
				if (!x) return;
				let r = e(t - J, 0, I), i = e(r / 350, 0, 1), a = 1 - e((r - (I - 600)) / 600, 0, 1);
				x.style.opacity = String(Math.min(i, a)), M.forEach((t, i) => {
					let a = N[i], o = t.layer, s = e((r - t.actionStart) / Math.max(1, t.actionEnd - t.actionStart), 0, 1);
					if (r < t.actionStart) return;
					let c = n(s);
					o.kind === "text" ? (a.style.opacity = s > 0 ? "1" : "0", a.style.clipPath = `inset(0 ${100 - c * 100}% 0 0)`, a.style.transform = `translateY(${(1 - c) * 4}px)`) : o.kind === "image" ? (a.style.opacity = String(c), a.style.clipPath = `inset(0 0 ${100 - c * 100}% 0)`) : (a.style.clipPath = `inset(0 ${100 - c * 100}% ${100 - c * 100}% 0)`, s >= 1 && (a.style.outline = "none"));
				}), P.forEach((t, n) => {
					let i = K(n, r), a = q(n, r);
					if (!a) {
						let e = Math.sin(r / 520 + n * 1.7) * 2.4;
						i.x += Math.cos(r / 470 + n) * e, i.y += Math.sin(r / 610 + n * 1.3) * e;
					}
					let o = a ? p(a.layer) : "arrow";
					t.dataset.shape !== o && (t.dataset.shape = o, t.innerHTML = f(o)), t.style.transform = `translate3d(${i.x}px, ${i.y}px, 0)`, t.style.opacity = r < L ? String(e(r / 180, 0, 1)) : "1";
					let s = F[n];
					a && a.layer.kind !== "text" ? (s.textContent = `${Math.round(a.layer.width)} × ${Math.round(a.layer.height)}`, s.style.transform = `translate(${i.x + 18}px, ${i.y + 18}px)`, s.style.opacity = "1") : s.style.opacity = "0";
				}), r >= I ? V() : S = requestAnimationFrame(Y);
			};
			return E = new Promise((e) => {
				T = e, S = requestAnimationFrame(Y);
			}), E;
		},
		cancel: H,
		destroy: () => {
			w = !0, H(), B();
		}
	};
}
function h() {
	return typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export { r as a, e as i, m as n, n as o, t as r, i as s, d as t };

//# sourceMappingURL=chunk-replay.js.map