import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const PUBLIC_ROOT = path.join(PROJECT_ROOT, "public");
const OUTPUT_ROOT = path.join(PUBLIC_ROOT, "art", "v1");

const W = 1024;
const H = 1536;
const BG_W = 1920;
const BG_H = 1440;

const C = {
  ink: "#14274a",
  inkSoft: "#263a5b",
  cream: "#fff7e7",
  paper: "#fffdf8",
  coral: "#ff625f",
  coralDark: "#c94243",
  mint: "#7ccdb6",
  mintDark: "#389b88",
  yellow: "#ffc62f",
  yellowDark: "#dc8f08",
  sky: "#6eb7e6",
  skyDark: "#357cae",
  skin: "#ffc99c",
  skinShade: "#ee9d72",
  blush: "#ff9d8b",
  white: "#fffdf5",
  navy: "#263a5b",
  navyDeep: "#111d36",
  denim: "#78a7d8",
  denimDark: "#3c70a8",
  beige: "#d8b07b",
  beigeDark: "#9c7043",
  plum: "#bd86b8",
  plumDark: "#80507d",
  black: "#272b38",
  gray: "#dce5e8",
  grayDark: "#7a8995",
  lime: "#e9ff5d",
  limeDark: "#82951b",
};

const XML_HEADER = `<?xml version="1.0" encoding="UTF-8"?>`;

function svgWrap(
  body,
  { opaque = false, width = W, height = H } = {},
) {
  return `${XML_HEADER}
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="yellowShade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe269"/>
      <stop offset="0.62" stop-color="${C.yellow}"/>
      <stop offset="1" stop-color="#eca50d"/>
    </linearGradient>
    <linearGradient id="mintShade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b6eadc"/>
      <stop offset="1" stop-color="${C.mint}"/>
    </linearGradient>
    <linearGradient id="skyShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a8c8d9"/>
      <stop offset="0.58" stop-color="#688ba4"/>
      <stop offset="1" stop-color="#345268"/>
    </linearGradient>
    <linearGradient id="roadShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#496b7b"/>
      <stop offset="1" stop-color="#213e54"/>
    </linearGradient>
    <radialGradient id="lampGlow">
      <stop offset="0" stop-color="#fff2a8" stop-opacity="0.95"/>
      <stop offset="0.42" stop-color="#ffd86d" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#ffd86d" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="reflectGlow">
      <stop offset="0" stop-color="#fbffbf" stop-opacity="0.95"/>
      <stop offset="0.38" stop-color="${C.lime}" stop-opacity="0.48"/>
      <stop offset="1" stop-color="${C.lime}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glassShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ecfbff" stop-opacity="0.54"/>
      <stop offset="1" stop-color="#b5dded" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  ${opaque ? `<rect width="${width}" height="${height}" fill="${C.cream}"/>` : ""}
  ${body}
</svg>`;
}

function outputPath(relativePath) {
  return path.join(OUTPUT_ROOT, ...relativePath.split("/"));
}

async function renderSvg(relativePath, body, options = {}) {
  const target = outputPath(relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  const svg = svgWrap(body, options);
  await sharp(Buffer.from(svg))
    .webp({
      quality: options.quality ?? 90,
      alphaQuality: 100,
      smartSubsample: true,
      effort: 6,
    })
    .toFile(target);
}

async function renderThumbnail(item) {
  const layers = [item.back, item.main, item.front].filter(Boolean).join("\n");
  const source = Buffer.from(svgWrap(layers));
  const { left, top, width, height } = item.thumbBox;
  const target = outputPath(`items/${item.id}/thumb.webp`);
  await mkdir(path.dirname(target), { recursive: true });

  await sharp(source)
    .extract({ left, top, width, height })
    .resize({
      width: 440,
      height: 320,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 32,
      bottom: 32,
      left: 36,
      right: 36,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({
      quality: 90,
      alphaQuality: 100,
      smartSubsample: true,
      effort: 6,
    })
    .toFile(target);
}

const baseCharacter = `
  <ellipse cx="512" cy="1442" rx="218" ry="42" fill="${C.ink}" opacity="0.13"/>

  <!-- legs and neutral socks -->
  <path d="M365 1012 C365 1144 369 1270 378 1368 C381 1406 405 1424 438 1418
           C466 1412 476 1392 474 1362 L480 1012 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M544 1012 L550 1362 C548 1392 558 1412 586 1418
           C619 1424 643 1406 646 1368 C655 1270 659 1144 659 1012 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M372 1286 C402 1298 444 1298 476 1286 L474 1372
           C462 1404 394 1411 378 1374 Z"
        fill="${C.white}" stroke="${C.ink}" stroke-width="7"/>
  <path d="M548 1286 C580 1298 622 1298 652 1286 L646 1374
           C630 1411 562 1404 550 1372 Z"
        fill="${C.white}" stroke="${C.ink}" stroke-width="7"/>
  <path d="M376 1308 C406 1318 445 1318 475 1308" fill="none"
        stroke="${C.mintDark}" stroke-width="12"/>
  <path d="M549 1308 C579 1318 618 1318 648 1308" fill="none"
        stroke="${C.mintDark}" stroke-width="12"/>

  <!-- neutral shorts -->
  <path d="M359 908 C410 888 614 888 665 908 L652 1104
           C615 1120 567 1121 526 1102 L512 984 L498 1102
           C457 1121 409 1120 372 1104 Z"
        fill="${C.navy}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M512 930 L512 1002" fill="none" stroke="${C.ink}" stroke-width="8"/>

  <!-- neck -->
  <path d="M449 525 L575 525 L584 646 C553 678 471 678 440 646 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="8"/>
  <path d="M452 555 C480 581 544 581 572 555 L576 606
           C543 631 481 631 448 606 Z"
        fill="${C.skinShade}" opacity="0.52"/>

  <!-- arms behind the neutral shirt -->
  <path d="M379 665 C332 686 314 757 294 844 L267 947
           C253 993 284 1028 319 1016 C345 1006 351 978 353 952
           L403 764 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M645 665 C692 686 710 757 730 844 L757 947
           C771 993 740 1028 705 1016 C679 1006 673 978 671 952
           L621 764 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M267 946 C249 963 241 985 248 1005 C255 1025 274 1028 284 1016
           C279 1037 301 1044 313 1026 C312 1049 335 1050 343 1029
           C346 1018 343 992 335 973 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>
  <path d="M757 946 C775 963 783 985 776 1005 C769 1025 750 1028 740 1016
           C745 1037 723 1044 711 1026 C712 1049 689 1050 681 1029
           C678 1018 681 992 689 973 Z"
        fill="${C.skin}" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>

  <!-- neutral undershirt -->
  <path d="M372 658 C403 629 441 618 466 616 C487 640 537 640 558 616
           C583 618 621 629 652 658 L638 938
           C580 962 444 962 386 938 Z"
        fill="${C.paper}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M463 618 C474 658 550 658 561 618"
        fill="none" stroke="${C.coral}" stroke-width="18" stroke-linecap="round"/>

  <!-- ears and head -->
  <ellipse cx="328" cy="373" rx="52" ry="66" fill="${C.skin}"
           stroke="${C.ink}" stroke-width="9"/>
  <ellipse cx="696" cy="373" rx="52" ry="66" fill="${C.skin}"
           stroke="${C.ink}" stroke-width="9"/>
  <path d="M332 387 C315 372 316 340 342 342" fill="none"
        stroke="${C.skinShade}" stroke-width="8" stroke-linecap="round"/>
  <path d="M692 387 C709 372 708 340 682 342" fill="none"
        stroke="${C.skinShade}" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="512" cy="360" rx="184" ry="206"
           fill="${C.skin}" stroke="${C.ink}" stroke-width="10"/>

  <!-- hair mass and fringe -->
  <path d="M325 343 C315 218 389 124 512 120 C650 114 724 216 700 354
           C680 318 659 285 631 260 C624 301 602 326 574 342
           C579 309 569 277 552 249 C532 300 486 336 433 350
           C449 314 444 281 432 252 C404 298 370 327 325 343 Z"
        fill="${C.navyDeep}" stroke="${C.ink}" stroke-width="10"
        stroke-linejoin="round"/>
  <path d="M378 202 C405 164 447 142 492 135"
        fill="none" stroke="#52627f" stroke-width="15" stroke-linecap="round" opacity="0.55"/>
  <path d="M548 139 C594 147 629 168 651 200"
        fill="none" stroke="#52627f" stroke-width="15" stroke-linecap="round" opacity="0.45"/>
  <path d="M493 122 C486 91 469 75 447 68 C477 63 499 76 512 101
           C528 75 552 65 578 72 C552 81 536 98 531 124 Z"
        fill="${C.navyDeep}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>

  <!-- subtle face base details -->
  <ellipse cx="402" cy="425" rx="32" ry="18" fill="${C.blush}" opacity="0.52"/>
  <ellipse cx="622" cy="425" rx="32" ry="18" fill="${C.blush}" opacity="0.52"/>
  <circle cx="512" cy="392" r="10" fill="${C.skinShade}" opacity="0.56"/>
`;

const faces = {
  ready: `
    <path d="M395 320 C422 300 451 302 472 319" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M552 319 C573 302 602 300 629 320" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="436" cy="355" rx="41" ry="50" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <ellipse cx="588" cy="355" rx="41" ry="50" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <ellipse cx="440" cy="363" rx="25" ry="34" fill="#5a2f19"/>
    <ellipse cx="584" cy="363" rx="25" ry="34" fill="#5a2f19"/>
    <circle cx="449" cy="349" r="9" fill="white"/>
    <circle cx="593" cy="349" r="9" fill="white"/>
    <path d="M459 456 C489 480 535 480 565 456" fill="none"
          stroke="#8f3c34" stroke-width="9" stroke-linecap="round"/>
  `,
  success: `
    <path d="M392 324 C425 299 454 305 474 321" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M550 321 C570 305 599 299 632 324" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M398 360 C420 334 451 334 474 360" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M550 360 C573 334 604 334 626 360" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M446 447 C478 505 546 505 578 447 C539 466 485 466 446 447 Z"
          fill="${C.coral}" stroke="#8f3c34" stroke-width="9" stroke-linejoin="round"/>
    <path d="M473 473 C497 488 527 488 551 473" fill="none"
          stroke="#ffb5a6" stroke-width="8" stroke-linecap="round"/>
  `,
  retry: `
    <path d="M391 323 C419 300 449 303 471 319" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <path d="M553 319 C578 300 609 306 634 331" fill="none"
          stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="436" cy="359" rx="38" ry="47" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <ellipse cx="588" cy="359" rx="38" ry="47" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <ellipse cx="444" cy="367" rx="22" ry="30" fill="#5a2f19"/>
    <ellipse cx="580" cy="367" rx="22" ry="30" fill="#5a2f19"/>
    <circle cx="451" cy="355" r="8" fill="white"/>
    <circle cx="587" cy="355" r="8" fill="white"/>
    <path d="M469 469 C492 448 532 448 555 469" fill="none"
          stroke="#8f3c34" stroke-width="9" stroke-linecap="round"/>
  `,
};

const raincoatBack = `
  <path d="M286 410 C258 214 365 82 512 76 C659 82 766 214 738 410
           C692 336 625 285 512 282 C399 285 332 336 286 410 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M316 386 C346 244 419 155 512 151 C605 155 678 244 708 386"
        fill="none" stroke="${C.yellowDark}" stroke-width="10" opacity="0.72"/>
`;

const raincoatMain = `
  <path d="M365 650 C398 617 436 600 466 596 C484 625 540 625 558 596
           C588 600 626 617 659 650 L691 1011
           C631 1051 393 1051 333 1011 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M374 659 C326 681 309 741 291 824 L263 948
           C259 981 279 1004 310 998 C333 993 340 969 343 944 L397 752 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M650 659 C698 681 715 741 733 824 L761 948
           C765 981 745 1004 714 998 C691 993 684 969 681 944 L627 752 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M465 599 C476 641 548 641 559 599" fill="none"
        stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>
  <path d="M512 640 L512 1029" fill="none" stroke="${C.yellowDark}" stroke-width="9"/>
  <circle cx="512" cy="709" r="13" fill="${C.ink}"/>
  <circle cx="512" cy="803" r="13" fill="${C.ink}"/>
  <circle cx="512" cy="897" r="13" fill="${C.ink}"/>
  <circle cx="512" cy="991" r="13" fill="${C.ink}"/>
  <path d="M390 808 L470 820 L464 917 C433 930 396 922 382 901 Z"
        fill="#ffd753" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M634 808 L554 820 L560 917 C591 930 628 922 642 901 Z"
        fill="#ffd753" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M343 954 C426 982 598 982 681 954" fill="none"
        stroke="${C.paper}" stroke-width="18"/>
  <path d="M276 913 L347 929" fill="none" stroke="${C.paper}" stroke-width="18"/>
  <path d="M748 913 L677 929" fill="none" stroke="${C.paper}" stroke-width="18"/>
`;

const windbreaker = `
  <path d="M368 650 C397 616 438 602 466 596 C486 624 538 624 558 596
           C586 602 627 616 656 650 L664 940
           C594 964 430 964 360 940 Z"
        fill="url(#mintShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M374 656 C326 678 313 748 296 830 L270 951
           C267 980 288 999 316 990 L348 922 L404 749 Z"
        fill="url(#mintShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M650 656 C698 678 711 748 728 830 L754 951
           C757 980 736 999 708 990 L676 922 L620 749 Z"
        fill="url(#mintShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M512 636 L512 951" fill="none" stroke="${C.mintDark}" stroke-width="9"/>
  <path d="M466 596 C484 643 540 643 558 596" fill="none"
        stroke="${C.ink}" stroke-width="10"/>
  <path d="M361 891 C430 915 594 915 663 891" fill="none"
        stroke="${C.mintDark}" stroke-width="18"/>
  <path d="M284 914 L347 930 M740 914 L677 930" stroke="${C.mintDark}"
        stroke-width="16" stroke-linecap="round"/>
  <path d="M429 762 L473 810 M595 762 L551 810" fill="none"
        stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>
`;

const cardigan = `
  <path d="M371 651 C405 620 438 605 469 599 C484 626 540 626 555 599
           C586 605 619 620 653 651 L647 948
           C580 971 444 971 377 948 Z"
        fill="${C.navy}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M377 656 C329 681 316 752 298 843 L272 956
           C271 984 292 1001 318 992 L352 920 L405 751 Z"
        fill="${C.navy}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M647 656 C695 681 708 752 726 843 L752 956
           C753 984 732 1001 706 992 L672 920 L619 751 Z"
        fill="${C.navy}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M463 601 L512 700 L561 601" fill="${C.cream}"
        stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M512 700 L512 958" fill="none" stroke="#d5b75e" stroke-width="8"/>
  <circle cx="512" cy="760" r="10" fill="#d5b75e"/>
  <circle cx="512" cy="830" r="10" fill="#d5b75e"/>
  <circle cx="512" cy="900" r="10" fill="#d5b75e"/>
  <path d="M383 902 C414 916 444 918 470 908 M641 902 C610 916 580 918 554 908"
        fill="none" stroke="#d5b75e" stroke-width="8"/>
`;

const sweater = `
  <path d="M365 652 C401 617 438 602 465 596 C485 632 539 632 559 596
           C586 602 623 617 659 652 L655 961
           C588 984 436 984 369 961 Z"
        fill="#f2e8d1" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M374 656 C326 681 313 748 294 841 L269 955
           C268 984 290 1002 317 992 L352 921 L405 751 Z"
        fill="#f2e8d1" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M650 656 C698 681 711 748 730 841 L755 955
           C756 984 734 1002 707 992 L672 921 L619 751 Z"
        fill="#f2e8d1" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M463 598 C476 653 548 653 561 598" fill="none"
        stroke="#cfbfa0" stroke-width="20"/>
  <path d="M378 902 C445 928 579 928 646 902" fill="none"
        stroke="#cfbfa0" stroke-width="20"/>
  <path d="M285 918 L346 935 M739 918 L678 935" stroke="#cfbfa0"
        stroke-width="18" stroke-linecap="round"/>
  <path d="M422 696 L602 876 M602 696 L422 876" stroke="#e1d4b9"
        stroke-width="8" opacity="0.8"/>
`;

const activePants = `
  <path d="M355 899 C414 883 610 883 669 899 L659 1355
           C625 1374 575 1374 544 1356 L512 1048 L480 1356
           C449 1374 399 1374 365 1355 Z"
        fill="${C.navy}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M355 915 C417 932 607 932 669 915" fill="none"
        stroke="${C.navyDeep}" stroke-width="22"/>
  <path d="M478 916 C484 956 490 986 512 1008 C534 986 540 956 546 916"
        fill="none" stroke="${C.ink}" stroke-width="9"/>
  <path d="M488 917 L472 978 M536 917 L552 978" stroke="${C.cream}"
        stroke-width="8" stroke-linecap="round"/>
  <path d="M365 1038 L438 1018 L447 1132 L372 1151 Z"
        fill="${C.inkSoft}" stroke="${C.ink}" stroke-width="8"/>
  <path d="M659 1038 L586 1018 L577 1132 L652 1151 Z"
        fill="${C.inkSoft}" stroke="${C.ink}" stroke-width="8"/>
  <path d="M366 1300 C397 1318 447 1318 478 1302 M658 1300 C627 1318 577 1318 546 1302"
        fill="none" stroke="${C.navyDeep}" stroke-width="16"/>
`;

const skyDenim = `
  <path d="M356 899 C418 881 606 881 668 899 L653 1351
           C621 1368 576 1369 544 1353 L512 1044 L480 1353
           C448 1369 403 1368 371 1351 Z"
        fill="${C.denim}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M356 920 C419 938 605 938 668 920" fill="none"
        stroke="${C.denimDark}" stroke-width="14"/>
  <path d="M512 923 L512 1050" fill="none" stroke="${C.denimDark}" stroke-width="8"/>
  <path d="M382 949 C407 979 438 987 466 962 M642 949 C617 979 586 987 558 962"
        fill="none" stroke="${C.denimDark}" stroke-width="8"/>
  <path d="M392 1290 C417 1306 449 1308 478 1295 M632 1290 C607 1306 575 1308 546 1295"
        fill="none" stroke="#c6d9eb" stroke-width="8"/>
`;

const beigeShorts = `
  <path d="M354 899 C417 881 607 881 670 899 L654 1120
           C619 1139 566 1138 526 1117 L512 1012 L498 1117
           C458 1138 405 1139 370 1120 Z"
        fill="${C.beige}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M355 921 C421 938 603 938 669 921" fill="none"
        stroke="${C.beigeDark}" stroke-width="14"/>
  <path d="M512 923 L512 1018" stroke="${C.beigeDark}" stroke-width="8"/>
  <path d="M386 974 L458 998 M638 974 L566 998" stroke="${C.beigeDark}"
        stroke-width="8" stroke-linecap="round"/>
  <path d="M374 1084 C410 1098 458 1097 495 1085 M650 1084 C614 1098 566 1097 529 1085"
        fill="none" stroke="#f1cf9b" stroke-width="8"/>
`;

const longSkirt = `
  <path d="M362 899 C418 881 606 881 662 899 L704 1338
           C624 1375 400 1375 320 1338 Z"
        fill="${C.plum}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M363 922 C423 940 601 940 661 922" fill="none"
        stroke="${C.plumDark}" stroke-width="15"/>
  <path d="M410 945 L382 1332 M470 945 L458 1350 M554 945 L566 1350 M614 945 L642 1332"
        fill="none" stroke="#d6a9d2" stroke-width="10"/>
  <path d="M331 1306 C421 1340 603 1340 693 1306" fill="none"
        stroke="${C.plumDark}" stroke-width="10"/>
`;

const rainBoots = `
  <path d="M350 1267 L480 1267 L480 1392 C481 1417 465 1435 440 1438
           L350 1438 C328 1438 317 1424 323 1404 L340 1376 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M544 1267 L674 1267 L684 1376 L701 1404 C707 1424 696 1438 674 1438
           L584 1438 C559 1435 543 1417 544 1392 Z"
        fill="url(#yellowShade)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M340 1281 C377 1293 443 1293 480 1281 M544 1281 C581 1293 647 1293 684 1281"
        fill="none" stroke="${C.yellowDark}" stroke-width="12"/>
  <path d="M325 1407 C370 1421 441 1421 484 1407 M540 1407 C583 1421 654 1421 699 1407"
        fill="none" stroke="${C.navyDeep}" stroke-width="24"/>
  <path d="M346 1425 L346 1445 M382 1427 L382 1447 M418 1427 L418 1447 M454 1424 L454 1444
           M570 1424 L570 1444 M606 1427 L606 1447 M642 1427 L642 1447 M678 1425 L678 1445"
        stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>
  <path d="M359 1320 C374 1300 394 1296 413 1297" fill="none"
        stroke="#fff0a2" stroke-width="12" stroke-linecap="round" opacity="0.8"/>
`;

const sneakers = `
  <path d="M347 1351 C384 1336 439 1337 476 1351 L500 1396
           C510 1420 494 1438 467 1438 L337 1438 C316 1438 307 1422 318 1405 Z"
        fill="${C.paper}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M677 1351 C640 1336 585 1337 548 1351 L524 1396
           C514 1420 530 1438 557 1438 L687 1438 C708 1438 717 1422 706 1405 Z"
        fill="${C.paper}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M326 1401 C370 1418 454 1418 496 1401 M698 1401 C654 1418 570 1418 528 1401"
        fill="none" stroke="${C.skyDark}" stroke-width="18"/>
  <path d="M361 1365 L461 1391 M663 1365 L563 1391" stroke="${C.skyDark}"
        stroke-width="9" stroke-linecap="round"/>
  <path d="M374 1367 L451 1388 M650 1367 L573 1388" stroke="${C.paper}"
        stroke-width="5"/>
`;

const slippers = `
  <path d="M328 1382 C364 1365 446 1364 484 1383 L494 1417
           C482 1441 338 1445 318 1422 Z"
        fill="${C.coral}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M696 1382 C660 1365 578 1364 540 1383 L530 1417
           C542 1441 686 1445 706 1422 Z"
        fill="${C.coral}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M347 1381 C365 1347 442 1346 467 1387 M677 1381 C659 1347 582 1346 557 1387"
        fill="none" stroke="#ffb09c" stroke-width="25" stroke-linecap="round"/>
  <path d="M323 1416 C366 1428 450 1428 490 1416 M701 1416 C658 1428 574 1428 534 1416"
        fill="none" stroke="${C.coralDark}" stroke-width="12"/>
`;

const dressShoes = `
  <path d="M347 1354 C389 1339 447 1344 478 1363 L503 1404
           C509 1424 493 1438 468 1438 L336 1438 C314 1438 309 1418 322 1402 Z"
        fill="${C.black}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M677 1354 C635 1339 577 1344 546 1363 L521 1404
           C515 1424 531 1438 556 1438 L688 1438 C710 1438 715 1418 702 1402 Z"
        fill="${C.black}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M360 1372 C385 1355 437 1358 464 1378 M664 1372 C639 1355 587 1358 560 1378"
        fill="none" stroke="#657084" stroke-width="10" stroke-linecap="round"/>
  <path d="M320 1416 C367 1428 452 1428 499 1416 M704 1416 C657 1428 572 1428 525 1416"
        fill="none" stroke="#090b10" stroke-width="15"/>
`;

function umbrellaBack(fill, transparent = false) {
  return `
    <g transform="translate(730 0) scale(0.82 1) translate(-612 0)">
    <path d="M112 524 C142 278 356 118 612 142 C800 160 908 298 925 524
             C857 489 791 489 724 524 C658 489 591 489 524 524
             C458 489 391 489 324 524 C258 489 191 489 112 524 Z"
          fill="${transparent ? "url(#glassShade)" : fill}" stroke="${C.ink}" stroke-width="12"
          stroke-linejoin="round" opacity="${transparent ? "0.9" : "1"}"/>
    <path d="M112 524 C196 276 410 150 612 142 C531 215 497 343 524 524
             M925 524 C838 281 727 166 612 142 C675 244 712 357 724 524
             M324 524 C354 331 451 196 612 142"
          fill="none" stroke="${transparent ? "#74a9cf" : "#6d7890"}"
          stroke-width="9" opacity="0.75"/>
    <path d="M133 480 C265 306 421 217 585 185" fill="none"
          stroke="white" stroke-width="20" stroke-linecap="round"
          opacity="${transparent ? "0.48" : "0.14"}"/>
    <circle cx="112" cy="524" r="16" fill="${C.sky}" stroke="${C.ink}" stroke-width="8"/>
    <circle cx="324" cy="524" r="16" fill="${C.sky}" stroke="${C.ink}" stroke-width="8"/>
    <circle cx="524" cy="524" r="16" fill="${C.sky}" stroke="${C.ink}" stroke-width="8"/>
    <circle cx="724" cy="524" r="16" fill="${C.sky}" stroke="${C.ink}" stroke-width="8"/>
    <circle cx="925" cy="524" r="16" fill="${C.sky}" stroke="${C.ink}" stroke-width="8"/>
    </g>
  `;
}

function umbrellaFront(dark = false) {
  return `
    <g transform="translate(730 0) scale(0.82 1) translate(-612 0)">
    <path d="M612 138 L612 1112" fill="none" stroke="${dark ? C.navyDeep : "#6683a2"}"
          stroke-width="20" stroke-linecap="round"/>
    <rect x="589" y="117" width="46" height="76" rx="16"
          fill="${C.navy}" stroke="${C.ink}" stroke-width="9"/>
    <path d="M612 1090 L612 1242 C612 1322 694 1350 742 1299
             C764 1276 761 1227 733 1216 C708 1207 690 1226 694 1249
             C697 1266 682 1283 661 1274 C646 1268 641 1250 641 1228"
          fill="none" stroke="${C.navy}" stroke-width="28" stroke-linecap="round"/>
    <path d="M612 1090 L612 1242 C612 1322 694 1350 742 1299"
          fill="none" stroke="${C.ink}" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
    <rect x="591" y="895" width="42" height="94" rx="18"
          fill="${C.navy}" stroke="${C.ink}" stroke-width="8"/>
    </g>
  `;
}

const reflectiveBand = `
  <g transform="rotate(10 316 872)">
    <rect x="265" y="839" width="103" height="64" rx="15"
          fill="${C.lime}" stroke="${C.ink}" stroke-width="10"/>
    <path d="M281 855 L351 887" stroke="white" stroke-width="13"
          stroke-linecap="round" opacity="0.9"/>
  </g>
`;

const toteBack = `
  <path d="M128 877 C157 843 288 843 317 877 L344 1255
           C292 1291 153 1291 101 1255 Z"
        fill="#e5cda7" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
  <path d="M118 978 C171 995 274 995 327 978" fill="none"
        stroke="#b58a55" stroke-width="9"/>
  <path d="M153 912 L130 1224 M292 912 L316 1224" stroke="#c09b67"
        stroke-width="7" opacity="0.75"/>
`;

const toteFront = `
  <path d="M149 921 C158 710 299 665 370 720 C408 750 421 809 409 878"
        fill="none" stroke="#9e7c4e" stroke-width="25" stroke-linecap="round"/>
  <path d="M149 921 C158 710 299 665 370 720" fill="none"
        stroke="#ead7b6" stroke-width="10" stroke-linecap="round"/>
  <circle cx="150" cy="921" r="17" fill="#9e7c4e" stroke="${C.ink}" stroke-width="7"/>
`;

const itemDefinitions = [
  {
    id: "yellow-raincoat",
    slot: "top",
    back: raincoatBack,
    main: raincoatMain,
    thumbBox: { left: 238, top: 120, width: 548, height: 960 },
  },
  {
    id: "mint-windbreaker",
    slot: "top",
    main: windbreaker,
    thumbBox: { left: 238, top: 560, width: 548, height: 470 },
  },
  {
    id: "navy-cardigan",
    slot: "top",
    main: cardigan,
    thumbBox: { left: 238, top: 560, width: 548, height: 470 },
  },
  {
    id: "cream-sweater",
    slot: "top",
    main: sweater,
    thumbBox: { left: 238, top: 560, width: 548, height: 470 },
  },
  {
    id: "active-pants",
    slot: "bottom",
    main: activePants,
    thumbBox: { left: 285, top: 840, width: 454, height: 575 },
  },
  {
    id: "sky-denim",
    slot: "bottom",
    main: skyDenim,
    thumbBox: { left: 285, top: 840, width: 454, height: 575 },
  },
  {
    id: "beige-shorts",
    slot: "bottom",
    main: beigeShorts,
    thumbBox: { left: 285, top: 840, width: 454, height: 350 },
  },
  {
    id: "long-skirt",
    slot: "bottom",
    main: longSkirt,
    thumbBox: { left: 270, top: 840, width: 484, height: 575 },
  },
  {
    id: "rain-boots",
    slot: "shoes",
    main: rainBoots,
    thumbBox: { left: 270, top: 1210, width: 484, height: 290 },
  },
  {
    id: "sneakers",
    slot: "shoes",
    main: sneakers,
    thumbBox: { left: 270, top: 1280, width: 484, height: 210 },
  },
  {
    id: "slippers",
    slot: "shoes",
    main: slippers,
    thumbBox: { left: 270, top: 1290, width: 484, height: 200 },
  },
  {
    id: "dress-shoes",
    slot: "shoes",
    main: dressShoes,
    thumbBox: { left: 270, top: 1290, width: 484, height: 200 },
  },
  {
    id: "clear-umbrella",
    slot: "accessory",
    back: umbrellaBack("#dff6ff", true),
    front: umbrellaFront(false),
    thumbBox: { left: 70, top: 80, width: 900, height: 1280 },
  },
  {
    id: "black-umbrella",
    slot: "accessory",
    back: umbrellaBack("#303342", false),
    front: umbrellaFront(true),
    thumbBox: { left: 70, top: 80, width: 900, height: 1280 },
  },
  {
    id: "reflective-band",
    slot: "accessory",
    front: reflectiveBand,
    thumbBox: { left: 230, top: 800, width: 190, height: 150 },
  },
  {
    id: "canvas-tote",
    slot: "accessory",
    back: toteBack,
    front: toteFront,
    thumbBox: { left: 70, top: 620, width: 400, height: 720 },
  },
];

const background = `
  <rect width="${BG_W}" height="${BG_H}" fill="url(#skyShade)"/>
  <g transform="scale(${BG_W / W} ${BG_H / H})">
  <circle cx="824" cy="250" r="210" fill="url(#lampGlow)"/>
  <path d="M0 470 L170 335 L340 470 V1040 H0 Z"
        fill="#385671" stroke="${C.ink}" stroke-width="10"/>
  <path d="M220 500 L476 275 L744 500 V1040 H220 Z"
        fill="#42637c" stroke="${C.ink}" stroke-width="10"/>
  <path d="M694 495 L864 350 L1024 470 V1040 H694 Z"
        fill="#314d67" stroke="${C.ink}" stroke-width="10"/>
  <rect x="60" y="560" width="92" height="156" rx="10" fill="#f5c962" opacity="0.72"/>
  <rect x="235" y="550" width="92" height="156" rx="10" fill="#a8d5de" opacity="0.7"/>
  <rect x="544" y="570" width="108" height="146" rx="10" fill="#f5c962" opacity="0.7"/>
  <rect x="782" y="560" width="92" height="156" rx="10" fill="#a8d5de" opacity="0.64"/>
  <path d="M0 965 C232 925 792 925 1024 965 V1536 H0 Z" fill="url(#roadShade)"/>
  <path d="M0 1064 C260 1010 764 1010 1024 1064" fill="none"
        stroke="#90b9c6" stroke-width="18" opacity="0.68"/>
  <path d="M850 283 L850 985" stroke="${C.ink}" stroke-width="24" stroke-linecap="round"/>
  <path d="M850 334 C796 334 771 376 771 421" fill="none"
        stroke="${C.ink}" stroke-width="18" stroke-linecap="round"/>
  <circle cx="771" cy="438" r="54" fill="#fff0a8" stroke="${C.ink}" stroke-width="11"/>
  <circle cx="771" cy="438" r="104" fill="url(#lampGlow)"/>
  <path d="M92 1260 C310 1219 714 1219 932 1260" fill="none"
        stroke="#b9e2e6" stroke-width="24" opacity="0.38"/>
  <ellipse cx="512" cy="1438" rx="300" ry="48" fill="#bddde1" opacity="0.28"/>
  <path d="M132 1175 L235 1128 M790 1186 L900 1139" stroke="#d4eff1"
        stroke-width="14" stroke-linecap="round" opacity="0.45"/>
  </g>
`;

const rainBack = `
  <g stroke="#d9f4fb" stroke-width="8" stroke-linecap="round" opacity="0.44">
    <path d="M86 80 L32 260 M208 12 L150 210 M372 52 L310 256 M546 20 L480 240
             M718 62 L654 276 M894 18 L830 238 M1000 130 L948 306
             M150 380 L92 574 M330 330 L268 538 M530 352 L470 554
             M740 320 L678 528 M924 390 L860 596 M80 670 L18 878
             M250 650 L188 858 M466 650 L402 862 M692 656 L628 864
             M910 652 L844 866 M126 1000 L64 1208 M350 976 L286 1190
             M594 1000 L530 1212 M824 980 L760 1190 M996 1060 L936 1260"/>
  </g>
`;

const rainFront = `
  <g stroke="#effcff" stroke-width="13" stroke-linecap="round" opacity="0.72">
    <path d="M116 182 L58 382 M414 128 L350 344 M786 110 L720 330
             M978 414 L914 632 M210 594 L142 824 M582 548 L510 790
             M846 796 L776 1034 M302 980 L228 1226 M664 1050 L590 1294
             M954 1190 L892 1396"/>
  </g>
  <g fill="#effcff" opacity="0.68">
    <path d="M97 438 C81 468 78 486 97 500 C116 486 113 468 97 438 Z"/>
    <path d="M880 654 C864 684 861 702 880 716 C899 702 896 684 880 654 Z"/>
    <path d="M454 870 C438 900 435 918 454 932 C473 918 470 900 454 870 Z"/>
    <path d="M746 1328 C730 1358 727 1376 746 1390 C765 1376 762 1358 746 1328 Z"/>
  </g>
`;

const reflectiveGlow = `
  <ellipse cx="316" cy="872" rx="162" ry="132" fill="url(#reflectGlow)"/>
  <g transform="rotate(10 316 872)">
    <rect x="258" y="831" width="118" height="80" rx="20"
          fill="none" stroke="#fbffca" stroke-width="18" opacity="0.62"/>
  </g>
  <g stroke="#fbffca" stroke-width="10" stroke-linecap="round" opacity="0.8">
    <path d="M316 714 L316 754 M316 990 L316 1030 M158 872 L198 872 M434 872 L474 872
             M204 760 L232 788 M400 956 L428 984 M204 984 L232 956 M400 788 L428 760"/>
  </g>
`;

async function main() {
  const relative = path.relative(PUBLIC_ROOT, OUTPUT_ROOT);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative !== path.join("art", "v1")) {
    throw new Error(`Refusing to clean unexpected output path: ${OUTPUT_ROOT}`);
  }

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(OUTPUT_ROOT, { recursive: true });

  const jobs = [
    renderSvg("character/base.webp", baseCharacter),
    renderSvg("character/faces/ready.webp", faces.ready),
    renderSvg("character/faces/success.webp", faces.success),
    renderSvg("character/faces/retry.webp", faces.retry),
    renderSvg("episodes/rainy-market-errand/background.webp", background, {
      opaque: true,
      quality: 84,
      width: BG_W,
      height: BG_H,
    }),
    renderSvg("episodes/rainy-market-errand/effects/rain-back.webp", rainBack),
    renderSvg("episodes/rainy-market-errand/effects/rain-front.webp", rainFront),
    renderSvg(
      "episodes/rainy-market-errand/effects/reflective-glow.webp",
      reflectiveGlow,
    ),
  ];

  for (const item of itemDefinitions) {
    if (item.back) {
      jobs.push(renderSvg(`items/${item.id}/wear-back.webp`, item.back));
    }
    if (item.main) {
      jobs.push(renderSvg(`items/${item.id}/wear-main.webp`, item.main));
    }
    if (item.front) {
      jobs.push(renderSvg(`items/${item.id}/wear-front.webp`, item.front));
    }
    jobs.push(renderThumbnail(item));
  }

  await Promise.all(jobs);

  const manifest = {
    version: 1,
    canvas: {
      width: W,
      height: H,
      groundAnchor: { x: 512, y: 1440 },
    },
    character: {
      base: "character/base.webp",
      faces: {
        ready: "character/faces/ready.webp",
        success: "character/faces/success.webp",
        retry: "character/faces/retry.webp",
      },
    },
    episode: {
      id: "rainy-market-errand",
      background: "episodes/rainy-market-errand/background.webp",
      backgroundCanvas: {
        width: BG_W,
        height: BG_H,
      },
      effects: {
        rainBack: {
          src: "episodes/rainy-market-errand/effects/rain-back.webp",
          z: 10,
        },
        rainFront: {
          src: "episodes/rainy-market-errand/effects/rain-front.webp",
          z: 110,
        },
        reflectiveGlow: {
          src: "episodes/rainy-market-errand/effects/reflective-glow.webp",
          z: 100,
          whenItemSelected: "reflective-band",
        },
      },
    },
    items: itemDefinitions.map((item) => ({
      id: item.id,
      slot: item.slot,
      thumbnail: `items/${item.id}/thumb.webp`,
      layers: [
        item.back && {
          src: `items/${item.id}/wear-back.webp`,
          z: item.id === "yellow-raincoat" ? 30 : 20,
        },
        item.main && {
          src: `items/${item.id}/wear-main.webp`,
          z: item.slot === "bottom" ? 50 : item.slot === "shoes" ? 60 : 70,
        },
        item.front && {
          src: `items/${item.id}/wear-front.webp`,
          z: 90,
        },
      ].filter(Boolean),
    })),
  };

  await writeFile(
    outputPath("art-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Generated ${itemDefinitions.length} items and 44 WebP assets in ${OUTPUT_ROOT}`,
  );
}

await main();
