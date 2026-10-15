// 테크를 더할 때는 startup/PROGRESS.md의 보너스 키를 따른다.
const SAVE_KEY = "jusik-hoesa-v2";
const STAT_MAX = 20;
const XP_BASE = 28;

const FIRST_NAMES = ["민준", "서연", "하준", "지우", "도윤", "서준", "예은", "주원", "지민", "현우", "수아", "윤서", "채원", "건우", "다은"];
const LAST_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const ROLES = ["사원", "주임", "대리", "과장", "연구원", "디자이너", "마케터", "운영"];

const MILESTONES = [60, 160, 400, 1000, 2500, 6000, 15000, 40000, 100000, 250000, 600000, 1500000, 4000000, 10000000, 25000000, 60000000];

const SURGES = [
  { name: "계약 성사", key: "money", mult: 9, min: 14 },
  { name: "단골 주문", key: "money", mult: 6, min: 8 },
  { name: "바이럴", key: "money", mult: 12, min: 20 },
  { name: "실험 성공", key: "research", mult: 9, min: 3 },
  { name: "야간 실험", key: "research", mult: 6, min: 2 },
  { name: "해커톤", key: "research", mult: 12, min: 4 },
  { name: "팀 바이브", key: "culture", mult: 9, min: 3 },
  { name: "소개 릴레이", key: "culture", mult: 6, min: 2 },
  { name: "미디어 소개", key: "culture", mult: 12, min: 4 }
];

const RESEARCH_TECHS = [
  { id: "onboard", group: "자리 잡기", name: "온보딩 체크리스트", cost: 12, needs: [], effect: "연구 +15%", desc: "입사 첫날을 정리하면 실험이 빨라집니다.", bonus: { research: 1.15 } },
  { id: "wiki", group: "자리 잡기", name: "위키 문서화", cost: 40, needs: ["onboard"], effect: "연구 +20% · 교육비 −10%", desc: "아는 것을 적어두면 다시 찾지 않습니다.", bonus: { research: 1.2, train: 0.9 } },
  { id: "git", group: "자리 잡기", name: "버전 관리", cost: 48, needs: ["onboard"], effect: "매출 +12%", desc: "되돌릴 수 있으면 더 과감해집니다.", bonus: { money: 1.12 } },
  { id: "standup", group: "자리 잡기", name: "데일리 스탠드업", cost: 26, needs: ["onboard"], effect: "성장 +10% · 연구 +8%", desc: "아침 15분이 하루의 낭비를 줄입니다.", bonus: { xp: 1.1, research: 1.08 } },
  { id: "script", group: "실험", name: "자동화 스크립트", cost: 5040, needs: ["wiki", "git"], effect: "매출 +25%", desc: "반복 업무를 기계에게 넘깁니다.", bonus: { money: 1.25 } },
  { id: "abtest", group: "실험", name: "A/B 테스트", cost: 6480, needs: ["wiki"], effect: "문화 +15% · 연구 +10%", desc: "감이 아니라 수치로 고릅니다.", bonus: { culture: 1.15, research: 1.1 } },
  { id: "review", group: "실험", name: "코드 리뷰", cost: 3600, needs: ["git"], effect: "매출 +10% · 연구 +12%", desc: "다른 눈이 사고를 먼저 봅니다.", bonus: { money: 1.1, research: 1.12 } },
  { id: "retro", group: "실험", name: "스프린트 회고", cost: 3960, needs: ["wiki", "standup"], effect: "문화 +10% · 성장 +12%", desc: "지난 주를 말하면 다음 주가 달라집니다.", bonus: { culture: 1.1, xp: 1.12 } },
  { id: "pipeline", group: "시스템", name: "데이터 파이프라인", cost: 19800, needs: ["script"], effect: "연구 +35%", desc: "숫자가 제때 도착합니다.", bonus: { research: 1.35 } },
  { id: "designsys", group: "시스템", name: "디자인 시스템", cost: 18000, needs: ["abtest"], effect: "매출 +18%", desc: "버튼 하나가 어디든 같습니다.", bonus: { money: 1.18 } },
  { id: "ci", group: "시스템", name: "자동 배포", cost: 25200, needs: ["script", "review"], effect: "매출 +15% · 연구 +20%", desc: "올리자마자 나갑니다.", bonus: { money: 1.15, research: 1.2 } },
  { id: "ml", group: "제품", name: "머신러닝 PoC", cost: 81000, needs: ["abtest", "pipeline"], effect: "매출 +40%", desc: "작은 모델이 큰 시간을 법니다.", bonus: { money: 1.4 } },
  { id: "flags", group: "제품", name: "기능 플래그", cost: 68400, needs: ["designsys", "git"], effect: "매출 +22%", desc: "끄고 켤 수 있으면 겁이 줄어듭니다.", bonus: { money: 1.22 } },
  { id: "observe", group: "제품", name: "관측 대시보드", cost: 100800, needs: ["pipeline", "ci"], effect: "연구 +28%", desc: "고장이 숫자로 먼저 옵니다.", bonus: { research: 1.28 } },
  { id: "patent", group: "자산", name: "특허 출원", cost: 288000, needs: ["ml"], effect: "매출 +30% · 연구 +25%", desc: "쌓아 둔 실험이 자산이 됩니다.", bonus: { money: 1.3, research: 1.25 } },
  { id: "platform", group: "자산", name: "내부 플랫폼", cost: 396000, needs: ["ml", "observe"], effect: "연구 +32% · 매출 +18%", desc: "팀이 같은 레일 위를 달립니다.", bonus: { research: 1.32, money: 1.18 } },
  { id: "lab", group: "자산", name: "사내 연구소", cost: 648000, needs: ["patent", "platform"], effect: "연구 +45% · 매출 +20%", desc: "이번 달은 실험만 해도 됩니다.", bonus: { research: 1.45, money: 1.2 } },
  { id: "moat", group: "자산", name: "데이터 해자", cost: 756000, needs: ["patent", "flags"], effect: "매출 +50%", desc: "쌓인 기록이 경쟁의 벽이 됩니다.", bonus: { money: 1.5 } }
];

const CULTURE_TECHS = [
  { id: "coffee", group: "일상", name: "커피타임", cost: 10, needs: [], effect: "문화 +15% · 성장 +10%", desc: "잠깐의 대화가 팀을 붙입니다.", bonus: { culture: 1.15, xp: 1.1 } },
  { id: "snack", group: "일상", name: "간식 서랍", cost: 22, needs: ["coffee"], effect: "성장 +12% · 문화 +8%", desc: "당이 떨어지면 대화도 떨어집니다.", bonus: { xp: 1.12, culture: 1.08 } },
  { id: "oneonone", group: "일상", name: "1:1 미팅", cost: 36, needs: ["coffee"], effect: "정원 +1 · 성장 +15%", desc: "한 명씩 보면 막힌 곳이 보입니다.", bonus: { seats: 1, xp: 1.15 } },
  { id: "dinner", group: "일상", name: "팀 회식", cost: 48, needs: ["coffee"], effect: "문화 +22%", desc: "밥 한 끼가 분위기를 바꿉니다.", bonus: { culture: 1.22 } },
  { id: "kudos", group: "팀", name: "칭찬 피드", cost: 3240, needs: ["oneonone"], effect: "성장 +18% · 문화 +12%", desc: "잘한 일이 채널에 남습니다.", bonus: { xp: 1.18, culture: 1.12 } },
  { id: "club", group: "팀", name: "사내 동호회", cost: 5040, needs: ["oneonone", "dinner"], effect: "정원 +2 · 문화 +18%", desc: "일 밖에서도 이야기가 이어집니다.", bonus: { seats: 2, culture: 1.18 } },
  { id: "flex", group: "팀", name: "유연 근무", cost: 5760, needs: ["dinner", "snack"], effect: "문화 +16% · 매출 +8%", desc: "출근 시간이 흐려지면 집중이 선명해집니다.", bonus: { culture: 1.16, money: 1.08 } },
  { id: "brand", group: "팀", name: "브랜딩 가이드", cost: 7200, needs: ["dinner"], effect: "매출 +18%", desc: "말투와 색이 같아지면 신뢰가 생깁니다.", bonus: { money: 1.18 } },
  { id: "open", group: "공간", name: "오픈 스페이스", cost: 25200, needs: ["club"], effect: "정원 +2 · 성장 +20%", desc: "책상을 늘릴 자리가 생깁니다.", bonus: { seats: 2, xp: 1.2 } },
  { id: "mentor", group: "공간", name: "멘토링", cost: 19800, needs: ["kudos", "oneonone"], effect: "성장 +22% · 정원 +1", desc: "선배의 책상이 학교가 됩니다.", bonus: { xp: 1.22, seats: 1 } },
  { id: "offsite", group: "공간", name: "워크숍", cost: 34200, needs: ["club", "brand"], effect: "문화 +25% · 연구 +10%", desc: "사무실 밖에서 다음 분기가 나옵니다.", bonus: { culture: 1.25, research: 1.1 } },
  { id: "values", group: "정체성", name: "코어 밸류", cost: 81000, needs: ["brand", "open"], effect: "성장 +25% · 신규 스탯 +1", desc: "무엇을 지키는지 적어 둡니다.", bonus: { xp: 1.25, hire: 1 } },
  { id: "townhall", group: "정체성", name: "타운홀", cost: 111600, needs: ["values", "offsite"], effect: "문화 +20% · 정원 +1", desc: "숫자가 아니라 방향을 같이 봅니다.", bonus: { culture: 1.2, seats: 1 } },
  { id: "equity", group: "정체성", name: "스톡옵션", cost: 129600, needs: ["brand", "values"], effect: "매출 +25% · 성장 +15%", desc: "회사의 성장이 내 이야기가 됩니다.", bonus: { money: 1.25, xp: 1.15 } },
  { id: "unicorn", group: "정체성", name: "유니콘 문화", cost: 162000, needs: ["values"], effect: "매출·연구·문화 +20% · 정원 +3", desc: "사람이 모이고, 일이 커집니다.", bonus: { money: 1.2, research: 1.2, culture: 1.2, seats: 3 } },
  { id: "legend", group: "정체성", name: "레전드 팀", cost: 504000, needs: ["unicorn", "equity", "townhall"], effect: "매출·연구·문화 +25% · 성장 +20% · 정원 +2", desc: "사람이 사람을 데려옵니다.", bonus: { money: 1.25, research: 1.25, culture: 1.25, xp: 1.2, seats: 2 } }
];

const OFFICE_ITEMS = [
  { id: "printer", name: "프린터", cost: 90, effect: "매출 +4/초", desc: "출력물이 쌓이면 이상하게 일이 됩니다.", bonus: { moneyFlat: 4 } },
  { id: "coffee_machine", name: "커피머신", cost: 180, effect: "문화 +0.8/초 · 성장 +8%", desc: "원두 냄새가 오피스를 깨웁니다.", bonus: { cultureFlat: 0.8, xp: 1.08 } },
  { id: "whiteboard", name: "화이트보드", cost: 240, effect: "연구 +1.2/초", desc: "아이디어는 지워도 남습니다.", bonus: { researchFlat: 1.2 } },
  { id: "dual_monitor", name: "듀얼 모니터", cost: 9360, effect: "매출 +12%", desc: "창을 두 개 띄우면 능률이 붙습니다.", bonus: { money: 1.12 } },
  { id: "standing", name: "스탠딩 데스크", cost: 14040, effect: "성장 +15%", desc: "일어서서 일하면 오후가 덜 무겁습니다.", bonus: { xp: 1.15 } },
  { id: "neon", name: "네온 사인", cost: 19800, effect: "문화 +12%", desc: "간판이 켜지면 야근이 조금 멋있어집니다.", bonus: { culture: 1.12 } },
  { id: "mfp", name: "복합기", cost: 43200, effect: "매출 +8/초 · 문화 +1/초", desc: "스캔·팩스·고장의 삼위일체.", bonus: { moneyFlat: 8, cultureFlat: 1 } },
  { id: "pinball", name: "핀볼", cost: 57600, effect: "성장 +10% · 성과가 더 자주", desc: "구슬이 굴러가면 사무실이 잠깐 시끄럽습니다.", bonus: { xp: 1.1, surge: 0.8 } },
  { id: "meeting", name: "회의실", cost: 144000, effect: "문화 +20% · 정원 +1", desc: "문을 닫으면 결정이 납니다.", bonus: { culture: 1.2, seats: 1 } },
  { id: "terrace", name: "옥상 테라스", cost: 216000, effect: "정원 +1 · 문화 +15% · 성장 +10%", desc: "바람 부는 쪽이 회의보다 빠릅니다.", bonus: { seats: 1, culture: 1.15, xp: 1.1 } },
  { id: "server", name: "서버 랙", cost: 324000, effect: "연구 +25% · 매출 +15%", desc: "팬 소리가 성장 배경음입니다.", bonus: { research: 1.25, money: 1.15 } }
];

const TRAIN = {
  efficiency: { label: "업무 코칭", key: "efficiency" },
  research: { label: "스터디 지원", key: "research" },
  communication: { label: "스피치 클래스", key: "communication" }
};

const RES_LABEL = { money: "매출", research: "연구", culture: "문화" };
