export type TransferOption = {
  id: string;
  label: string;
};

export type EpisodeLearning = {
  reasonPrompt: string;
  reasonClues: string[];
  modelAnswer: string;
  transfer: {
    situation: string;
    question: string;
    options: TransferOption[];
    correctOptionId: string;
    successFeedback: string;
    retryFeedback: string;
  };
};

const EPISODE_LEARNING: Record<string, EpisodeLearning> = {
  "rescue-team-trial": {
    reasonPrompt: "왜 이 코디가 구조대 입단 시험에 맞을까요?",
    reasonClues: ["밝아서 잘 보이기", "걷고 뛰기 편하기", "몸과 발을 안전하게 보호하기"],
    modelAnswer:
      "훈련장에서는 밝아서 잘 보이고, 걷고 뛰기 편하며, 미끄럼을 줄이는 신발과 보호 장비로 몸을 지킬 수 있어야 해요.",
    transfer: {
      situation: "새 상황 · 해 질 무렵 운동회 정리 돕기",
      question: "운동장 정리를 도울 때 가장 알맞은 준비는 무엇일까요?",
      options: [
        { id: "visible-active-grip", label: "잘 보이고 움직이기 편하며 잘 미끄러지지 않는 옷차림" },
        { id: "formal-decoration", label: "움직임보다 격식과 장식을 앞세운 옷차림" },
        { id: "sleep-softness", label: "잠자리에 알맞은 부드럽고 느슨한 옷차림" },
      ],
      correctOptionId: "visible-active-grip",
      successFeedback:
        "맞아요! 어두워지는 운동장과 정리 활동을 함께 살펴 가시성, 활동성, 접지력을 연결했어요.",
      retryFeedback:
        "해 질 무렵의 운동장과 몸을 움직이는 일을 함께 떠올려 보세요.",
    },
  },
  "school-pe-rush": {
    reasonPrompt: "왜 이 코디로 학교와 체육 수업을 모두 준비할 수 있을까요?",
    reasonClues: ["학교에서 단정하기", "운동장에서 자유롭게 움직이기", "달릴 때 발을 안정적으로 딛기"],
    modelAnswer:
      "학교에서 단정해 보이면서도 통풍이 잘되고 움직이기 편하며, 막힌 운동화로 발을 보호할 수 있기 때문이에요.",
    transfer: {
      situation: "새 상황 · 오전 수업 뒤 생태공원 관찰",
      question: "교실과 공원 활동을 이어서 할 때 무엇을 먼저 살펴야 할까요?",
      options: [
        { id: "party-flashy", label: "파티에 어울리는 반짝이는 장식" },
        { id: "neat-active-closed", label: "단정함과 활동성, 발을 가리는 신발" },
        { id: "rain-only", label: "비 소식이 없어도 두꺼운 우비와 장화" },
      ],
      correctOptionId: "neat-active-closed",
      successFeedback:
        "맞아요! 이어지는 두 장소에서 할 일을 모두 생각해 단정함과 활동성을 함께 골랐어요.",
      retryFeedback:
        "교실에 있을 때와 공원에서 걸을 때 필요한 기능을 하나씩 찾아보세요.",
    },
  },
  "bedtime-ready": {
    reasonPrompt: "왜 이 코디가 소미의 잠잘 준비에 알맞을까요?",
    reasonClues: ["몸을 조이지 않기", "부드럽고 통풍이 잘되기", "서늘한 방에서 포근하기"],
    modelAnswer:
      "부드럽고 통풍이 잘되는 잠옷이 몸을 조이지 않으며, 서늘한 방에서도 편안하게 체온을 지켜 주기 때문이에요.",
    transfer: {
      situation: "새 상황 · 서늘한 밤 기차에서 쉬기",
      question: "오래 앉아 잠깐 잘 때 가장 알맞은 준비는 무엇일까요?",
      options: [
        { id: "hard-formal", label: "모양이 흐트러지지 않는 딱딱한 정장" },
        { id: "dangling-accessory", label: "잠들 때 걸릴 수 있는 길고 늘어진 장식" },
        { id: "soft-comfort-warm", label: "몸을 조이지 않는 옷과 가벼운 보온 소품" },
      ],
      correctOptionId: "soft-comfort-warm",
      successFeedback:
        "맞아요! 쉬는 활동에는 편안함, 부드러움, 알맞은 보온이 중요해요.",
      retryFeedback:
        "몸을 오래 기대고 쉴 때 답답하거나 걸리는 부분이 없는지 생각해 보세요.",
    },
  },
  "friend-birthday-party": {
    reasonPrompt: "왜 이 코디가 생일 축하와 파티 놀이에 모두 어울릴까요?",
    reasonClues: ["친구를 축하하는 느낌", "실내에서 단정하기", "게임할 때 편하게 움직이기"],
    modelAnswer:
      "축하하는 색이나 소품으로 마음을 표현하면서도, 단정하고 편한 옷과 안전한 신발로 함께 놀 수 있기 때문이에요.",
    transfer: {
      situation: "새 상황 · 친구의 작은 작품 전시회",
      question: "친구를 축하하고 전시장을 둘러볼 때 어떤 선택이 알맞을까요?",
      options: [
        { id: "celebrate-neat-comfort", label: "축하가 보이면서 단정하고 편한 옷차림" },
        { id: "pajama-relax", label: "집에서 잘 때 입는 잠옷과 수면 양말" },
        { id: "outdoor-rain", label: "맑은 실내에서도 우비와 빗길 장화" },
      ],
      correctOptionId: "celebrate-neat-comfort",
      successFeedback:
        "맞아요! 친구를 축하하는 표현과 전시장을 편하게 걷는 기능을 함께 살폈어요.",
      retryFeedback:
        "친구에게 전할 마음과 전시장에서 하게 될 일을 함께 떠올려 보세요.",
    },
  },
  "rainy-market-errand": {
    reasonPrompt: "비 오는 저녁의 환경 단서가 이 코디와 어떻게 연결될까요?",
    reasonClues: ["빗물과 큰 웅덩이", "어두워진 마트 길", "젖어서 미끄러운 바닥"],
    modelAnswer:
      "방수 옷과 신발이 빗물을 막고, 밝거나 반사되는 부분이 어두운 길에서 잘 보이게 하며, 접지력 있는 밑창이 미끄럼을 줄여요.",
    transfer: {
      situation: "새 상황 · 안개 낀 새벽 반려견 산책",
      question: "안개와 축축한 길을 함께 생각한 준비는 무엇일까요?",
      options: [
        { id: "dark-smooth", label: "어두운색 옷과 밑창이 매끄러운 구두" },
        { id: "visible-grip-cover", label: "잘 보이는 표시와 접지력 있는 신발, 몸을 가리는 옷" },
        { id: "indoor-slippers", label: "가까운 길이므로 발이 열린 실내 슬리퍼" },
      ],
      correctOptionId: "visible-grip-cover",
      successFeedback:
        "맞아요! 안개 속 가시성과 축축한 길의 접지력을 함께 연결했어요.",
      retryFeedback:
        "안개 때문에 잘 보이는지, 젖은 길에서 안전하게 디딜 수 있는지 살펴보세요.",
    },
  },
  "summer-waterpark": {
    reasonPrompt: "강한 햇빛과 젖은 환경에서 이 코디는 몸을 어떻게 지켜 줄까요?",
    reasonClues: ["강한 햇빛 막기", "물에서 빠르게 마르기", "젖은 바닥과 물속에서 안전하기"],
    modelAnswer:
      "래시가드와 수영복이 햇빛을 가리고 빨리 마르며, 물놀이 안전 장비와 접지력 있는 신발이 물과 젖은 바닥의 위험을 줄여요.",
    transfer: {
      situation: "새 상황 · 한여름 강가 생태 조사",
      question: "햇빛 아래 얕은 물가를 살필 때 가장 알맞은 준비는 무엇일까요?",
      options: [
        { id: "absorbent-heavy", label: "물을 많이 머금는 두꺼운 니트와 긴 치마" },
        { id: "formal-smooth", label: "격식 있는 재킷과 밑창이 매끄러운 구두" },
        { id: "sun-quickdry-grip", label: "햇빛 보호와 빠른 건조, 젖은 바닥용 신발" },
      ],
      correctOptionId: "sun-quickdry-grip",
      successFeedback:
        "맞아요! 더위만 본 것이 아니라 햇빛, 물, 젖은 바닥을 나누어 살폈어요.",
      retryFeedback:
        "몸에 닿는 햇빛과 물, 발밑의 젖은 바닥을 각각 생각해 보세요.",
    },
  },
  "winter-ski-class": {
    reasonPrompt: "영하의 눈 덮인 환경에서 이 코디가 필요한 까닭은 무엇일까요?",
    reasonClues: ["눈과 찬 바람 막기", "젖지 않고 체온 지키기", "넘어질 때 머리와 몸 보호하기"],
    modelAnswer:
      "방수·방한 옷이 눈과 바람을 막아 체온을 지키고, 스키용 신발과 보호 장비가 눈 위 이동과 넘어짐에 대비해 줘요.",
    transfer: {
      situation: "새 상황 · 겨울 야외 빙판 체험",
      question: "차갑고 미끄러운 빙판에서 필요한 기능 묶음은 무엇일까요?",
      options: [
        { id: "warm-protect-grip", label: "보온과 충격 보호, 빙판 활동에 맞는 접지" },
        { id: "warm-only", label: "따뜻하지만 젖기 쉽고 움직이기 무거운 옷만 준비" },
        { id: "exposed-light", label: "움직임만 생각한 얇은 반소매와 반바지" },
      ],
      correctOptionId: "warm-protect-grip",
      successFeedback:
        "맞아요! 추위, 미끄러짐, 넘어짐이라는 서로 다른 위험을 함께 해결했어요.",
      retryFeedback:
        "따뜻함만으로 충분한지, 빙판에서 미끄러지거나 넘어질 때도 생각해 보세요.",
    },
  },
  "wedding-flower-child": {
    reasonPrompt: "다온의 화동 역할과 축하하는 마음이 이 코디에 어떻게 보일까요?",
    reasonClues: ["결혼식의 단정한 분위기", "축하를 전하는 색이나 소품", "꽃바구니를 들고 편하게 걷기"],
    modelAnswer:
      "단정한 옷으로 결혼식 자리를 존중하고, 꽃바구니나 작은 장식으로 축하를 표현하며, 편한 신발로 화동 역할을 잘할 수 있어요.",
    transfer: {
      situation: "새 상황 · 학교 발표회 진행 도우미",
      question: "무대의 역할과 친구들에 대한 배려를 함께 보여 주는 선택은 무엇일까요?",
      options: [
        { id: "attention-only", label: "진행보다 자신만 눈에 띄는 큰 장식과 불편한 신발" },
        { id: "role-neat-comfort", label: "단정하고 역할이 보이며 편하게 움직이는 옷차림" },
        { id: "sleep-casual", label: "무대 역할과 관계없는 잠옷과 실내 슬리퍼" },
      ],
      correctOptionId: "role-neat-comfort",
      successFeedback:
        "맞아요! 단정함은 꾸미기 경쟁이 아니라 역할과 함께하는 사람을 배려하는 표현이에요.",
      retryFeedback:
        "무대에서 맡은 일과 친구들에게 전하고 싶은 태도를 함께 생각해 보세요.",
    },
  },
  "family-funeral": {
    reasonPrompt: "은호의 위로와 존중하는 마음을 이 옷차림은 어떻게 전할까요?",
    reasonClues: ["가족과 추모 공간의 안내 살피기", "차분하고 단정하게 표현하기", "오래 곁을 지킬 수 있게 편안하기"],
    modelAnswer:
      "가족과 추모 공간의 안내에 맞춰 차분하고 단정한 옷을 고르고 장식을 줄이면, 오래 곁을 지키며 위로와 존중을 전할 수 있어요.",
    transfer: {
      situation: "새 상황 · 다른 문화의 추모 모임 방문",
      question: "옷차림 관습을 잘 모를 때 가장 배려 깊은 선택은 무엇일까요?",
      options: [
        { id: "black-always", label: "문화와 안내를 묻지 않고 검은 옷만 정답이라 여기기" },
        { id: "celebration-flashy", label: "평소 파티처럼 화려한 장식으로 눈에 띄기" },
        { id: "ask-follow-simple", label: "가족이나 주최자의 안내를 묻고 차분하게 준비하기" },
      ],
      correctOptionId: "ask-follow-simple",
      successFeedback:
        "맞아요! 추모 방식은 문화와 가정에 따라 다를 수 있어 안내를 살피는 태도가 존중을 전해요.",
      retryFeedback:
        "한 가지 색을 규칙으로 정하기보다 그 가족과 공간의 안내를 먼저 확인해 보세요.",
    },
  },
  "lunar-new-year-visit": {
    reasonPrompt: "하린의 명절 옷차림은 전통과 가족에 대한 마음을 어떻게 나타낼까요?",
    reasonClues: ["세배할 때 단정하기", "전통 또는 가족의 방식 존중하기", "겨울 이동과 사촌 놀이에 편안하기"],
    modelAnswer:
      "한복이나 단정한 일상복으로 가족의 명절 방식을 존중하고, 따뜻하고 편한 옷을 골라 세배와 놀이를 모두 할 수 있어요.",
    transfer: {
      situation: "새 상황 · 친구 가족의 명절 행사 초대",
      question: "익숙하지 않은 명절 자리에 갈 때 가장 알맞은 준비는 무엇일까요?",
      options: [
        { id: "ask-respect-comfort", label: "가족의 방식을 묻고 단정함과 편안함을 함께 준비하기" },
        { id: "costume-assume", label: "묻지 않고 눈에 띄는 전통 의상처럼 꾸미기" },
        { id: "ignore-occasion", label: "자리의 뜻은 보지 않고 평소 잠옷 그대로 가기" },
      ],
      correctOptionId: "ask-respect-comfort",
      successFeedback:
        "맞아요! 전통을 존중하는 첫걸음은 정답을 짐작하기보다 그 가족의 방식을 살피는 일이에요.",
      retryFeedback:
        "낯선 전통을 혼자 짐작하기보다 초대한 가족에게 물어볼 수 있어요.",
    },
  },
  "science-lab-experiment": {
    reasonPrompt: "실험실의 위험과 보호할 몸의 부분을 이 코디와 연결해 볼까요?",
    reasonClues: ["튀는 액체에서 눈과 피부 보호하기", "떨어지는 물질에서 발 가리기", "소매와 장식이 도구에 걸리지 않게 하기"],
    modelAnswer:
      "튀는 액체에는 보안경과 긴 보호복, 떨어지는 물질에는 막힌 신발이 필요하고, 소매와 장식을 정돈하면 도구에 걸릴 위험을 줄여요.",
    transfer: {
      situation: "새 상황 · 미술실에서 뜨거운 접착 도구 사용",
      question: "위험을 먼저 찾은 뒤 고른 준비로 가장 알맞은 것은 무엇일까요?",
      options: [
        { id: "loose-open", label: "도구에 닿기 쉬운 넓은 소매와 발이 열린 신발" },
        { id: "heat-fitted-closed", label: "열을 다룰 손 보호와 정돈된 소매, 막힌 신발" },
        { id: "decoration-first", label: "위험보다 작품과 어울리는 장식만 먼저 고르기" },
      ],
      correctOptionId: "heat-fitted-closed",
      successFeedback:
        "맞아요! 장소 이름을 외우지 않고 열, 걸림, 낙하 위험을 보호 기능으로 바꾸었어요.",
      retryFeedback:
        "뜨거운 도구가 어디에 닿을 수 있고 무엇이 걸리거나 떨어질지 먼저 찾아보세요.",
    },
  },
  "family-cooking": {
    reasonPrompt: "주방의 여러 위험을 줄이도록 옷의 기능을 어떻게 옮겨 적용했나요?",
    reasonClues: ["불에서 소매와 머리 정돈하기", "뜨거운 냄비에서 손과 몸 보호하기", "젖은 바닥에서 발 보호하기"],
    modelAnswer:
      "고정된 소매와 정돈된 머리는 불에 닿을 위험을 줄이고, 앞치마와 열 보호 장갑, 막힌 미끄럼 방지 신발은 열과 젖은 바닥에 대비해요.",
    transfer: {
      situation: "새 상황 · 학교 축제에서 따뜻한 간식 만들기",
      question: "과학실과 주방에서 배운 원칙을 옮겨 적용한 선택은 무엇일까요?",
      options: [
        { id: "apron-only", label: "앞치마만 입고 넓은 소매와 열린 신발은 그대로 두기" },
        { id: "festival-flashy", label: "조리 위험보다 축제용 장식과 긴 팔찌를 먼저 고르기" },
        { id: "fitted-heat-hygiene-grip", label: "정돈된 옷과 열 보호, 위생, 접지력 있는 신발" },
      ],
      correctOptionId: "fitted-heat-hygiene-grip",
      successFeedback:
        "맞아요! 장소가 달라도 열, 위생, 미끄럼, 걸림 위험에는 같은 안전 원리를 적용할 수 있어요.",
      retryFeedback:
        "앞치마 하나만 보지 말고 불 주변, 손, 머리, 발밑의 위험을 차례로 살펴보세요.",
    },
  },
  "zombie-city-escape": {
    reasonPrompt: "가상훈련의 T·P·O에서 위험을 찾고 필요한 기능을 모두 연결해 볼까요?",
    reasonClues: ["어두운 밤에 서로 잘 보이기", "장애물 길에서 몸과 발 보호하기", "안전지대까지 빠르게 움직이기"],
    modelAnswer:
      "가상훈련의 어두운 밤과 장애물 길, 빠른 탈출 상황을 보고 가시성, 신체 보호, 접지력, 활동성을 함께 갖춘 코디를 선택해야 해요.",
    transfer: {
      situation: "최종 새 상황 · 해 질 무렵 숲 체험 뒤 안전지대로 이동",
      question: "힌트 없이 T·P·O와 위험을 분석한 판단으로 가장 알맞은 것은 무엇일까요?",
      options: [
        { id: "copy-zombie-items", label: "상황은 살피지 않고 가상 좀비 훈련에서 쓴 물건을 그대로 복사한다" },
        { id: "analyze-all-functions", label: "어둠, 숲길, 빠른 이동을 보고 가시성·보호·접지·활동성을 연결한다" },
        { id: "choose-fast-only", label: "빠르게 움직이는 기능만 고르고 어둠과 장애물 위험은 나중에 생각한다" },
      ],
      correctOptionId: "analyze-all-functions",
      successFeedback:
        "맞아요! 가상훈련의 정답을 외운 것이 아니라 새 T·P·O를 읽고 네 가지 기능을 스스로 연결했어요.",
      retryFeedback:
        "시간, 장소, 할 일을 나눈 뒤 어둠과 장애물이 만드는 위험을 기능으로 바꾸어 보세요.",
    },
  },
};

export function getEpisodeLearning(
  episodeSlug: string,
): EpisodeLearning | undefined {
  return EPISODE_LEARNING[episodeSlug];
}
