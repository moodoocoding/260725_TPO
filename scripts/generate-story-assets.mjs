import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const ART_ROOT = path.join(PROJECT_ROOT, "public", "art");
const OUTPUT_ROOT = path.join(ART_ROOT, "v2");
const V1_ROOT = path.join(ART_ROOT, "v1");
const CATALOG_PATH = path.join(PROJECT_ROOT, "lib", "story-catalog.json");
const W = 1024;
const H = 1536;
const THUMB_W = 512;
const THUMB_H = 384;
const BG_W = 1920;
const BG_H = 1440;
const INK = "#14274a";
const PAPER = "#fffaf0";

const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));

function assertSafeOutputRoot() {
  const expected = path.resolve(PROJECT_ROOT, "public", "art", "v2");
  if (path.resolve(OUTPUT_ROOT) !== expected || !expected.startsWith(path.resolve(PROJECT_ROOT))) {
    throw new Error(`Unsafe output path: ${OUTPUT_ROOT}`);
  }
}

function target(relativePath) {
  return path.join(OUTPUT_ROOT, ...relativePath.split("/"));
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function svg(body, width, height, definitions = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="${INK}" flood-opacity=".16"/>
    </filter>
    ${definitions}
  </defs>
  ${body}
</svg>`;
}

async function render(relativePath, source, options = {}) {
  const output = target(relativePath);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(Buffer.from(source))
    .webp({
      quality: options.quality ?? 86,
      alphaQuality: 100,
      smartSubsample: true,
      effort: 5,
    })
    .toFile(output);
}

function itemDefinitions(item) {
  return `
    <linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${item.color}"/>
      <stop offset=".68" stop-color="${item.color}"/>
      <stop offset="1" stop-color="${item.accent}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${item.accent}"/>
      <stop offset="1" stop-color="${item.color}"/>
    </linearGradient>`;
}

function topLayer(item, variant) {
  const style = item.styleKey;
  const long = /coat|raincoat|lab-coat|protective/.test(style);
  const loose = /hoodie|sweater|wide-shirt|pajama/.test(style);
  const formal = /shirt|formal|cardigan|hanbok|chef|lab/.test(style);
  const hem = long ? 1115 : loose ? 1010 : 955;
  const left = loose ? 342 : 365;
  const right = loose ? 682 : 659;
  const collar = formal
    ? `<path d="M441 623 L512 700 L583 623 L558 606 C536 634 488 634 466 606 Z" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>`
    : `<path d="M455 619 C474 663 550 663 569 619" fill="none" stroke="${item.accent}" stroke-width="22" stroke-linecap="round"/>`;
  const hood = /hoodie|raincoat|ski/.test(style)
    ? `<path d="M426 635 C414 559 452 523 512 523 C572 523 610 559 598 635 L564 648 C553 607 471 607 460 648 Z" fill="${item.accent}" stroke="${INK}" stroke-width="8"/>`
    : "";
  const sleeves = `<path d="M385 665 C333 691 316 786 292 919 C282 972 303 1005 338 996 C362 990 370 965 370 938 L417 747 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9"/>
    <path d="M639 665 C691 691 708 786 732 919 C742 972 721 1005 686 996 C662 990 654 965 654 938 L607 747 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9"/>`;
  const pockets = variant % 2
    ? `<path d="M399 842 H474 V914 H399 Z M550 842 H625 V914 H550 Z" fill="${item.accent}" opacity=".72" stroke="${INK}" stroke-width="6"/>`
    : `<path d="M407 864 L477 846 M547 846 L617 864" stroke="${item.accent}" stroke-width="15" stroke-linecap="round"/>`;
  const trim = variant % 3 === 0
    ? `<path d="M512 690 V${hem - 30}" stroke="${item.accent}" stroke-width="12"/><circle cx="512" cy="748" r="8" fill="${INK}"/><circle cx="512" cy="812" r="8" fill="${INK}"/>`
    : `<path d="M391 ${hem - 28} Q512 ${hem + 2} 633 ${hem - 28}" fill="none" stroke="${item.accent}" stroke-width="13"/>`;

  return `${hood}${sleeves}
    <path d="M392 656 C426 626 458 618 473 615 C491 641 533 641 551 615 C566 618 598 626 632 656 L${right} ${hem - 35} C602 ${hem + 12} 422 ${hem + 12} ${left} ${hem - 35} Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
    ${collar}${pockets}${trim}`;
}

function bottomLayer(item, variant) {
  const style = item.styleKey;
  if (/skirt/.test(style)) {
    return `<path d="M397 900 C447 879 577 879 627 900 L688 1194 C601 1234 423 1234 336 1194 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
      <path d="M398 940 H626" stroke="${item.accent}" stroke-width="18"/>
      ${variant % 2 ? `<path d="M512 945 V1198" stroke="${item.accent}" stroke-width="9" opacity=".55"/>` : ""}`;
  }
  const shorts = /shorts/.test(style);
  const pajama = /pajama/.test(style);
  const end = shorts ? 1110 : 1368;
  const width = /wide|cargo|track|ski/.test(style) ? 142 : 122;
  const pattern = pajama
    ? `<g fill="${item.accent}" opacity=".52">${[430, 512, 594].map((x) => `<circle cx="${x}" cy="1040" r="12"/>`).join("")}</g>`
    : `<path d="M392 985 H463 M561 985 H632" stroke="${item.accent}" stroke-width="12" stroke-linecap="round"/>`;
  return `<path d="M375 902 C435 879 589 879 649 902 L${638 + (width - 122) / 2} ${end} C622 ${end + 28} 557 ${end + 28} 542 ${end} L512 1028 L482 ${end} C467 ${end + 28} 402 ${end + 28} ${386 - (width - 122) / 2} ${end} Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M512 930 V1040" stroke="${INK}" stroke-width="8"/>
    ${pattern}
    ${variant % 3 === 0 ? `<path d="M401 1230 H472 M552 1230 H623" stroke="${item.accent}" stroke-width="18"/>` : ""}`;
}

function shoesLayer(item, variant) {
  const tall = /boot|safety/.test(item.styleKey);
  const open = /slipper|sandal/.test(item.styleKey);
  const top = tall ? 1205 : 1321;
  const holes = open
    ? `<path d="M346 1368 H473 M551 1368 H678" stroke="${PAPER}" stroke-width="28" stroke-linecap="round"/>`
    : "";
  return `<path d="M367 ${top} C402 ${top - 18} 449 ${top - 18} 478 ${top} L483 1390 C475 1431 417 1445 321 1425 C296 1420 292 1384 319 1367 L367 1342 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M657 ${top} C622 ${top - 18} 575 ${top - 18} 546 ${top} L541 1390 C549 1431 607 1445 703 1425 C728 1420 732 1384 705 1367 L657 1342 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    ${holes}
    <path d="M319 1404 C370 1419 433 1418 479 1398 M705 1404 C654 1419 591 1418 545 1398" fill="none" stroke="${item.accent}" stroke-width="${variant % 2 ? 18 : 11}" stroke-linecap="round"/>`;
}

function accessoryMain(item, variant) {
  const style = item.styleKey;
  if (/cap|hat|crown/.test(style)) {
    return `<path d="M354 262 C370 132 654 132 670 262 L645 315 C589 282 435 282 379 315 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10"/>
      ${/cap/.test(style) ? `<path d="M470 282 C575 268 664 282 716 326 C645 342 558 329 492 314 Z" fill="${item.accent}" stroke="${INK}" stroke-width="9"/>` : ""}
      ${variant % 2 ? `<circle cx="512" cy="181" r="26" fill="${item.accent}" stroke="${INK}" stroke-width="7"/>` : ""}`;
  }
  if (/mask|goggle/.test(style)) {
    return `<path d="M376 344 Q512 300 648 344 L631 421 Q512 454 393 421 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10"/>
      <path d="M414 353 Q457 337 493 353 L486 403 Q445 418 410 398 Z M531 353 Q567 337 610 353 L614 398 Q579 418 538 403 Z" fill="${PAPER}" opacity=".55" stroke="${INK}" stroke-width="7"/>`;
  }
  if (/scarf|necklace|bow-tie|norigae/.test(style)) {
    return `<path d="M437 581 Q512 636 587 581 L569 688 Q512 728 455 688 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9"/>
      ${variant % 2 ? `<path d="M487 661 L455 871 L518 844 L548 672 Z" fill="${item.accent}" stroke="${INK}" stroke-width="8"/>` : `<circle cx="512" cy="692" r="28" fill="${item.accent}" stroke="${INK}" stroke-width="8"/>`}`;
  }
  if (/life-jacket|apron/.test(style)) {
    return `<path d="M402 660 Q452 625 474 620 L512 704 L550 620 Q572 625 622 660 L618 1010 Q512 1046 406 1010 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10"/>
      <path d="M512 703 V996" stroke="${item.accent}" stroke-width="13"/>
      <path d="M437 850 H587 V958 H437 Z" fill="${item.accent}" opacity=".78" stroke="${INK}" stroke-width="7"/>`;
  }
  if (/glove|mitt/.test(style)) {
    return `<path d="M250 932 C224 887 251 842 288 857 C300 813 347 825 349 868 L354 971 C337 1042 266 1046 245 996 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9"/>
      <path d="M774 932 C800 887 773 842 736 857 C724 813 677 825 675 868 L670 971 C687 1042 758 1046 779 996 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="9"/>`;
  }
  if (/band|bracelet/.test(style)) {
    return `<path d="M263 905 L353 933 L340 982 L250 954 Z M761 905 L671 933 L684 982 L774 954 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="8"/>`;
  }
  if (/helmet/.test(style)) {
    return `<path d="M334 294 C345 126 679 126 690 294 L650 360 Q512 300 374 360 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="11"/>
      <path d="M512 142 V316 M390 222 H634" stroke="${item.accent}" stroke-width="18"/>`;
  }
  if (/towel|blanket/.test(style)) {
    return `<path d="M356 622 Q512 568 668 622 L650 1120 Q512 1182 374 1120 Z" fill="url(#fabric)" opacity=".9" stroke="${INK}" stroke-width="10"/>
      <path d="M390 720 H634 M390 1040 H634" stroke="${item.accent}" stroke-width="18" opacity=".65"/>`;
  }
  const side = variant % 2 ? 700 : 280;
  return `<path d="M${side - 82} 804 Q${side} 752 ${side + 82} 804 L${side + 72} 1055 Q${side} 1092 ${side - 72} 1055 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="10"/>
    <path d="M${side - 47} 818 Q${side} 711 ${side + 47} 818" fill="none" stroke="${item.accent}" stroke-width="15"/>
    <circle cx="${side}" cy="930" r="24" fill="${item.accent}" stroke="${INK}" stroke-width="7"/>`;
}

function backLayer(item) {
  if (item.styleKey === "umbrella") {
    return `<path d="M122 444 C178 79 846 79 902 444 C809 384 715 384 623 444 C548 386 476 386 401 444 C309 384 215 384 122 444 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <path d="M512 132 V1138" stroke="${item.accent}" stroke-width="17" opacity=".72"/>`;
  }
  if (/backpack|tote/.test(item.styleKey)) {
    return `<path d="M354 658 Q512 548 670 658 L680 1068 Q512 1140 344 1068 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="11"/>
      <path d="M402 678 Q512 580 622 678" fill="none" stroke="${item.accent}" stroke-width="22"/>`;
  }
  if (item.styleKey === "cape") {
    return `<path d="M395 585 Q512 540 629 585 L783 1195 Q512 1320 241 1195 Z" fill="url(#fabric)" stroke="${INK}" stroke-width="12"/>`;
  }
  if (item.styleKey === "blanket") {
    return `<path d="M314 596 Q512 510 710 596 L755 1220 Q512 1325 269 1220 Z" fill="url(#fabric)" opacity=".9" stroke="${INK}" stroke-width="11"/>`;
  }
  return `<path d="M407 584 Q512 518 617 584 L664 832 Q512 890 360 832 Z" fill="${item.accent}" stroke="${INK}" stroke-width="10"/>`;
}

function frontLayer(item) {
  if (item.styleKey === "umbrella") {
    return `<path d="M512 420 V1160 Q512 1238 584 1238 Q652 1238 652 1172" fill="none" stroke="${item.accent}" stroke-width="22" stroke-linecap="round"/>
      <circle cx="512" cy="420" r="18" fill="${item.color}" stroke="${INK}" stroke-width="7"/>`;
  }
  if (/backpack|tote/.test(item.styleKey)) {
    return `<path d="M390 662 Q331 805 359 1036 M634 662 Q693 805 665 1036" fill="none" stroke="${item.accent}" stroke-width="24" stroke-linecap="round"/>`;
  }
  if (item.styleKey === "cape") {
    return `<path d="M423 602 Q512 650 601 602" fill="none" stroke="${item.accent}" stroke-width="26" stroke-linecap="round"/><circle cx="512" cy="634" r="24" fill="${item.color}" stroke="${INK}" stroke-width="8"/>`;
  }
  return `<path d="M362 668 Q512 612 662 668 L638 1130 Q512 1192 386 1130 Z" fill="none" stroke="${item.accent}" stroke-width="22" stroke-dasharray="28 18"/>`;
}

function wearBody(item, kind) {
  const variant = hash(item.id);
  if (kind === "back") return backLayer(item);
  if (kind === "front") return frontLayer(item);
  if (item.slot === "top") return topLayer(item, variant);
  if (item.slot === "bottom") return bottomLayer(item, variant);
  if (item.slot === "shoes") return shoesLayer(item, variant);
  return accessoryMain(item, variant);
}

function thumbnailBody(item) {
  const variant = hash(item.id);
  const common = `filter="url(#shadow)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"`;
  if (item.slot === "top") {
    const long = /coat|raincoat|lab/.test(item.styleKey);
    return `<g ${common}><path d="M162 76 L224 46 Q256 82 288 46 L350 76 L422 164 L366 205 L340 160 L340 ${long ? 334 : 290} Q256 320 172 ${long ? 334 : 290} L172 160 L146 205 L90 164 Z" fill="url(#fabric)"/><path d="M224 48 L256 100 L288 48" fill="${PAPER}"/><path d="M256 104 V278" stroke="${item.accent}" stroke-width="12"/></g>`;
  }
  if (item.slot === "bottom") {
    if (/skirt/.test(item.styleKey)) {
      return `<path d="M158 62 H354 L405 322 Q256 362 107 322 Z" fill="url(#fabric)" ${common}/><path d="M156 96 H356" stroke="${item.accent}" stroke-width="16"/>`;
    }
    return `<path d="M151 62 H361 L382 322 Q330 350 278 322 L256 180 L234 322 Q182 350 130 322 Z" fill="url(#fabric)" ${common}/><path d="M256 74 V190" stroke="${INK}" stroke-width="8"/>`;
  }
  if (item.slot === "shoes") {
    return `<g ${common}><path d="M84 210 Q136 146 218 184 L236 276 Q180 326 70 292 Z" fill="url(#fabric)"/><path d="M428 210 Q376 146 294 184 L276 276 Q332 326 442 292 Z" fill="url(#fabric)"/><path d="M78 280 Q158 312 229 274 M434 280 Q354 312 283 274" fill="none" stroke="${item.accent}" stroke-width="14"/></g>`;
  }
  if (/umbrella/.test(item.styleKey)) {
    return `<g ${common}><path d="M70 188 Q256 22 442 188 Q349 146 256 188 Q163 146 70 188 Z" fill="url(#fabric)"/><path d="M256 188 V310 Q256 346 292 346 Q326 346 326 314" fill="none" stroke="${item.accent}" stroke-width="14"/></g>`;
  }
  if (/cap|hat|crown|helmet/.test(item.styleKey)) {
    return `<g ${common}><path d="M122 218 Q132 66 256 66 Q380 66 390 218 Q256 166 122 218 Z" fill="url(#fabric)"/><path d="M220 208 Q348 194 432 250 Q322 280 206 242 Z" fill="${item.accent}"/></g>`;
  }
  if (/mask|goggle/.test(item.styleKey)) {
    return `<path d="M100 144 Q256 72 412 144 L388 256 Q256 316 124 256 Z" fill="url(#fabric)" ${common}/><circle cx="193" cy="190" r="46" fill="${PAPER}" opacity=".58"/><circle cx="319" cy="190" r="46" fill="${PAPER}" opacity=".58"/>`;
  }
  return `<g ${common}><path d="M128 116 Q256 32 384 116 L402 314 Q256 366 110 314 Z" fill="url(#fabric)"/><path d="M170 124 Q256 22 342 124" fill="none" stroke="${item.accent}" stroke-width="18"/><circle cx="256" cy="220" r="${22 + (variant % 16)}" fill="${item.accent}"/></g>`;
}

function backgroundBody(episode) {
  const [a, b] = episode.backgroundColors;
  const gradient = `<linearGradient id="scene" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const frame = `<rect width="${BG_W}" height="${BG_H}" fill="url(#scene)"/><circle cx="1640" cy="210" r="210" fill="${PAPER}" opacity=".16"/><path d="M0 1160 Q480 1050 960 1160 T1920 1160 V1440 H0 Z" fill="${INK}" opacity=".14"/>`;
  const scenes = {
    "rescue-hq": `<rect x="210" y="260" width="1500" height="900" rx="42" fill="${PAPER}" opacity=".86"/><rect x="330" y="370" width="620" height="420" fill="${a}" opacity=".7" stroke="${INK}" stroke-width="22"/><g fill="${b}" stroke="${INK}" stroke-width="18"><circle cx="1190" cy="520" r="116"/><path d="M1190 438 V602 M1108 520 H1272"/></g><path d="M1110 880 H1530 M1110 980 H1450" stroke="${INK}" stroke-width="34" opacity=".55"/>`,
    "school-yard": `<rect x="1040" y="320" width="660" height="610" fill="${PAPER}" stroke="${INK}" stroke-width="20"/><g fill="${a}" stroke="${INK}" stroke-width="13">${[1120,1320,1520].flatMap((x)=>[450,650].map((y)=>`<rect x="${x}" y="${y}" width="120" height="110"/>`)).join("")}</g><ellipse cx="650" cy="1160" rx="620" ry="210" fill="#d36f5d" stroke="${INK}" stroke-width="18"/><ellipse cx="650" cy="1160" rx="430" ry="130" fill="none" stroke="${PAPER}" stroke-width="22"/>`,
    "cozy-bedroom": `<rect x="160" y="220" width="560" height="430" fill="#cde8f2" stroke="${INK}" stroke-width="20"/><path d="M440 220 V650 M160 435 H720" stroke="${INK}" stroke-width="18"/><rect x="850" y="670" width="820" height="430" rx="38" fill="${PAPER}" stroke="${INK}" stroke-width="22"/><path d="M870 760 Q1260 620 1650 760 V1080 H870 Z" fill="${a}" opacity=".8"/><circle cx="1490" cy="230" r="105" fill="#fff2b0" opacity=".75"/>`,
    "birthday-party": `<path d="M180 260 Q340 430 500 260 Q660 430 820 260 Q980 430 1140 260 Q1300 430 1460 260 Q1620 430 1780 260" fill="none" stroke="${PAPER}" stroke-width="28"/><g stroke="${INK}" stroke-width="15">${[320,620,1320,1600].map((x,i)=>`<ellipse cx="${x}" cy="${520+(i%2)*90}" rx="88" ry="118" fill="${i%2?a:b}"/><path d="M${x} ${638+(i%2)*90} q-45 120 0 220" fill="none"/>`).join("")}</g><rect x="530" y="880" width="860" height="260" rx="35" fill="${PAPER}" stroke="${INK}" stroke-width="20"/><path d="M710 880 V760 H1210 V880" fill="${a}" stroke="${INK}" stroke-width="18"/>`,
    "rainy-street": `<g stroke="${PAPER}" stroke-width="12" opacity=".46">${Array.from({length:18},(_,i)=>`<path d="M${60+i*112} 80 L${-10+i*112} 330"/>`).join("")}</g><rect x="210" y="420" width="540" height="620" fill="${INK}" opacity=".62"/><rect x="1170" y="330" width="560" height="710" fill="${INK}" opacity=".68"/><g fill="#ffd86d">${[310,510,1270,1490].map(x=>`<rect x="${x}" y="540" width="120" height="150"/>`).join("")}</g><ellipse cx="960" cy="1240" rx="700" ry="100" fill="#c9eff5" opacity=".38"/>`,
    waterpark: `<path d="M0 850 Q380 760 760 850 T1520 850 T2280 850 V1440 H0 Z" fill="#55b8db"/><path d="M0 990 Q360 910 720 990 T1440 990 T2160 990" fill="none" stroke="${PAPER}" stroke-width="30" opacity=".72"/><path d="M1260 220 Q850 420 1120 830" fill="none" stroke="#ffd75d" stroke-width="130"/><path d="M1260 220 Q850 420 1120 830" fill="none" stroke="${INK}" stroke-width="16"/><g fill="${PAPER}" opacity=".9">${[260,550,1520].map((x)=>`<path d="M${x} 760 l120 -220 l120 220 Z"/><rect x="${x+105}" y="760" width="30" height="260"/>`).join("")}</g>`,
    "ski-slope": `<path d="M0 940 L520 300 L920 820 L1300 210 L1920 930 V1440 H0 Z" fill="${PAPER}" opacity=".9" stroke="${INK}" stroke-width="18"/><path d="M520 300 L700 585 L560 540 L490 640 L390 590 Z M1300 210 L1480 500 L1340 460 L1260 560 L1160 500 Z" fill="${a}"/><path d="M180 260 H1710" stroke="${INK}" stroke-width="18"/><g fill="${b}" stroke="${INK}" stroke-width="10">${[330,720,1110,1500].map((x,i)=>`<rect x="${x}" y="${250+i%2*80}" width="130" height="74" rx="24"/>`).join("")}</g>`,
    "wedding-hall": `<path d="M520 1140 V650 Q520 250 960 250 Q1400 250 1400 650 V1140" fill="${PAPER}" opacity=".68" stroke="${INK}" stroke-width="24"/><path d="M650 1140 V660 Q650 390 960 390 Q1270 390 1270 660 V1140" fill="none" stroke="${b}" stroke-width="34"/><g fill="${PAPER}" stroke="${INK}" stroke-width="10">${[470,570,1350,1450].flatMap(x=>[560,720,880].map(y=>`<circle cx="${x}" cy="${y}" r="48"/>`)).join("")}</g><path d="M780 1160 H1140" stroke="${PAPER}" stroke-width="180" opacity=".75"/>`,
    "memorial-hall": `<rect x="310" y="210" width="1300" height="920" fill="${INK}" opacity=".72"/><rect x="650" y="350" width="620" height="490" fill="${PAPER}" stroke="#d8d8d8" stroke-width="22"/><circle cx="960" cy="590" r="130" fill="${a}" opacity=".78"/><rect x="510" y="910" width="900" height="180" fill="#2a2d35"/><g fill="${PAPER}" opacity=".9">${[430,520,1400,1490].flatMap(x=>[830,930].map(y=>`<circle cx="${x}" cy="${y}" r="42"/>`)).join("")}</g>`,
    "hanok-holiday": `<rect x="250" y="610" width="1420" height="520" fill="${PAPER}" stroke="${INK}" stroke-width="22"/><path d="M140 600 Q960 180 1780 600 Q1500 700 960 610 Q420 700 140 600 Z" fill="${b}" stroke="${INK}" stroke-width="24"/><g fill="${a}" stroke="${INK}" stroke-width="12">${[390,670,950,1230,1510].map(x=>`<rect x="${x}" y="690" width="150" height="340"/>`).join("")}</g><g fill="#f46b5f" stroke="${INK}" stroke-width="9">${[260,1660].map(x=>`<circle cx="${x}" cy="420" r="75"/><path d="M${x} 495 V670"/>`).join("")}</g>`,
    "science-lab": `<rect x="140" y="780" width="1640" height="360" fill="${PAPER}" stroke="${INK}" stroke-width="22"/><rect x="240" y="270" width="570" height="370" fill="#d9f4f6" stroke="${INK}" stroke-width="20"/><path d="M525 270 V640 M240 455 H810" stroke="${INK}" stroke-width="16"/><g stroke="${INK}" stroke-width="16">${[1040,1280,1520].map((x,i)=>`<path d="M${x} 500 V720 L${x-90} 940 Q${x} 1010 ${x+90} 940 L${x} 720" fill="${i%2?a:b}" opacity=".75"/>`).join("")}</g><g fill="${INK}">${Array.from({length:7},(_,i)=>`<circle cx="${1020+i*90}" cy="${880-(i%3)*55}" r="16"/>`).join("")}</g>`,
    "family-kitchen": `<rect x="120" y="230" width="1680" height="390" fill="${PAPER}" stroke="${INK}" stroke-width="22"/><g fill="${a}" stroke="${INK}" stroke-width="12">${[180,500,820,1140,1460].map(x=>`<rect x="${x}" y="285" width="260" height="280"/>`).join("")}</g><rect x="90" y="840" width="1740" height="310" fill="${PAPER}" stroke="${INK}" stroke-width="24"/><ellipse cx="960" cy="820" rx="245" ry="95" fill="${b}" stroke="${INK}" stroke-width="18"/><path d="M760 820 Q960 1050 1160 820" fill="${b}" stroke="${INK}" stroke-width="18"/><path d="M860 670 q-70 -120 0 -220 M1010 650 q70 -120 0 -220" fill="none" stroke="${PAPER}" stroke-width="28" opacity=".7"/>`,
    "zombie-city": `<g fill="${INK}" opacity=".78">${[60,340,650,980,1280,1570].map((x,i)=>`<path d="M${x} ${420-i%3*80} H${x+300} V1200 H${x} Z"/>`).join("")}</g><g fill="#d7d36b" opacity=".58">${Array.from({length:15},(_,i)=>`<rect x="${120+(i%5)*350}" y="${520+Math.floor(i/5)*180}" width="74" height="90"/>`).join("")}</g><path d="M180 1160 L520 920 L850 1160 L1160 890 L1540 1160" fill="none" stroke="${PAPER}" stroke-width="38" stroke-dasharray="80 30"/><g fill="#f2a947" stroke="${INK}" stroke-width="12">${[420,960,1460].map(x=>`<path d="M${x} 1000 l90 160 h-180 Z"/>`).join("")}</g>`,
  };
  return {
    definitions: gradient,
    body: `${frame}${scenes[episode.backgroundStyle] ?? scenes["rescue-hq"]}`,
  };
}

async function copyCharacterAssets() {
  const files = [
    ["character/base.webp", "character/base.webp"],
    ["character/faces/ready.webp", "character/faces/ready.webp"],
    ["character/faces/success.webp", "character/faces/success.webp"],
    ["character/faces/retry.webp", "character/faces/retry.webp"],
  ];
  for (const [sourceRelative, outputRelative] of files) {
    const output = target(outputRelative);
    await mkdir(path.dirname(output), { recursive: true });
    await copyFile(path.join(V1_ROOT, ...sourceRelative.split("/")), output);
  }
}

async function main() {
  assertSafeOutputRoot();
  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await copyCharacterAssets();

  for (const item of catalog.items) {
    for (const kind of item.layerKinds) {
      await render(
        `items/${item.id}/wear-${kind}.webp`,
        svg(wearBody(item, kind), W, H, itemDefinitions(item)),
      );
    }
    await render(
      `items/${item.id}/thumb.webp`,
      svg(thumbnailBody(item), THUMB_W, THUMB_H, itemDefinitions(item)),
    );
  }

  for (const episode of catalog.episodes) {
    const scene = backgroundBody(episode);
    await render(
      `episodes/${episode.slug}/background.webp`,
      svg(scene.body, BG_W, BG_H, scene.definitions),
      { quality: 82 },
    );
  }

  const manifest = {
    schemaVersion: 2,
    catalogVersion: catalog.version,
    generatedAt: new Date().toISOString(),
    canvas: { width: W, height: H },
    thumbnailCanvas: { width: THUMB_W, height: THUMB_H },
    backgroundCanvas: { width: BG_W, height: BG_H },
    character: {
      base: "character/base.webp",
      faces: {
        ready: "character/faces/ready.webp",
        success: "character/faces/success.webp",
        retry: "character/faces/retry.webp",
      },
    },
    items: Object.fromEntries(
      catalog.items.map((item) => [
        item.id,
        {
          slot: item.slot,
          styleKey: item.styleKey,
          thumbnail: `items/${item.id}/thumb.webp`,
          layers: Object.fromEntries(
            item.layerKinds.map((kind) => [
              kind,
              `items/${item.id}/wear-${kind}.webp`,
            ]),
          ),
        },
      ]),
    ),
    episodes: Object.fromEntries(
      catalog.episodes.map((episode) => [
        episode.slug,
        {
          background: `episodes/${episode.slug}/background.webp`,
          backgroundStyle: episode.backgroundStyle,
        },
      ]),
    ),
  };
  await writeFile(
    target("art-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const layerCount = catalog.items.reduce(
    (total, item) => total + item.layerKinds.length,
    0,
  );
  console.log(
    `Generated art v2: ${catalog.items.length} items, ${layerCount} wear layers, ${catalog.episodes.length} backgrounds`,
  );
}

await main();
