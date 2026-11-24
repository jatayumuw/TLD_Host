import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ISO_KIT_PATH =
  process.env.ISO_KIT_PATH ||
  join(homedir(), ".gemini", "config", "plugins", "minimalist-design", "skills", "anatomy", "kit", "iso-kit.mjs");
const k = await import(pathToFileURL(ISO_KIT_PATH).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIR = dirname(HERE);
const SVG_OUT = join(WEBSITE_DIR, "assets", "temaram-room-anatomy.svg");
const JS_OUT = join(WEBSITE_DIR, "temaram-room-art.js");

const WIDTH = 1440;
const HEIGHT = 900;

// Compact urban studio room footprint (world coordinates ~1px scale)
const FLOOR = { x: -210, y: -180, w: 420, d: 360, r: 8 };
const WALL_T = 10;
const WALL_H = 182;

const P = k.fitProjection(
  [...k.boxCorners(FLOOR, -12, WALL_H + 8)],
  WIDTH,
  HEIGHT,
  { pad: 76, azimuth: 42, elevation: 30 },
);

const at = (pt) => k.iso(pt, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const sortByDepth = (items) =>
  [...items].sort((a, b) => k.depthOf(a.anchor, P) - k.depthOf(b.anchor, P));
const cornersByDepth = (plan, inset) =>
  k.corners(plan, inset).sort(
    (a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P),
  );

// Hero light coordinate: center of Temaram ION 1 bottom light-guide collar
const LAMP_DESK_X = 36;
const LAMP_DESK_Y = -128;
const LAMP_Z = 73.5;
const [lampSx, lampSy] = at([LAMP_DESK_X, LAMP_DESK_Y, LAMP_Z]);

function drawRoomShell() {
  const out = [];

  // 1. Floor slab & architectural plank grooves
  out.push(`<path class="iso-halo" d="${k.haloOf(FLOOR, -12, 10, P)}"/>`);
  out.push(S(k.slabOf(FLOOR, -10, 10, P, 6, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(FLOOR, 3), 0, P, 6), { tone: "faint" }));
  const floorSeams = [];
  for (let gx = FLOOR.x + WALL_T + 42; gx < FLOOR.x + FLOOR.w - 16; gx += 46) {
    floorSeams.push(k.lineOnTop([gx, FLOOR.y + WALL_T], [gx, FLOOR.y + FLOOR.d - 2], 0, P));
  }
  out.push(L(floorSeams.join(""), { tone: "faint" }));

  // 2. Woven studio rug centered in open floor
  const RUG = { x: -32, y: -42, w: 172, d: 164, r: 4 };
  out.push(S(k.slabOf(RUG, 0, 1.4, P, 4, 0.4), { tone: "faint", crease: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(RUG, 7), 1.4, P, 4), { tone: "lo" }));

  // 3. Cutaway Left Back Wall (x = -210..-200) & Right Back Wall (y = -180..-170)
  const LEFT_WALL = { x: FLOOR.x, y: FLOOR.y, w: WALL_T, d: FLOOR.d, r: 2 };
  const RIGHT_WALL = { x: FLOOR.x + WALL_T, y: FLOOR.y, w: FLOOR.w - WALL_T, d: WALL_T, r: 2 };
  const wallOrder = [
    {
      anchor: [LEFT_WALL.x + WALL_T / 2, LEFT_WALL.y + LEFT_WALL.d / 2, 0],
      svg: S(k.slabOf(LEFT_WALL, 0, WALL_H, P, 2, 1.2), { tone: "mid" }),
    },
    {
      anchor: [RIGHT_WALL.x + RIGHT_WALL.w / 2, RIGHT_WALL.y + WALL_T / 2, 0],
      svg: S(k.slabOf(RIGHT_WALL, 0, WALL_H, P, 2, 1.2), { tone: "mid" }),
    },
  ].sort((a, b) => k.depthOf(a.anchor, P) - k.depthOf(b.anchor, P));
  wallOrder.forEach((w) => out.push(w.svg));

  // Baseboards flush along inner wall bases
  out.push(
    S(
      k.slabOf({ x: FLOOR.x + WALL_T, y: FLOOR.y + WALL_T, w: 2.2, d: FLOOR.d - WALL_T - 2, r: 0.6 }, 0, 8, P, 2),
      { tone: "lo" },
    ),
  );
  out.push(
    S(
      k.slabOf({ x: FLOOR.x + WALL_T + 2.2, y: FLOOR.y + WALL_T, w: FLOOR.w - WALL_T - 4, d: 2.2, r: 0.6 }, 0, 8, P, 2),
      { tone: "lo" },
    ),
  );

  // 4. Recessed Window with Venetian Blinds on Back-Left Wall
  const WX = FLOOR.x + WALL_T;
  const WY0 = -114;
  const WY1 = 10;
  const WZ0 = 56;
  const WZ1 = 148;
  // Dark pane backing slab
  out.push(
    S(k.slabOf({ x: WX, y: WY0 + 4, w: 1.6, d: WY1 - WY0 - 8, r: 0.4 }, WZ0 + 4, WZ1 - WZ0 - 8, P, 2), {
      tone: "faint",
    }),
  );
  // Top header, side jambs, center mullion, lower sill (bottom-to-top)
  out.push(
    S(k.slabOf({ x: WX, y: WY0 - 3, w: 5.5, d: WY1 - WY0 + 6, r: 1 }, WZ0 - 4, 4.5, P, 2, 0.5), { tone: "mid" }),
  );
  out.push(S(k.slabOf({ x: WX, y: WY0, w: 4, d: 4.5, r: 0.6 }, WZ0 + 0.5, WZ1 - WZ0, P, 2), { tone: "mid" }));
  out.push(
    S(k.slabOf({ x: WX, y: (WY0 + WY1) / 2 - 2, w: 3.2, d: 4, r: 0.5 }, WZ0 + 0.5, WZ1 - WZ0 - 4, P, 2), {
      tone: "lo",
    }),
  );
  // Horizontal blind slats spanning jamb to jamb cleanly
  for (let bz = WZ0 + 18; bz <= WZ1 - 12; bz += 12) {
    out.push(
      S(k.slabOf({ x: WX + 1.6, y: WY0 + 4.5, w: 2.4, d: WY1 - WY0 - 9, r: 0.4 }, bz, 1.8, P, 2), {
        tone: "lo",
        crease: "none",
      }),
    );
  }
  out.push(S(k.slabOf({ x: WX, y: WY1 - 4.5, w: 4, d: 4.5, r: 0.6 }, WZ0 + 0.5, WZ1 - WZ0, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: WX, y: WY0, w: 4.4, d: WY1 - WY0, r: 0.6 }, WZ1 - 4, 4.5, P, 2, 0.5), { tone: "mid" }));

  // 5. Wall Art Mirror & Floating Botanical Shelf on Back-Right Wall
  const RY = FLOOR.y + WALL_T;
  // Tall mirror panel
  const MIRROR = { x: -162, y: RY, w: 58, d: 3.4, r: 2 };
  out.push(S(k.slabOf(MIRROR, 54, 92, P, 3, 0.6), { tone: "mid" }));
  out.push(
    L(
      k.pathOf(
        [
          at([MIRROR.x + 5, RY + 3.4, 59]),
          at([MIRROR.x + MIRROR.w - 5, RY + 3.4, 59]),
          at([MIRROR.x + MIRROR.w - 5, RY + 3.4, 141]),
          at([MIRROR.x + 5, RY + 3.4, 141]),
        ],
        true,
      ),
      { tone: "faint" },
    ),
  );

  // Floating timber shelf above desk + brackets + books + amber vials
  const SHELF = { x: -12, y: RY, w: 126, d: 24, r: 2 };
  for (const bx of [6, 90]) {
    out.push(S(k.slabOf({ x: bx, y: RY, w: 5, d: 18, r: 1 }, 104, 10, P, 2), { tone: "lo" }));
  }
  out.push(S(k.slabOf(SHELF, 114, 5.5, P, 3, 0.8), { tone: "mid" }));
  const books = [
    { x: -2, w: 7, h: 24 },
    { x: 5.8, w: 6, h: 20 },
    { x: 12.5, w: 8, h: 25 },
    { x: 21.2, w: 6.5, h: 22 },
  ];
  books.forEach((bk) => {
    out.push(S(k.slabOf({ x: bk.x, y: RY + 3, w: bk.w, d: 16, r: 0.8 }, 119.5, bk.h, P, 2, 0.4), { tone: "hi" }));
  });
  // Two cylindrical essential-oil vials on the right of the shelf
  for (const [vx, vh] of [
    [76, 14],
    [92, 11],
  ]) {
    out.push(S(k.cylinder(vx, RY + 12, 4.4, 119.5, vh, P, 20, 0.4), { tone: "hi" }));
    out.push(S(k.cylinder(vx, RY + 12, 2.2, 119.5 + vh, 3.6, P, 16), { tone: "mid" }));
  }

  return out.join("");
}

function drawPlanter() {
  const CX = -172;
  const CY = -142;
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: CX - 16, y: CY - 16, w: 32, d: 32, r: 16 }, 0, 4, P)}"/>`);
  out.push(S(k.cylinder(CX, CY, 15.5, 0, 2.4, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(CX, CY, 13.5, 2.4, 24, P, 32, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(CX, CY, 14.8, 26.4, 4, P, 32, 0.6), { tone: "hi" }));
  out.push(S(k.cylinder(CX, CY, 12.2, 29.8, 1.2, P, 24), { tone: "lo" }));
  // Architectural stem & leaf fronds
  out.push(S(k.cylinder(CX, CY, 1.5, 31, 26, P, 16), { tone: "lo" }));
  const leaves = [
    [
      [CX, CY],
      [CX + 15, CY + 6],
      [CX + 22, CY + 2],
      [CX + 9, CY - 6],
    ],
    [
      [CX, CY],
      [CX - 8, CY + 16],
      [CX - 3, CY + 23],
      [CX + 5, CY + 11],
    ],
    [
      [CX, CY],
      [CX + 10, CY - 13],
      [CX + 18, CY - 17],
      [CX + 15, CY - 5],
    ],
  ];
  leaves.forEach((ring, i) => {
    out.push(S(k.extrude(ring, 42 + i * 5.5, 1.6, P, { convex: true }), { tone: "hi", crease: "none" }));
  });
  return out.join("");
}

function drawBed() {
  const BED = { x: -192, y: -44, w: 146, d: 118, r: 4 };
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BED, 0, 14, P)}"/>`);

  // 4 short timber feet behind frame
  for (const [lx, ly] of cornersByDepth(BED, 8)) {
    out.push(S(k.cylinder(lx, ly, 3.2, 0, 8, P, 20), { tone: "lo" }));
  }

  // Headboard against left wall + vertical slat panel joints
  const HEAD = { x: BED.x, y: BED.y, w: 10, d: BED.d, r: 3 };
  out.push(S(k.slabOf(HEAD, 8, 66, P, 3, 1.0), { tone: "mid" }));
  const slatSeams = [];
  for (let sy = BED.y + 16; sy <= BED.y + BED.d - 16; sy += 16) {
    slatSeams.push(k.segment([HEAD.x + HEAD.w, sy, 12], [HEAD.x + HEAD.w, sy, 70], P));
  }
  out.push(L(slatSeams.join(""), { tone: "faint" }));

  // Platform frame plinth
  out.push(S(k.slabOf(BED, 8, 9, P, 4, 1.0), { tone: "mid" }));

  // Beveled mattress
  const MATT = { x: BED.x + 11, y: BED.y + 6, w: BED.w - 17, d: BED.d - 12, r: 5 };
  out.push(S(k.slabOf(MATT, 17, 15, P, 6, 1.4), { tone: "hi" }));

  // Folded quilt over lower half
  const QUILT = { x: MATT.x + 48, y: MATT.y - 1.5, w: MATT.w - 46.5, d: MATT.d + 3, r: 4 };
  out.push(
    S(
      k.slabOf(QUILT, 17, 17.5, P, 5, 1.2),
      { tone: "mid", inner: L(k.sideSeam(QUILT, 30, P, 5), { tone: "faint" }) },
    ),
  );
  // Fold seam top band
  out.push(L(k.lineOnTop([QUILT.x + 8, QUILT.y], [QUILT.x + 8, QUILT.y + QUILT.d], 34.5, P), { tone: "lo" }));

  // Two pillows sorted back-to-front along +y
  for (const py of [MATT.y + 10, MATT.y + MATT.d / 2 + 4]) {
    const PILLOW = { x: MATT.x + 6, y: py, w: 30, d: 40, r: 6 };
    out.push(S(k.slabOf(PILLOW, 32, 6.5, P, 5, 1.2), { tone: "hi" }));
  }

  return out.join("");
}

function drawNightstand() {
  const NS = { x: -192, y: 86, w: 48, d: 46, r: 3 };
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(NS, 0, 12, P)}"/>`);
  for (const [lx, ly] of cornersByDepth(NS, 6)) {
    out.push(S(k.slabOf({ x: lx - 2, y: ly - 2, w: 4, d: 4, r: 1 }, 0, 10, P, 2), { tone: "lo" }));
  }
  out.push(S(k.slabOf(NS, 10, 4, P, 3, 0.5), { tone: "mid" }));
  // Drawer cabinet box
  out.push(S(k.slabOf(NS, 24, 18, P, 3, 0.9), { tone: "mid" }));
  // Front pull handle bar
  out.push(S(k.slabOf({ x: NS.x + 16, y: NS.y + NS.d, w: 16, d: 2, r: 0.6 }, 32, 2.2, P, 2), { tone: "hi" }));

  // Stacked books + face-down phone (sorted)
  const props = sortByDepth([
    {
      anchor: [-168, 100, 42],
      svg: [
        S(k.slabOf({ x: -180, y: 92, w: 22, d: 16, r: 1.5 }, 42, 3.6, P, 3, 0.4), { tone: "hi" }),
        S(k.slabOf({ x: -178, y: 94, w: 18, d: 13, r: 1.2 }, 45.6, 3.2, P, 3, 0.4), { tone: "mid" }),
      ].join(""),
    },
    {
      anchor: [-160, 120, 42],
      svg: S(k.slabOf({ x: -164, y: 114, w: 12, d: 7, r: 1.8 }, 42, 1.6, P, 4, 0.3), { tone: "lo" }),
    },
  ]);
  props.forEach((p) => out.push(p.svg));

  return out.join("");
}

function drawDeskAndTemaram() {
  const DESK = { x: -22, y: -152, w: 168, d: 84, r: 4 };
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, 10, P)}"/>`);

  // 4 timber desk legs back-to-front
  for (const [lx, ly] of cornersByDepth(DESK, 9)) {
    out.push(S(k.slabOf({ x: lx - 2.6, y: ly - 2.6, w: 5.2, d: 5.2, r: 1.4 }, 0, 56, P, 2), { tone: "lo" }));
  }
  // Back apron rail + under-desk drawer box
  out.push(S(k.slabOf({ x: DESK.x + 8, y: DESK.y + 6, w: DESK.w - 16, d: 4, r: 1 }, 46, 10, P, 2), { tone: "lo" }));
  const DRAWER = { x: DESK.x + 12, y: DESK.y + 12, w: 66, d: 64, r: 2 };
  out.push(S(k.slabOf(DRAWER, 45, 11, P, 3, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: DRAWER.x + 23, y: DRAWER.y + DRAWER.d, w: 20, d: 2, r: 0.6 }, 49.5, 2, P, 2), { tone: "hi" }));

  // Beveled tabletop
  out.push(S(k.slabOf(DESK, 56, 7, P, 5, 1.2), { tone: "mid" }));

  // Desktop objects strictly sorted back-to-front by anchor depth
  const ION = { x: LAMP_DESK_X - 18, y: LAMP_DESK_Y - 10, w: 36, d: 20, r: 5 };
  const LAPTOP = { x: 76, y: -136, w: 50, d: 36, r: 3 };
  const BOOK = { x: 20, y: -98, w: 34, d: 24, r: 1.5 };
  const MUG_CX = 122;
  const MUG_CY = -92;

  const desktopItems = sortByDepth([
    {
      anchor: [LAPTOP.x + LAPTOP.w / 2, LAPTOP.y + LAPTOP.d / 2, 63],
      svg: [
        `<path class="iso-halo" d="${k.haloOf(LAPTOP, 63, 3, P)}"/>`,
        S(
          k.slabOf(LAPTOP, 63, 3.2, P, 4, 0.6),
          { tone: "lo", inner: L(k.sideSeam(LAPTOP, 64.6, P, 4), { tone: "faint" }) },
        ),
        L(k.lineOnTop([LAPTOP.x + 6, LAPTOP.y + 5], [LAPTOP.x + LAPTOP.w - 6, LAPTOP.y + 5], 66.2, P), { tone: "mid" }),
      ].join(""),
    },
    {
      anchor: [LAMP_DESK_X, LAMP_DESK_Y, 63],
      svg: [
        // Ambient light spill pool on desktop directly under ION 1
        `<g class="anatomy-lamp-pool-group" data-lamp-aura>`,
        `  <ellipse cx="${lampSx.toFixed(1)}" cy="${(lampSy + 22).toFixed(1)}" rx="150" ry="96" fill="url(#temaram-lamp-pool)"/>`,
        `</g>`,
        `<path class="iso-halo" d="${k.haloOf(ION, 63, 4, P)}"/>`,
        // Basalt base foot + chamfered plinth
        S(k.slabOf(k.insetPlan(ION, 2), 63, 2.2, P, 4), { tone: "lo" }),
        S(k.slabOf(ION, 65.2, 6, P, 5, 0.8), { tone: "mid" }),
        // Luminous glowing collar (data-lit accent)
        S(k.slabOf(k.insetPlan(ION, 2.4), 71.2, 5.2, P, 4), { tone: "lit", crease: "lit", lit: true }),
        // Reclaimed Javanese teak enclosure with continuous Batik Kawung lid top & side seam
        S(
          k.slabOf(ION, 76.4, 14, P, 5, 1.0),
          { tone: "hi", inner: L(k.sideSeam(ION, 86, P, 5), { tone: "mid" }) },
        ),
        L(k.planOutline(k.insetPlan(ION, 4), 90.4, P, 4), { tone: "lo" }),
        D(k.dotGrid(ION.x + 7.5, ION.y + 6.5, 4, 2, 6.2, 90.4, P), { size: 0.75, tone: "mid" }),
        // Top tactile cap
        S(k.cylinder(LAMP_DESK_X, LAMP_DESK_Y, 3.2, 90.4, 2, P, 24, 0.4), { tone: "hi", lit: true }),
      ].join(""),
    },
    {
      anchor: [BOOK.x + BOOK.w / 2, BOOK.y + BOOK.d / 2, 63],
      svg: [
        S(k.slabOf(BOOK, 63, 2, P, 3, 0.4), { tone: "hi" }),
        L(k.lineOnTop([BOOK.x + BOOK.w / 2, BOOK.y], [BOOK.x + BOOK.w / 2, BOOK.y + BOOK.d], 65, P), { tone: "lo" }),
        S(k.slabOf({ x: BOOK.x + BOOK.w + 4, y: BOOK.y + 4, w: 1.6, d: 16, r: 0.8 }, 63, 1.5, P, 2), { tone: "mid" }),
      ].join(""),
    },
    {
      anchor: [MUG_CX, MUG_CY, 63],
      svg: [
        S(k.slabOf({ x: MUG_CX - 8, y: MUG_CY - 8, w: 16, d: 16, r: 3 }, 63, 1, P, 3), { tone: "lo" }),
        S(k.cylinder(MUG_CX, MUG_CY, 5.4, 64, 9.5, P, 24, 0.5), { tone: "hi" }),
      ].join(""),
    },
  ]);
  desktopItems.forEach((item) => out.push(item.svg));

  // Tucked wooden stool in front of desk
  const STOOL = { x: 36, y: -56, w: 40, d: 34, r: 10 };
  out.push(`<path class="iso-halo" d="${k.haloOf(STOOL, 0, 8, P)}"/>`);
  for (const [lx, ly] of cornersByDepth(STOOL, 7)) {
    out.push(S(k.cylinder(lx, ly, 2, 0, 36, P, 16), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: STOOL.x + 7, y: STOOL.y + 15, w: STOOL.w - 14, d: 3.4, r: 1 }, 13, 2.8, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf(STOOL, 36, 5, P, 6, 1.0), { tone: "hi" }));

  return out.join("");
}

function buildSvg() {
  const roomContent = [
    drawRoomShell(),
    sortByDepth([
      { anchor: [-172, -142, 0], svg: drawPlanter() },
      { anchor: [-119, 15, 0], svg: drawBed() },
      { anchor: [-168, 109, 0], svg: drawNightstand() },
      { anchor: [62, -96, 0], svg: drawDeskAndTemaram() },
    ])
      .map((g) => g.svg)
      .join(""),
  ].join("");

  return [
    `<svg class="iso-svg anatomy-room-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`,
    `  <defs>`,
    `    <radialGradient id="temaram-cone-grad" cx="50%" cy="50%" r="50%">`,
    `      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>`,
    `      <stop offset="28%" stop-color="#dcdcdc" stop-opacity="0.92"/>`,
    `      <stop offset="58%" stop-color="#707070" stop-opacity="0.54"/>`,
    `      <stop offset="82%" stop-color="#222222" stop-opacity="0.18"/>`,
    `      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>`,
    `    </radialGradient>`,
    `    <radialGradient id="temaram-lamp-pool" cx="50%" cy="50%" r="50%">`,
    `      <stop offset="0%" stop-color="var(--preview-hex, #E09648)" stop-opacity="0.48"/>`,
    `      <stop offset="48%" stop-color="var(--preview-hex, #E09648)" stop-opacity="0.16"/>`,
    `      <stop offset="100%" stop-color="var(--preview-hex, #E09648)" stop-opacity="0"/>`,
    `    </radialGradient>`,
    `    <mask id="temaram-room-mask" maskUnits="userSpaceOnUse">`,
    `      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>`,
    `      <circle data-room-cone cx="${lampSx.toFixed(1)}" cy="${lampSy.toFixed(1)}" r="0" fill="url(#temaram-cone-grad)"/>`,
    `    </mask>`,
    `  </defs>`,
    `  <g mask="url(#temaram-room-mask)" class="anatomy-room-masked">${roomContent}</g>`,
    `</svg>`,
  ].join("\n");
}

mkdirSync(join(WEBSITE_DIR, "assets"), { recursive: true });

const svgString = buildSvg();
writeFileSync(SVG_OUT, svgString + "\n", "utf8");

const meta = {
  width: WIDTH,
  height: HEIGHT,
  lampX: Number(lampSx.toFixed(1)),
  lampY: Number(lampSy.toFixed(1)),
  lampPctX: Number(((lampSx / WIDTH) * 100).toFixed(2)),
  lampPctY: Number(((lampSy / HEIGHT) * 100).toFixed(2)),
};

const jsBundle = `window.TEMARAM_ROOM_META = ${JSON.stringify(meta)};\nwindow.TEMARAM_ROOM_SVG = ${JSON.stringify(svgString)};\n`;
writeFileSync(JS_OUT, jsBundle, "utf8");

console.log("BUILT_ANATOMY_ROOM:", JSON.stringify(meta), "bytes:", svgString.length);
