/**
 * glimmEngine.ts
 * 
 * WebGL Iridescent Sweep Transition Engine.
 * 
 * Ported and adapted for Vue 3 and ciervo-ui.
 * Based on the original work of Noman Ijaz (glimm).
 * 
 * Original License: MIT License
 * Copyright (c) 2024-2026 Noman Ijaz
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

// ==========================================
// 1. OKLCH & COLOR MATH
// ==========================================

export const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

export const linearToSrgb = (c: number): number =>
  c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

export const linearRgbToOklab = (r: number, g: number, b: number): [number, number, number] => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  ];
};

export const oklabToLinearRgb = (L: number, a: number, b: number): [number, number, number] => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
};

export interface OklchColor {
  L: number;
  C: number;
  H: number;
}

export const rgbToOklch = (rgb: [number, number, number]): OklchColor => {
  const [L, a, b] = linearRgbToOklab(
    srgbToLinear(rgb[0]),
    srgbToLinear(rgb[1]),
    srgbToLinear(rgb[2])
  );
  return { L, C: Math.sqrt(a * a + b * b), H: Math.atan2(b, a) };
};

export const oklchToRgb = ({ L, C, H }: OklchColor): [number, number, number] => {
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const [lr, lg, lb] = oklabToLinearRgb(L, a, b);
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  return [
    clamp01(linearToSrgb(lr)),
    clamp01(linearToSrgb(lg)),
    clamp01(linearToSrgb(lb))
  ];
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const lerpHueShortest = (h1: number, h2: number, t: number): number => {
  let diff = h2 - h1;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return h1 + diff * t;
};

const lerpOklch = (a: OklchColor, b: OklchColor, t: number): OklchColor => {
  const EPS = 1e-4;
  const ha = a.C < EPS ? b.H : a.H;
  const hb = b.C < EPS ? a.H : b.H;
  return {
    L: a.L + (b.L - a.L) * t,
    C: a.C + (b.C - a.C) * t,
    H: lerpHueShortest(ha, hb, t)
  };
};

export function sampleChainRgb(anchors: OklchColor[], samples: number): [number, number, number][] {
  if (anchors.length === 0) return [];
  if (anchors.length === 1) {
    const rgb = oklchToRgb(anchors[0]);
    return Array.from({ length: samples }, () => rgb);
  }
  const out: [number, number, number][] = [];
  const K = anchors.length;
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const seg = t * (K - 1);
    const segI = Math.min(K - 2, Math.floor(seg));
    const segT = seg - segI;
    out.push(oklchToRgb(lerpOklch(anchors[segI], anchors[segI + 1], segT)));
  }
  return out;
}

// ==========================================
// 2. COSINE PALETTE FITTING (INIGO QUILEZ FORMULA)
// ==========================================

export interface CosinePalette {
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
}

function solve3x3(M: number[][], v: number[]): [number, number, number] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) < 1e-9) return null;
  const col = (i: number) => M.map((row, r) => row.map((x, c) => (c === i ? v[r] : x)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

export function fitCosinePaletteToSamples(samples: [number, number, number][]): CosinePalette {
  const N = samples.length;
  const C = 0.5;
  const ts = samples.map((_, i) => i / (N - 1));
  const cosV = ts.map((t) => Math.cos(2 * Math.PI * C * t));
  const sinV = ts.map((t) => Math.sin(2 * Math.PI * C * t));
  const sCos = cosV.reduce((s, v) => s + v, 0);
  const sSin = sinV.reduce((s, v) => s + v, 0);
  const sCosCos = cosV.reduce((s, v) => s + v * v, 0);
  const sSinSin = sinV.reduce((s, v) => s + v * v, 0);
  const sCosSin = cosV.reduce((s, v, i) => s + v * sinV[i], 0);
  const M = [
    [N, sCos, sSin],
    [sCos, sCosCos, sCosSin],
    [sSin, sCosSin, sSinSin]
  ];
  const fitChannel = (ch: 0 | 1 | 2) => {
    const ys = samples.map((c) => c[ch]);
    const sY = ys.reduce((s, y) => s + y, 0);
    const sYCos = ys.reduce((s, y, i) => s + y * cosV[i], 0);
    const sYSin = ys.reduce((s, y, i) => s + y * sinV[i], 0);
    const sol = solve3x3(M, [sY, sYCos, sYSin]);
    if (!sol) return { a: sY / N, b: 0, d: 0 };
    const [a, alpha, beta] = sol;
    const b = Math.sqrt(alpha * alpha + beta * beta);
    const d = (Math.atan2(-beta, alpha) / (2 * Math.PI) + 1) % 1;
    return { a, b, d };
  };
  const r = fitChannel(0);
  const g = fitChannel(1);
  const bl = fitChannel(2);
  return {
    a: [r.a, g.a, bl.a],
    b: [r.b, g.b, bl.b],
    c: [C, C, C],
    d: [r.d, g.d, bl.d]
  };
}

export const accentPair = (hexA: string, hexB: string): CosinePalette => {
  const samples = sampleChainRgb(
    [rgbToOklch(hexToRgb(hexA)), rgbToOklch(hexToRgb(hexB))],
    17
  );
  samples[0] = hexToRgb(hexA);
  samples[samples.length - 1] = hexToRgb(hexB);
  return fitCosinePaletteToSamples(samples);
};

export const accentChain = (hexes: string[]): CosinePalette => {
  if (hexes.length === 0) return accentPair("#6155F5", "#00C0E8");
  if (hexes.length === 1) {
    const v = hexToRgb(hexes[0]);
    return { a: v, b: [0, 0, 0], c: [1, 1, 1], d: [0, 0, 0] };
  }
  const anchors = hexes.map((h) => rgbToOklch(hexToRgb(h)));
  const samples = sampleChainRgb(anchors, 17);
  return fitCosinePaletteToSamples(samples);
};

/**
 * Creates a flat solid color cosine palette (zero chromatic dispersion).
 */
export const createSolidPalette = (hex: string): CosinePalette => {
  const rgb = hexToRgb(hex);
  return {
    a: rgb,
    b: [0, 0, 0],
    c: [1, 1, 1],
    d: [0, 0, 0]
  };
};

// ==========================================
// 3. PALETTE CATALOGUE
// ==========================================

export const GLIMM_PALETTES: Record<string, CosinePalette> = {
  // Glimm original presets
  prism: accentChain(["#00C0E8", "#6155F5", "#CB30E0"]),
  berry: accentChain(["#FF2D55", "#CB30E0"]),
  lagoon: accentChain(["#0088FF", "#00C0E8", "#34C759"]),
  citrus: accentChain(["#34C759", "#FFCC00", "#FF8D28"]),
  azure: accentChain(["#00C0E8", "#0088FF", "#6155F5"]),
  ember: accentChain(["#FFCC00", "#FF8D28", "#FF2D55"]),

  // ciervo-ui bespoke additions
  ciervo: accentChain(["#f97316", "#fb923c", "#ea580c"]),
  neon: accentChain(["#00f5d4", "#7b2cbf", "#f72585"]),
  aurora: accentChain(["#05ffa1", "#00bbf9", "#4361ee"]),
  monochrome: accentChain(["#ffffff", "#d1d5db", "#9ca3af"]),

  // Solid presets
  solidOrange: createSolidPalette("#f97316"),
  solidBlue: createSolidPalette("#3b82f6"),
  solidWhite: createSolidPalette("#ffffff")
};

export function resolvePalette(p: string | CosinePalette | undefined): CosinePalette {
  if (!p) return GLIMM_PALETTES.prism;
  if (typeof p === "string") return GLIMM_PALETTES[p] ?? GLIMM_PALETTES.prism;
  return p;
}

// ==========================================
// 4. EASINGS
// ==========================================

export type EasingFunction = (t: number) => number;

export const EASINGS: Record<string, EasingFunction> = {
  linear: (t) => t,
  ease: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t) => t * t * t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  snap: (t) => 1 - Math.pow(1 - t, 6),
  back: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // Custom spring easing modeled after ciervo-ui button physical spring
  spring: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }
};

export function resolveEasing(e: string | EasingFunction | undefined): EasingFunction {
  if (!e) return EASINGS.easeInOutCubic;
  if (typeof e === "string") return EASINGS[e] ?? EASINGS.easeInOutCubic;
  return e;
}

// ==========================================
// 5. GLSL SHADERS
// ==========================================

export const VS = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`;

export const FS = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uProgress;
uniform float uAlpha;
uniform float uBandTight;
uniform float uPosStart;
uniform float uPosEnd;
uniform float uHueShift;
uniform float uDirection; // 0 = horizontal, 1 = vertical
uniform float uWaveAmount;
uniform float uRippleAmount;
uniform float uWaveSpeed;
uniform float uBrightness;
uniform float uSwellAmount;
uniform vec3 uPalA;
uniform vec3 uPalB;
uniform vec3 uPalC;
uniform vec3 uPalD;

#define PI 3.14159265359

vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b * cos(2.0 * PI * (c * t + d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float axis  = mix(uv.x, uv.y, uDirection);
  float cross = mix(uv.y, uv.x, uDirection);

  float pos = uPosStart + uProgress * (uPosEnd - uPosStart);
  float tw = uTime * uWaveSpeed;

  float waveX = sin(cross * 4.2 + tw * 0.08 + 0.3) * 0.004 * uWaveAmount;
  float d = (axis - pos) - waveX;
  float band = exp(-d * d * uBandTight);

  // Analytic slope & synthetic normal derivation
  float dhDaxis = -2.0 * d * uBandTight * band;
  vec2 slope = vec2(mix(dhDaxis, 0.0, uDirection), mix(0.0, dhDaxis, uDirection));
  vec3 N = normalize(vec3(-slope.x * 0.18, slope.y * 0.18, 1.0));

  float trail = clamp(0.5 - d * 1.3, 0.0, 1.0);
  trail = pow(trail, 2.5) * 0.30;

  float midpointFocus = 4.0 * uProgress * (1.0 - uProgress);
  float halo = exp(-d * d * 2.5) * 0.12 * midpointFocus;
  float intensity = clamp(max(band, trail) + halo * (1.0 - band), 0.0, 1.0);

  float vfade = smoothstep(0.0, 0.015, cross) * (1.0 - smoothstep(0.985, 1.0, cross));
  float ripple = sin(cross * 12.0 + axis * 3.0 + tw * 0.40) * 0.015 * uRippleAmount;
  float t = N.x * 0.12 + N.y * 0.08 + axis * 0.90 + cross * 0.16 + ripple + uHueShift + uTime * 0.04;

  vec3 col = (pal(t, uPalA, uPalB, uPalC, uPalD) * 0.50
            + pal(t - 0.18, uPalA, uPalB, uPalC, uPalD) * 0.25
            + pal(t + 0.18, uPalA, uPalB, uPalC, uPalD) * 0.25) * uBrightness;

  // Specular and Fresnel highlight
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(0.35, 0.55, 0.9));
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, 3.0);
  float spec    = pow(NdotH, 80.0);

  float entryFade = mix(0.2, 1.0, 4.0 * uProgress * (1.0 - uProgress));
  float bodyA = intensity * vfade * uAlpha * entryFade;
  vec3  bodyPM = col * bodyA;

  float highMask = band * vfade * uAlpha * entryFade * uSwellAmount;
  vec3  highEmit = (col * fresnel * 0.55 + vec3(spec) * 1.1) * highMask;
  float highA    = (fresnel * 0.4 + spec * 0.9) * highMask;

  gl_FragColor = vec4(bodyPM + highEmit, min(bodyA + highA, 1.0));
}
`;

// ==========================================
// 6. SHADER CONTROLLER & ANIMATION PIPELINE
// ==========================================

export type SweepDirection = "ltr" | "rtl" | "ttb" | "btt";

export interface ShaderOptions {
  canvas?: HTMLCanvasElement;
  palette?: CosinePalette | string;
  bandTight?: number;
  direction?: SweepDirection;
  waveAmount?: number;
  rippleAmount?: number;
  waveSpeed?: number;
  brightness?: number;
  swellAmount?: number;
}

export interface SweepOptions {
  palette?: CosinePalette | string;
  direction?: SweepDirection;
  easing?: string | EasingFunction;
  sweepMs?: number;
  outroMs?: number;
  midpoint?: number;
  peakAlpha?: number;
  brightness?: number;
  bandTight?: number;
  waveAmount?: number;
  rippleAmount?: number;
  waveSpeed?: number;
  swellAmount?: number;
  onMidpoint?: () => void | Promise<void>;
  onComplete?: () => void;
}

export interface ShaderController {
  canvas: HTMLCanvasElement;
  setProgress: (p: number) => void;
  setAlpha: (a: number) => void;
  setPalette: (p: CosinePalette) => void;
  setBandTight: (b: number) => void;
  setDirection: (d: SweepDirection) => void;
  setWaveAmount: (v: number) => void;
  setRippleAmount: (v: number) => void;
  setWaveSpeed: (v: number) => void;
  setBrightness: (v: number) => void;
  setSwellAmount: (v: number) => void;
  getProgress: () => number;
  getAlpha: () => number;
  destroy: () => void;
}

const dirToUniforms = (d: SweepDirection) => {
  switch (d) {
    case "ltr":
      return { axis: 0, posStart: -0.2, posEnd: 1.2 };
    case "rtl":
      return { axis: 0, posStart: 1.2, posEnd: -0.2 };
    case "ttb":
      return { axis: 1, posStart: -0.2, posEnd: 1.2 };
    case "btt":
      return { axis: 1, posStart: 1.2, posEnd: -0.2 };
  }
};

export function createShader(opts: ShaderOptions = {}): ShaderController | null {
  if (typeof window === "undefined") return null;
  const canvas = opts.canvas ?? document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("[glimmEngine] shader compile error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VS);
  if (!vs) return null;
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!fs) {
    gl.deleteShader(vs);
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[glimmEngine] shader link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u("uRes");
  const uTime = u("uTime");
  const uProgress = u("uProgress");
  const uAlpha = u("uAlpha");
  const uBandTight = u("uBandTight");
  const uPosStart = u("uPosStart");
  const uPosEnd = u("uPosEnd");
  const uHueShift = u("uHueShift");
  const uDirection = u("uDirection");
  const uWaveAmount = u("uWaveAmount");
  const uRippleAmount = u("uRippleAmount");
  const uWaveSpeed = u("uWaveSpeed");
  const uBrightness = u("uBrightness");
  const uSwellAmount = u("uSwellAmount");
  const uPalA = u("uPalA");
  const uPalB = u("uPalB");
  const uPalC = u("uPalC");
  const uPalD = u("uPalD");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const state = {
    progress: 0,
    alpha: 0,
    palette: resolvePalette(opts.palette),
    bandTight: clamp(opts.bandTight ?? 14, 0.1, 200),
    direction: opts.direction ?? "ltr",
    waveAmount: clamp(opts.waveAmount ?? 0, 0, 2),
    rippleAmount: clamp(opts.rippleAmount ?? 1, 0, 2),
    waveSpeed: clamp(opts.waveSpeed ?? 1, 0, 3),
    brightness: clamp(opts.brightness ?? 1, 0, 1.5),
    swellAmount: clamp(opts.swellAmount ?? 0.55, 0, 1)
  };

  const hueShift = Math.random() * 0.4;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const start = performance.now();
  let raf = 0;

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    const dirU = dirToUniforms(state.direction);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uProgress, state.progress);
    gl.uniform1f(uAlpha, state.alpha);
    gl.uniform1f(uBandTight, state.bandTight);
    gl.uniform1f(uPosStart, dirU.posStart);
    gl.uniform1f(uPosEnd, dirU.posEnd);
    gl.uniform1f(uDirection, dirU.axis);
    gl.uniform1f(uWaveAmount, state.waveAmount);
    gl.uniform1f(uRippleAmount, state.rippleAmount);
    gl.uniform1f(uWaveSpeed, state.waveSpeed);
    gl.uniform1f(uBrightness, state.brightness);
    gl.uniform1f(uSwellAmount, state.swellAmount);
    gl.uniform1f(uHueShift, hueShift);

    gl.uniform3f(uPalA, state.palette.a[0], state.palette.a[1], state.palette.a[2]);
    gl.uniform3f(uPalB, state.palette.b[0], state.palette.b[1], state.palette.b[2]);
    gl.uniform3f(uPalC, state.palette.c[0], state.palette.c[1], state.palette.c[2]);
    gl.uniform3f(uPalD, state.palette.d[0], state.palette.d[1], state.palette.d[2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    canvas,
    setProgress: (p: number) => {
      state.progress = clamp(p, 0, 1);
    },
    setAlpha: (a: number) => {
      state.alpha = clamp(a, 0, 1.5);
    },
    setPalette: (p: CosinePalette) => {
      state.palette = p;
    },
    setBandTight: (b: number) => {
      state.bandTight = clamp(b, 0.1, 200);
    },
    setDirection: (d: SweepDirection) => {
      state.direction = d;
    },
    setWaveAmount: (v: number) => {
      state.waveAmount = clamp(v, 0, 2);
    },
    setRippleAmount: (v: number) => {
      state.rippleAmount = clamp(v, 0, 2);
    },
    setWaveSpeed: (v: number) => {
      state.waveSpeed = clamp(v, 0, 3);
    },
    setBrightness: (v: number) => {
      state.brightness = clamp(v, 0, 1.5);
    },
    setSwellAmount: (v: number) => {
      state.swellAmount = clamp(v, 0, 1);
    },
    getProgress: () => state.progress,
    getAlpha: () => state.alpha,
    destroy: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    }
  };
}

export function playSweep(
  ctrl: ShaderController,
  opts: SweepOptions = {}
): { midpoint: Promise<void>; done: Promise<void>; cancel: () => void } {
  const sweepMs = opts.sweepMs ?? 850;
  const outroMs = opts.outroMs ?? 400;
  const midpoint = opts.midpoint ?? 0.52;
  const peakAlpha = opts.peakAlpha ?? 1;
  const easing = resolveEasing(opts.easing);

  if (opts.palette) ctrl.setPalette(resolvePalette(opts.palette));
  if (opts.direction) ctrl.setDirection(opts.direction);
  if (opts.bandTight !== undefined) ctrl.setBandTight(opts.bandTight);
  if (opts.waveAmount !== undefined) ctrl.setWaveAmount(opts.waveAmount);
  if (opts.rippleAmount !== undefined) ctrl.setRippleAmount(opts.rippleAmount);
  if (opts.waveSpeed !== undefined) ctrl.setWaveSpeed(opts.waveSpeed);
  if (opts.brightness !== undefined) ctrl.setBrightness(opts.brightness);
  if (opts.swellAmount !== undefined) ctrl.setSwellAmount(opts.swellAmount);

  let cancelled = false;
  let raf = 0;
  let resolveMidpoint: () => void = () => {};
  let resolveDone: () => void = () => {};

  const midpointP = new Promise<void>((r) => {
    resolveMidpoint = r;
  });
  const doneP = new Promise<void>((r) => {
    resolveDone = r;
  });

  (async () => {
    ctrl.setAlpha(peakAlpha);
    ctrl.setProgress(0);

    let midpointFired = false;
    let midpointTask: Promise<void> = Promise.resolve();

    const fireMidpoint = () => {
      midpointFired = true;
      midpointTask = Promise.resolve().then(() => opts.onMidpoint?.());
      midpointTask.then(resolveMidpoint, (error) => {
        console.error("[glimmEngine] midpoint callback error:", error);
        resolveMidpoint();
      });
    };

    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (cancelled) {
          resolve();
          return;
        }
        const raw = Math.min(1, (performance.now() - t0) / sweepMs);
        const progress = easing(raw);
        ctrl.setProgress(progress);

        if (!midpointFired && progress >= midpoint) {
          fireMidpoint();
        }

        if (raw < 1) raf = requestAnimationFrame(tick);
        else resolve();
      };
      raf = requestAnimationFrame(tick);
    });

    if (cancelled) return;
    if (!midpointFired) fireMidpoint();
    await midpointTask.catch(() => {});
    if (cancelled) return;

    // Outro fade ramp
    const tOutro = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (cancelled) {
          resolve();
          return;
        }
        const raw = Math.min(1, (performance.now() - tOutro) / outroMs);
        const alpha = peakAlpha * (1 - EASINGS.easeInOutCubic(raw));
        ctrl.setAlpha(alpha);
        if (raw < 1) raf = requestAnimationFrame(tick);
        else resolve();
      };
      raf = requestAnimationFrame(tick);
    });

    if (cancelled) return;
    ctrl.setProgress(0);
    ctrl.setAlpha(0);
    opts.onComplete?.();
    resolveDone();
  })();

  return {
    midpoint: midpointP,
    done: doneP,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resolveMidpoint();
      resolveDone();
    }
  };
}
