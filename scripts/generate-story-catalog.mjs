import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const item = (
  id,
  name,
  slot,
  color,
  accent,
  symbol,
  styleKey,
  tags,
  note,
  layerKinds = ["main"],
) => ({
  id,
  name,
  slot,
  color,
  accent,
  symbol,
  styleKey,
  tags,
  note,
  layerKinds,
});

const items = [
  item("rescue-jacket", "구조 훈련복", "top", "#f6574f", "#c93538", "구조대", "jacket", ["visible", "active", "practical", "rescue", "coverage"], "밝아서 잘 보이고 팔을 움직이기 편한 구조 훈련복이에요.", ["back", "main"]),
  item("sports-hoodie", "활동 후드", "top", "#5b80ce", "#294a8b", "후드", "hoodie", ["active", "comfortable", "warm", "casual"], "몸을 움직이기 편하고 포근해요."),
  item("school-cardigan", "학교 가디건", "top", "#41577c", "#202d49", "가디건", "cardigan", ["school", "neat", "warm", "practical"], "학교에서 단정하고 편하게 입을 수 있어요."),
  item("party-shirt", "반짝 파티 셔츠", "top", "#f58ab8", "#a83e70", "파티복", "shirt", ["celebration", "flashy", "formal"], "즐거운 파티에는 어울리지만 차분한 자리에는 튈 수 있어요."),
  item("yellow-raincoat", "노란 우비", "top", "#ffd54f", "#f3a712", "우비", "raincoat", ["waterproof", "visible", "coverage", "practical"], "비를 막고 어두운 길에서도 잘 보여요.", ["back", "main"]),
  item("mint-windbreaker", "민트 바람막이", "top", "#73d8c7", "#2b9c91", "바람막이", "jacket", ["water-resistant", "visible", "active", "practical"], "가벼운 비와 바람을 막고 움직이기 편해요."),
  item("navy-cardigan", "남색 가디건", "top", "#263a5b", "#17243b", "가디건", "cardigan", ["warm", "dark", "neat", "practical"], "단정하고 따뜻하지만 비에는 젖기 쉬워요."),
  item("cream-sweater", "크림 니트", "top", "#f2e8d1", "#cfbfa0", "니트", "sweater", ["warm", "light", "coverage", "absorbent"], "포근하지만 물에 젖으면 무거워져요."),
  item("school-track-jacket", "학교 체육복 상의", "top", "#68a8df", "#326da5", "체육복", "track-jacket", ["school", "active", "breathable", "practical"], "학교와 체육 활동에 모두 편해요."),
  item("white-shirt", "단정한 흰 셔츠", "top", "#fffaf0", "#9aa7b1", "셔츠", "shirt", ["neat", "formal", "respectful"], "축하나 예의를 갖추는 자리에 단정해요."),
  item("cotton-pajama-top", "면 잠옷 상의", "top", "#9bc8e8", "#5c8fb5", "잠옷", "pajama", ["sleep", "soft", "comfortable", "breathable"], "부드럽고 땀이 잘 빠져 잠잘 때 편해요."),
  item("cotton-tshirt", "면 티셔츠", "top", "#8bd6b4", "#3f9c78", "티셔츠", "tshirt", ["breathable", "comfortable", "casual", "active"], "가볍고 편하지만 특별한 보호 기능은 적어요."),
  item("fleece-sweater", "포근한 수면 니트", "top", "#bda2db", "#7957a3", "수면복", "sweater", ["sleep", "soft", "warm", "comfortable"], "추운 밤에 포근하지만 더운 날에는 답답할 수 있어요."),
  item("formal-jacket", "단정한 재킷", "top", "#333f5b", "#151d30", "재킷", "formal-jacket", ["formal", "neat", "respectful", "dark"], "격식과 존중을 표현하는 단정한 옷이에요."),
  item("swim-rashguard", "수영 래시가드", "top", "#36b6cd", "#137085", "래시가드", "rashguard", ["swim", "quick-dry", "sun-protection", "coverage"], "물에서 잘 마르고 햇빛과 피부를 보호해요."),
  item("ski-jacket", "방수 스키 재킷", "top", "#ff7d4d", "#b94322", "스키복", "ski-jacket", ["snowproof", "waterproof", "warm", "visible", "coverage"], "눈과 찬 바람을 막고 체온을 지켜요."),
  item("wool-coat", "울 코트", "top", "#8d6f67", "#543c36", "코트", "coat", ["warm", "formal", "absorbent", "restrict"], "따뜻하지만 눈에 젖으면 무겁고 움직임이 불편해요."),
  item("black-cardigan", "검정 가디건", "top", "#30323b", "#111218", "가디건", "cardigan", ["dark", "neat", "respectful", "simple"], "차분하고 단정해서 조용한 자리에 어울려요."),
  item("hanbok-jeogori", "한복 저고리", "top", "#f3a3a9", "#b64e60", "저고리", "hanbok-top", ["traditional", "respectful", "neat", "celebration"], "명절의 뜻을 살리고 웃어른께 예의를 표현해요."),
  item("lab-coat", "실험복", "top", "#eef7f7", "#6f9098", "실험복", "lab-coat", ["lab", "coverage", "protective", "fitted"], "실험 재료가 옷과 피부에 닿는 것을 줄여요."),
  item("fitted-cooking-top", "소매가 고정된 조리복", "top", "#f7efe0", "#a47c55", "조리복", "chef-top", ["cooking", "fitted", "neat", "coverage"], "소매가 불이나 음식에 닿지 않게 고정돼요."),
  item("loose-sleeve-shirt", "소매가 넓은 셔츠", "top", "#f0b7da", "#9f5d86", "넓은소매", "wide-shirt", ["loose-sleeve", "snag-risk", "flashy"], "넓은 소매가 실험 도구나 불에 닿을 수 있어요."),
  item("protective-jacket", "튼튼한 보호 재킷", "top", "#6c7b52", "#344129", "보호복", "protective-jacket", ["protective", "active", "coverage", "practical"], "몸을 가리면서 빠르게 움직이기 좋아요."),

  item("active-pants", "검정 활동 바지", "bottom", "#343b4a", "#171b24", "활동바지", "pants", ["active", "coverage", "practical", "dark"], "걷고 뛰기 편하면서 다리를 가려 줘요."),
  item("sky-denim", "하늘색 청바지", "bottom", "#78a7d8", "#3c70a8", "청바지", "denim", ["coverage", "practical", "casual"], "다리를 가리지만 젖으면 무거워질 수 있어요."),
  item("beige-shorts", "베이지 반바지", "bottom", "#d8b07b", "#9c7043", "반바지", "shorts", ["active", "breathable", "exposed"], "움직이기 편하지만 다리 보호는 적어요."),
  item("long-skirt", "긴 주름치마", "bottom", "#bd86b8", "#8a5586", "긴치마", "skirt", ["coverage", "formal", "restrict", "snag-risk"], "단정할 수 있지만 활동할 때 걸리거나 젖을 수 있어요."),
  item("school-track-pants", "학교 체육복 바지", "bottom", "#426ea8", "#213e6a", "체육바지", "track-pants", ["school", "active", "breathable", "practical"], "체육 수업에서 안전하게 움직이기 편해요."),
  item("pajama-pants", "면 잠옷 바지", "bottom", "#9bc8e8", "#5c8fb5", "잠옷바지", "pajama-pants", ["sleep", "soft", "comfortable", "breathable"], "잠잘 때 부드럽고 몸을 조이지 않아요."),
  item("cotton-pants", "편한 면바지", "bottom", "#b7a987", "#716448", "면바지", "pants", ["comfortable", "coverage", "practical", "neat"], "여러 상황에서 편하고 단정하게 입을 수 있어요."),
  item("party-chinos", "단정한 파티 바지", "bottom", "#d5b67a", "#8b6b33", "파티바지", "chinos", ["celebration", "neat", "comfortable", "formal"], "축하 자리에서 단정하면서 움직이기 편해요."),
  item("swim-shorts", "수영 반바지", "bottom", "#3bb1db", "#136f9a", "수영복", "swim-shorts", ["swim", "quick-dry", "active", "lightweight"], "물에서 움직이기 쉽고 빠르게 말라요."),
  item("ski-pants", "방수 스키 바지", "bottom", "#2e517c", "#162c49", "스키바지", "ski-pants", ["snowproof", "waterproof", "warm", "coverage"], "눈과 찬 바람을 막아 다리를 따뜻하게 지켜요."),
  item("formal-pants", "검정 정장 바지", "bottom", "#292d39", "#11131a", "정장바지", "formal-pants", ["formal", "neat", "respectful", "dark"], "격식 있는 자리에서 단정하고 차분해요."),
  item("black-skirt", "검정 단정 치마", "bottom", "#383945", "#181820", "검정치마", "skirt", ["formal", "neat", "respectful", "dark"], "차분하고 단정한 자리에 어울려요."),
  item("hanbok-skirt", "한복 치마", "bottom", "#77b9c4", "#397985", "한복치마", "hanbok-skirt", ["traditional", "respectful", "neat", "celebration"], "명절의 전통과 예의를 표현해요."),
  item("lab-pants", "긴 실험 바지", "bottom", "#53647a", "#283447", "실험바지", "pants", ["lab", "coverage", "protective", "practical"], "실험할 때 다리 노출을 줄여 줘요."),
  item("cooking-pants", "긴 조리 바지", "bottom", "#6a6258", "#38322d", "조리바지", "pants", ["cooking", "coverage", "comfortable", "practical"], "뜨거운 것이 튈 때 다리를 보호해요."),
  item("protective-cargo-pants", "보호 카고 바지", "bottom", "#58654c", "#2c3726", "카고바지", "cargo-pants", ["protective", "active", "coverage", "practical"], "몸을 보호하고 필요한 물건을 넣기 좋아요."),

  item("rain-boots", "노란 장화", "shoes", "#ffc928", "#d89100", "장화", "boots", ["waterproof", "grip", "coverage", "practical"], "발을 빗물에서 보호하고 잘 미끄러지지 않아요."),
  item("sneakers", "운동화", "shoes", "#f7f4ec", "#4f8ec9", "운동화", "sneakers", ["grip", "active", "practical", "closed-shoe"], "걷고 뛰기 편한 막힌 신발이에요."),
  item("slippers", "집 슬리퍼", "shoes", "#f28f79", "#b95243", "슬리퍼", "slippers", ["open", "slippery", "casual"], "집에서는 편하지만 밖이나 위험한 장소에는 부적절해요."),
  item("dress-shoes", "검정 구두", "shoes", "#262626", "#090909", "구두", "dress-shoes", ["dark", "formal", "smooth-sole", "closed-shoe"], "격식에는 좋지만 빠른 활동에는 불편할 수 있어요."),
  item("running-shoes", "체육 운동화", "shoes", "#f5f3ea", "#f05f55", "체육화", "sneakers", ["school", "grip", "active", "closed-shoe"], "체육 활동에서 발을 잡아 주고 잘 미끄러지지 않아요."),
  item("sleep-socks", "부드러운 수면 양말", "shoes", "#d9c8ef", "#8d73ad", "수면양말", "socks", ["sleep", "soft", "warm", "comfortable"], "잠잘 때 발을 부드럽고 따뜻하게 해요."),
  item("party-sneakers", "단정한 파티 운동화", "shoes", "#fff5dd", "#d4a247", "파티화", "sneakers", ["celebration", "neat", "comfortable", "active"], "축하 자리에서 단정하면서 편하게 움직여요."),
  item("aqua-shoes", "아쿠아 슈즈", "shoes", "#40c7c6", "#157d7d", "아쿠아화", "aqua-shoes", ["swim", "grip", "quick-dry", "closed-shoe"], "물놀이 바닥에서 발을 보호하고 미끄럼을 줄여요."),
  item("sandals", "샌들", "shoes", "#e6a85f", "#9b632c", "샌들", "sandals", ["open", "lightweight", "casual"], "가볍지만 발가락 보호와 미끄럼 방지는 적어요."),
  item("ski-boots", "스키 부츠", "shoes", "#4b5f82", "#202d48", "스키부츠", "ski-boots", ["snowproof", "grip", "protective", "warm"], "스키에서 발목을 잡고 눈과 충격을 막아 줘요."),
  item("hiking-boots", "튼튼한 등산화", "shoes", "#70543e", "#38271c", "등산화", "hiking-boots", ["grip", "protective", "coverage", "active"], "거친 길에서 발목과 발바닥을 보호해요."),
  item("formal-flats", "단정한 검정 단화", "shoes", "#34323a", "#15141a", "단화", "flats", ["formal", "neat", "respectful", "closed-shoe"], "격식 있는 자리에서 단정하고 비교적 편해요."),
  item("hanbok-shoes", "한복 꽃신", "shoes", "#d85d69", "#8b2935", "꽃신", "hanbok-shoes", ["traditional", "neat", "respectful"], "한복과 어울려 명절의 뜻을 살려요."),
  item("closed-safety-shoes", "막힌 안전화", "shoes", "#4a535c", "#20262c", "안전화", "safety-shoes", ["closed-shoe", "protective", "grip", "lab"], "실험 재료가 발에 닿는 것을 줄이고 발을 보호해요."),
  item("kitchen-nonslip-shoes", "주방 미끄럼 방지화", "shoes", "#3c4b4b", "#162323", "주방화", "safety-shoes", ["closed-shoe", "grip", "cooking", "protective"], "젖을 수 있는 주방 바닥에서 발을 보호해요."),

  item("clear-umbrella", "투명 우산", "accessory", "#bdebf2", "#5a9eae", "우산", "umbrella", ["waterproof", "transparent", "practical"], "비를 막으면서 앞을 볼 수 있어요.", ["back", "front"]),
  item("black-umbrella", "검정 우산", "accessory", "#303342", "#12141c", "우산", "umbrella", ["waterproof", "dark", "practical"], "비는 막지만 어두운 길에서는 눈에 덜 띌 수 있어요.", ["back", "front"]),
  item("reflective-band", "반사 밴드", "accessory", "#e9ff5d", "#849317", "반사띠", "band", ["visible", "safety", "practical"], "빛을 반사해 어두운 길에서도 잘 보이게 해요."),
  item("canvas-tote", "장바구니", "accessory", "#e5cda7", "#9e7c4e", "가방", "tote", ["shopping", "practical", "storage"], "물건을 담기 좋지만 비를 막아 주지는 못해요.", ["back", "front"]),
  item("rescue-cap", "노란 안전모", "accessory", "#ffc83d", "#e4a922", "안전모", "helmet", ["rescue", "visible", "practical", "safety", "protective"], "머리를 보호하고 밝은 색으로 위치를 잘 보이게 해요.", ["back", "front"]),
  item("school-backpack", "학교 책가방", "accessory", "#486fae", "#203d71", "책가방", "backpack", ["school", "storage", "practical"], "학교 준비물을 양손 자유롭게 옮길 수 있어요.", ["back", "front"]),
  item("sports-cap", "체육 모자", "accessory", "#f6c84d", "#b57912", "체육모", "cap", ["school", "active", "sun-protection"], "야외 체육 활동에서 햇빛을 가려 줘요."),
  item("party-hat", "화려한 파티 모자", "accessory", "#f06cae", "#963965", "파티모", "party-hat", ["celebration", "flashy", "casual"], "생일 파티는 즐겁게 꾸미지만 차분한 자리에는 맞지 않아요."),
  item("sleep-mask", "수면 안대", "accessory", "#7d6bad", "#3d315e", "안대", "mask", ["sleep", "comfortable", "darkness"], "빛을 가려 잠들기 편하게 도와요."),
  item("blanket", "가벼운 담요", "accessory", "#d5b6e8", "#8f68aa", "담요", "blanket", ["sleep", "soft", "warm"], "잠잘 때 체온을 포근하게 유지해요.", ["back", "front"]),
  item("scarf", "목도리", "accessory", "#e96b64", "#9e3632", "목도리", "scarf", ["warm", "snag-risk"], "추운 곳에서는 따뜻하지만 잠이나 활동 중에는 걸릴 수 있어요."),
  item("gift-bag", "생일 선물 가방", "accessory", "#ffcc5c", "#c17d1c", "선물", "gift-bag", ["celebration", "respectful", "storage"], "친구를 축하하는 마음을 담아 가기 좋아요."),
  item("bow-tie", "단정한 나비넥타이", "accessory", "#4f6ea6", "#223b68", "나비넥타이", "bow-tie", ["formal", "neat", "celebration"], "축하 자리에서 단정한 느낌을 더해요."),
  item("swim-cap", "수영모", "accessory", "#ff7e71", "#b94339", "수영모", "swim-cap", ["swim", "hygiene", "water-safety"], "머리카락을 정리해 안전하고 깨끗하게 물놀이해요."),
  item("goggles", "물안경", "accessory", "#49b7dc", "#176d8f", "물안경", "goggles", ["swim", "eye-protection", "water-safety"], "물속에서 눈을 보호하고 앞을 보게 해요."),
  item("life-jacket", "구명조끼", "accessory", "#ff8d3f", "#b94a16", "구명조끼", "life-jacket", ["swim", "water-safety", "protective", "visible"], "물놀이 중 몸이 뜨도록 도와 안전을 지켜요."),
  item("towel", "큰 수건", "accessory", "#f4f0df", "#afa37c", "수건", "towel", ["swim", "dry", "practical"], "물놀이 뒤 몸을 닦고 체온을 지켜요."),
  item("ski-helmet", "스키 헬멧", "accessory", "#3f526e", "#19283f", "헬멧", "helmet", ["snow-safety", "protective", "ski"], "넘어지거나 부딪힐 때 머리를 보호해요."),
  item("ski-goggles", "스키 고글", "accessory", "#58a8ca", "#245c75", "스키고글", "goggles", ["snow-safety", "eye-protection", "ski"], "눈보라와 강한 햇빛에서 눈을 보호해요."),
  item("gloves", "방한 장갑", "accessory", "#536d9b", "#273c63", "장갑", "gloves", ["warm", "protective", "ski"], "손을 따뜻하게 하고 눈과 마찰에서 보호해요."),
  item("flower-basket", "꽃바구니", "accessory", "#efb6c5", "#9d6172", "꽃바구니", "basket", ["celebration", "wedding", "respectful"], "결혼을 축하하는 화동의 역할을 표현해요."),
  item("simple-ribbon", "작은 단정 리본", "accessory", "#6f7da0", "#34405f", "리본", "ribbon", ["neat", "simple", "respectful"], "눈에 띄지 않으면서 단정함을 더해요."),
  item("black-bag", "작은 검정 가방", "accessory", "#30323a", "#121319", "검정가방", "bag", ["dark", "simple", "respectful", "storage"], "차분하고 단정하게 필요한 물건을 담아요."),
  item("flower-crown", "화려한 꽃관", "accessory", "#f19bb5", "#ac4668", "꽃관", "flower-crown", ["celebration", "flashy"], "축하 자리에는 어울리지만 추모 자리에는 너무 화려해요."),
  item("bright-necklace", "반짝 목걸이", "accessory", "#ffd45f", "#af7d14", "목걸이", "necklace", ["flashy", "celebration", "snag-risk"], "화려한 장식이라 차분한 자리나 활동에는 맞지 않을 수 있어요."),
  item("norigae", "전통 노리개", "accessory", "#e76573", "#9b2f40", "노리개", "norigae", ["traditional", "celebration", "respectful"], "한복과 함께 명절의 멋과 뜻을 살려요."),
  item("hanbok-hat", "전통 복건", "accessory", "#333a53", "#161b2b", "복건", "hanbok-hat", ["traditional", "respectful", "neat"], "전통 옷차림과 어울리는 단정한 장식이에요."),
  item("safety-goggles", "보안경", "accessory", "#c8eef4", "#4a8b99", "보안경", "goggles", ["lab", "eye-protection", "protective"], "실험 재료가 눈에 튀는 것을 막아 줘요."),
  item("lab-gloves", "실험 장갑", "accessory", "#85c9da", "#347b8e", "실험장갑", "gloves", ["lab", "hand-protection", "protective"], "실험 물질이 손에 직접 닿는 것을 줄여요."),
  item("notebook", "실험 기록장", "accessory", "#f3e7bd", "#9d8744", "기록장", "book", ["lab", "learning", "practical"], "실험 과정을 적는 데 필요하지만 보호 장비는 아니에요."),
  item("dangling-scarf", "길게 늘어진 스카프", "accessory", "#dd6f97", "#8f3658", "긴스카프", "scarf", ["snag-risk", "loose", "flashy"], "실험 도구나 불에 걸릴 수 있어 위험해요."),
  item("apron", "앞치마", "accessory", "#e9c27e", "#9f7134", "앞치마", "apron", ["cooking", "protective", "hygiene"], "음식과 뜨거운 것이 옷에 튀는 것을 줄여요."),
  item("oven-mitt", "오븐 장갑", "accessory", "#ef765f", "#a63628", "오븐장갑", "oven-mitt", ["cooking", "heat-protection", "protective"], "뜨거운 그릇을 잡을 때 손을 보호해요."),
  item("chef-hat", "조리 모자", "accessory", "#fffaf0", "#a4a09a", "조리모", "chef-hat", ["cooking", "hygiene", "neat"], "머리카락을 정리해 음식을 깨끗하게 만들어요."),
  item("loose-bracelet", "늘어진 팔찌", "accessory", "#e8b64e", "#9d711e", "팔찌", "bracelet", ["snag-risk", "loose", "flashy"], "조리 도구나 음식에 걸릴 수 있어요."),
  item("helmet", "튼튼한 헬멧", "accessory", "#4f6174", "#243444", "헬멧", "helmet", ["protective", "safety", "active"], "부딪히거나 넘어질 때 머리를 보호해요."),
  item("knee-pads", "무릎 보호대", "accessory", "#586b78", "#283945", "보호대", "knee-pads", ["protective", "active", "safety"], "빠르게 움직이거나 넘어질 때 무릎을 보호해요."),
  item("flashlight", "밝은 손전등", "accessory", "#ffd963", "#a87a17", "손전등", "flashlight", ["visible", "practical", "safety"], "어두운 길을 보고 위치를 알리는 데 도움이 돼요."),
  item("cape", "길게 펄럭이는 망토", "accessory", "#8f4f9f", "#50255c", "망토", "cape", ["snag-risk", "restrict", "flashy"], "멋져 보이지만 달릴 때 걸리거나 잡힐 수 있어요.", ["back", "front"]),
];

items.push(
  item(
    "whistle",
    "구조 신호 호루라기",
    "accessory",
    "#f2c94c",
    "#d69a1f",
    "호루라기",
    "whistle",
    ["rescue", "signaling", "practical"],
    "멀리 있는 사람에게 위치를 알리는 데 도움되지만 몸을 보호해 주지는 않아요.",
  ),
);

const criteria = (category, groups) =>
  groups.map(([label, anyTags, points]) => ({
    category,
    anyTags,
    points,
    strength: `"${label}"에 맞는 선택을 잘했어요.`,
    improvement: `${label} 조건을 옷의 기능에서 더 찾아보세요.`,
  }));

const rules = ({ tpo, function: functions, expression, mandatory, forbidden }) => ({
  criteria: [
    ...criteria("tpo", tpo),
    ...criteria("function", functions),
    ...criteria("expression", expression),
  ],
  mandatory: mandatory.map(([label, anyTags]) => ({
    label,
    anyTags,
    improvement: `"${label}"에 맞는 아이템이 안전과 목적에 꼭 필요해요.`,
  })),
  forbidden: forbidden.map(([tag, feedback, penalty = 8]) => ({
    tag,
    penalty,
    feedback,
  })),
});

const message = (speaker, text) => ({ speaker, text });

const episodes = [
  {
    slug: "rescue-team-trial",
    chapterId: "prologue",
    order: 1,
    title: "구조대 입단 시험",
    kicker: "PROLOGUE · 첫 번째 임무",
    teaser: "안전하고 활동적인 코디로 구조대원이 될 준비를 해요.",
    sender: "나래 대장",
    weatherIcon: "★",
    weatherLabel: "맑은 오후 · 구조대 훈련장",
    weatherNote: "빠르게 움직이고 다른 사람에게 잘 보여야 해요",
    backgroundStyle: "rescue-hq",
    backgroundColors: ["#f7c85b", "#f06b5d"],
    timeLimitSeconds: 90,
    tpo: { time: "맑은 오후", place: "스타일 구조대 훈련장", occasion: "입단 시험과 안전 훈련" },
    messages: [
      message("나래 대장", "오늘은 스타일 구조대 입단 시험 날이야!"),
      message("나래 대장", "훈련장에서 걷고 뛰며 안전 단서를 찾게 될 거야."),
      message("나래 대장", "움직이기 편하고 잘 보이는 옷차림을 준비해 줘."),
      message("구조대", "안전과 활동성을 모두 살펴보고 출발하자!"),
    ],
    itemIds: [
      "rescue-jacket",
      "mint-windbreaker",
      "sports-hoodie",
      "formal-jacket",
      "active-pants",
      "protective-cargo-pants",
      "beige-shorts",
      "long-skirt",
      "sneakers",
      "hiking-boots",
      "dress-shoes",
      "slippers",
      "rescue-cap",
      "reflective-band",
      "whistle",
      "canvas-tote",
    ],
    itemRoles: {
      "rescue-jacket": "best",
      "mint-windbreaker": "acceptable",
      "sports-hoodie": "partial",
      "formal-jacket": "mismatch",
      "active-pants": "best",
      "protective-cargo-pants": "acceptable",
      "beige-shorts": "partial",
      "long-skirt": "mismatch",
      "sneakers": "best",
      "hiking-boots": "acceptable",
      "dress-shoes": "partial",
      "slippers": "mismatch",
      "rescue-cap": "best",
      "reflective-band": "acceptable",
      "whistle": "partial",
      "canvas-tote": "mismatch",
    },
    canonicalItemIds: [
      "rescue-jacket",
      "active-pants",
      "sneakers",
      "rescue-cap",
    ],
    rules: rules({
      tpo: [["훈련 장소", ["rescue", "safety"], 10], ["활동 상황", ["active"], 10], ["잘 보이는 옷차림", ["visible"], 10]],
      function: [["미끄럼 방지", ["grip"], 10], ["몸 보호", ["coverage", "protective"], 10], ["실용성", ["practical"], 10]],
      expression: [["구조대 역할", ["rescue"], 10], ["단정한 준비", ["neat", "practical"], 10]],
      mandatory: [["활동하기 편한 옷", ["active"]], ["안전하게 디딜 신발", ["grip"]]],
      forbidden: [["slippery", "미끄러운 신발은 훈련 중 넘어질 수 있어요."], ["restrict", "움직임을 막는 긴 옷은 훈련에 불편해요."]],
    }),
    successTitle: "구조대 입단 준비 완료!",
    retryTitle: "안전 장비를 다시 살펴볼까요?",
  },
  {
    slug: "school-pe-rush",
    chapterId: "busy-day",
    order: 2,
    title: "늦잠 후 등교와 체육 수업",
    kicker: "CHAPTER 1 · 바쁜 하루",
    teaser: "학교 예절과 체육 활동을 한 번에 만족하는 옷을 골라요.",
    sender: "민준",
    weatherIcon: "☀",
    weatherLabel: "평일 아침 · 20°C",
    weatherNote: "곧 등교하고 첫 시간에 체육 수업이 있어요",
    backgroundStyle: "school-yard",
    backgroundColors: ["#a9d9f2", "#72b87b"],
    timeLimitSeconds: 60,
    tpo: { time: "평일 아침", place: "학교와 운동장", occasion: "등교 후 체육 수업" },
    messages: [
      message("민준", "늦잠을 자서 곧 학교로 출발해야 해!"),
      message("민준", "오늘 첫 수업은 운동장에서 하는 체육이야."),
      message("민준", "학교에서 단정하면서 마음껏 뛸 수 있게 도와줘."),
      message("구조대", "학교, 활동, 안전한 신발 단서를 찾아보자!"),
    ],
    itemIds: ["school-track-jacket", "sports-hoodie", "school-cardigan", "party-shirt", "school-track-pants", "active-pants", "sky-denim", "long-skirt", "running-shoes", "sneakers", "dress-shoes", "slippers", "school-backpack", "sports-cap", "reflective-band", "party-hat"],
    rules: rules({
      tpo: [["학교 장소", ["school"], 10], ["체육 수업", ["active"], 10], ["아침 준비", ["practical"], 10]],
      function: [["안전한 밑창", ["grip"], 10], ["통풍과 움직임", ["breathable", "active"], 10], ["발 보호", ["closed-shoe"], 10]],
      expression: [["학교의 단정함", ["school", "neat"], 10], ["과하지 않은 표현", ["practical"], 10]],
      mandatory: [["체육 활동성", ["active"]], ["미끄럼을 줄이는 신발", ["grip"]]],
      forbidden: [["slippery", "슬리퍼는 달릴 때 벗겨지거나 미끄러질 수 있어요."], ["restrict", "긴 옷은 체육 활동에서 움직임을 방해할 수 있어요."]],
    }),
    successTitle: "학교와 체육 준비를 모두 마쳤어요!",
    retryTitle: "체육 시간에 움직일 수 있을지 다시 볼까요?",
  },
  {
    slug: "bedtime-ready",
    chapterId: "busy-day",
    order: 3,
    title: "저녁에 잠잘 준비",
    kicker: "CHAPTER 1 · 바쁜 하루",
    teaser: "몸을 조이지 않고 편안히 잘 수 있는 옷을 찾아요.",
    sender: "소미",
    weatherIcon: "☾",
    weatherLabel: "늦은 밤 · 포근한 방",
    weatherNote: "몸을 편하게 쉬게 하고 숙면을 준비해요",
    backgroundStyle: "cozy-bedroom",
    backgroundColors: ["#6b72a8", "#c7a9d8"],
    timeLimitSeconds: 60,
    tpo: { time: "잠들기 전 늦은 밤", place: "집의 침실", occasion: "편안한 수면 준비" },
    messages: [
      message("소미", "오늘 하루가 길어서 이제 푹 쉬고 싶어."),
      message("소미", "방은 조금 서늘하지만 이불 속은 따뜻해."),
      message("소미", "몸을 조이지 않고 편안히 잘 수 있게 골라 줘."),
      message("구조대", "부드러움, 통풍, 편안함을 살펴보자!"),
    ],
    itemIds: ["cotton-pajama-top", "cotton-tshirt", "fleece-sweater", "formal-jacket", "pajama-pants", "cotton-pants", "active-pants", "sky-denim", "sleep-socks", "slippers", "running-shoes", "dress-shoes", "sleep-mask", "blanket", "scarf", "school-backpack"],
    rules: rules({
      tpo: [["수면 시간", ["sleep"], 10], ["침실 장소", ["comfortable"], 10], ["서늘한 밤", ["warm"], 10]],
      function: [["부드러운 재질", ["soft"], 10], ["통풍", ["breathable"], 10], ["몸을 조이지 않음", ["comfortable"], 10]],
      expression: [["편안한 생활복", ["sleep", "comfortable"], 10], ["침실에 맞는 단순함", ["soft", "practical"], 10]],
      mandatory: [["잠자기 편한 옷", ["sleep"]], ["몸을 조이지 않는 준비", ["comfortable"]]],
      forbidden: [["formal", "딱딱하고 격식 있는 옷은 잠잘 때 몸을 쉬게 하기 어려워요."], ["snag-risk", "길게 늘어진 소품은 잠잘 때 걸릴 수 있어요."]],
    }),
    successTitle: "포근한 잠잘 준비가 끝났어요!",
    retryTitle: "몸이 편하게 쉴 수 있을지 다시 볼까요?",
  },
  {
    slug: "friend-birthday-party",
    chapterId: "busy-day",
    order: 4,
    title: "친구의 생일 파티",
    kicker: "CHAPTER 1 · 바쁜 하루",
    teaser: "친구를 축하하면서도 편하게 놀 수 있는 코디를 만들어요.",
    sender: "지우",
    weatherIcon: "♬",
    weatherLabel: "토요일 오후 · 실내 파티",
    weatherNote: "친구를 축하하고 함께 게임을 하며 놀아요",
    backgroundStyle: "birthday-party",
    backgroundColors: ["#ffd06b", "#ee7fa8"],
    timeLimitSeconds: 60,
    tpo: { time: "토요일 오후", place: "친구 집의 실내 파티", occasion: "생일 축하와 놀이" },
    messages: [
      message("지우", "오늘은 내 친구 유나의 생일 파티야!"),
      message("지우", "친구 집에서 케이크를 먹고 신나는 게임도 할 거래."),
      message("지우", "축하하는 마음이 보이면서 편하게 놀고 싶어."),
      message("구조대", "축하, 단정함, 편안함을 함께 찾아보자!"),
    ],
    itemIds: ["party-shirt", "white-shirt", "sports-hoodie", "yellow-raincoat", "party-chinos", "sky-denim", "active-pants", "pajama-pants", "party-sneakers", "dress-shoes", "sneakers", "rain-boots", "gift-bag", "party-hat", "bow-tie", "black-umbrella"],
    rules: rules({
      tpo: [["생일 축하", ["celebration"], 10], ["실내 장소", ["comfortable", "neat"], 10], ["함께 노는 활동", ["active"], 10]],
      function: [["편한 움직임", ["comfortable", "active"], 10], ["안전한 신발", ["grip", "closed-shoe"], 10], ["선물 수납", ["storage", "practical"], 10]],
      expression: [["축하하는 표현", ["celebration"], 10], ["단정한 개성", ["neat", "formal"], 10]],
      mandatory: [["친구를 축하하는 표현", ["celebration"]], ["편하게 참여할 준비", ["comfortable", "active"]]],
      forbidden: [["sleep", "잠옷은 친구의 초대에 대한 예의를 충분히 표현하기 어려워요."], ["waterproof", "실내 파티에 우비나 우산은 불필요하고 움직임을 방해해요."]],
    }),
    successTitle: "즐겁고 단정한 파티 코디예요!",
    retryTitle: "축하와 편안함을 함께 찾아볼까요?",
  },
  {
    slug: "rainy-market-errand",
    chapterId: "weather-alert",
    order: 5,
    title: "비 오는 날 마트 심부름",
    kicker: "CHAPTER 2 · 날씨 특보",
    teaser: "비와 어두운 길에서 몸을 보호하고 잘 보이는 옷을 골라요.",
    sender: "하루",
    weatherIcon: "☂",
    weatherLabel: "비 오는 저녁 · 18°C",
    weatherNote: "어두운 길과 큰 웅덩이를 조심해요",
    backgroundStyle: "rainy-street",
    backgroundColors: ["#88afc5", "#334f69"],
    timeLimitSeconds: 60,
    tpo: { time: "비가 많이 오는 저녁", place: "집 앞 마트로 가는 길", occasion: "우유를 사 오는 짧은 심부름" },
    messages: [
      message("하루", "저녁 준비 중 엄마가 우유를 사 오라고 하셨어."),
      message("하루", "밖에 비가 많이 오고 벌써 어두워졌어."),
      message("하루", "집 앞 마트라 금방 다녀오지만 큰 웅덩이를 지나야 해."),
      message("구조대", "젖지 않고, 잘 보이고, 미끄러지지 않는 코디를 찾아보자!"),
    ],
    itemIds: ["yellow-raincoat", "mint-windbreaker", "navy-cardigan", "cream-sweater", "active-pants", "sky-denim", "beige-shorts", "long-skirt", "rain-boots", "sneakers", "slippers", "dress-shoes", "clear-umbrella", "black-umbrella", "reflective-band", "canvas-tote"],
    rules: rules({
      tpo: [["비 오는 날씨", ["waterproof", "water-resistant"], 10], ["어두운 시간", ["visible"], 10], ["마트 심부름", ["shopping", "practical"], 10]],
      function: [["빗물 보호", ["waterproof", "water-resistant"], 10], ["미끄럼 방지", ["grip"], 10], ["몸 가리기", ["coverage"], 10]],
      expression: [["실용적인 선택", ["practical"], 10], ["안전을 배려한 표현", ["visible", "safety"], 10]],
      mandatory: [["비를 막는 준비", ["waterproof", "water-resistant"]], ["젖은 길에서 안전한 신발", ["grip"]], ["어두운 길에서 보이는 준비", ["visible"]]],
      forbidden: [["slippery", "미끄러운 신발은 빗길에서 넘어질 수 있어요."], ["restrict", "긴 옷은 젖은 바닥에서 움직임을 방해할 수 있어요."]],
    }),
    successTitle: "하루가 안전하게 마트로 출발했어요!",
    retryTitle: "비와 어두운 길 단서를 다시 볼까요?",
  },
  {
    slug: "summer-waterpark",
    chapterId: "weather-alert",
    order: 6,
    title: "여름 워터파크",
    kicker: "CHAPTER 2 · 날씨 특보",
    teaser: "물과 햇빛에서 몸을 지키며 안전하게 놀 준비를 해요.",
    sender: "서준",
    weatherIcon: "☀",
    weatherLabel: "한여름 낮 · 31°C",
    weatherNote: "강한 햇빛과 미끄러운 물놀이 바닥을 조심해요",
    backgroundStyle: "waterpark",
    backgroundColors: ["#63d0ec", "#43b889"],
    timeLimitSeconds: 60,
    tpo: { time: "햇빛이 강한 여름 낮", place: "야외 워터파크", occasion: "수영과 물놀이" },
    messages: [
      message("서준", "오늘 가족과 야외 워터파크에 왔어!"),
      message("서준", "햇빛이 아주 강하고 바닥에는 물이 많아."),
      message("서준", "물에서 잘 움직이고 몸도 안전하게 지키고 싶어."),
      message("구조대", "수영복, 빠른 건조, 물놀이 안전 단서를 찾아보자!"),
    ],
    itemIds: ["swim-rashguard", "cotton-tshirt", "yellow-raincoat", "cream-sweater", "swim-shorts", "beige-shorts", "active-pants", "long-skirt", "aqua-shoes", "sandals", "sneakers", "dress-shoes", "swim-cap", "goggles", "life-jacket", "towel"],
    rules: rules({
      tpo: [["물놀이 상황", ["swim"], 10], ["강한 햇빛", ["sun-protection"], 10], ["더운 날씨", ["quick-dry", "breathable"], 10]],
      function: [["물 안전", ["water-safety"], 10], ["미끄럼 방지", ["grip"], 10], ["빠른 건조", ["quick-dry"], 10]],
      expression: [["물놀이에 맞는 준비", ["swim"], 10], ["위생과 배려", ["hygiene", "practical"], 10]],
      mandatory: [["물놀이용 옷", ["swim"]], ["물에서 몸을 보호할 준비", ["water-safety"]], ["미끄러운 바닥용 신발", ["grip"]]],
      forbidden: [["absorbent", "물을 많이 머금는 옷은 무거워져 움직이기 어려워요."], ["smooth-sole", "매끄러운 밑창은 젖은 바닥에서 미끄러울 수 있어요."]],
    }),
    successTitle: "시원하고 안전한 물놀이 준비 완료!",
    retryTitle: "물과 햇빛에서 몸을 지킬 준비를 다시 볼까요?",
  },
  {
    slug: "winter-ski-class",
    chapterId: "weather-alert",
    order: 7,
    title: "겨울 스키 교실",
    kicker: "CHAPTER 2 · 날씨 특보",
    teaser: "눈과 찬 바람, 넘어짐에 대비한 스키 코디를 만들어요.",
    sender: "예린",
    weatherIcon: "❄",
    weatherLabel: "겨울 아침 · -6°C",
    weatherNote: "눈보라와 찬 바람, 미끄러운 슬로프를 조심해요",
    backgroundStyle: "ski-slope",
    backgroundColors: ["#cbe9f4", "#6b91bd"],
    timeLimitSeconds: 60,
    tpo: { time: "영하의 겨울 아침", place: "눈 덮인 스키장", occasion: "스키 수업과 안전 훈련" },
    messages: [
      message("예린", "오늘 처음으로 스키 교실에 참가해!"),
      message("예린", "밖은 영하이고 눈바람도 조금 불어."),
      message("예린", "따뜻하면서 넘어질 때 몸을 지킬 수 있게 도와줘."),
      message("구조대", "방수, 보온, 눈 위 안전 장비를 찾아보자!"),
    ],
    itemIds: ["ski-jacket", "wool-coat", "cream-sweater", "cotton-tshirt", "ski-pants", "active-pants", "sky-denim", "beige-shorts", "ski-boots", "hiking-boots", "sneakers", "slippers", "ski-helmet", "ski-goggles", "gloves", "party-hat"],
    rules: rules({
      tpo: [["눈 오는 날씨", ["snowproof", "waterproof"], 10], ["영하의 기온", ["warm"], 10], ["스키 수업", ["ski", "snow-safety"], 10]],
      function: [["체온 보호", ["warm"], 10], ["눈과 충격 보호", ["protective", "snow-safety"], 10], ["눈 위 접지", ["grip", "snowproof"], 10]],
      expression: [["수업에 맞는 장비", ["ski", "snow-safety"], 10], ["안전을 우선한 선택", ["protective"], 10]],
      mandatory: [["눈과 찬 바람을 막는 옷", ["snowproof", "waterproof"]], ["체온을 지킬 준비", ["warm"]], ["스키 안전 장비", ["snow-safety"]]],
      forbidden: [["exposed", "반바지는 영하의 날씨에서 체온을 지키기 어려워요."], ["slippery", "슬리퍼는 눈 위에서 미끄럽고 발을 보호하지 못해요."]],
    }),
    successTitle: "따뜻하고 안전한 스키 준비 완료!",
    retryTitle: "눈과 추위, 넘어짐 단서를 다시 볼까요?",
  },
  {
    slug: "wedding-flower-child",
    chapterId: "heart-and-manners",
    order: 8,
    title: "친척 결혼식의 화동",
    kicker: "CHAPTER 3 · 마음을 입어요",
    teaser: "결혼을 축하하고 화동 역할에 맞는 단정한 옷을 골라요.",
    sender: "다온",
    weatherIcon: "♡",
    weatherLabel: "주말 낮 · 결혼식장",
    weatherNote: "축하하는 마음과 화동 역할을 옷으로 표현해요",
    backgroundStyle: "wedding-hall",
    backgroundColors: ["#f7dce2", "#d9b77d"],
    timeLimitSeconds: 60,
    tpo: { time: "주말 낮", place: "친척의 결혼식장", occasion: "화동 역할과 결혼 축하" },
    messages: [
      message("다온", "오늘 친척 언니의 결혼식에서 화동을 맡았어."),
      message("다온", "꽃바구니를 들고 천천히 걸으며 축하할 거야."),
      message("다온", "단정하고 역할에 어울리면서 편하게 걷고 싶어."),
      message("구조대", "격식, 축하, 화동 역할 단서를 찾아보자!"),
    ],
    itemIds: ["formal-jacket", "white-shirt", "navy-cardigan", "yellow-raincoat", "formal-pants", "black-skirt", "party-chinos", "active-pants", "formal-flats", "dress-shoes", "party-sneakers", "rain-boots", "bow-tie", "flower-basket", "simple-ribbon", "party-hat"],
    rules: rules({
      tpo: [["결혼 축하", ["celebration", "wedding"], 10], ["결혼식 장소", ["formal"], 10], ["화동 역할", ["wedding", "respectful"], 10]],
      function: [["편하게 걷기", ["comfortable", "active"], 10], ["막힌 단정한 신발", ["closed-shoe", "neat"], 10], ["역할 소품", ["wedding"], 10]],
      expression: [["격식과 존중", ["formal", "respectful"], 10], ["축하하는 표현", ["celebration", "wedding"], 10]],
      mandatory: [["결혼식을 존중하는 단정함", ["formal", "respectful"]], ["축하나 화동 역할 표현", ["celebration", "wedding"]]],
      forbidden: [["waterproof", "결혼식장 안에서 우비와 장화는 역할과 격식에 맞지 않아요."], ["casual", "너무 일상적인 옷은 화동 역할을 충분히 표현하기 어려워요."]],
    }),
    successTitle: "축하하는 마음이 보이는 화동 코디예요!",
    retryTitle: "결혼식과 화동 역할을 다시 생각해 볼까요?",
  },
  {
    slug: "family-funeral",
    chapterId: "heart-and-manners",
    order: 9,
    title: "장례식 참석",
    kicker: "CHAPTER 3 · 마음을 입어요",
    teaser: "슬픔을 함께하고 조용한 존중을 표현하는 옷을 골라요.",
    sender: "은호",
    weatherIcon: "●",
    weatherLabel: "저녁 · 조용한 추모 공간",
    weatherNote: "화려함을 줄이고 슬픔과 존중을 표현해요",
    backgroundStyle: "memorial-hall",
    backgroundColors: ["#777a82", "#30333b"],
    timeLimitSeconds: 60,
    tpo: { time: "차분한 저녁", place: "가족 장례식장", occasion: "고인을 추모하고 가족을 위로함" },
    messages: [
      message("은호", "오늘 가족과 함께 장례식장에 가게 되었어."),
      message("은호", "큰 소리나 화려한 장식은 줄이고 조용히 인사드릴 거야."),
      message("은호", "슬픔을 함께하고 존중하는 마음이 보이게 도와줘."),
      message("구조대", "어두운색, 단정함, 장식 최소화 단서를 찾아보자."),
    ],
    itemIds: ["black-cardigan", "navy-cardigan", "formal-jacket", "party-shirt", "formal-pants", "black-skirt", "active-pants", "long-skirt", "dress-shoes", "formal-flats", "sneakers", "rain-boots", "simple-ribbon", "black-bag", "flower-crown", "bright-necklace"],
    rules: rules({
      tpo: [["추모 상황", ["respectful"], 10], ["차분한 장소", ["dark", "simple"], 10], ["조용한 저녁", ["neat"], 10]],
      function: [["오래 머물 편안함", ["comfortable", "practical"], 10], ["단정한 막힌 신발", ["closed-shoe", "formal"], 10], ["과하지 않은 장식", ["simple"], 10]],
      expression: [["슬픔과 존중", ["respectful"], 10], ["차분한 표현", ["dark", "simple"], 10]],
      mandatory: [["추모의 존중", ["respectful"]], ["차분하고 단정한 표현", ["dark", "simple", "neat"]]],
      forbidden: [["flashy", "화려한 장식은 조용히 추모하는 분위기와 맞지 않아요."], ["celebration", "축하용 장식은 추모의 뜻을 다르게 보이게 할 수 있어요."]],
    }),
    successTitle: "차분하게 존중을 표현한 옷차림이에요.",
    retryTitle: "추모의 마음을 어떻게 표현할지 다시 볼까요?",
  },
  {
    slug: "lunar-new-year-visit",
    chapterId: "heart-and-manners",
    order: 10,
    title: "설날 할머니 댁 방문",
    kicker: "CHAPTER 3 · 마음을 입어요",
    teaser: "전통과 예의를 살리면서 가족과 편하게 지낼 옷을 골라요.",
    sender: "하린",
    weatherIcon: "福",
    weatherLabel: "설날 아침 · 할머니 댁",
    weatherNote: "웃어른께 인사하고 가족과 명절을 보내요",
    backgroundStyle: "hanok-holiday",
    backgroundColors: ["#e8c684", "#8cb6a2"],
    timeLimitSeconds: 60,
    tpo: { time: "겨울 설날 아침", place: "할머니의 한옥집", occasion: "세배와 가족 명절 모임" },
    messages: [
      message("하린", "설날이라 가족과 할머니 댁에 가는 중이야."),
      message("하린", "도착하면 웃어른께 세배하고 사촌들과 놀 거야."),
      message("하린", "전통과 예의를 살리면서 편하게 지내고 싶어."),
      message("구조대", "명절, 웃어른께 대한 예의, 편안함을 찾아보자!"),
    ],
    itemIds: ["hanbok-jeogori", "formal-jacket", "navy-cardigan", "sports-hoodie", "hanbok-skirt", "formal-pants", "black-skirt", "active-pants", "hanbok-shoes", "formal-flats", "sneakers", "slippers", "norigae", "hanbok-hat", "black-bag", "ski-goggles"],
    rules: rules({
      tpo: [["설날 명절", ["traditional"], 10], ["웃어른 방문", ["respectful"], 10], ["가족 모임", ["comfortable", "celebration"], 10]],
      function: [["겨울 보온", ["warm", "coverage"], 10], ["실내 활동 편안함", ["comfortable", "active"], 10], ["단정한 신발", ["neat", "traditional"], 10]],
      expression: [["전통 또는 단정함", ["traditional", "formal"], 10], ["웃어른께 예의", ["respectful"], 10]],
      mandatory: [["웃어른께 대한 예의", ["respectful"]], ["명절을 나타내는 전통 또는 단정함", ["traditional", "formal", "neat"]]],
      forbidden: [["ski", "스키 장비는 명절 인사와 실내 가족 모임에 필요하지 않아요."], ["slippery", "헐거운 슬리퍼는 이동하거나 세배할 때 벗겨질 수 있어요."]],
    }),
    successTitle: "전통과 예의를 살린 설날 코디예요!",
    retryTitle: "명절과 웃어른께 대한 예의를 다시 볼까요?",
  },
  {
    slug: "science-lab-experiment",
    chapterId: "safety-call",
    order: 11,
    title: "과학실 실험",
    kicker: "CHAPTER 4 · 안전 출동",
    teaser: "눈과 피부, 발을 보호하는 실험실 안전복을 준비해요.",
    sender: "도윤",
    weatherIcon: "⚗",
    weatherLabel: "평일 오전 · 학교 과학실",
    weatherNote: "액체가 튀거나 도구가 떨어질 수 있어요",
    backgroundStyle: "science-lab",
    backgroundColors: ["#b8dce1", "#5d8c99"],
    timeLimitSeconds: 60,
    tpo: { time: "평일 오전 수업", place: "학교 과학실", occasion: "액체를 사용하는 과학 실험" },
    messages: [
      message("도윤", "오늘 과학실에서 색이 변하는 액체 실험을 해."),
      message("도윤", "선생님이 액체가 눈이나 피부에 닿지 않게 조심하라고 하셨어."),
      message("도윤", "실험 도구에 걸리지 않고 몸을 보호하게 도와줘."),
      message("구조대", "보안경, 긴 옷, 막힌 신발 단서를 찾아보자!"),
    ],
    itemIds: ["lab-coat", "fitted-cooking-top", "cotton-tshirt", "loose-sleeve-shirt", "lab-pants", "cotton-pants", "beige-shorts", "long-skirt", "closed-safety-shoes", "sneakers", "sandals", "slippers", "safety-goggles", "lab-gloves", "notebook", "dangling-scarf"],
    rules: rules({
      tpo: [["과학실 장소", ["lab"], 10], ["액체 실험", ["protective"], 10], ["수업 상황", ["learning", "practical"], 10]],
      function: [["눈 보호", ["eye-protection"], 10], ["피부 가리기", ["coverage"], 10], ["발 보호", ["closed-shoe"], 10]],
      expression: [["안전 규칙 준수", ["lab", "protective"], 10], ["정돈된 준비", ["fitted", "neat"], 10]],
      mandatory: [["눈 보호 장비", ["eye-protection"]], ["팔과 다리를 가리는 옷", ["coverage"]], ["막힌 신발", ["closed-shoe"]]],
      forbidden: [["loose-sleeve", "넓은 소매는 실험 도구나 액체에 닿을 수 있어요."], ["open", "발이 열린 신발은 떨어진 물질로부터 발을 보호하기 어려워요."], ["snag-risk", "늘어진 소품은 실험 도구에 걸릴 수 있어요."]],
    }),
    successTitle: "과학실 안전 준비를 모두 갖췄어요!",
    retryTitle: "눈, 피부, 발 보호를 다시 확인할까요?",
  },
  {
    slug: "family-cooking",
    chapterId: "safety-call",
    order: 12,
    title: "가족을 위한 요리",
    kicker: "CHAPTER 4 · 안전 출동",
    teaser: "불과 뜨거운 그릇, 미끄러운 바닥에 대비해요.",
    sender: "채원",
    weatherIcon: "♨",
    weatherLabel: "저녁 준비 시간 · 집 주방",
    weatherNote: "불과 뜨거운 냄비, 젖은 바닥을 조심해요",
    backgroundStyle: "family-kitchen",
    backgroundColors: ["#f1c47d", "#b86e4d"],
    timeLimitSeconds: 60,
    tpo: { time: "가족 저녁 준비 시간", place: "집의 주방", occasion: "불과 칼을 사용하는 요리" },
    messages: [
      message("채원", "오늘 가족을 위해 따뜻한 수프를 만들 거야."),
      message("채원", "주방에는 뜨거운 냄비가 있고 바닥에 물이 튈 수도 있어."),
      message("채원", "소매와 머리카락을 정리하고 안전하게 요리하고 싶어."),
      message("구조대", "고정된 소매, 긴 바지, 미끄럼 방지, 조리 보호를 찾자!"),
    ],
    itemIds: ["fitted-cooking-top", "cotton-tshirt", "lab-coat", "loose-sleeve-shirt", "cooking-pants", "cotton-pants", "beige-shorts", "long-skirt", "kitchen-nonslip-shoes", "closed-safety-shoes", "sandals", "slippers", "apron", "oven-mitt", "chef-hat", "loose-bracelet"],
    rules: rules({
      tpo: [["주방 장소", ["cooking"], 10], ["불과 뜨거운 도구", ["heat-protection", "protective"], 10], ["가족 식사 준비", ["hygiene", "neat"], 10]],
      function: [["고정된 소매", ["fitted"], 10], ["미끄럼 방지", ["grip"], 10], ["열과 음식 보호", ["heat-protection", "protective"], 10]],
      expression: [["깨끗한 조리 준비", ["hygiene", "cooking"], 10], ["가족을 배려한 단정함", ["neat", "practical"], 10]],
      mandatory: [["불에 닿지 않는 고정된 옷", ["fitted"]], ["주방 바닥에서 안전한 신발", ["grip", "closed-shoe"]], ["조리 보호 장비", ["heat-protection", "cooking"]]],
      forbidden: [["loose-sleeve", "넓은 소매는 불이나 음식에 닿을 수 있어요."], ["snag-risk", "늘어진 장식은 조리 도구에 걸릴 수 있어요."], ["open", "발이 열린 신발은 뜨거운 것이 떨어질 때 발을 보호하기 어려워요."]],
    }),
    successTitle: "깨끗하고 안전한 요리 준비 완료!",
    retryTitle: "불, 뜨거운 그릇, 바닥 안전을 다시 볼까요?",
  },
  {
    slug: "zombie-city-escape",
    chapterId: "safety-call",
    order: 13,
    title: "좀비 도시 탈출",
    kicker: "CHAPTER 4 · 안전 출동",
    teaser: "가상의 위험 속에서도 활동성과 신체 보호 원칙을 적용해요.",
    sender: "태오",
    weatherIcon: "!",
    weatherLabel: "어두운 밤 · 가상의 좀비 도시",
    weatherNote: "빠르게 이동하고 몸을 보호하며 길을 밝혀야 해요",
    backgroundStyle: "zombie-city",
    backgroundColors: ["#47526a", "#26362e"],
    timeLimitSeconds: 60,
    tpo: { time: "어두운 밤", place: "가상의 좀비 도시", occasion: "안전한 곳까지 빠르게 이동하는 탈출 훈련" },
    messages: [
      message("태오", "게임 속 도시에서 좀비를 피해 안전지대로 가야 해!"),
      message("태오", "길은 어둡고 바닥에는 장애물이 많아."),
      message("태오", "빠르게 움직이면서 몸과 발을 지킬 수 있게 해 줘."),
      message("구조대", "활동성, 신체 보호, 접지력, 가시성을 찾아보자!"),
    ],
    itemIds: ["protective-jacket", "sports-hoodie", "ski-jacket", "party-shirt", "protective-cargo-pants", "active-pants", "sky-denim", "long-skirt", "hiking-boots", "running-shoes", "dress-shoes", "slippers", "helmet", "knee-pads", "flashlight", "cape"],
    rules: rules({
      tpo: [["어두운 시간", ["visible"], 10], ["장애물 많은 장소", ["protective", "grip"], 10], ["빠른 탈출", ["active"], 10]],
      function: [["신체 보호", ["protective"], 10], ["안전한 밑창", ["grip"], 10], ["몸 가리기", ["coverage"], 10]],
      expression: [["실용적인 생존 준비", ["practical", "safety"], 10], ["위험을 줄이는 선택", ["protective", "active"], 10]],
      mandatory: [["빠르게 움직일 옷", ["active"]], ["몸을 보호할 준비", ["protective"]], ["안전하게 디딜 신발", ["grip"]]],
      forbidden: [["snag-risk", "길게 늘어진 옷은 장애물에 걸릴 수 있어요."], ["slippery", "미끄러운 신발은 빠르게 이동할 때 위험해요."], ["restrict", "움직임을 제한하는 옷은 탈출을 방해해요."]],
    }),
    successTitle: "안전지대로 출발할 준비 완료!",
    retryTitle: "활동성과 몸 보호를 다시 살펴볼까요?",
  },
];

const chapters = [
  { id: "prologue", title: "프롤로그", subtitle: "구조대원이 되는 첫걸음", color: "#f2b94b", episodeSlugs: ["rescue-team-trial"] },
  { id: "busy-day", title: "1. 바쁜 하루", subtitle: "하루의 활동에 맞춰 입어요", color: "#e98372", episodeSlugs: ["school-pe-rush", "bedtime-ready", "friend-birthday-party"] },
  { id: "weather-alert", title: "2. 날씨 특보", subtitle: "비, 더위, 눈에서 몸을 지켜요", color: "#5ba9c8", episodeSlugs: ["rainy-market-errand", "summer-waterpark", "winter-ski-class"] },
  { id: "heart-and-manners", title: "3. 마음을 입어요", subtitle: "축하와 존중을 옷으로 표현해요", color: "#ba7da4", episodeSlugs: ["wedding-flower-child", "family-funeral", "lunar-new-year-visit"] },
  { id: "safety-call", title: "4. 안전 출동", subtitle: "장소별 안전 원칙을 적용해요", color: "#6b8b61", episodeSlugs: ["science-lab-experiment", "family-cooking", "zombie-city-escape"] },
];

const itemById = new Map(items.map((entry) => [entry.id, entry]));
const validSlots = ["top", "bottom", "shoes", "accessory"];

if (episodes.length !== 13) {
  throw new Error(`Expected 13 episodes, received ${episodes.length}`);
}

if (itemById.size !== items.length) {
  throw new Error("Duplicate item id in story catalog");
}

for (const episode of episodes) {
  const expectedItemsPerSlot = 4;
  const expectedItemCount = expectedItemsPerSlot * validSlots.length;
  if (
    episode.itemIds.length !== expectedItemCount ||
    new Set(episode.itemIds).size !== expectedItemCount
  ) {
    throw new Error(
      `${episode.slug} must contain ${expectedItemCount} unique item ids`,
    );
  }

  const counts = Object.fromEntries(validSlots.map((slot) => [slot, 0]));
  for (const id of episode.itemIds) {
    const catalogItem = itemById.get(id);
    if (!catalogItem) throw new Error(`${episode.slug} references unknown item ${id}`);
    counts[catalogItem.slot] += 1;
  }

  for (const slot of validSlots) {
    if (counts[slot] !== expectedItemsPerSlot) {
      throw new Error(
        `${episode.slug} requires ${expectedItemsPerSlot} ${slot} items, received ${counts[slot]}`,
      );
    }
  }

  if (episode.itemRoles) {
    const validRoles = new Set(["best", "acceptable", "partial", "mismatch"]);
    const roleIds = Object.keys(episode.itemRoles);
    if (
      roleIds.length !== episode.itemIds.length ||
      roleIds.some((id) => !episode.itemIds.includes(id)) ||
      Object.values(episode.itemRoles).some((role) => !validRoles.has(role))
    ) {
      throw new Error(`${episode.slug} has an invalid item role map`);
    }
    if (
      !Array.isArray(episode.canonicalItemIds) ||
      episode.canonicalItemIds.length !== validSlots.length ||
      episode.canonicalItemIds.some(
        (id) => episode.itemRoles[id] !== "best",
      )
    ) {
      throw new Error(`${episode.slug} has an invalid canonical outfit`);
    }
  }

  const categoryTotals = { tpo: 0, function: 0, expression: 0 };
  for (const criterion of episode.rules.criteria) {
    categoryTotals[criterion.category] += criterion.points;
  }

  if (
    categoryTotals.tpo !== 30 ||
    categoryTotals.function !== 30 ||
    categoryTotals.expression !== 20
  ) {
    throw new Error(`${episode.slug} has invalid score category totals`);
  }
}

const catalog = {
  version: 3,
  generatedAt: "2026-07-26",
  slots: validSlots,
  chapters,
  items,
  episodes,
};

await writeFile(
  path.join(ROOT, "lib", "story-catalog.json"),
  `${JSON.stringify(catalog, null, 2)}\n`,
  "utf8",
);

console.log(
  `Generated story catalog: ${episodes.length} episodes, ${items.length} items`,
);
