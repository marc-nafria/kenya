// =========================================================
// ETAP Kenya — low-poly morphing scenes
// Inspired by Bryan James' "Species In Pieces" (2015)
//
// - 60 triangles, SAME identity across all 8 scenes
// - Wildly variable sizes, any rotation, free placement
// - Palette per scene designed to READ against the light
//   page background (no framed box, no scene background)
// - Triangles are zoned by viewBox Y so each one stays
//   within a ~25-unit band between scenes → smooth morph:
//     0–11   (12) atmosphere / upper elements (y 0–30)
//     12–29  (18) hero upper / mid-upper      (y 20–55)
//     30–47  (18) hero lower / mid-lower      (y 45–75)
//     48–59  (12) ground / horizon            (y 65–90)
// - On scene change: all 60 tweens run concurrently with
//   staggered start per index (in-pieces-style sweep).
// =========================================================

const N = 60;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DUR = 1000;     // ms tween per triangle
const STAGGER = 10;   // ms per index (total sweep ≈ 1.6 s)

// ---- Per-scene page tint (bg + halo + text) ----
const THEME = [
  // 0 Intro — neutral light
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },

  // 1 Night Mode — deep navy; light text
  { bg: '#12213D', halo: 'rgba(18, 33, 61, 0.95)',
    textPrimary: '#F4F6FA', textSecondary: '#BBC8DC', textLabel: '#7D8BA8',
    panel: 'rgba(30, 47, 78, 0.55)' },

  // 2 Solar Pumping — warm cream dawn
  { bg: '#FCE7B9', halo: 'rgba(252, 231, 185, 0.95)',
    textPrimary: '#1F1910', textSecondary: '#4A3A22', textLabel: '#8A7550',
    panel: 'rgba(252, 231, 185, 0.82)' },

  // 3–8 keep neutral for now
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' },
  { bg: '#F8FAFC', halo: 'rgba(248, 250, 252, 0.95)',
    textPrimary: '#0F172A', textSecondary: '#334155', textLabel: '#94A3B8',
    panel: 'rgba(248, 250, 252, 0.82)' }
];

// ---- Indicator logic ----
const etapLogic = {
  0: { turb: 100, gas: 100, path: 100, org: 100 }, // Intro
  1: { turb: 100, gas: 100, path: 100, org: 100 }, // Night Mode
  2: { turb: 100, gas: 100, path: 100, org: 100 }, // Solar Pumping
  3: { turb: 100, gas: 100, path: 100, org: 100 }, // Buffer Tank
  4: { turb: 100, gas: 10,  path: 100, org: 100 }, // Cascade Aeration
  5: { turb: 20,  gas: 10,  path: 100, org: 100 }, // Settling Tank
  6: { turb: 0,   gas: 5,   path: 90,  org: 100 }, // Roughing Filter (URF)
  7: { turb: 0,   gas: 0,   path: 0,   org: 80  }, // Slow Sand Filter
  8: { turb: 0,   gas: 0,   path: 0,   org: 0   }  // Biochar Polishing
};

// ---- DOM refs ----
const turbEl = document.getElementById('val-turb');
const gasEl  = document.getElementById('val-gas');
const pathEl = document.getElementById('val-path');
const orgEl  = document.getElementById('val-org');
const steps  = document.querySelectorAll('.step');
const field  = document.getElementById('tri-field');

// Build polygons once
const polys = [];
for (let i = 0; i < N; i++) {
  const p = document.createElementNS(SVG_NS, 'polygon');
  p.setAttribute('class', 'tri');
  p.setAttribute('points', '0,0 0,0 0,0');
  p.setAttribute('fill', '#000');
  p.setAttribute('stroke', '#000');
  field.appendChild(p);
  polys.push(p);
}

// Compact constructor
const T = (x1, y1, x2, y2, x3, y3, f) => ({
  p: [[x1, y1], [x2, y2], [x3, y3]],
  f
});

// =========================================================
// SCENE 0 — Intro / Presentation
// Decorative floating water drops.  Each drop = 8 triangles:
//   2 upper forming the tip + 6 lower fanning a half-octagon.
// Right side uses lighter cyan, left side darker, 4-tone gradient.
// =========================================================
function sceneIntro() {
  const C1 = '#B8E4EE';  // highlight
  const C2 = '#7ACAE0';  // lit face
  const C3 = '#4FB3D9';  // transition
  const C4 = '#2A85B3';  // shadow
  const HI = '#C4E8F0';  // sparkle

  const drop = (cx, cy, R, H) => {
    const p1x = cx + 0.866 * R, p1y = cy + 0.5   * R;
    const p2x = cx + 0.5   * R, p2y = cy + 0.866 * R;
    const p3x = cx,             p3y = cy + R;
    const p4x = cx - 0.5   * R, p4y = cy + 0.866 * R;
    const p5x = cx - 0.866 * R, p5y = cy + 0.5   * R;
    return [
      T(cx, cy - H,  cx - R, cy,  cx, cy,       C3),
      T(cx, cy - H,  cx, cy,      cx + R, cy,   C1),
      T(cx, cy,  cx + R, cy,  p1x, p1y,         C1),
      T(cx, cy,  p1x, p1y,    p2x, p2y,         C2),
      T(cx, cy,  p2x, p2y,    p3x, p3y,         C2),
      T(cx, cy,  p3x, p3y,    p4x, p4y,         C3),
      T(cx, cy,  p4x, p4y,    p5x, p5y,         C4),
      T(cx, cy,  p5x, p5y,    cx - R, cy,       C4)
    ];
  };

  const sparkle = (cx, cy, s, color = HI) =>
    T(cx, cy - s,  cx - s * 0.75, cy + s * 0.6,  cx + s * 0.75, cy + s * 0.6,  color);

  return [
    // 0–7 UPPER: TINY drop
    ...drop(25, 25, 4, 6),
    // 8–11 UPPER sparkles
    sparkle( 80, 12, 1.5),
    sparkle(110, 28, 2.5),
    sparkle(150, 38, 1.0),
    sparkle( 55, 18, 2.2),

    // 12–19 MID-UPPER: SMALL drop
    ...drop(62, 50, 6, 10),
    // 20–27 MID-UPPER: MEDIUM drop
    ...drop(128, 62, 9, 14),
    // 28–29 sparkles
    sparkle( 14, 72, 2.0),
    sparkle(152, 88, 1.6),

    // 30–37 MID-LOWER: HUGE hero drop
    ...drop(90, 100, 16, 26),
    // 38–45 MID-LOWER: LARGE drop
    ...drop(28, 132, 12, 19),
    // 46–47 sparkles
    sparkle( 55, 128, 1.0),
    sparkle(148,  95, 1.5),

    // 48–55 LOWER: TINY drop
    ...drop(142, 158, 4, 6),
    // 56–59 sparkles
    sparkle( 68, 162, 2.2),
    sparkle(102, 170, 1.3),
    sparkle( 85, 142, 1.0),
    sparkle(120, 152, 2.6)
  ];
}

// =========================================================
// SCENE 1 — Night Mode
// Wider crescent moon (outer circle r=14, inner shifted -8 so the
// lit sliver is chunky), a few stars in the upper sky, distant
// mountain silhouettes behind the ground, and a dim dark ground
// strip positioned within the scene zone (upper half of the page).
// Two small decorative drops + sparkles are scattered in the lower
// portion of the page for ambient movement.
// =========================================================
function sceneNight() {
  // Moon stays bright (hero element) against the deep navy bg
  const MOON_BRIGHT = '#F4E8C0';
  const MOON_MID    = '#E8DCB0';
  const MOON_DIM    = '#D9C99A';
  const MOON_DIMMER = '#C9B88A';
  const STAR        = '#F4F6FA';   // bright (near white)
  const STAR_DIM    = '#BBC8DC';
  // Mountains: darker than the #12213D bg so they silhouette subtly.
  // Narrow tonal range → they "pile up" as a cluster, not as four
  // distinct peaks stretched across the canvas.
  const MT_BACK  = '#0A1528';
  const MT_MID   = '#0F1C33';
  const MT_FRONT = '#14223D';
  // Hill layers — 3-tone dark range, organic dunes
  const H_BACK   = '#0E1A30';
  const H_MID    = '#13203A';
  const H_FRONT  = '#192740';
  const ROCK     = '#091322';
  // Night-water cyan drops — brighter so they pop against the dark bg
  const DR1 = '#7FAECF';
  const DR2 = '#5A8EB3';
  const DR3 = '#3D6E96';
  const DR4 = '#254F74';
  const SPK = '#BCCBDB';

  // Sampled at θ = ±75°, ±37.5°, 0°. Outer circle c=(110,25) r=14,
  // inner circle c=(102,25) r=14 → 8 unit offset → chunky crescent.
  // 4 quads × 2 triangles = 8 tris total, cel-shaded.
  const drop = (cx, cy, R, H) => {
    const p1x = cx + 0.866 * R, p1y = cy + 0.5   * R;
    const p2x = cx + 0.5   * R, p2y = cy + 0.866 * R;
    const p3x = cx,             p3y = cy + R;
    const p4x = cx - 0.5   * R, p4y = cy + 0.866 * R;
    const p5x = cx - 0.866 * R, p5y = cy + 0.5   * R;
    return [
      T(cx, cy - H,  cx - R, cy,  cx, cy,       DR3),
      T(cx, cy - H,  cx, cy,      cx + R, cy,   DR1),
      T(cx, cy,  cx + R, cy,  p1x, p1y,         DR1),
      T(cx, cy,  p1x, p1y,    p2x, p2y,         DR2),
      T(cx, cy,  p2x, p2y,    p3x, p3y,         DR2),
      T(cx, cy,  p3x, p3y,    p4x, p4y,         DR3),
      T(cx, cy,  p4x, p4y,    p5x, p5y,         DR4),
      T(cx, cy,  p5x, p5y,    cx - R, cy,       DR4)
    ];
  };

  const sparkle = (cx, cy, s, color = SPK) =>
    T(cx, cy - s,  cx - s * 0.75, cy + s * 0.6,  cx + s * 0.75, cy + s * 0.6,  color);

  return [
    // ---- 0–7 CRESCENT MOON (wider) at virtual outer-centre (110,25) ----
    // Top horn (θ -75 to -37.5)
    T(114, 12,  121, 17,  113, 17, MOON_DIM),
    T(114, 12,  113, 17,  106, 12, MOON_DIMMER),
    // Upper belly (θ -37.5 to 0)
    T(121, 17,  124, 25,  116, 25, MOON_BRIGHT),
    T(121, 17,  116, 25,  113, 17, MOON_MID),
    // Lower belly (θ 0 to 37.5)
    T(124, 25,  121, 33,  113, 33, MOON_BRIGHT),
    T(124, 25,  113, 33,  116, 25, MOON_MID),
    // Bottom horn (θ 37.5 to 75)
    T(121, 33,  114, 38,  106, 38, MOON_DIM),
    T(121, 33,  106, 38,  113, 33, MOON_DIMMER),

    // ---- 8–11 STARS (tiny, in upper sky) ----
    T( 20, 16,   22, 19,   18, 19, STAR),
    T( 60,  8,   62, 11,   58, 11, STAR_DIM),
    T( 85, 22,   87, 24,   83, 24, STAR),
    T(148, 40,  150, 42,  146, 42, STAR_DIM),

    // ---- 12–15 MOUNTAINS — clustered cluster in x 20–120, overlapping peaks ----
    T( 20, 62,   55, 44,   90, 62, MT_BACK),   // back tall peak
    T(  8, 62,   38, 50,   68, 62, MT_MID),    // left peak, overlaps back
    T( 70, 62,  100, 46,  128, 62, MT_MID),    // right peak, overlaps back
    T( 52, 62,   82, 52,  112, 62, MT_FRONT),  // front peak, overlaps both

    // ---- 16–27 GROUND — 3 layers of organic dunes (no rectangle) ----
    // Back layer (4 big dune silhouettes, darkest)
    T(  0, 84,   22, 66,   50, 84, H_BACK),
    T( 30, 84,   60, 62,   94, 84, H_BACK),
    T( 80, 84,  108, 68,  138, 84, H_BACK),
    T(124, 84,  148, 70,  160, 84, H_BACK),
    // Mid layer (4 medium dunes, slightly lighter)
    T(  0, 86,   14, 76,   34, 86, H_MID),
    T( 42, 86,   62, 74,   86, 86, H_MID),
    T( 82, 86,  104, 78,  126, 86, H_MID),
    T(126, 86,  142, 80,  160, 86, H_MID),
    // Front layer (4 small mounds, lightest of the ground trio)
    T( 10, 88,   18, 82,   28, 88, H_FRONT),
    T( 54, 88,   64, 82,   78, 88, H_FRONT),
    T( 96, 88,  108, 84,  120, 88, H_FRONT),
    T(138, 88,  148, 84,  158, 88, H_FRONT),

    // ---- 28–29 tiny rocks (darkest accents) ----
    T( 36, 87,   42, 83,   48, 87, ROCK),
    T(116, 87,  122, 83,  128, 87, ROCK),

    // ---- 30–37 DECOR DROP 1 (small, lower-left for ambient movement) ----
    ...drop(22, 112, 5, 8),

    // ---- 38–47 SPARKLES scattered mid-lower ----
    sparkle( 60, 100, 1.4),
    sparkle( 95, 115, 2.0),
    sparkle(125, 108, 1.5),
    sparkle(150, 122, 1.2),
    sparkle( 42, 132, 1.8),
    sparkle( 80, 128, 1.0),
    sparkle(110, 130, 1.6),
    sparkle(145, 135, 1.3),
    sparkle( 70, 120, 1.0),
    sparkle(130, 98,  1.4),

    // ---- 48–55 DECOR DROP 2 (small, lower-right) ----
    ...drop(135, 152, 6, 10),

    // ---- 56–59 SPARKLES lower ----
    sparkle( 25, 158, 1.6),
    sparkle( 65, 168, 2.0),
    sparkle( 95, 172, 1.2),
    sparkle(160, 170, 1.5)
  ];
}

// =========================================================
// SCENE 2 — Solar Pumping (simple demo)
// The 8 moon-crescent triangles morph into an 8-wedge SUN at
// the same position. Stars become warm sparkles; muted-blue
// mountains warm into beige hills; dim-night ground becomes
// warm earth. Decorative water drops carry through unchanged.
// Same triangle-index layout as sceneNight for a clean morph.
// =========================================================
function sceneSolar() {
  // Sun wedges — slight tonal gradient bright-top-right → dim-bottom-left
  const SUN_BRIGHT = '#FFE066';
  const SUN_MID    = '#FFD34E';
  const SUN_DIM    = '#FFC434';
  const SUN_SHADE  = '#F2B024';
  const ACC_LIGHT  = '#FFEBB5';
  const ACC_MED    = '#FFD87A';
  // Warm distant hills (blend softly with the cream bg)
  const MT_LIGHT = '#D8BC94';
  const MT_DARK  = '#C4A682';
  // Warm earth ground
  const G_TOP  = '#D4B896';
  const G_ALT  = '#C8AA84';
  const G_BOT  = '#B89670';
  const G_DEEP = '#A0825E';
  const G_SH   = '#C09874';
  const ROCK   = '#8B5A2B';
  // Decor drops stay cyan (water is always water)
  const DR1 = '#A3C0D2';
  const DR2 = '#70A0B8';
  const DR3 = '#4579A0';
  const DR4 = '#2A5B7D';
  const SPK = '#FFE5B0';   // warm sparkle

  const drop = (cx, cy, R, H) => {
    const p1x = cx + 0.866 * R, p1y = cy + 0.5   * R;
    const p2x = cx + 0.5   * R, p2y = cy + 0.866 * R;
    const p3x = cx,             p3y = cy + R;
    const p4x = cx - 0.5   * R, p4y = cy + 0.866 * R;
    const p5x = cx - 0.866 * R, p5y = cy + 0.5   * R;
    return [
      T(cx, cy - H,  cx - R, cy,  cx, cy,       DR3),
      T(cx, cy - H,  cx, cy,      cx + R, cy,   DR1),
      T(cx, cy,  cx + R, cy,  p1x, p1y,         DR1),
      T(cx, cy,  p1x, p1y,    p2x, p2y,         DR2),
      T(cx, cy,  p2x, p2y,    p3x, p3y,         DR2),
      T(cx, cy,  p3x, p3y,    p4x, p4y,         DR3),
      T(cx, cy,  p4x, p4y,    p5x, p5y,         DR4),
      T(cx, cy,  p5x, p5y,    cx - R, cy,       DR4)
    ];
  };

  const sparkle = (cx, cy, s, color = SPK) =>
    T(cx, cy - s,  cx - s * 0.75, cy + s * 0.6,  cx + s * 0.75, cy + s * 0.6,  color);

  return [
    // ---- 0–7 SUN — 8 wedges fanning from centre (110,25), r=10 ----
    T(110, 25,  120, 25,  117, 32, SUN_MID),     // right-down
    T(110, 25,  117, 32,  110, 35, SUN_DIM),     // bot-right
    T(110, 25,  110, 35,  103, 32, SUN_SHADE),   // bot-left
    T(110, 25,  103, 32,  100, 25, SUN_DIM),     // left-down
    T(110, 25,  100, 25,  103, 18, SUN_MID),     // left-up
    T(110, 25,  103, 18,  110, 15, SUN_BRIGHT),  // top-left
    T(110, 25,  110, 15,  117, 18, SUN_BRIGHT),  // top (brightest)
    T(110, 25,  117, 18,  120, 25, SUN_BRIGHT),  // right-up

    // ---- 8–11 warm accents in the sky (replacing stars) ----
    T( 20, 16,   22, 19,   18, 19, ACC_LIGHT),
    T( 60,  8,   62, 11,   58, 11, ACC_MED),
    T( 85, 22,   87, 24,   83, 24, ACC_LIGHT),
    T(148, 40,  150, 42,  146, 42, ACC_MED),

    // ---- 12–15 MOUNTAINS — clustered peaks (same layout as Night, warm tones) ----
    T( 20, 62,   55, 44,   90, 62, G_BOT),     // back tall peak
    T(  8, 62,   38, 50,   68, 62, G_ALT),
    T( 70, 62,  100, 46,  128, 62, G_ALT),
    T( 52, 62,   82, 52,  112, 62, G_TOP),     // front peak

    // ---- 16–27 GROUND — 3 layers of organic dunes (warm earth) ----
    T(  0, 84,   22, 66,   50, 84, G_DEEP),
    T( 30, 84,   60, 62,   94, 84, G_DEEP),
    T( 80, 84,  108, 68,  138, 84, G_DEEP),
    T(124, 84,  148, 70,  160, 84, G_DEEP),
    T(  0, 86,   14, 76,   34, 86, G_BOT),
    T( 42, 86,   62, 74,   86, 86, G_BOT),
    T( 82, 86,  104, 78,  126, 86, G_BOT),
    T(126, 86,  142, 80,  160, 86, G_BOT),
    T( 10, 88,   18, 82,   28, 88, G_TOP),
    T( 54, 88,   64, 82,   78, 88, G_TOP),
    T( 96, 88,  108, 84,  120, 88, G_TOP),
    T(138, 88,  148, 84,  158, 88, G_TOP),

    // ---- 28–29 rocks ----
    T( 36, 87,   42, 83,   48, 87, ROCK),
    T(116, 87,  122, 83,  128, 87, ROCK),

    // ---- 30–37 DECOR DROP 1 (same as night — water persists) ----
    ...drop(22, 112, 5, 8),

    // ---- 38–47 sparkles mid-lower (warmer) ----
    sparkle( 60, 100, 1.4),
    sparkle( 95, 115, 2.0),
    sparkle(125, 108, 1.5),
    sparkle(150, 122, 1.2),
    sparkle( 42, 132, 1.8),
    sparkle( 80, 128, 1.0),
    sparkle(110, 130, 1.6),
    sparkle(145, 135, 1.3),
    sparkle( 70, 120, 1.0),
    sparkle(130, 98,  1.4),

    // ---- 48–55 DECOR DROP 2 ----
    ...drop(135, 152, 6, 10),

    // ---- 56–59 sparkles lower ----
    sparkle( 25, 158, 1.6),
    sparkle( 65, 168, 2.0),
    sparkle( 95, 172, 1.2),
    sparkle(160, 170, 1.5)
  ];
}

// =========================================================
// SCENE 2 — Buffer Tank: tall cylinder hero, antenna + LoRaWAN waves
// Palette: cool neutrals, steel, brown water visible
// =========================================================
function sceneBuffer() {
  return [
    // ---- 0–11 UPPER (sky + LoRaWAN waves + antenna) ----
    T(  8, 14,  32, 10,  24, 22, '#E4EBEE'),
    T( 50, 10,  72, 14,  62, 22, '#D5E0E5'),
    T( 96, 12, 120, 10, 108, 20, '#D5E0E5'),
    T(130, 18, 154, 14, 146, 26, '#C4D2DA'),
    // Antenna + waves (hero feature)
    T( 76,  2,  82,  2,  79,  8, '#5C6B75'),  // antenna tip
    T( 76,  8,  82,  8,  79, 14, '#5C6B75'),  // antenna pole
    T( 60,  0,  76,  0,  68,  6, '#4FB3D9'),  // wave upper L
    T( 82,  0,  98,  0,  90,  6, '#4FB3D9'),  // wave upper R
    T( 56,  4,  78,  6,  72, 12, '#7FCDE3'),  // wave mid L
    T( 80,  6, 102,  4,  88, 12, '#7FCDE3'),  // wave mid R
    T( 68, 10,  90, 10,  79, 14, '#9FDBEA'),  // wave inner
    T( 40, 26,  58, 24,  52, 30, '#DEE7EC'),  // sky haze

    // ---- 12–29 MID-UPPER (tank upper cylinder — heavily faceted) ----
    // Upper hull (light shading reads as curvature)
    T( 54, 18,  72, 16,  66, 22, '#DDE3E6'),
    T( 72, 16,  90, 16,  80, 22, '#E4EBEE'),
    T( 90, 16, 106, 18, 100, 22, '#D5DCE0'),
    T( 52, 22,  66, 22,  60, 28, '#C6CED3'),
    T( 66, 22,  80, 22,  73, 28, '#D0D8DC'),
    T( 80, 22,  94, 22,  87, 28, '#C6CED3'),
    T( 94, 22, 108, 22, 101, 28, '#B3BCC2'),
    T( 52, 28,  60, 28,  56, 34, '#AEB5BD'),
    T( 60, 28,  73, 28,  66, 34, '#C6CED3'),
    T( 73, 28,  87, 28,  80, 34, '#B8C0C5'),
    T( 87, 28, 101, 28,  94, 34, '#A8B0B7'),
    T(101, 28, 110, 28, 105, 34, '#9FA7AF'),
    // Tank upper rim line
    T( 52, 34,  66, 34,  59, 38, '#8A9098'),
    T( 66, 34,  80, 34,  73, 38, '#9FA7AF'),
    T( 80, 34,  94, 34,  87, 38, '#8A9098'),
    T( 94, 34, 110, 34, 102, 38, '#7A8088'),
    // Inlet pipe
    T(  8, 28,  36, 28,  36, 32, '#6B7480'),
    T(  8, 28,  12, 32,  36, 32, '#3E4952'),

    // ---- 30–47 MID-LOWER (tank lower + water inside cutaway) ----
    // Tank mid-body + cutaway
    T( 52, 38,  66, 38,  59, 44, '#AEB5BD'),
    T( 66, 38,  80, 38,  73, 44, '#C6CED3'),
    T( 80, 38,  94, 38,  87, 44, '#B8C0C5'),
    T( 94, 38, 110, 38, 102, 44, '#9FA7AF'),
    // Water inside (cutaway — stratified brown)
    T( 56, 44,  72, 44,  64, 50, '#8B5A2B'),  // water top L
    T( 72, 44,  88, 44,  80, 50, '#A0693A'),  // water top M
    T( 88, 44, 104, 44,  96, 50, '#8B5A2B'),  // water top R
    T( 56, 50,  72, 50,  64, 58, '#6E4720'),
    T( 72, 50,  88, 50,  80, 58, '#8B5A2B'),
    T( 88, 50, 104, 50,  96, 58, '#6E4720'),
    T( 56, 58,  72, 58,  64, 64, '#5C3A1E'),
    T( 72, 58,  88, 58,  80, 64, '#6E4720'),
    T( 88, 58, 104, 58,  96, 64, '#5C3A1E'),
    // Tank base/bowl
    T( 52, 64,  72, 66,  64, 70, '#6B7380'),
    T( 72, 66,  88, 66,  80, 70, '#8A9098'),
    T( 88, 66, 110, 64, 102, 70, '#6B7380'),
    T( 58, 70,  72, 70,  64, 72, '#3E4952'),
    T( 72, 70,  90, 70,  82, 72, '#5C6B75'),
    T( 90, 70, 104, 70,  98, 72, '#3E4952'),
    // Level indicator (small blue marker)
    T(112, 42, 116, 42, 114, 54, '#3EA8D9'),
    T(112, 42, 114, 54, 110, 48, '#5CC0EB'),

    // ---- 48–59 LOWER (ground) ----
    T(  0, 72,  30, 72,  16, 80, '#A89A82'),
    T( 26, 72,  58, 72,  42, 80, '#8A7C68'),
    T( 54, 72,  84, 72,  70, 80, '#A89A82'),
    T( 80, 72, 108, 72,  94, 80, '#8A7C68'),
    T(104, 72, 134, 72, 120, 80, '#A89A82'),
    T(130, 72, 160, 72, 146, 80, '#8A7C68'),
    T(  0, 80,  40, 80,  20, 90, '#76665A'),
    T( 35, 80,  80, 80,  60, 90, '#8A7C68'),
    T( 75, 80, 120, 80, 100, 90, '#76665A'),
    T(115, 80, 160, 80, 140, 90, '#8A7C68'),
    T( 40, 74,  46, 70,  48, 76, '#6BA368'),  // grass accent
    T(120, 74, 126, 70, 128, 76, '#6BA368')   // grass accent
  ];
}

// =========================================================
// SCENE 3 — Cascade Aeration: 3 descending stone steps, water, foam, gas bubbles
// Palette: warm stone + brown aerating water + white foam + grey gas
// =========================================================
function sceneCascade() {
  return [
    // ---- 0–11 UPPER (gas bubbles rising + sky) ----
    T( 40, 14,  48, 10,  50, 18, '#B8C0C4'),  // H2S puff 1
    T( 44, 22,  48, 18,  50, 24, '#B8C0C4'),
    T( 76,  8,  84,  6,  82, 14, '#B8C0C4'),  // H2S puff 2
    T( 80, 16,  84, 12,  86, 18, '#A8B0B7'),
    T(104, 12, 112,  8, 114, 16, '#B8C0C4'),  // H2S puff 3
    T(108, 22, 112, 18, 114, 24, '#A8B0B7'),
    T(130,  8, 138,  4, 140, 12, '#B8C0C4'),  // H2S puff 4
    T( 10, 16,  20, 12,  18, 20, '#D5DDE2'),  // sky wisp
    T( 54, 24,  66, 20,  62, 28, '#DEE7EC'),  // wisp
    T( 92, 22, 104, 18, 100, 26, '#DEE7EC'),  // wisp
    T(122, 22, 134, 18, 130, 26, '#C6CED3'),
    T(148, 14, 156, 10, 154, 18, '#C6CED3'),

    // ---- 12–29 MID-UPPER (step 1 + step 2 top + water on them) ----
    // Step 1 (top step)
    T( 18, 32,  56, 32,  56, 40, '#B0A290'),   // step 1 top light
    T( 18, 32,  18, 40,  56, 40, '#8A7C6A'),   // step 1 shade
    T( 18, 40,  56, 40,  50, 44, '#6B5E4E'),   // step 1 front
    // Water on step 1
    T( 18, 28,  56, 28,  56, 32, '#8B5A2B'),
    T( 18, 30,  38, 29,  28, 32, '#A0693A'),
    T( 38, 30,  56, 29,  48, 32, '#A0693A'),
    // Foam crest at edge of step 1
    T( 52, 28,  60, 30,  54, 34, '#F5EBD8'),
    T( 56, 32,  62, 34,  58, 36, '#E6D9BF'),
    // Fall from step 1 to step 2
    T( 56, 40,  64, 40,  58, 48, '#9C6B3A'),
    T( 64, 40,  64, 48,  58, 48, '#7A4F24'),
    T( 60, 44,  66, 44,  62, 50, '#A0693A'),
    // Step 2 top (begins in this zone)
    T( 52, 48,  90, 48,  90, 52, '#B0A290'),
    T( 52, 48,  52, 52,  90, 52, '#8A7C6A'),
    // Water on step 2
    T( 52, 44,  90, 44,  90, 48, '#A87A44'),   // aerating lighter
    T( 56, 46,  76, 45,  66, 48, '#BC8E58'),
    T( 76, 46,  90, 45,  82, 48, '#BC8E58'),
    // Distant peaks (fade)
    T(118, 38, 136, 32, 150, 38, '#D9CDB8'),
    T(140, 38, 152, 32, 160, 38, '#C7BCA8'),

    // ---- 30–47 MID-LOWER (step 2 bottom + fall + step 3 + water) ----
    // Step 2 side/shade
    T( 52, 52,  90, 52,  86, 58, '#6B5E4E'),
    // Fall 2
    T( 90, 52,  98, 52,  94, 60, '#9C6B3A'),
    T( 98, 52,  98, 60,  94, 60, '#7A4F24'),
    T( 94, 56, 100, 56,  96, 62, '#A0693A'),
    // Foam crest step 2
    T( 86, 44,  94, 46,  90, 50, '#F5EBD8'),
    T( 92, 50,  98, 52,  94, 54, '#E6D9BF'),
    // Step 3 top
    T( 88, 62, 128, 62, 128, 68, '#B0A290'),
    T( 88, 62,  88, 68, 128, 68, '#8A7C6A'),
    T( 88, 68, 128, 68, 122, 72, '#6B5E4E'),   // step 3 front
    // Water on step 3 (even lighter as aeration continues)
    T( 88, 58, 128, 58, 128, 62, '#BC8E58'),
    T( 90, 60, 112, 59, 102, 62, '#D2A576'),
    T(112, 60, 128, 59, 120, 62, '#D2A576'),
    // Foam step 3
    T(122, 58, 130, 60, 126, 64, '#F5EBD8'),
    // Runoff after step 3
    T(128, 70, 138, 72, 128, 74, '#9C6B3A'),
    T(136, 72, 144, 74, 138, 76, '#8B5D30'),
    // Droplets & spray
    T( 64, 48,  66, 52,  62, 52, '#9C6B3A'),
    T( 98, 60, 100, 64,  96, 64, '#A87A44'),
    T(132, 70, 134, 74, 130, 74, '#BC8E58'),
    T( 72, 44,  74, 48,  70, 48, '#E6D9BF'),   // tiny foam droplet
    T(108, 58, 110, 62, 106, 62, '#F5EBD8'),   // tiny foam droplet

    // ---- 48–59 LOWER (ground) ----
    T(  0, 72,  32, 72,  16, 82, '#76665A'),
    T( 28, 72,  60, 72,  44, 82, '#8A7C6A'),
    T( 56, 74,  88, 74,  72, 82, '#76665A'),
    T( 84, 76, 116, 76, 100, 84, '#8A7C6A'),
    T(112, 76, 144, 76, 128, 84, '#76665A'),
    T(140, 76, 160, 76, 152, 84, '#8A7C6A'),
    T(  0, 82,  40, 82,  20, 90, '#5C4E42'),
    T( 35, 82,  80, 82,  60, 90, '#76665A'),
    T( 75, 84, 120, 84, 100, 90, '#5C4E42'),
    T(115, 84, 160, 84, 140, 90, '#76665A'),
    T( 12, 74,  16, 70,  18, 76, '#6BA368'),
    T(142, 74, 146, 70, 148, 76, '#6BA368')
  ];
}

// =========================================================
// SCENE 4 — Settling Tank: wide cross-section, sloped floor wedge, sediment pile
// Palette: dusty/ochre, clarifying top + dark sludge bottom
// =========================================================
function sceneSettle() {
  return [
    // ---- 0–11 UPPER (atmosphere + inlet context) ----
    T(  6, 10,  28,  8,  22, 18, '#E8DDC5'),
    T( 44, 14,  66, 10,  58, 20, '#D8CCB0'),
    T( 80,  8, 102, 12,  94, 20, '#D8CCB0'),
    T(118, 10, 140,  8, 132, 18, '#E8DDC5'),
    T(146, 18, 158, 14, 154, 24, '#C4B69A'),
    // Arrows indicating very slow motion (horizontal wisps)
    T( 14, 28,  34, 27,  24, 32, '#D8CCB0'),
    T( 40, 26,  60, 25,  50, 30, '#C4B69A'),
    T(110, 26, 130, 25, 120, 30, '#C4B69A'),
    T(132, 28, 152, 27, 142, 32, '#D8CCB0'),
    // Fade-in at tank top
    T(  0,  4,  14,  0,  10, 10, '#EFE5D0'),
    T(150,  4, 160,  0, 158, 10, '#EFE5D0'),
    T( 74,  4,  86,  2,  80, 10, '#E8DDC5'),

    // ---- 12–29 MID-UPPER (tank walls + top water layer — clarifying) ----
    // Tank left wall
    T( 10, 22,  18, 22,  18, 40, '#3A3A3A'),
    T( 10, 22,  10, 40,  18, 40, '#2B2B2B'),
    // Tank right wall (mirror)
    T(142, 22, 150, 22, 150, 40, '#3A3A3A'),
    T(150, 22, 150, 40, 142, 40, '#2B2B2B'),
    // Tank top rim
    T( 10, 22, 150, 22, 150, 26, '#4A4A4A'),
    // Top clarifying water band (stratified — lighter)
    T( 18, 26,  50, 26,  34, 32, '#D8C8A4'),
    T( 46, 26,  80, 26,  64, 32, '#D8C8A4'),
    T( 76, 26, 110, 26,  94, 32, '#D8C8A4'),
    T(106, 26, 142, 26, 124, 32, '#D8C8A4'),
    T( 18, 32,  50, 32,  34, 38, '#C9A878'),
    T( 46, 32,  80, 32,  64, 38, '#C9A878'),
    T( 76, 32, 110, 32,  94, 38, '#C9A878'),
    T(106, 32, 142, 32, 124, 38, '#C9A878'),
    // Floc dots sinking in clarifying zone
    T( 32, 30,  34, 32,  30, 32, '#6E4720'),
    T( 68, 28,  70, 30,  66, 30, '#6E4720'),
    T( 96, 32,  98, 34,  94, 34, '#6E4720'),
    T(120, 30, 122, 32, 118, 32, '#6E4720'),
    T( 50, 34,  52, 36,  48, 36, '#6E4720'),

    // ---- 30–47 MID-LOWER (mid-turbid water + sloped floor + sediment) ----
    // Middle turbid water
    T( 18, 38,  50, 38,  34, 46, '#A07C4A'),
    T( 46, 38,  80, 38,  64, 46, '#A07C4A'),
    T( 76, 38, 110, 38,  94, 46, '#A07C4A'),
    T(106, 38, 142, 38, 124, 46, '#A07C4A'),
    T( 18, 46,  50, 46,  34, 50, '#8B6534'),
    T( 46, 46,  80, 46,  64, 50, '#8B6534'),
    T( 76, 46, 110, 46,  94, 50, '#8B6534'),
    T(106, 46, 142, 46, 124, 50, '#8B6534'),
    // THE SLOPED FLOOR — key visual feature (diagonal wedge)
    T( 18, 50,  80, 58,  18, 62, '#6B4520'),
    T( 18, 62,  80, 58, 142, 62, '#5C3A1E'),
    T( 80, 58, 142, 62, 142, 50, '#7A5428'),
    // Sediment pile (dark cone at low end of slope)
    T(100, 52, 142, 58, 142, 62, '#3E2514'),
    T(100, 52, 142, 62, 116, 62, '#2B170B'),
    T(120, 54, 142, 60, 142, 62, '#1C0D06'),
    // More floc in transition zone
    T( 28, 42,  30, 44,  26, 44, '#6E4720'),
    T( 56, 42,  58, 44,  54, 44, '#6E4720'),
    T( 84, 42,  86, 44,  82, 44, '#6E4720'),
    T(112, 42, 114, 44, 110, 44, '#6E4720'),

    // ---- 48–59 LOWER (ground context + inlet/outlet pipes) ----
    T(  2, 28,  10, 28,  10, 34, '#5C6B75'),  // inlet pipe
    T(150, 28, 158, 28, 150, 34, '#5C6B75'),  // outlet pipe
    T(  0, 62,  20, 62,  10, 72, '#8A7A68'),
    T( 16, 62,  40, 62,  28, 72, '#76665A'),
    T(120, 62, 144, 62, 132, 72, '#76665A'),
    T(140, 62, 160, 62, 152, 72, '#8A7A68'),
    T(  0, 72,  35, 72,  18, 82, '#76665A'),
    T(125, 72, 160, 72, 142, 82, '#76665A'),
    T(  0, 82,  40, 82,  20, 90, '#5C4E42'),
    T(120, 82, 160, 82, 140, 90, '#5C4E42'),
    T( 45, 82,  80, 82,  62, 90, '#76665A'),
    T( 80, 82, 115, 82,  98, 90, '#76665A')
  ];
}

// =========================================================
// SCENE 5 — Roughing Filter (URF): vertical tank, 3 gravel layers, upward flow
// Palette: cool pale greens/stone, water cleared at top
// =========================================================
function sceneURF() {
  return [
    // ---- 0–11 UPPER (clean water exit + atmosphere) ----
    // Clean water emerging at top (arrow up)
    T( 74,  0,  86,  0,  80,  6, '#8FCFB5'),  // main stream out
    T( 76,  6,  84,  6,  80, 12, '#CFE3D9'),
    T( 72, 10,  76, 10,  74, 14, '#CFE3D9'),
    T( 84, 10,  88, 10,  86, 14, '#CFE3D9'),
    // Sky
    T(  6, 10,  22,  8,  16, 16, '#DDE7DE'),
    T( 36, 12,  52,  8,  48, 18, '#CBD8CD'),
    T(106, 12, 122,  8, 118, 18, '#CBD8CD'),
    T(140,  8, 154, 12, 148, 18, '#B9C8BB'),
    // Upward flow hints high in vessel
    T( 76, 18,  84, 18,  80, 14, '#8FCFB5'),
    T( 68, 20,  72, 20,  70, 24, '#CFE3D9'),
    T( 88, 20,  92, 20,  90, 24, '#CFE3D9'),
    T( 58, 22,  62, 22,  60, 26, '#DDE7DE'),

    // ---- 12–29 MID-UPPER (tank shell upper + fine gravel layer) ----
    // Tank shell upper walls
    T( 48, 14,  56, 14,  56, 30, '#C8CFC6'),  // left wall
    T( 48, 14,  48, 30,  56, 30, '#A3ABA3'),
    T(104, 14, 112, 14, 112, 30, '#C8CFC6'),
    T(112, 14, 112, 30, 104, 30, '#A3ABA3'),
    T( 48, 14, 112, 14, 112, 18, '#DDE3DA'),  // top rim
    // Water cap (clearing) INSIDE vessel
    T( 56, 18,  78, 18,  68, 22, '#CFE3D9'),
    T( 80, 18, 104, 18,  92, 22, '#CFE3D9'),
    T( 56, 22,  80, 22,  68, 28, '#A8D0BA'),
    T( 80, 22, 104, 22,  92, 28, '#A8D0BA'),
    // Fine gravel layer (top — finest)
    T( 56, 28,  80, 28,  68, 34, '#D4C4A8'),
    T( 80, 28, 104, 28,  92, 34, '#D4C4A8'),
    T( 56, 34,  80, 34,  68, 40, '#B8A988'),
    T( 80, 34, 104, 34,  92, 40, '#B8A988'),
    // Fine gravel chunks
    T( 62, 32,  66, 31,  64, 35, '#9E8F72'),
    T( 74, 32,  78, 31,  76, 35, '#9E8F72'),
    T( 86, 32,  90, 31,  88, 35, '#9E8F72'),
    T( 98, 32, 102, 31, 100, 35, '#9E8F72'),
    T( 60, 37,  64, 36,  62, 40, '#9E8F72'),

    // ---- 30–47 MID-LOWER (medium + coarse gravel + incoming turbid) ----
    // Medium gravel layer
    T( 56, 40,  80, 40,  68, 46, '#9C8B73'),
    T( 80, 40, 104, 40,  92, 46, '#9C8B73'),
    T( 56, 46,  80, 46,  68, 52, '#7E6D58'),
    T( 80, 46, 104, 46,  92, 52, '#7E6D58'),
    // Medium chunks
    T( 62, 43,  68, 42,  65, 48, '#5E4E38'),
    T( 78, 43,  84, 42,  81, 48, '#5E4E38'),
    T( 94, 43, 100, 42,  97, 48, '#5E4E38'),
    // Coarse gravel layer (bottom — big chunks)
    T( 56, 52,  80, 52,  68, 58, '#6B5B4A'),
    T( 80, 52, 104, 52,  92, 58, '#6B5B4A'),
    T( 56, 58,  80, 58,  68, 64, '#4E4034'),
    T( 80, 58, 104, 58,  92, 64, '#4E4034'),
    // Coarse stone chunks
    T( 60, 55,  70, 54,  66, 60, '#3E3328'),
    T( 78, 55,  88, 54,  84, 60, '#3E3328'),
    T( 92, 57, 102, 56,  98, 62, '#3E3328'),
    T( 64, 62,  72, 60,  68, 64, '#3E3328'),
    T( 84, 62,  92, 60,  88, 64, '#3E3328'),
    // Tank lower walls
    T( 48, 30,  56, 30,  56, 64, '#A3ABA3'),
    T(104, 30, 112, 30, 112, 64, '#A3ABA3'),
    T( 48, 64,  56, 64,  56, 30, '#8A9288'),

    // ---- 48–59 LOWER (turbid in at bottom + ground) ----
    T( 56, 64, 104, 64,  98, 68, '#6B5B4A'),  // filter base
    T( 48, 64, 112, 64, 108, 70, '#3E3328'),
    // Turbid water entering from bottom
    T( 60, 68,  68, 70,  64, 74, '#8B5A2B'),
    T( 96, 68, 100, 70,  98, 74, '#8B5A2B'),
    // Ground
    T(  0, 70,  36, 70,  18, 80, '#8A7A68'),
    T(122, 70, 160, 70, 142, 80, '#8A7A68'),
    T(  0, 80,  40, 80,  20, 90, '#76665A'),
    T(120, 80, 160, 80, 140, 90, '#76665A'),
    T( 40, 80,  80, 80,  60, 90, '#8A7C68'),
    T( 80, 80, 120, 80, 100, 90, '#76665A'),
    // Grass accents
    T( 14, 72,  18, 68,  20, 74, '#6BA368'),
    T(138, 72, 142, 68, 144, 74, '#6BA368')
  ];
}

// =========================================================
// SCENE 6 — Slow Sand Filter: wide shallow basin, vivid green Schmutzdecke on sand
// Palette: pale green above + vivid green biofilm + beige sand + muted surround
// =========================================================
function sceneSand() {
  return [
    // ---- 0–11 UPPER (pale sky + life hint) ----
    T(  8, 10,  28,  6,  22, 16, '#D5E6DA'),
    T( 40, 14,  60, 10,  54, 20, '#C2D6C8'),
    T( 74,  6,  92, 10,  86, 16, '#C2D6C8'),
    T(108, 12, 126,  8, 120, 18, '#D5E6DA'),
    T(138, 14, 156, 10, 150, 20, '#B2C8B8'),
    // Microbe tendrils rising (life escaping)
    T( 38, 24,  42, 20,  44, 26, '#6FAE5E'),
    T( 70, 24,  74, 20,  76, 26, '#6FAE5E'),
    T(100, 24, 104, 20, 106, 26, '#6FAE5E'),
    T(128, 24, 132, 20, 134, 26, '#6FAE5E'),
    // Water droplet hints
    T( 22, 28,  24, 30,  20, 30, '#A8D8E8'),
    T( 56, 28,  58, 30,  54, 30, '#A8D8E8'),
    T(140, 28, 142, 30, 138, 30, '#A8D8E8'),

    // ---- 12–29 MID-UPPER (basin walls top + standing water + Schmutzdecke) ----
    // Basin walls upper
    T( 14, 26,  22, 26,  22, 36, '#4A4A4A'),
    T( 14, 26,  14, 36,  22, 36, '#333333'),
    T(138, 26, 146, 26, 146, 36, '#4A4A4A'),
    T(138, 36, 146, 36, 146, 26, '#333333'),
    T( 14, 26, 146, 26, 146, 30, '#5A5A5A'),  // top rim
    // Standing water (pale clear blue)
    T( 22, 30,  50, 30,  38, 36, '#A8D8E8'),
    T( 46, 30,  80, 30,  64, 36, '#A8D8E8'),
    T( 76, 30, 110, 30,  94, 36, '#A8D8E8'),
    T(106, 30, 138, 30, 122, 36, '#A8D8E8'),
    T( 22, 36,  50, 36,  38, 40, '#8AC4D9'),
    T( 46, 36,  80, 36,  64, 40, '#8AC4D9'),
    T( 76, 36, 110, 36,  94, 40, '#8AC4D9'),
    T(106, 36, 138, 36, 122, 40, '#8AC4D9'),
    // SCHMUTZDECKE — the signature vivid green living layer
    T( 22, 40,  50, 40,  38, 44, '#6FAE5E'),
    T( 46, 40,  80, 40,  64, 44, '#7FBF6A'),
    T( 76, 40, 110, 40,  94, 44, '#6FAE5E'),
    T(106, 40, 138, 40, 122, 44, '#7FBF6A'),
    T( 22, 44, 138, 44, 138, 46, '#528E44'),
    // Microbe dots within Schmutzdecke
    T( 36, 42,  38, 44,  34, 44, '#3A5A3A'),
    T( 66, 42,  68, 44,  64, 44, '#3A5A3A'),
    T( 96, 42,  98, 44,  94, 44, '#3A5A3A'),
    T(124, 42, 126, 44, 122, 44, '#3A5A3A'),

    // ---- 30–47 MID-LOWER (sand bed upper + lower + percolation) ----
    // Sand bed upper
    T( 22, 46,  50, 46,  38, 54, '#E4D6A7'),
    T( 46, 46,  80, 46,  64, 54, '#E4D6A7'),
    T( 76, 46, 110, 46,  94, 54, '#E4D6A7'),
    T(106, 46, 138, 46, 122, 54, '#E4D6A7'),
    T( 22, 54,  50, 54,  38, 58, '#C9B98A'),
    T( 46, 54,  80, 54,  64, 58, '#C9B98A'),
    T( 76, 54, 110, 54,  94, 58, '#C9B98A'),
    T(106, 54, 138, 54, 122, 58, '#C9B98A'),
    // Sand bed lower
    T( 22, 58,  50, 58,  38, 64, '#B8A77A'),
    T( 46, 58,  80, 58,  64, 64, '#B8A77A'),
    T( 76, 58, 110, 58,  94, 64, '#B8A77A'),
    T(106, 58, 138, 58, 122, 64, '#B8A77A'),
    // Sand grains texture
    T( 30, 50,  32, 52,  28, 52, '#A8976A'),
    T( 58, 50,  60, 52,  56, 52, '#A8976A'),
    T( 86, 50,  88, 52,  84, 52, '#A8976A'),
    T(114, 50, 116, 52, 112, 52, '#A8976A'),
    // Percolation dots descending into sand
    T( 42, 48,  44, 50,  40, 50, '#A8D8E8'),
    T( 88, 52,  90, 54,  86, 54, '#A8D8E8'),

    // ---- 48–59 LOWER (basin walls lower + base + ground) ----
    T( 14, 64,  22, 64,  22, 36, '#333333'),  // completes left wall downward
    T(138, 64, 146, 64, 146, 36, '#333333'),  // completes right wall
    T( 22, 64, 138, 64, 138, 68, '#2B2B2B'),  // basin base
    T(  0, 68,  36, 68,  18, 78, '#8A7A68'),
    T(124, 68, 160, 68, 142, 78, '#8A7A68'),
    T(  0, 78,  40, 78,  20, 90, '#76665A'),
    T(120, 78, 160, 78, 140, 90, '#76665A'),
    T( 40, 78,  80, 78,  60, 90, '#8A7C68'),
    T( 80, 78, 120, 78, 100, 90, '#76665A'),
    T( 18, 70,  22, 66,  24, 72, '#6BA368'),  // grass
    T(136, 70, 140, 66, 142, 72, '#6BA368'),  // grass
    T( 60, 70,  64, 66,  66, 72, '#6BA368')   // grass
  ];
}

// =========================================================
// SCENE 7 — Biochar Polishing + delivery: dark column, clean water arc, child's cup
// Palette: warm golden hour + dark biochar + crystal cyan water
// =========================================================
function sceneBiochar() {
  return [
    // ---- 0–11 UPPER (golden hour sky + acacia canopy + sparkles) ----
    T(  8,  8,  28,  4,  20, 14, '#F6E3B8'),
    T( 40, 10,  62,  6,  56, 18, '#EECFA0'),
    T( 78,  4,  98,  8,  92, 16, '#F6E3B8'),
    T(116, 10, 138,  6, 130, 18, '#EECFA0'),
    // Acacia canopy (right side, near delivery point)
    T(124, 22, 146, 18, 134, 28, '#3E7A3E'),
    T(128, 24, 148, 22, 140, 30, '#4F8F4F'),
    T(136, 18, 144, 14, 142, 20, '#6BA368'),
    // Schoolhouse roof
    T(124, 30, 148, 30, 136, 24, '#8C5E3E'),
    // Sparkles on stream
    T( 80, 14,  82, 18,  78, 18, '#FFFFFF'),
    T( 94, 22,  96, 26,  92, 26, '#FFFFFF'),
    T( 40, 26,  42, 30,  38, 30, '#FFF3C4'),
    T( 58, 22,  60, 26,  56, 26, '#FFF3C4'),

    // ---- 12–29 MID-UPPER (biochar column top + outlet + stream begins) ----
    // Biochar column top cap
    T( 20, 20,  42, 20,  42, 26, '#3A3A3A'),
    T( 20, 20,  20, 26,  42, 26, '#2A2A2A'),
    T( 20, 26,  42, 26,  42, 32, '#2A2A2A'),
    T( 20, 26,  20, 32,  42, 32, '#1C1C1C'),
    // Biochar column body (dark, faceted)
    T( 20, 32,  42, 32,  42, 40, '#1C1C1C'),
    T( 20, 32,  20, 40,  42, 40, '#0E0E0E'),
    T( 20, 40,  42, 40,  42, 48, '#1C1C1C'),
    T( 20, 40,  20, 48,  42, 48, '#0E0E0E'),
    // Outlet pipe going right from column
    T( 42, 36,  66, 36,  66, 42, '#5C6B75'),
    T( 42, 36,  46, 42,  66, 42, '#3E4952'),
    // Water stream arc (clean cyan from outlet)
    T( 66, 38,  74, 40,  72, 46, '#7FD8E8'),
    T( 74, 40,  82, 44,  78, 48, '#7FD8E8'),
    T( 82, 44,  88, 50,  84, 52, '#9FE3EF'),
    T( 88, 50,  94, 54,  90, 56, '#9FE3EF'),
    // Schoolhouse body
    T(124, 30, 148, 30, 148, 46, '#C4926B'),
    T(124, 30, 124, 46, 148, 46, '#A87850'),
    T(132, 38, 140, 38, 136, 46, '#5C3A1E'),  // door
    // Sparkle / reflections on column
    T( 24, 28,  26, 30,  22, 30, '#5C5C5C'),
    T( 36, 42,  38, 44,  34, 44, '#4A4A4A'),

    // ---- 30–47 MID-LOWER (child's hands + cup + water landing) ----
    // Hands (cupped)
    T( 94, 54, 108, 58,  94, 62, '#F2C27A'),   // palm L
    T(108, 58, 124, 58, 118, 64, '#E8A85E'),   // palm R
    T( 94, 62, 124, 64, 108, 70, '#D88E42'),   // palm shadow
    T(102, 56, 114, 58, 108, 62, '#F8D29A'),   // palm highlight
    // Water pooling in hands
    T( 98, 58, 118, 58, 108, 62, '#7FD8E8'),
    T(102, 60, 116, 60, 108, 64, '#9FE3EF'),
    // Stream meeting hands (splash)
    T( 88, 54,  94, 50,  98, 58, '#9FE3EF'),
    T( 92, 56,  96, 52, 100, 58, '#BBECF4'),
    // Biochar particles visible inside column
    T( 24, 34,  28, 36,  24, 38, '#2A2A2A'),
    T( 30, 38,  36, 40,  32, 42, '#1C1C1C'),
    T( 24, 42,  30, 44,  24, 46, '#2A2A2A'),
    T( 32, 44,  38, 46,  34, 48, '#1C1C1C'),
    // Biochar column base/plinth
    T( 20, 48,  42, 48,  40, 54, '#2A2A2A'),
    T( 20, 48,  22, 54,  40, 54, '#1C1C1C'),
    // Ground under column
    T( 14, 54,  48, 54,  30, 60, '#8A7C6A'),
    // Extra sparkle on water stream
    T( 76, 44,  78, 48,  74, 48, '#FFFFFF'),
    T( 86, 52,  88, 56,  84, 56, '#FFFFFF'),
    // Acacia trunk
    T(132, 28, 134, 28, 133, 44, '#6B4A2B'),

    // ---- 48–59 LOWER (ground) ----
    T(  0, 60,  28, 60,  14, 70, '#C49C74'),
    T( 24, 60,  58, 60,  42, 70, '#A8886B'),
    T( 54, 60,  90, 60,  72, 70, '#C49C74'),
    T( 86, 64, 122, 62, 104, 72, '#A8886B'),
    T(118, 64, 152, 64, 138, 72, '#C49C74'),
    T(148, 64, 160, 64, 156, 72, '#A8886B'),
    T(  0, 72,  40, 72,  20, 82, '#8A6A48'),
    T( 35, 72,  80, 72,  60, 82, '#A8886B'),
    T( 75, 72, 120, 72, 100, 82, '#8A6A48'),
    T(115, 72, 160, 72, 140, 82, '#A8886B'),
    T(  0, 82,  80, 82,  40, 90, '#5C3A1E'),
    T( 80, 82, 160, 82, 120, 90, '#5C3A1E')
  ];
}

const SCENES = [
  sceneIntro(), sceneNight(),  sceneSolar(),  sceneBuffer(),  sceneCascade(),
  sceneSettle(), sceneURF(),   sceneSand(),   sceneBiochar()
];

// Sanity check
SCENES.forEach((s, i) => {
  if (s.length !== N) console.warn(`Scene ${i}: ${s.length} triangles (expected ${N})`);
});

// =========================================================
// Tween engine — JS-driven (CSS can't animate `points`)
// =========================================================
const current = SCENES[0].map(tr => ({
  p: tr.p.map(pt => [pt[0], pt[1]]),
  f: tr.f
}));

// =========================================================
// Perpetual render loop
//   - Runs every frame, always
//   - If a scene transition is active, interpolates points + fill
//   - On top of the base points, adds a subtle idle wobble so
//     triangles feel alive. Amplitude small enough not to break
//     the shape; per-index phase keeps neighbours nearly in sync.
// =========================================================
const tweenState = {
  active: false,
  startTime: 0,
  from: null,
  target: null
};

function applyScene(idx) {
  const target = SCENES[idx];
  if (!target) return;

  tweenState.from = current.map(tr => ({
    p: tr.p.map(pt => [pt[0], pt[1]]),
    f: tr.f
  }));
  tweenState.target = target;
  tweenState.startTime = performance.now();
  tweenState.active = true;

  // Tint the whole page to match the scene's mood.
  const theme = THEME[idx];
  if (theme) {
    const r = document.documentElement.style;
    r.setProperty('--bg',             theme.bg);
    r.setProperty('--halo',           theme.halo);
    r.setProperty('--text-primary',   theme.textPrimary);
    r.setProperty('--text-secondary', theme.textSecondary);
    r.setProperty('--text-label',     theme.textLabel);
    r.setProperty('--panel-bg',       theme.panel);
  }

  const state = etapLogic[idx];
  if (state) {
    animateValue(turbEl, state.turb, 600);
    animateValue(gasEl,  state.gas,  600);
    animateValue(pathEl, state.path, 600);
    animateValue(orgEl,  state.org,  600);
  }
}

function renderLoop(now) {
  // --- 1. Advance the tween (writes into current[])
  if (tweenState.active) {
    let anyGoing = false;
    for (let i = 0; i < N; i++) {
      const delay = i * STAGGER;
      const raw = (now - tweenState.startTime - delay) / DUR;
      const t = Math.max(0, Math.min(1, raw));
      if (raw < 1) anyGoing = true;
      const e = easeInOut(t);
      const a = tweenState.from[i];
      const b = tweenState.target[i];
      current[i].p[0][0] = lerp(a.p[0][0], b.p[0][0], e);
      current[i].p[0][1] = lerp(a.p[0][1], b.p[0][1], e);
      current[i].p[1][0] = lerp(a.p[1][0], b.p[1][0], e);
      current[i].p[1][1] = lerp(a.p[1][1], b.p[1][1], e);
      current[i].p[2][0] = lerp(a.p[2][0], b.p[2][0], e);
      current[i].p[2][1] = lerp(a.p[2][1], b.p[2][1], e);
      current[i].f = lerpHex(a.f, b.f, e);
    }
    if (!anyGoing) tweenState.active = false;
  }

  // --- 2. Render with idle wobble
  const tm = now / 1000;
  for (let i = 0; i < N; i++) {
    const c = current[i];
    // Signed area: twice the triangle area. Skip wobble on collapsed/hidden tris.
    const a2 = Math.abs(
      (c.p[1][0] - c.p[0][0]) * (c.p[2][1] - c.p[0][1]) -
      (c.p[2][0] - c.p[0][0]) * (c.p[1][1] - c.p[0][1])
    );
    let dx = 0, dy = 0;
    if (a2 > 0.5) {
      const phase = i * 0.23;
      dx = Math.sin(tm * 0.55 + phase) * 0.22;
      dy = Math.cos(tm * 0.42 + phase * 1.3) * 0.18;
    }

    polys[i].setAttribute('points',
      `${(c.p[0][0] + dx).toFixed(2)},${(c.p[0][1] + dy).toFixed(2)} ` +
      `${(c.p[1][0] + dx).toFixed(2)},${(c.p[1][1] + dy).toFixed(2)} ` +
      `${(c.p[2][0] + dx).toFixed(2)},${(c.p[2][1] + dy).toFixed(2)}`);
    polys[i].setAttribute('fill', c.f);
    polys[i].setAttribute('stroke', c.f);
  }

  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function lerpHex(a, b, t) {
  const ca = parseHex(a), cb = parseHex(b);
  const r = Math.round(lerp(ca[0], cb[0], t));
  const g = Math.round(lerp(ca[1], cb[1], t));
  const bl = Math.round(lerp(ca[2], cb[2], t));
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}
function parseHex(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function toHex(n) { return n.toString(16).padStart(2,'0'); }

function animateValue(obj, targetValue, duration) {
  const currentValue = parseInt(obj.innerText.replace('%', '')) || 0;
  // Use a class so the CSS var for "primary" text color kicks in on unchanged
  // indicators and adapts to the scene theme (e.g. light text on dark night bg).
  obj.classList.toggle('ind-changed', targetValue < 100);
  if (currentValue === targetValue) return;
  let startTimestamp = null;
  const tick = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const eo = progress * (2 - progress);
    obj.innerHTML = Math.floor(eo * (targetValue - currentValue) + currentValue) + '%';
    if (progress < 1) window.requestAnimationFrame(tick);
    else obj.innerHTML = targetValue + '%';
  };
  window.requestAnimationFrame(tick);
}

// =========================================================
// Scroll observer
// =========================================================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    steps.forEach(s => s.classList.remove('active'));
    entry.target.classList.add('active');
    applyScene(parseInt(entry.target.getAttribute('data-step'), 10));
  });
}, {
  root: document.getElementById('scroll-zone'),
  rootMargin: '-35% 0px -35% 0px',
  threshold: 0
});

steps.forEach(s => observer.observe(s));

// Initial paint
applyScene(0);
