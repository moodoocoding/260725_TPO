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

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(
  projectRoot,
  "art-source",
  "character-rig",
  "story-cast-v5",
);
const publicRoot = path.join(projectRoot, "public", "art", "v5");
const validationRoot = path.join(
  projectRoot,
  "art-validation",
  "story-cast-v5",
);
const v4HaruRoot = path.join(
  projectRoot,
  "public",
  "art",
  "v4",
  "episodes",
  "rescue-team-trial",
  "character",
);
const catalog = JSON.parse(
  await readFile(path.join(projectRoot, "lib", "story-catalog.json"), "utf8"),
);

const CANVAS = { width: 1024, height: 1536 };
const RIG_ID = "otter-v1.0.0";
const ART_VERSION = "v5-v4-rig-requester-cast-1.0.0";
const MOODS = ["ready", "success", "retry"];
const LAYER_ORDER = ["back", "main", "front"];
const PLANE_Z = {
  wearBack: 10,
  body: 20,
  bottom: 30,
  shoes: 40,
  top: 50,
  accessory: 60,
  wearFront: 70,
  face: 80,
};
const ANCHORS = {
  headTop: { x: 526, y: 159 },
  headCenter: { x: 526, y: 360 },
  earLeft: { x: 318, y: 299 },
  earRight: { x: 736, y: 299 },
  neckCenter: { x: 526, y: 590 },
  shoulderLeft: { x: 401, y: 602 },
  shoulderRight: { x: 650, y: 602 },
  elbowLeft: { x: 309, y: 744 },
  elbowRight: { x: 742, y: 744 },
  wristLeft: { x: 274, y: 849 },
  wristRight: { x: 779, y: 849 },
  handLeft: { x: 267, y: 883 },
  handRight: { x: 788, y: 883 },
  waistCenter: { x: 526, y: 862 },
  hipLeft: { x: 443, y: 1002 },
  hipRight: { x: 610, y: 1002 },
  kneeLeft: { x: 409, y: 1093 },
  kneeRight: { x: 643, y: 1093 },
  ankleLeft: { x: 410, y: 1202 },
  ankleRight: { x: 648, y: 1202 },
  footLeft: { x: 389, y: 1242 },
  footRight: { x: 671, y: 1242 },
  groundCenter: { x: 526, y: 1278 },
};
const SAFE_AREAS = {
  character: { left: 208, top: 96, right: 828, bottom: 1278 },
  face: { left: 345, top: 270, right: 707, bottom: 510 },
  wear: { left: 100, top: 48, right: 940, bottom: 1312 },
};

const CAST = [
  ["school-pe-rush", 2, "민준", "minjun-puppy", "puppy", "#c98c58", "#8d5738", "#f8dbb2", "#3f79b8", "#50301f"],
  ["bedtime-ready", 3, "소미", "somi-hamster", "hamster", "#d7a065", "#9a6241", "#f8dfbd", "#a56ca8", "#4c2e22"],
  ["friend-birthday-party", 4, "지우", "jiwoo-quokka", "quokka", "#b98255", "#754b34", "#efd0a8", "#e65d7a", "#493026"],
  ["summer-waterpark", 6, "서준", "seojun-penguin", "penguin", "#34485c", "#1f2f40", "#f2f5f4", "#2e9fc3", "#26384a"],
  ["winter-ski-class", 7, "예린", "yerin-polar-bear", "polar-bear", "#f2f4ef", "#b8c7cf", "#fffdf5", "#7c74c9", "#435360"],
  ["wedding-flower-child", 8, "다온", "daon-red-panda", "red-panda", "#ce6d3c", "#673c31", "#fff0d4", "#d7879f", "#52362a"],
  ["family-funeral", 9, "은호", "eunho-silver-fox", "silver-fox", "#9aa6b1", "#46525f", "#edf1f2", "#647083", "#29343e"],
  ["lunar-new-year-visit", 10, "하린", "harin-squirrel", "squirrel", "#c87745", "#82452f", "#f5d7aa", "#d64c4c", "#4f3022"],
  ["science-lab-experiment", 11, "도윤", "doyoon-badger", "badger", "#6e7780", "#38414a", "#e7e4dc", "#4f94a3", "#25303a"],
  ["family-cooking", 12, "채원", "chaewon-calico-cat", "calico-cat", "#f0dfc4", "#d1793e", "#fff8e9", "#d8794f", "#3d2a20"],
  ["zombie-city-escape", 13, "태오", "taeo-ferret", "ferret", "#c8a27a", "#625044", "#f1d8b8", "#7b9b57", "#342a25"],
].map(
  ([
    episodeSlug,
    episodeOrder,
    name,
    id,
    species,
    fur,
    shade,
    patch,
    accent,
    iris,
  ]) => ({
    episodeSlug,
    episodeOrder,
    name,
    id,
    species,
    fur,
    shade,
    patch,
    accent,
    iris,
  }),
);

const HARU_V5_ID = "haru-otter-v4";
const ITEM_IDS = [
  ...new Set(
    catalog.episodes
      .filter((episode) => episode.order >= 2)
      .flatMap((episode) => episode.itemIds),
  ),
].sort();
const itemById = new Map(catalog.items.map((item) => [item.id, item]));
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function scoped(target, parent) {
  const resolved = path.resolve(target);
  const expectedParent = path.resolve(parent);
  if (
    resolved === expectedParent ||
    !resolved.startsWith(`${expectedParent}${path.sep}`)
  ) {
    throw new Error(`Unsafe generated output: ${target}`);
  }
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function svg(attributes, body, definitions = "") {
  const data = Object.entries(attributes)
    .map(([key, value]) => `data-${key}="${value}"`)
    .join(" ");
  return `${XML_HEADER}
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536" ${data}>
  ${definitions ? `<defs>${definitions}</defs>` : ""}
  ${body}
</svg>
`.replace(/[ \t]+$/gm, "");
}

function ears(character) {
  const ink = "#18324a";
  const { species, fur, shade, patch } = character;
  if (species === "puppy") {
    return `<path d="M382 250 C319 201 263 249 270 350 C274 421 300 475 337 470 C371 466 391 409 401 326 Z" fill="${shade}" stroke="${ink}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M670 250 C733 201 789 249 782 350 C778 421 752 475 715 470 C681 466 661 409 651 326 Z" fill="${shade}" stroke="${ink}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M362 273 C326 248 299 273 302 346 C304 387 316 417 333 421 C353 414 365 371 370 314 Z M690 273 C726 248 753 273 750 346 C748 387 736 417 719 421 C699 414 687 371 682 314 Z" fill="${fur}" opacity=".55"/>`;
  }
  if (["red-panda", "silver-fox", "calico-cat"].includes(species)) {
    return `<path d="M348 279 L373 112 L472 224 Z" fill="${fur}" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M704 279 L679 112 L580 224 Z" fill="${fur}" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M375 223 L384 157 L432 218 Z M677 223 L668 157 L620 218 Z" fill="${shade}" opacity=".8"/>`;
  }
  if (species === "penguin") {
    return `<path d="M470 172 C486 119 512 98 526 132 C540 98 566 119 582 172" fill="${fur}" stroke="${ink}" stroke-width="9"/>`;
  }
  const radius = species === "polar-bear" ? 60 : species === "hamster" ? 54 : 50;
  return `<circle cx="359" cy="258" r="${radius}" fill="${fur}" stroke="${ink}" stroke-width="9"/>
    <circle cx="693" cy="258" r="${radius}" fill="${fur}" stroke="${ink}" stroke-width="9"/>
    <circle cx="359" cy="258" r="27" fill="${species === "badger" || species === "ferret" ? patch : shade}" opacity=".8"/>
    <circle cx="693" cy="258" r="27" fill="${species === "badger" || species === "ferret" ? patch : shade}" opacity=".8"/>`;
}

function markings(character) {
  const { species, shade, patch } = character;
  if (species === "puppy") {
    return `<g id="puppy-markings">
      <path d="M480 168 C493 148 511 145 526 160 C541 145 559 148 572 168 L552 318 C544 341 508 341 500 318 Z" fill="${patch}" opacity=".92"/>
      <ellipse cx="478" cy="429" rx="76" ry="65" fill="${patch}"/>
      <ellipse cx="574" cy="429" rx="76" ry="65" fill="${patch}"/>
      <path d="M400 285 C420 243 462 229 491 253 C468 288 436 307 400 285 Z" fill="${shade}" opacity=".32"/>
    </g>`;
  }
  if (species === "red-panda") {
    return `<path d="M365 330 C414 286 472 291 507 340 C478 406 413 426 365 385 Z M687 330 C638 286 580 291 545 340 C574 406 639 426 687 385 Z" fill="${shade}" opacity=".9"/>`;
  }
  if (species === "badger") {
    return `<path d="M464 170 C485 147 509 145 526 157 C543 145 567 147 588 170 L557 388 L526 430 L495 388 Z" fill="${patch}" opacity=".92"/>
    <path d="M386 275 L454 207 L476 410 L419 443 Z M666 275 L598 207 L576 410 L633 443 Z" fill="${shade}" opacity=".86"/>`;
  }
  if (species === "silver-fox") {
    return `<path d="M382 366 C419 304 474 292 526 333 C578 292 633 304 670 366 C637 458 573 493 526 488 C479 493 415 458 382 366 Z" fill="${patch}" opacity=".94"/>`;
  }
  if (species === "calico-cat") {
    return `<path d="M389 210 C426 171 471 178 489 223 C465 269 416 278 383 247 Z" fill="${shade}" opacity=".9"/>
      <path d="M579 174 C626 167 659 198 655 240 C624 264 591 257 567 229 Z" fill="#46515c" opacity=".92"/>
      <path d="M443 184 L464 248 M526 165 V242 M609 184 L588 248" fill="none" stroke="#46515c" stroke-width="12" stroke-linecap="round" opacity=".7"/>`;
  }
  if (species === "penguin") {
    return `<path d="M365 264 C403 179 463 153 526 181 C589 153 649 179 687 264 L649 403 C608 358 568 339 526 348 C484 339 444 358 403 403 Z" fill="${shade}" opacity=".96"/>
      <path d="M437 294 C468 258 500 253 526 277 C552 253 584 258 615 294 C594 351 565 376 526 376 C487 376 458 351 437 294 Z" fill="${patch}" opacity=".95"/>`;
  }
  if (species === "ferret") {
    return `<path d="M379 317 C420 278 470 286 509 335 C483 390 430 412 384 382 Z M673 317 C632 278 582 286 543 335 C569 390 622 412 668 382 Z" fill="${shade}" opacity=".78"/>
      <ellipse cx="526" cy="426" rx="73" ry="58" fill="${patch}" opacity=".92"/>`;
  }
  return "";
}

function characterBase(character) {
  const ink = "#18324a";
  const paper = "#fffaf0";
  const shorts = "#29486a";
  const { fur, shade, patch, accent } = character;
  return svg(
    {
      "rig-id": RIG_ID,
      "character-id": character.id,
      species: character.species,
      layer: "base",
    },
    `
  <g id="shared-v4-body" data-body-contract="${RIG_ID}">
    <path d="M417 958 C404 1049 399 1158 399 1211 C390 1235 366 1250 349 1260 C337 1268 341 1274 357 1274 H456 C474 1274 483 1260 479 1244 L488 982 Z" fill="${fur}" stroke="${ink}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M635 958 C648 1049 653 1158 653 1211 C662 1235 686 1250 703 1260 C715 1268 711 1274 695 1274 H596 C578 1274 569 1260 573 1244 L564 982 Z" fill="${fur}" stroke="${ink}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M399 1173 C426 1182 457 1182 483 1173 L479 1246 C462 1260 423 1262 402 1247 Z M653 1173 C626 1182 595 1182 569 1173 L573 1246 C590 1260 629 1262 650 1247 Z" fill="${paper}" stroke="${ink}" stroke-width="7"/>
    <path d="M401 1195 C426 1204 456 1204 481 1195 M651 1195 C626 1204 596 1204 571 1195" fill="none" stroke="${accent}" stroke-width="11"/>
    <path d="M376 850 C423 834 629 834 676 850 L664 1043 C627 1058 584 1058 541 1040 L526 948 L511 1040 C468 1058 425 1058 388 1043 Z" fill="${shorts}" stroke="${ink}" stroke-width="9"/>
    <path d="M465 501 L587 501 L596 620 C566 649 486 649 456 620 Z" fill="${fur}" stroke="${ink}" stroke-width="8"/>
    <path d="M469 535 C493 558 559 558 583 535 L586 579 C558 603 494 603 466 579 Z" fill="${shade}" opacity=".45"/>
    <path d="M407 590 C365 608 336 662 317 724 L276 827 C259 868 268 913 299 929 C329 943 352 911 355 879 L418 699 Z" fill="${fur}" stroke="${ink}" stroke-width="9"/>
    <path d="M645 590 C687 608 716 662 735 724 L776 827 C793 868 784 913 753 929 C723 943 700 911 697 879 L634 699 Z" fill="${fur}" stroke="${ink}" stroke-width="9"/>
    <path d="M275 824 C252 844 245 870 252 894 C260 918 282 925 294 910 C291 933 316 941 330 922 C332 943 355 941 361 919 C364 902 356 874 344 851 Z" fill="${fur}" stroke="${ink}" stroke-width="7"/>
    <path d="M777 824 C800 844 807 870 800 894 C792 918 770 925 758 910 C761 933 736 941 722 922 C720 943 697 941 691 919 C688 902 696 874 708 851 Z" fill="${fur}" stroke="${ink}" stroke-width="7"/>
    <path d="M407 586 C446 566 485 558 526 558 C567 558 606 566 645 586 L668 878 C628 894 581 901 526 901 C471 901 424 894 384 878 Z" fill="${paper}" stroke="${ink}" stroke-width="9"/>
    <path d="M449 579 C468 619 494 637 526 637 C558 637 584 619 603 579" fill="none" stroke="${accent}" stroke-width="17"/>
  </g>
  <g id="species-head">
    ${ears(character)}
    <ellipse cx="526" cy="360" rx="184" ry="201" fill="${fur}" stroke="${ink}" stroke-width="10"/>
    <ellipse cx="526" cy="414" rx="110" ry="91" fill="${patch}" opacity=".92"/>
    ${markings(character)}
    <path d="M489 166 C500 118 519 101 526 135 C533 101 552 118 563 166" fill="${shade}" stroke="${ink}" stroke-width="8"/>
  </g>`,
  );
}

function faceExtras(character) {
  if (character.species === "puppy") {
    return `<g id="puppy-face-details">
      <circle cx="476" cy="433" r="4" fill="${character.shade}" opacity=".72"/>
      <circle cx="458" cy="446" r="4" fill="${character.shade}" opacity=".72"/>
      <circle cx="576" cy="433" r="4" fill="${character.shade}" opacity=".72"/>
      <circle cx="594" cy="446" r="4" fill="${character.shade}" opacity=".72"/>
      <path d="M526 442 C507 442 494 450 484 462 M526 442 C545 442 558 450 568 462" fill="none" stroke="${character.shade}" stroke-width="5" stroke-linecap="round"/>
    </g>`;
  }
  if (["calico-cat", "silver-fox", "red-panda"].includes(character.species)) {
    return `<path d="M456 410 L374 394 M456 431 L371 438 M596 410 L678 394 M596 431 L681 438" fill="none" stroke="${character.shade}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (character.species === "hamster") {
    return `<circle cx="405" cy="424" r="19" fill="#ef9b8d" opacity=".58"/><circle cx="647" cy="424" r="19" fill="#ef9b8d" opacity=".58"/>`;
  }
  return "";
}

function characterFace(character, mood) {
  const ink = "#18324a";
  const mouth = "#8e4b43";
  const nose = character.species === "puppy" ? "#2d2422" : character.shade;
  let expression;
  if (mood === "success") {
    expression = `<path d="M405 324 C438 299 468 305 488 321 M564 321 C584 305 614 299 647 324" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M412 360 C434 334 465 334 488 360 M564 360 C587 334 618 334 640 360" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M460 449 C492 505 560 505 592 449 C553 468 499 468 460 449 Z" fill="#ef7e73" stroke="${mouth}" stroke-width="9"/>`;
  } else if (mood === "retry") {
    expression = `<path d="M405 323 C433 300 463 303 485 319 M567 319 C592 300 623 306 648 331" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="450" cy="359" rx="38" ry="47" fill="#fffdf5" stroke="${ink}" stroke-width="8"/><ellipse cx="602" cy="359" rx="38" ry="47" fill="#fffdf5" stroke="${ink}" stroke-width="8"/>
    <ellipse cx="458" cy="367" rx="22" ry="30" fill="${character.iris}"/><ellipse cx="594" cy="367" rx="22" ry="30" fill="${character.iris}"/>
    <circle cx="465" cy="355" r="8" fill="#fff"/><circle cx="601" cy="355" r="8" fill="#fff"/>
    <path d="M483 471 C506 450 546 450 569 471" fill="none" stroke="${mouth}" stroke-width="9" stroke-linecap="round"/>`;
  } else {
    expression = `<path d="M409 320 C436 300 465 302 486 319 M566 319 C587 302 616 300 643 320" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="450" cy="355" rx="41" ry="50" fill="#fffdf5" stroke="${ink}" stroke-width="8"/><ellipse cx="602" cy="355" rx="41" ry="50" fill="#fffdf5" stroke="${ink}" stroke-width="8"/>
    <ellipse cx="454" cy="363" rx="25" ry="34" fill="${character.iris}"/><ellipse cx="598" cy="363" rx="25" ry="34" fill="${character.iris}"/>
    <circle cx="463" cy="349" r="9" fill="#fff"/><circle cx="607" cy="349" r="9" fill="#fff"/>
    <path d="M473 458 C503 482 549 482 579 458" fill="none" stroke="${mouth}" stroke-width="9" stroke-linecap="round"/>`;
  }
  return svg(
    {
      "rig-id": RIG_ID,
      "character-id": character.id,
      species: character.species,
      layer: mood,
    },
    `<g id="face-${mood}">
      ${expression}
      <path d="M507 404 Q526 391 545 404 Q542 426 526 433 Q510 426 507 404 Z" fill="${nose}" stroke="${ink}" stroke-width="6"/>
      <path d="M526 431 V442" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
      ${faceExtras(character)}
    </g>`,
  );
}

function itemDefinitions(item) {
  return `<linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${item.color}"/>
    <stop offset=".7" stop-color="${item.color}"/>
    <stop offset="1" stop-color="${item.accent}"/>
  </linearGradient>`;
}

function topMain(item) {
  const style = item.styleKey;
  const long = /coat|raincoat|lab|protective/.test(style);
  const loose = /hoodie|sweater|wide|pajama/.test(style);
  const formal = /shirt|formal|cardigan|hanbok|chef|lab/.test(style);
  const hem = long ? 1020 : loose ? 912 : 890;
  const variant = hash(item.id);
  const collar = formal
    ? `<path d="M463 579 L526 650 L589 579 L566 566 C547 592 505 592 486 566 Z" fill="#fffaf0" stroke="#18324a" stroke-width="7"/>`
    : `<path d="M463 579 C480 620 572 620 589 579" fill="none" stroke="${item.accent}" stroke-width="18"/>`;
  const hood = /hoodie|raincoat|ski/.test(style)
    ? `<path d="M437 594 C425 522 468 494 526 494 C584 494 627 522 615 594 L583 612 C570 571 482 571 469 612 Z" fill="${item.accent}" stroke="#18324a" stroke-width="8"/>`
    : "";
  return `${hood}
    <path d="M405 589 C365 604 337 635 320 676 L278 780 C300 800 326 812 355 815 L410 706 L421 660 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
    <path d="M647 589 C687 604 715 635 732 676 L774 780 C752 800 726 812 697 815 L642 706 L631 660 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
    <path d="M407 586 C446 566 485 558 526 558 C567 558 606 566 645 586 L${long ? 690 : 668} ${hem - 20} C625 ${hem + 12} 427 ${hem + 12} ${long ? 362 : 384} ${hem - 20} Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
    ${collar}
    <path d="M526 650 V${hem - 22}" stroke="${item.accent}" stroke-width="${variant % 2 ? 11 : 7}"/>
    <path d="M397 ${hem - 38} C440 ${hem - 25} 483 ${hem - 20} 526 ${hem - 20} C569 ${hem - 20} 612 ${hem - 25} 655 ${hem - 38}" fill="none" stroke="${item.accent}" stroke-width="12"/>`;
}

function bottomMain(item) {
  const style = item.styleKey;
  const variant = hash(item.id);
  if (/skirt/.test(style)) {
    return `<path d="M382 850 C428 844 477 842 526 842 C575 842 624 844 670 850 L718 1192 C625 1222 427 1222 334 1192 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
      <path d="M380 850 C429 864 478 869 526 869 C574 869 623 864 672 850" fill="none" stroke="${item.accent}" stroke-width="15"/>
      ${variant % 2 ? `<path d="M526 880 V1198" stroke="${item.accent}" stroke-width="8" opacity=".55"/>` : ""}`;
  }
  const shorts = /shorts|swim/.test(style);
  const end = shorts ? 1062 : 1210;
  const wide = /wide|cargo|track|ski|pajama/.test(style) ? 18 : 0;
  return `<path d="M382 850 C428 844 477 842 526 842 C575 842 624 844 670 850 C680 887 692 927 700 970 L${702 + wide} ${end} C660 ${end + 12} 618 ${end + 11} 574 ${end - 2} L550 1018 L526 982 L502 1018 L478 ${end - 2} C434 ${end + 11} 392 ${end + 12} ${350 - wide} ${end} L352 970 C360 927 372 887 382 850 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
    <path d="M382 850 C428 858 477 862 526 862 C575 862 624 858 670 850 L680 892 C629 903 578 908 526 908 C474 908 423 903 372 892 Z" fill="${item.accent}" opacity=".78"/>
    <path d="M526 908 V982" stroke="#18324a" stroke-width="7"/>`;
}

function shoesMain(item) {
  const tall = /boot|safety/.test(item.styleKey);
  const open = /slipper|sandal|aqua/.test(item.styleKey);
  const top = tall ? 1118 : 1188;
  return `<path d="M327 ${top} C360 ${top - 18} 418 ${top - 17} 463 ${top + 10} L488 1254 C479 1284 445 1302 389 1302 C340 1302 309 1285 307 1258 C309 1227 315 1208 327 ${top} Z" fill="url(#fabric)" stroke="#18324a" stroke-width="8"/>
    <path d="M725 ${top} C692 ${top - 18} 634 ${top - 17} 589 ${top + 10} L564 1254 C573 1284 607 1302 663 1302 C712 1302 743 1285 745 1258 C743 1227 737 1208 725 ${top} Z" fill="url(#fabric)" stroke="#18324a" stroke-width="8"/>
    ${open ? `<path d="M341 1229 Q400 1188 468 1231 M711 1229 Q652 1188 584 1231" fill="none" stroke="#fffaf0" stroke-width="18"/>` : ""}
    <path d="M309 1252 C345 1270 405 1274 487 1254 M743 1252 C707 1270 647 1274 565 1254" fill="none" stroke="${item.accent}" stroke-width="11"/>`;
}

function accessoryMain(item) {
  const style = item.styleKey;
  const variant = hash(item.id);
  if (/cap|hat|crown|helmet/.test(style)) {
    return `<path d="M346 286 C360 132 692 132 706 286 L670 354 Q526 299 382 354 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="10"/>
      ${/cap/.test(style) ? `<path d="M494 318 C608 293 704 313 759 365 C674 384 584 369 505 346 Z" fill="${item.accent}" stroke="#18324a" stroke-width="8"/>` : ""}
      ${variant % 2 ? `<circle cx="526" cy="171" r="22" fill="${item.accent}" stroke="#18324a" stroke-width="6"/>` : ""}`;
  }
  if (/mask|goggle/.test(style)) {
    return `<path d="M387 334 Q526 292 665 334 L650 421 Q526 454 402 421 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
      <path d="M421 347 Q466 330 506 349 L497 405 Q454 420 417 399 Z M546 349 Q586 330 631 347 L635 399 Q598 420 555 405 Z" fill="#fffaf0" opacity=".55" stroke="#18324a" stroke-width="6"/>`;
  }
  if (/scarf|necklace|bow-tie|norigae|whistle/.test(style)) {
    return `<path d="M450 560 Q526 615 602 560 L582 694 Q526 730 470 694 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="8"/>
      <circle cx="526" cy="700" r="${20 + (variant % 14)}" fill="${item.accent}" stroke="#18324a" stroke-width="7"/>`;
  }
  if (/life-jacket|apron/.test(style)) {
    return `<path d="M412 594 Q464 562 484 560 L526 646 L568 560 Q588 562 640 594 L635 890 Q526 925 417 890 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
      <path d="M526 646 V875" stroke="${item.accent}" stroke-width="12"/>`;
  }
  if (/glove|mitt/.test(style)) {
    return `<path d="M249 804 C228 768 251 728 287 742 C302 704 343 720 347 757 L356 867 C339 923 277 929 250 884 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="8"/>
      <path d="M803 804 C824 768 801 728 765 742 C750 704 709 720 705 757 L696 867 C713 923 775 929 802 884 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="8"/>`;
  }
  if (/band|bracelet|knee-pad/.test(style)) {
    return `<path d="M267 782 L357 810 L342 859 L252 831 Z M785 782 L695 810 L710 859 L800 831 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="7"/>`;
  }
  const side = variant % 2 ? 735 : 317;
  return `<path d="M${side - 76} 704 Q${side} 659 ${side + 76} 704 L${side + 68} 995 Q${side} 1030 ${side - 68} 995 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="9"/>
    <path d="M${side - 43} 718 Q${side} 620 ${side + 43} 718" fill="none" stroke="${item.accent}" stroke-width="14"/>`;
}

function itemBack(item) {
  const style = item.styleKey;
  if (/umbrella/.test(style)) {
    return `<path d="M126 408 C190 56 862 56 926 408 C826 350 726 350 626 408 C559 360 493 360 426 408 C326 350 226 350 126 408 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="11"/>`;
  }
  if (/backpack|tote|bag|basket/.test(style)) {
    return `<path d="M378 584 Q526 502 674 584 L704 1030 Q526 1102 348 1030 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="10"/>`;
  }
  if (/cape|blanket/.test(style)) {
    return `<path d="M410 550 Q526 510 642 550 L798 1190 Q526 1300 254 1190 Z" fill="url(#fabric)" stroke="#18324a" stroke-width="11"/>`;
  }
  return `<path d="M430 558 Q526 486 622 558 L660 734 Q526 788 392 734 Z" fill="${item.accent}" stroke="#18324a" stroke-width="9"/>`;
}

function itemFront(item) {
  const style = item.styleKey;
  if (/umbrella/.test(style)) {
    return `<path d="M788 386 V904 Q788 964 734 964 Q688 964 688 920" fill="none" stroke="${item.accent}" stroke-width="20" stroke-linecap="round"/>`;
  }
  if (/backpack|tote|bag|basket/.test(style)) {
    return `<path d="M410 590 Q351 730 373 942 M642 590 Q701 730 679 942" fill="none" stroke="${item.accent}" stroke-width="22" stroke-linecap="round"/>`;
  }
  if (/cape/.test(style)) {
    return `<path d="M438 572 Q526 616 614 572" fill="none" stroke="${item.accent}" stroke-width="24"/><circle cx="526" cy="600" r="22" fill="${item.color}" stroke="#18324a" stroke-width="7"/>`;
  }
  return `<path d="M392 594 Q526 546 660 594 L640 1020 Q526 1076 412 1020 Z" fill="none" stroke="${item.accent}" stroke-width="18" stroke-dasharray="26 16"/>`;
}

function wearBody(item, kind) {
  if (kind === "back") return itemBack(item);
  if (kind === "front") return itemFront(item);
  if (item.slot === "top") return topMain(item);
  if (item.slot === "bottom") return bottomMain(item);
  if (item.slot === "shoes") return shoesMain(item);
  return accessoryMain(item);
}

async function renderSvgSource(sourcePath, publicPath, source) {
  await Promise.all([
    mkdir(path.dirname(sourcePath), { recursive: true }),
    mkdir(path.dirname(publicPath), { recursive: true }),
  ]);
  await writeFile(sourcePath, source, "utf8");
  await sharp(Buffer.from(source), { density: 96 })
    .resize({ width: 1024, height: 1536, fit: "fill" })
    .webp({ lossless: true, alphaQuality: 100, effort: 6 })
    .toFile(publicPath);
}

async function generateCharacter(character) {
  await renderSvgSource(
    path.join(sourceRoot, "characters", character.id, "base.svg"),
    path.join(publicRoot, "characters", character.id, "base.webp"),
    characterBase(character),
  );
  for (const mood of MOODS) {
    await renderSvgSource(
      path.join(sourceRoot, "characters", character.id, "faces", `${mood}.svg`),
      path.join(publicRoot, "characters", character.id, "faces", `${mood}.webp`),
      characterFace(character, mood),
    );
  }
}

async function generateItem(item) {
  const layerKinds = item.layerKinds?.length ? item.layerKinds : ["main"];
  const rendered = [];
  for (const kind of layerKinds) {
    const source = svg(
      {
        "rig-id": RIG_ID,
        "item-id": item.id,
        slot: item.slot,
        layer: kind,
      },
      wearBody(item, kind),
      itemDefinitions(item),
    );
    const sourcePath = path.join(
      sourceRoot,
      "items",
      item.id,
      `wear-${kind}.svg`,
    );
    const publicPath = path.join(
      publicRoot,
      "items",
      item.id,
      `wear-${kind}.webp`,
    );
    await renderSvgSource(sourcePath, publicPath, source);
    rendered.push({ kind, publicPath });
  }
  const composite = await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      [...rendered]
        .sort(
          (left, right) =>
            LAYER_ORDER.indexOf(left.kind) - LAYER_ORDER.indexOf(right.kind),
        )
        .map(({ publicPath: input }) => ({ input })),
    )
    .png()
    .toBuffer();
  await sharp(composite)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: 384,
      height: 240,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(path.join(publicRoot, "items", item.id, "thumb.webp"));
  return {
    id: item.id,
    slot: item.slot,
    thumbnail: `items/${item.id}/thumb.webp`,
    layers: Object.fromEntries(
      layerKinds.map((kind) => [
        kind,
        `items/${item.id}/wear-${kind}.webp`,
      ]),
    ),
  };
}

async function copyHaru() {
  const targetRoot = path.join(publicRoot, "characters", HARU_V5_ID);
  await mkdir(targetRoot, { recursive: true });
  for (const mood of MOODS) {
    await copyFile(
      path.join(v4HaruRoot, `${mood}.webp`),
      path.join(targetRoot, `${mood}.webp`),
    );
  }
}

function buildEpisodeMap() {
  const map = {
    "rescue-team-trial": {
      episodeOrder: 1,
      characterId: HARU_V5_ID,
      name: "하루",
      species: "otter",
      mode: "full-frame-moods",
      rigId: RIG_ID,
      moods: Object.fromEntries(
        MOODS.map((mood) => [
          mood,
          `/art/v4/episodes/rescue-team-trial/character/${mood}.webp`,
        ]),
      ),
    },
    "rainy-market-errand": {
      episodeOrder: 5,
      characterId: HARU_V5_ID,
      name: "하루",
      species: "otter",
      mode: "full-frame-moods",
      rigId: RIG_ID,
      moods: Object.fromEntries(
        MOODS.map((mood) => [
          mood,
          `characters/${HARU_V5_ID}/${mood}.webp`,
        ]),
      ),
    },
  };
  for (const character of CAST) {
    map[character.episodeSlug] = {
      episodeOrder: character.episodeOrder,
      characterId: character.id,
      name: character.name,
      species: character.species,
      mode: "layered-base-face",
      rigId: RIG_ID,
      base: `characters/${character.id}/base.webp`,
      faces: Object.fromEntries(
        MOODS.map((mood) => [
          mood,
          `characters/${character.id}/faces/${mood}.webp`,
        ]),
      ),
    };
  }
  return Object.fromEntries(
    Object.entries(map).sort(
      ([, left], [, right]) => left.episodeOrder - right.episodeOrder,
    ),
  );
}

async function makeContactSheet(episodeMap) {
  const episodes = catalog.episodes
    .filter((episode) => episode.order >= 2)
    .sort((left, right) => left.order - right.order);
  const cardWidth = 256;
  const cardHeight = 420;
  const columns = 4;
  const cards = [];
  for (const episode of episodes) {
    const mapping = episodeMap[episode.slug];
    let figure;
    if (mapping.mode === "full-frame-moods") {
      figure = await sharp(path.join(publicRoot, mapping.moods.ready))
        .resize({
          width: 220,
          height: 340,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    } else {
      const base = path.join(publicRoot, mapping.base);
      const face = path.join(publicRoot, mapping.faces.ready);
      const merged = await sharp({
        create: {
          width: 1024,
          height: 1536,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: base }, { input: face }])
        .png()
        .toBuffer();
      figure = await sharp(merged)
        .resize({
          width: 220,
          height: 340,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}">
      <rect x="1" y="1" width="${cardWidth - 2}" height="${cardHeight - 2}" rx="18" fill="#fffaf0" stroke="#b9c9d2" stroke-width="2"/>
      <text x="128" y="376" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#18324a">${mapping.name}</text>
      <text x="128" y="403" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#60768a">EP${episode.order} · ${mapping.species}</text>
    </svg>`);
    cards.push(
      await sharp(label)
        .composite([{ input: figure, left: 18, top: 16 }])
        .png()
        .toBuffer(),
    );
  }
  const gap = 18;
  const margin = 24;
  const rows = Math.ceil(cards.length / columns);
  await mkdir(validationRoot, { recursive: true });
  await sharp({
    create: {
      width: margin * 2 + columns * cardWidth + (columns - 1) * gap,
      height: margin * 2 + rows * cardHeight + (rows - 1) * gap,
      channels: 4,
      background: { r: 225, g: 235, b: 240, alpha: 1 },
    },
  })
    .composite(
      cards.map((input, index) => ({
        input,
        left: margin + (index % columns) * (cardWidth + gap),
        top: margin + Math.floor(index / columns) * (cardHeight + gap),
      })),
    )
    .webp({ quality: 92, effort: 6 })
    .toFile(path.join(validationRoot, "ep2-13-ready-contact-sheet.webp"));
}

async function main() {
  scoped(sourceRoot, path.join(projectRoot, "art-source", "character-rig"));
  scoped(publicRoot, path.join(projectRoot, "public", "art"));
  scoped(validationRoot, path.join(projectRoot, "art-validation"));
  await Promise.all([
    rm(sourceRoot, { recursive: true, force: true }),
    rm(publicRoot, { recursive: true, force: true }),
    rm(validationRoot, { recursive: true, force: true }),
  ]);
  await Promise.all([
    mkdir(sourceRoot, { recursive: true }),
    mkdir(publicRoot, { recursive: true }),
    mkdir(validationRoot, { recursive: true }),
  ]);

  for (const character of CAST) await generateCharacter(character);
  await copyHaru();
  const itemManifest = {};
  for (const itemId of ITEM_IDS) {
    const item = itemById.get(itemId);
    if (!item) throw new Error(`Catalog item missing: ${itemId}`);
    itemManifest[itemId] = await generateItem(item);
  }

  const episodeMap = buildEpisodeMap();
  const manifest = {
    schemaVersion: 2,
    artVersion: ART_VERSION,
    deterministic: true,
    canvas: CANVAS,
    rig: {
      id: RIG_ID,
      anchors: ANCHORS,
      safeAreas: SAFE_AREAS,
      baseGroundY: 1278,
      shoeGroundY: 1308,
      planeZ: PLANE_Z,
      moodAliases: {
        neutral: "ready",
        happy: "success",
        worried: "retry",
      },
    },
    roots: {
      characters: "/art/v5/characters",
      items: "/art/v5/items",
    },
    episodeMap,
    items: itemManifest,
  };
  await Promise.all([
    writeFile(
      path.join(sourceRoot, "cast-spec.json"),
      `${JSON.stringify(
        {
          artVersion: ART_VERSION,
          canvas: CANVAS,
          rig: manifest.rig,
          cast: CAST,
          preservedHaru: {
            id: HARU_V5_ID,
            source: "public/art/v4/episodes/rescue-team-trial/character",
            copiedForEpisode: 5,
          },
          itemIds: ITEM_IDS,
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
    writeFile(
      path.join(publicRoot, "character-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    ),
  ]);
  await makeContactSheet(episodeMap);
  console.log(
    `Generated v5: ${CAST.length} layered requester characters + preserved Haru, ${ITEM_IDS.length} EP2-13 wear items`,
  );
}

await main();
