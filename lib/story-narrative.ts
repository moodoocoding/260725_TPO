export type NarrativeSpeaker =
  | "narrator"
  | "captain"
  | "hari"
  | "button"
  | "requester";

export type NarrativeMood =
  | "bright"
  | "calm"
  | "urgent"
  | "solemn";

export type NarrativeBeat = {
  id: string;
  speaker: NarrativeSpeaker;
  text: string;
  visualKey: string;
  mood: NarrativeMood;
};

type NarrativeBeatInput = Omit<NarrativeBeat, "visualKey" | "mood"> &
  Partial<Pick<NarrativeBeat, "visualKey" | "mood">>;

export type ChapterNarrative = {
  chapterId: string;
  opening: NarrativeBeat[];
  badgeName: string;
  ending: NarrativeBeat[];
  nextHook: NarrativeBeat[];
};

export type EpisodeNarrative = {
  slug: string;
  chapterId: string;
  order: number;
  requester: string;
  cause: string;
  intro: NarrativeBeat[];
  successAftermath: NarrativeBeat[];
  retryLine: string;
  nextHook: NarrativeBeat[];
};

export type FinalNarrative = {
  title: string;
  ending: NarrativeBeat[];
  nextSeasonHook: NarrativeBeat[];
};

export const STORY_NARRATIVE_TITLE = "하루와 친구들, 네 개의 구조대 배지";

type ChapterNarrativeInput = Omit<
  ChapterNarrative,
  "opening" | "ending" | "nextHook"
> & {
  opening: NarrativeBeatInput[];
  ending: NarrativeBeatInput[];
  nextHook: NarrativeBeatInput[];
};

type EpisodeNarrativeInput = Omit<
  EpisodeNarrative,
  "intro" | "successAftermath" | "nextHook"
> & {
  intro: NarrativeBeatInput[];
  successAftermath: NarrativeBeatInput[];
  nextHook: NarrativeBeatInput[];
};

const RAW_CHAPTER_NARRATIVES = {
  prologue: {
    chapterId: "prologue",
    badgeName: "신입 대원증",
    opening: [
      {
        id: "prologue-opening-1",
        speaker: "narrator",
        text: "TPO 스타일 구조대 본부에는 친구들의 상황을 비춰 보는 신기한 상황 옷장이 있다.",
        visualKey: "headquarters-wardrobe",
        mood: "bright",
      },
      {
        id: "prologue-opening-2",
        speaker: "narrator",
        text: "신입 코디네이터가 문을 열자 수달 현장 파트너 하루와 나래 대장, 단추 나침반이 기다리고 있었다.",
        visualKey: "team-introduction",
        mood: "bright",
      },
      {
        id: "prologue-opening-3",
        speaker: "captain",
        text: "입단 시험 뒤에 네 개의 배지를 모으면 정식 구조대원이 돼. 먼저 상황을 보는 눈부터 확인해 볼까?",
        visualKey: "empty-badge-card",
        mood: "bright",
      },
    ],
    ending: [
      {
        id: "prologue-ending-1",
        speaker: "narrator",
        text: "하루가 안전 표식 네 개를 모두 찾자 신입 코디네이터의 대원증이 반짝였다.",
        visualKey: "rookie-card",
        mood: "bright",
      },
      {
        id: "prologue-ending-2",
        speaker: "captain",
        text: "코디네이터도 하루도 합격! 이제 친구들의 임무를 맡아도 되겠어.",
        mood: "bright",
      },
    ],
    nextHook: [
      {
        id: "prologue-hook-1",
        speaker: "requester",
        text: "민준이야. 늦잠을 잤는데 오늘 첫 시간이 체육이야!",
        visualKey: "school-message",
        mood: "urgent",
      },
      {
        id: "prologue-hook-2",
        speaker: "captain",
        text: "특별한 재난만 구조대의 일이 아니야. 평범한 하루를 편안하게 만드는 일부터 시작해 보자.",
        mood: "bright",
      },
    ],
  },
  "busy-day": {
    chapterId: "busy-day",
    badgeName: "생활 배지",
    opening: [
      {
        id: "busy-day-opening-1",
        speaker: "narrator",
        text: "입단 시험 다음 날, 본부의 무전기가 아침부터 밤까지 세 번 울렸다.",
        visualKey: "headquarters-clock",
        mood: "bright",
      },
      {
        id: "busy-day-opening-2",
        speaker: "button",
        text: "멋진 옷 하나면 학교에서도, 침실에서도, 파티에서도 충분하지 않을까?",
        visualKey: "clock-bed-invitation",
        mood: "bright",
      },
      {
        id: "busy-day-opening-3",
        speaker: "captain",
        text: "같은 옷도 때와 장소, 할 일에 따라 달라질 수 있어. 친구들이 무엇을 할지 먼저 살펴보자.",
        mood: "calm",
      },
    ],
    ending: [
      {
        id: "busy-day-ending-1",
        speaker: "narrator",
        text: "본부 화면에 아침, 밤, 특별한 날의 기록이 한 줄로 이어지고 생활 배지가 빛났다.",
        visualKey: "daily-life-badge",
        mood: "bright",
      },
      {
        id: "busy-day-ending-2",
        speaker: "captain",
        text: "시간만 본 것이 아니라, 그 시간에 친구가 할 일까지 살폈구나.",
        mood: "bright",
      },
    ],
    nextHook: [
      {
        id: "busy-day-hook-1",
        speaker: "narrator",
        text: "생일 파티가 끝난 뒤 굵은 빗방울이 본부 창문을 두드리고 밖이 갑자기 어두워졌다.",
        visualKey: "rainy-window",
        mood: "urgent",
      },
      {
        id: "busy-day-hook-2",
        speaker: "hari",
        text: "집 앞 마트에 다녀와야 하는데, 이 옷 그대로 밖에 나가도 될까?",
        mood: "urgent",
      },
    ],
  },
  "weather-alert": {
    chapterId: "weather-alert",
    badgeName: "날씨 배지",
    opening: [
      {
        id: "weather-alert-opening-1",
        speaker: "narrator",
        text: "생활 배지를 얻은 뒤, 구조대는 장마와 여름, 겨울을 차례로 지나는 장기 날씨 훈련을 맡았다.",
        visualKey: "season-map",
        mood: "bright",
      },
      {
        id: "weather-alert-opening-2",
        speaker: "captain",
        text: "날씨는 몸에게 보내는 편지란다. 비, 햇빛, 눈바람은 서로 다른 준비를 부탁하지.",
        visualKey: "rain-sun-snow",
        mood: "calm",
      },
      {
        id: "weather-alert-opening-3",
        speaker: "hari",
        text: "이번에는 옷이 몸을 어떻게 지켜 주는지 찾아보자!",
        mood: "bright",
      },
    ],
    ending: [
      {
        id: "weather-alert-ending-1",
        speaker: "narrator",
        text: "비구름, 태양, 눈송이 아이콘이 방패 모양의 날씨 배지로 합쳐졌다.",
        visualKey: "weather-badge",
        mood: "bright",
      },
      {
        id: "weather-alert-ending-2",
        speaker: "captain",
        text: "날씨를 미리 읽으면 몸을 지키는 준비를 할 수 있어.",
        mood: "bright",
      },
    ],
    nextHook: [
      {
        id: "weather-alert-hook-1",
        speaker: "narrator",
        text: "예린의 고맙다는 답장 뒤에 다온의 결혼식 사진이 도착했다.",
        visualKey: "thank-you-message",
        mood: "calm",
      },
      {
        id: "weather-alert-hook-2",
        speaker: "captain",
        text: "다음 요청에는 날씨표에 보이지 않는 단서가 있어. 사람의 마음이지.",
        visualKey: "three-invitations",
        mood: "calm",
      },
    ],
  },
  "heart-and-manners": {
    chapterId: "heart-and-manners",
    badgeName: "마음 배지",
    opening: [
      {
        id: "heart-and-manners-opening-1",
        speaker: "narrator",
        text: "결혼식의 다온, 장례식장의 은호, 설날 할머니 댁으로 가는 하린에게서 조심스러운 부탁이 도착했다.",
        visualKey: "flower-ribbon-pouch",
        mood: "calm",
      },
      {
        id: "heart-and-manners-opening-2",
        speaker: "hari",
        text: "세 친구는 축하와 위로, 존중을 어떻게 옷으로 전해야 할지 망설이고 있어.",
        mood: "calm",
      },
      {
        id: "heart-and-manners-opening-3",
        speaker: "captain",
        text: "옷에는 몸을 지키는 기능뿐 아니라 말없이 마음을 전하는 힘도 있단다.",
        mood: "calm",
      },
    ],
    ending: [
      {
        id: "heart-and-manners-ending-1",
        speaker: "narrator",
        text: "축하의 꽃, 위로의 리본, 명절의 매듭이 둥근 마음 배지로 이어졌다.",
        visualKey: "heart-badge",
        mood: "calm",
      },
      {
        id: "heart-and-manners-ending-2",
        speaker: "captain",
        text: "진짜 멋은 비싼 옷이나 정해진 모양이 아니라, 상대와 자리의 뜻을 살피는 데서 시작해.",
        mood: "calm",
      },
    ],
    nextHook: [
      {
        id: "heart-and-manners-hook-1",
        speaker: "narrator",
        text: "그 순간 도윤이 보낸 과학실 사진에 액체 비커와 가까이 늘어진 넓은 소매가 보였다.",
        visualKey: "science-risk-photo",
        mood: "urgent",
      },
      {
        id: "heart-and-manners-hook-2",
        speaker: "requester",
        text: "여기서는 무엇이 위험해 보이니?",
        mood: "urgent",
      },
    ],
  },
  "safety-call": {
    chapterId: "safety-call",
    badgeName: "안전 배지",
    opening: [
      {
        id: "safety-call-opening-1",
        speaker: "narrator",
        text: "마음 배지가 빛나자 과학실, 주방, 구조대 가상도시에서 연달아 경보가 울렸다.",
        visualKey: "three-safety-alerts",
        mood: "urgent",
      },
      {
        id: "safety-call-opening-2",
        speaker: "button",
        text: "정답표는 어디 있지? 처음 보는 곳이라서 잘 모르겠어.",
        mood: "urgent",
      },
      {
        id: "safety-call-opening-3",
        speaker: "captain",
        text: "진짜 구조대원은 처음 보는 곳에서도 위험을 스스로 찾아. 지금까지 배운 단서를 모두 연결해 보자.",
        mood: "calm",
      },
    ],
    ending: [
      {
        id: "safety-call-ending-1",
        speaker: "narrator",
        text: "마지막 안전 배지가 대원증에 끼워지고 네 개의 빈자리가 모두 빛으로 채워졌다.",
        visualKey: "four-complete-badges",
        mood: "bright",
      },
      {
        id: "safety-call-ending-2",
        speaker: "captain",
        text: "이제 처음 보는 상황에서도 무엇을 살펴야 하는지 스스로 찾을 수 있구나.",
        mood: "bright",
      },
    ],
    nextHook: [
      {
        id: "safety-call-hook-1",
        speaker: "narrator",
        text: "본부에 발신자가 가려진 새로운 메시지 알림이 도착했다.",
        visualKey: "mystery-message",
        mood: "bright",
      },
      {
        id: "safety-call-hook-2",
        speaker: "requester",
        text: "새로운 계절, 새로운 TPO 요청이 도착했어요.",
        mood: "bright",
      },
    ],
  },
} as const satisfies Record<string, ChapterNarrativeInput>;

const RAW_EPISODE_NARRATIVES = {
  "rescue-team-trial": {
    slug: "rescue-team-trial",
    chapterId: "prologue",
    order: 1,
    requester: "나래 대장",
    cause: "정식 임무를 맡기 전, 하루가 신입 코디네이터가 고른 옷을 입고 훈련장에서 활동성·접지력·가시성을 시험한다.",
    intro: [
      {
        id: "rescue-team-trial-intro-1",
        speaker: "narrator",
        text: "훈련장 스피커에서 첫 시험 알림이 울리고 안전 표식 네 개가 켜졌다.",
        visualKey: "training-ground-start",
        mood: "bright",
      },
      {
        id: "rescue-team-trial-intro-2",
        speaker: "button",
        text: "첫날이니까 가장 화려한 옷이 좋겠지?",
        mood: "bright",
      },
      {
        id: "rescue-team-trial-intro-3",
        speaker: "captain",
        text: "하루가 훈련장에서 걷고 뛸 때는 무엇이 먼저 필요할까?",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "rescue-team-trial-aftermath-1",
        speaker: "narrator",
        text: "하루는 안전 표식을 모두 찾고 미끄러지지 않은 채 출발선으로 돌아왔다.",
        visualKey: "training-ground-finish",
        mood: "bright",
      },
      {
        id: "rescue-team-trial-aftermath-2",
        speaker: "captain",
        text: "코디네이터도 하루도 합격! 이제 친구들의 임무를 맡아도 되겠어.",
        mood: "bright",
      },
    ],
    retryLine: "하루는 아직 입단 시험 출발선에 있어. 걷고 뛸 때 필요한 안전 단서를 다시 찾아보자.",
    nextHook: [
      {
        id: "rescue-team-trial-next-1",
        speaker: "narrator",
        text: "빈 대원증을 살펴보던 순간 학교 방향에서 민준의 다급한 문자가 도착했다.",
        visualKey: "school-message",
        mood: "urgent",
      },
    ],
  },
  "school-pe-rush": {
    slug: "school-pe-rush",
    chapterId: "busy-day",
    order: 2,
    requester: "민준",
    cause: "민준이 늦잠을 잤고 갈아입을 시간 없이 등교한 뒤 첫 수업으로 운동장 체육을 해야 한다.",
    intro: [
      {
        id: "school-pe-rush-intro-1",
        speaker: "narrator",
        text: "학교 종이 울리기까지 시간이 얼마 남지 않았고 민준의 책상에는 교과서와 체육 시간표가 함께 놓여 있다.",
        visualKey: "school-desk-schedule",
        mood: "urgent",
      },
      {
        id: "school-pe-rush-intro-2",
        speaker: "button",
        text: "학교니까 교복처럼 보이는 옷만 고르면 되겠지?",
        mood: "urgent",
      },
      {
        id: "school-pe-rush-intro-3",
        speaker: "hari",
        text: "그 옷으로 민준이 운동장에서 마음껏 뛸 수 있을지도 살펴보자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "school-pe-rush-aftermath-1",
        speaker: "narrator",
        text: "민준은 수업에 늦지 않았고 체육 시간에도 가볍게 달렸다.",
        visualKey: "school-running",
        mood: "bright",
      },
      {
        id: "school-pe-rush-aftermath-2",
        speaker: "requester",
        text: "갈아입지 않아도 오늘 일정을 모두 해낼 수 있었어!",
        mood: "bright",
      },
    ],
    retryLine: "민준은 아직 학교로 출발하기 전이야. 교실의 단정함과 운동장의 활동성을 함께 찾아보자.",
    nextHook: [
      {
        id: "school-pe-rush-next-1",
        speaker: "narrator",
        text: "운동장의 불이 꺼질 무렵 본부에 하품 소리가 섞인 소미의 문자가 도착했다.",
        visualKey: "sleepy-message",
        mood: "calm",
      },
    ],
  },
  "bedtime-ready": {
    slug: "bedtime-ready",
    chapterId: "busy-day",
    order: 3,
    requester: "소미",
    cause: "긴 하루를 보낸 소미가 조금 서늘한 침실에서 몸을 조이지 않고 편안히 자려 한다.",
    intro: [
      {
        id: "bedtime-ready-intro-1",
        speaker: "narrator",
        text: "본부의 조명이 차분해지고 창밖에 달이 떠오르자 소미의 침실 사진이 도착했다.",
        visualKey: "moonlit-bedroom",
        mood: "calm",
      },
      {
        id: "bedtime-ready-intro-2",
        speaker: "hari",
        text: "이번에는 빨리 뛰는 기능보다 소미의 몸이 편히 쉬는 기능을 찾아야 해.",
        mood: "calm",
      },
      {
        id: "bedtime-ready-intro-3",
        speaker: "captain",
        text: "누웠을 때 걸리거나 답답한 곳은 없을까?",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "bedtime-ready-aftermath-1",
        speaker: "narrator",
        text: "소미는 몸을 조이는 곳 없이 이불 속에 편안히 누웠다.",
        visualKey: "comfortable-bedtime",
        mood: "calm",
      },
      {
        id: "bedtime-ready-aftermath-2",
        speaker: "requester",
        text: "내일은 개운하게 일어날 수 있을 것 같아.",
        mood: "calm",
      },
    ],
    retryLine: "소미는 아직 잠자리에 들기 전이야. 부드러움과 통풍, 몸을 조이지 않는 편안함을 다시 살펴보자.",
    nextHook: [
      {
        id: "bedtime-ready-next-1",
        speaker: "narrator",
        text: "다음 날 아침, 본부 문틈으로 지우가 보낸 알록달록한 생일 초대장이 들어왔다.",
        visualKey: "birthday-invitation",
        mood: "bright",
      },
    ],
  },
  "friend-birthday-party": {
    slug: "friend-birthday-party",
    chapterId: "busy-day",
    order: 4,
    requester: "지우",
    cause: "지우가 유나의 생일을 축하하고 친구 집에서 몸을 움직이는 게임에도 참여하려 한다.",
    intro: [
      {
        id: "friend-birthday-party-intro-1",
        speaker: "narrator",
        text: "지우는 작은 선물과 생일 초대장을 들고 파티에 갈 준비를 하고 있다.",
        visualKey: "birthday-gift",
        mood: "bright",
      },
      {
        id: "friend-birthday-party-intro-2",
        speaker: "button",
        text: "반짝이는 옷일수록 축하하는 마음도 더 커 보일 거야!",
        mood: "bright",
      },
      {
        id: "friend-birthday-party-intro-3",
        speaker: "hari",
        text: "지우가 축하하는 마음을 보이면서 친구들과 신나게 놀 수 있는지도 살펴보자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "friend-birthday-party-aftermath-1",
        speaker: "narrator",
        text: "지우는 촛불을 함께 끄고 게임에서도 신나게 움직였다.",
        visualKey: "birthday-party",
        mood: "bright",
      },
      {
        id: "friend-birthday-party-aftermath-2",
        speaker: "requester",
        text: "유나가 와 줘서 정말 기쁘다고 했어!",
        mood: "bright",
      },
    ],
    retryLine: "지우는 아직 파티로 출발하기 전이야. 축하 표현과 실내에서 편하게 노는 기능을 함께 찾아보자.",
    nextHook: [
      {
        id: "friend-birthday-party-next-1",
        speaker: "narrator",
        text: "파티가 끝나자 굵은 비가 내렸다. 하루는 우유를 사러 갈 준비를 했다.",
        visualKey: "rainy-evening",
        mood: "urgent",
      },
    ],
  },
  "rainy-market-errand": {
    slug: "rainy-market-errand",
    chapterId: "weather-alert",
    order: 5,
    requester: "하루",
    cause: "저녁 준비 중 우유가 떨어졌고, 하루가 큰 웅덩이와 어두운 빗길을 지나 가까운 마트에 다녀와야 한다.",
    intro: [
      {
        id: "rainy-market-errand-intro-1",
        speaker: "narrator",
        text: "창문을 두드리는 빗소리와 함께 휴대폰 호우 알림이 울렸다.",
        visualKey: "heavy-rain-alert",
        mood: "urgent",
      },
      {
        id: "rainy-market-errand-intro-2",
        speaker: "button",
        text: "마트가 가까우니까 하루는 아무 신발이나 신어도 괜찮지 않을까?",
        mood: "urgent",
      },
      {
        id: "rainy-market-errand-intro-3",
        speaker: "captain",
        text: "젖은 길, 어두운 저녁, 큰 웅덩이가 각각 어떤 위험을 만드는지 찾아보자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "rainy-market-errand-aftermath-1",
        speaker: "narrator",
        text: "하루는 웅덩이를 조심히 지나 우유를 무사히 가져왔다.",
        visualKey: "safe-rainy-return",
        mood: "bright",
      },
      {
        id: "rainy-market-errand-aftermath-2",
        speaker: "requester",
        text: "젖은 현관에 미끄러지지 않은 안전한 발자국만 남았어!",
        mood: "bright",
      },
    ],
    retryLine: "하루는 아직 마트로 출발하기 전이야. 방수와 가시성, 젖은 바닥의 접지력을 다시 살펴보자.",
    nextHook: [
      {
        id: "rainy-market-errand-next-1",
        speaker: "narrator",
        text: "비구름이 물러가고 달력이 여름방학으로 넘어가자 서준의 워터파크 사진이 도착했다.",
        visualKey: "summer-calendar",
        mood: "bright",
      },
    ],
  },
  "summer-waterpark": {
    slug: "summer-waterpark",
    chapterId: "weather-alert",
    order: 6,
    requester: "서준",
    cause: "서준이 야외 워터파크에서 물속 활동, 강한 햇빛, 계속 젖어 있는 바닥을 함께 마주한다.",
    intro: [
      {
        id: "summer-waterpark-intro-1",
        speaker: "narrator",
        text: "워터파크 전광판에 높은 기온과 강한 자외선 표시가 떴다.",
        visualKey: "waterpark-board",
        mood: "bright",
      },
      {
        id: "summer-waterpark-intro-2",
        speaker: "requester",
        text: "미끄럼틀을 타고 싶지만 햇빛과 젖은 바닥도 걱정돼.",
        mood: "urgent",
      },
      {
        id: "summer-waterpark-intro-3",
        speaker: "hari",
        text: "서준이 물속과 물 밖을 오갈 때 각각 어떤 기능이 필요한지 찾아보자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "summer-waterpark-aftermath-1",
        speaker: "narrator",
        text: "서준은 물속에서 편하게 움직이고 쉬는 동안에는 햇빛도 잘 가렸다.",
        visualKey: "safe-waterplay",
        mood: "bright",
      },
      {
        id: "summer-waterpark-aftermath-2",
        speaker: "requester",
        text: "마지막 미끄럼틀도 안전하게 성공했어!",
        mood: "bright",
      },
    ],
    retryLine: "서준은 아직 물놀이를 시작하기 전이야. 물속 움직임과 햇빛, 젖은 바닥 단서를 다시 연결해 보자.",
    nextHook: [
      {
        id: "summer-waterpark-next-1",
        speaker: "narrator",
        text: "날씨 배지의 눈송이 칸이 반짝이자 예린의 스키 교실 문자가 도착했다.",
        visualKey: "empty-snow-slot",
        mood: "urgent",
      },
    ],
  },
  "winter-ski-class": {
    slug: "winter-ski-class",
    chapterId: "weather-alert",
    order: 7,
    requester: "예린",
    cause: "예린의 첫 스키 수업 날 기온이 영하로 떨어지고 눈바람과 넘어짐에 대비해야 한다.",
    intro: [
      {
        id: "winter-ski-class-intro-1",
        speaker: "narrator",
        text: "스키장 화면에 영하의 기온과 눈바람 표시가 떴다.",
        visualKey: "ski-weather-board",
        mood: "urgent",
      },
      {
        id: "winter-ski-class-intro-2",
        speaker: "requester",
        text: "첫 수업은 설레지만 넘어질 때 몸이 아플까 봐 걱정돼.",
        mood: "urgent",
      },
      {
        id: "winter-ski-class-intro-3",
        speaker: "hari",
        text: "예린에게는 따뜻함뿐 아니라 눈 위 활동을 위한 방수와 보호 기능도 필요해.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "winter-ski-class-aftermath-1",
        speaker: "narrator",
        text: "예린은 눈밭에서 넘어져도 안전하게 일어나 첫 코스를 마쳤다.",
        visualKey: "ski-finish",
        mood: "bright",
      },
      {
        id: "winter-ski-class-aftermath-2",
        speaker: "requester",
        text: "하얀 눈 위에 내 S자 자국이 길게 이어졌어!",
        mood: "bright",
      },
    ],
    retryLine: "예린은 아직 첫 코스에 들어가기 전이야. 보온과 방수, 넘어질 때의 보호 단서를 다시 찾아보자.",
    nextHook: [
      {
        id: "winter-ski-class-next-1",
        speaker: "narrator",
        text: "예린이 고맙다고 인사한 뒤, 다온이 결혼식 꽃바구니 사진을 보냈다.",
        visualKey: "wool-loop-gift",
        mood: "calm",
      },
    ],
  },
  "wedding-flower-child": {
    slug: "wedding-flower-child",
    chapterId: "heart-and-manners",
    order: 8,
    requester: "다온",
    cause: "다온이 친척 결혼식에서 꽃바구니를 들고 천천히 입장하는 화동 역할을 맡았다.",
    intro: [
      {
        id: "wedding-flower-child-intro-1",
        speaker: "narrator",
        text: "결혼식장에 꽃잎 길이 준비되고 다온은 화동 입장 연습을 기다리고 있다.",
        visualKey: "wedding-aisle",
        mood: "bright",
      },
      {
        id: "wedding-flower-child-intro-2",
        speaker: "button",
        text: "가장 화려한 옷이 축하를 가장 크게 보여 주지 않을까?",
        mood: "bright",
      },
      {
        id: "wedding-flower-child-intro-3",
        speaker: "hari",
        text: "다온이 꽃바구니를 들고 끝까지 편하게 걷는 것도 축하의 일부야.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "wedding-flower-child-aftermath-1",
        speaker: "narrator",
        text: "다온은 꽃잎을 고르게 뿌리며 끝까지 씩씩하게 걸었다.",
        visualKey: "flower-child-finish",
        mood: "bright",
      },
      {
        id: "wedding-flower-child-aftermath-2",
        speaker: "requester",
        text: "신랑과 신부가 환한 미소로 고맙다고 해 주셨어.",
        mood: "bright",
      },
    ],
    retryLine: "다온은 아직 입장하기 전이야. 결혼식의 격식과 축하 표현, 편하게 걷는 기능을 함께 찾아보자.",
    nextHook: [
      {
        id: "wedding-flower-child-next-1",
        speaker: "narrator",
        text: "기쁜 음악이 잦아든 뒤 평소보다 조용한 은호의 문자 알림이 울렸다.",
        visualKey: "quiet-message",
        mood: "solemn",
      },
    ],
  },
  "family-funeral": {
    slug: "family-funeral",
    chapterId: "heart-and-manners",
    order: 9,
    requester: "은호",
    cause: "은호가 가족과 장례식장을 찾아 조용히 인사하고 슬퍼하는 가족 곁에 오래 머무르려 한다.",
    intro: [
      {
        id: "family-funeral-intro-1",
        speaker: "narrator",
        text: "이번 요청은 작은 목소리로 도착했고 은호는 가족과 함께 장례식장으로 갈 준비를 하고 있다.",
        visualKey: "funeral-message",
        mood: "solemn",
      },
      {
        id: "family-funeral-intro-2",
        speaker: "button",
        text: "결혼식에서 쓴 반짝이는 장식을 다시 꺼내면 안 될까?",
        mood: "solemn",
      },
      {
        id: "family-funeral-intro-3",
        speaker: "hari",
        text: "지금은 눈에 띄기보다 은호가 조용히 곁을 지키는 마음을 표현해야 해.",
        mood: "solemn",
      },
    ],
    successAftermath: [
      {
        id: "family-funeral-aftermath-1",
        speaker: "narrator",
        text: "은호는 조용히 인사를 드리고 슬퍼하는 가족 곁을 지켰다.",
        visualKey: "quiet-support",
        mood: "solemn",
      },
      {
        id: "family-funeral-aftermath-2",
        speaker: "requester",
        text: "말이 많지 않아도 위로와 존중의 마음이 잘 전해졌어.",
        mood: "calm",
      },
    ],
    retryLine: "은호는 아직 장례식장으로 출발하기 전이야. 가족과 공간의 안내에 맞는 차분함과 존중을 다시 살펴보자.",
    nextHook: [
      {
        id: "family-funeral-next-1",
        speaker: "narrator",
        text: "며칠 뒤 가족과 함께 있어 힘이 됐다는 답장과 함께 하린의 설날 복주머니 사진이 도착했다.",
        visualKey: "new-year-pouch",
        mood: "calm",
      },
    ],
  },
  "lunar-new-year-visit": {
    slug: "lunar-new-year-visit",
    chapterId: "heart-and-manners",
    order: 10,
    requester: "하린",
    cause: "하린이 할머니께 세배한 뒤 사촌들과 놀 예정이라 전통과 예의, 겨울 이동과 실내 활동을 함께 고려해야 한다.",
    intro: [
      {
        id: "lunar-new-year-visit-intro-1",
        speaker: "narrator",
        text: "한옥집 대문 너머로 가족들의 웃음소리가 들리고 하린은 세배를 준비하고 있다.",
        visualKey: "hanok-new-year",
        mood: "bright",
      },
      {
        id: "lunar-new-year-visit-intro-2",
        speaker: "hari",
        text: "하린이 단정하게 인사한 뒤 사촌들과 앉았다 일어나며 편하게 놀 수 있어야 해.",
        mood: "calm",
      },
      {
        id: "lunar-new-year-visit-intro-3",
        speaker: "captain",
        text: "한복과 단정한 일상복처럼 서로 다른 방법으로도 같은 존중을 표현할 수 있단다.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "lunar-new-year-visit-aftermath-1",
        speaker: "narrator",
        text: "하린은 정성껏 세배한 뒤 사촌들과 마당에서 즐겁게 놀았다.",
        visualKey: "new-year-bow",
        mood: "bright",
      },
      {
        id: "lunar-new-year-visit-aftermath-2",
        speaker: "requester",
        text: "할머니가 마음도 옷차림도 참 단정하다고 칭찬해 주셨어.",
        mood: "bright",
      },
    ],
    retryLine: "하린은 아직 할머니 댁에 들어가기 전이야. 세배의 예의와 가족 놀이의 편안함을 함께 찾아보자.",
    nextHook: [
      {
        id: "lunar-new-year-visit-next-1",
        speaker: "narrator",
        text: "그 순간 도윤이 액체 비커와 넓은 소매가 함께 찍힌 과학실 사진을 보냈다.",
        visualKey: "science-risk-photo",
        mood: "urgent",
      },
    ],
  },
  "science-lab-experiment": {
    slug: "science-lab-experiment",
    chapterId: "safety-call",
    order: 11,
    requester: "도윤",
    cause: "도윤의 반이 액체 실험을 하며 눈·피부·발을 보호하고 넓은 소매가 도구에 걸리지 않게 준비해야 한다.",
    intro: [
      {
        id: "science-lab-experiment-intro-1",
        speaker: "narrator",
        text: "실험대에는 색이 변하는 액체 병과 유리 도구가 놓여 있다.",
        visualKey: "science-lab-table",
        mood: "urgent",
      },
      {
        id: "science-lab-experiment-intro-2",
        speaker: "captain",
        text: "옷 이름을 먼저 찾지 말고 도윤의 어디가 다칠 수 있는지부터 생각해 볼까?",
        mood: "calm",
      },
      {
        id: "science-lab-experiment-intro-3",
        speaker: "hari",
        text: "보호할 부위를 찾은 뒤 보안경, 긴 옷, 막힌 신발, 정돈된 소매를 연결하자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "science-lab-experiment-aftermath-1",
        speaker: "narrator",
        text: "도윤은 액체를 안전하게 섞어 멋진 색 변화를 관찰했다.",
        visualKey: "successful-experiment",
        mood: "bright",
      },
      {
        id: "science-lab-experiment-aftermath-2",
        speaker: "requester",
        text: "선생님이 준비가 잘된 과학자는 실험도 침착하다고 칭찬해 주셨어!",
        mood: "bright",
      },
    ],
    retryLine: "도윤은 아직 실험을 시작하기 전이야. 눈과 피부, 발, 소매가 어떤 위험을 만날지 다시 살펴보자.",
    nextHook: [
      {
        id: "science-lab-experiment-next-1",
        speaker: "narrator",
        text: "색이 변하는 액체를 본 채원이 따뜻한 수프 사진을 보내 왔다.",
        visualKey: "soup-message",
        mood: "bright",
      },
    ],
  },
  "family-cooking": {
    slug: "family-cooking",
    chapterId: "safety-call",
    order: 12,
    requester: "채원",
    cause: "채원이 가족을 위해 수프를 만들며 불, 뜨거운 냄비, 젖은 바닥, 소매와 머리카락의 걸림 위험에 대비한다.",
    intro: [
      {
        id: "family-cooking-intro-1",
        speaker: "narrator",
        text: "주방에서는 냄비가 보글보글 끓고 씻은 채소의 물이 바닥에 떨어져 있다.",
        visualKey: "busy-kitchen",
        mood: "urgent",
      },
      {
        id: "family-cooking-intro-2",
        speaker: "hari",
        text: "과학실의 가리기, 정돈하기, 막힌 신발 원칙이 채원의 주방에서도 이어져.",
        mood: "calm",
      },
      {
        id: "family-cooking-intro-3",
        speaker: "captain",
        text: "이번에는 열 보호와 위생 단서까지 더해 보자.",
        mood: "calm",
      },
    ],
    successAftermath: [
      {
        id: "family-cooking-aftermath-1",
        speaker: "narrator",
        text: "채원은 수프를 흘리지 않고 식탁까지 안전하게 옮겼다.",
        visualKey: "soup-on-table",
        mood: "bright",
      },
      {
        id: "family-cooking-aftermath-2",
        speaker: "requester",
        text: "가족들이 맛있는 냄새만큼 든든한 준비에도 박수를 보내 줬어!",
        mood: "bright",
      },
    ],
    retryLine: "채원은 아직 요리를 시작하기 전이야. 불과 뜨거운 냄비, 젖은 바닥, 정돈할 부분을 다시 찾아보자.",
    nextHook: [
      {
        id: "family-cooking-next-1",
        speaker: "narrator",
        text: "태오가 기다리던 마지막 가상훈련실이 열리고 어두운 도시가 나타났다.",
        visualKey: "simulation-room",
        mood: "urgent",
      },
    ],
  },
  "zombie-city-escape": {
    slug: "zombie-city-escape",
    chapterId: "safety-call",
    order: 13,
    requester: "태오",
    cause: "태오가 실제 재난이 아닌 졸업용 가상훈련에서 어둠, 장애물, 빠른 이동, 신체 보호 조건을 한꺼번에 적용한다.",
    intro: [
      {
        id: "zombie-city-escape-intro-1",
        speaker: "narrator",
        text: "가상 도시 화면이 야간 모드로 바뀌고 장애물이 많은 길이 나타났다.",
        visualKey: "virtual-zombie-city",
        mood: "urgent",
      },
      {
        id: "zombie-city-escape-intro-2",
        speaker: "captain",
        text: "목표는 좀비와 싸우는 것이 아니라 태오가 안전지대까지 빠르고 안전하게 이동하도록 돕는 거야.",
        mood: "calm",
      },
      {
        id: "zombie-city-escape-intro-3",
        speaker: "hari",
        text: "이번에는 힌트 없이 우리가 T·P·O와 필요한 기능을 직접 연결해 보자.",
        mood: "bright",
      },
    ],
    successAftermath: [
      {
        id: "zombie-city-escape-aftermath-1",
        speaker: "narrator",
        text: "태오는 장애물을 피해 안전지대 문을 통과했다.",
        visualKey: "simulation-success",
        mood: "bright",
      },
      {
        id: "zombie-city-escape-aftermath-2",
        speaker: "requester",
        text: "화면 속 좀비들이 멈추고 훈련 성공이라는 글자가 나타났어!",
        mood: "bright",
      },
    ],
    retryLine: "태오는 아직 가상훈련 출발선에 있어. 활동성, 신체 보호, 접지력, 어둠 속 가시성을 차례로 다시 살펴보자.",
    nextHook: [
      {
        id: "zombie-city-escape-next-1",
        speaker: "narrator",
        text: "가상 도시의 불이 켜지자 지난 열세 번의 임무 기록과 네 개의 배지가 한 화면에 모였다.",
        visualKey: "all-mission-records",
        mood: "bright",
      },
    ],
  },
} as const satisfies Record<string, EpisodeNarrativeInput>;

const RAW_FINAL_ENDING = {
  title: "정식 TPO 구조대원",
  ending: [
    {
      id: "final-ending-1",
      speaker: "narrator",
      text: "마지막 안전 배지가 대원증에 끼워지자 지난 임무의 친구들이 영상 통화 화면에 차례로 나타났다.",
      visualKey: "friends-video-call",
      mood: "bright",
    },
    {
      id: "final-ending-2",
      speaker: "narrator",
      text: "민준은 운동화를, 예린은 눈 위의 S자 자국을, 다온은 꽃바구니를, 채원은 수프 그릇을 자랑했다.",
      visualKey: "friends-mementos",
      mood: "bright",
    },
    {
      id: "final-ending-3",
      speaker: "captain",
      text: "너희는 옷만 고른 게 아니야. 친구의 할 일과 몸, 마음을 먼저 살폈어.",
      mood: "calm",
    },
    {
      id: "final-ending-4",
      speaker: "captain",
      text: "이제 어디서든 스스로 이유를 찾는 정식 TPO 구조대원이야.",
      visualKey: "official-rescuer-card",
      mood: "bright",
    },
    {
      id: "final-ending-5",
      speaker: "button",
      text: "다음 상황에서는 우리가 무엇부터 살펴볼까?",
      visualKey: "compass-points-to-player",
      mood: "bright",
    },
  ],
  nextSeasonHook: [
    {
      id: "next-season-hook-1",
      speaker: "narrator",
      text: "본부에 새로운 메시지 알림이 도착했다. 발신자는 아직 가려져 있다.",
      visualKey: "mystery-message",
      mood: "bright",
    },
    {
      id: "next-season-hook-2",
      speaker: "requester",
      text: "새로운 계절, 새로운 TPO 요청이 도착했어요.",
      mood: "bright",
    },
  ],
} as const satisfies {
  title: string;
  ending: NarrativeBeatInput[];
  nextSeasonHook: NarrativeBeatInput[];
};

function completeBeat(beat: NarrativeBeatInput): NarrativeBeat {
  return {
    ...beat,
    visualKey: beat.visualKey ?? "dialogue",
    mood: beat.mood ?? "calm",
  };
}

export const NARRATIVE_CHAPTERS: Readonly<Record<string, ChapterNarrative>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(RAW_CHAPTER_NARRATIVES).map(([chapterId, chapter]) => [
        chapterId,
        {
          ...chapter,
          opening: chapter.opening.map(completeBeat),
          ending: chapter.ending.map(completeBeat),
          nextHook: chapter.nextHook.map(completeBeat),
        },
      ]),
    ),
  );

export const NARRATIVE_EPISODES: Readonly<Record<string, EpisodeNarrative>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(RAW_EPISODE_NARRATIVES).map(([slug, episode]) => [
        slug,
        {
          ...episode,
          intro: episode.intro.map(completeBeat),
          successAftermath: episode.successAftermath.map(completeBeat),
          nextHook: episode.nextHook.map(completeBeat),
        },
      ]),
    ),
  );

export const STORY_FINAL_ENDING: FinalNarrative = {
  ...RAW_FINAL_ENDING,
  ending: RAW_FINAL_ENDING.ending.map(completeBeat),
  nextSeasonHook: RAW_FINAL_ENDING.nextSeasonHook.map(completeBeat),
};

export const STORY_CHAPTER_NARRATIVES = NARRATIVE_CHAPTERS;
export const STORY_EPISODE_NARRATIVES = NARRATIVE_EPISODES;

export const STORY_NARRATIVE_CHAPTER_IDS = Object.freeze(
  Object.keys(STORY_CHAPTER_NARRATIVES),
);

export const STORY_NARRATIVE_EPISODE_SLUGS = Object.freeze(
  Object.values(STORY_EPISODE_NARRATIVES)
    .sort((left, right) => left.order - right.order)
    .map((episode) => episode.slug),
);

export function getChapterNarrative(
  chapterId: string,
): ChapterNarrative | undefined {
  return NARRATIVE_CHAPTERS[chapterId];
}

export function getEpisodeNarrative(
  slug: string,
): EpisodeNarrative | undefined {
  return NARRATIVE_EPISODES[slug];
}
