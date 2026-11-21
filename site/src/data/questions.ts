export type QuestionType =
  | 'choice3'
  | 'choice4'
  | 'choice5'
  | 'multi'
  | 'short'
  | 'calc'
  | 'descriptive'
  | 'reading'
  | 'code'
  | 'ox'

export interface QuestionOption {
  label: string
  text: string
}

export interface Question {
  id: number
  subject: string
  topic: string
  type: QuestionType
  difficulty: number
  prompt: string
  passage: string
  code: string
  hint: string
  options: QuestionOption[]
}

export const subjects = ["국어", "영어", "수학", "과학", "사회", "역사", "IT·코딩", "논리·추리", "상식·시사", "기타", "컴퓨터공학", "전자공학", "기계공학", "화학공학", "경영학", "경제학", "법학", "심리학", "의학·간호", "건축·토목", "수능"] as const

export const topicsBySubject: Record<string, readonly string[]> = {"국어": ["어휘·한자", "문법", "독해"], "영어": ["어휘", "문법", "독해"], "수학": ["대수", "기하", "확률·통계"], "과학": ["물리", "화학", "생물·지구과학"], "사회": ["경제", "법·정치", "지리"], "역사": ["한국사", "세계사"], "IT·코딩": ["프로그래밍", "자료구조·알고리즘", "네트워크·보안"], "논리·추리": ["명제", "수열·추리"], "상식·시사": ["일반상식", "시사"], "기타": ["예술", "한자"], "컴퓨터공학": ["운영체제", "데이터베이스"], "전자공학": ["회로이론", "신호처리"], "기계공학": ["열역학", "재료역학"], "화학공학": ["반응공학", "공정열역학"], "경영학": ["재무관리", "마케팅"], "경제학": ["미시경제", "거시경제"], "법학": ["민법", "형법"], "심리학": ["인지심리", "연구방법"], "의학·간호": ["생리학", "약리학"], "건축·토목": ["구조역학", "건축계획"], "수능": ["국어", "수학", "영어", "한국사", "사회탐구", "과학탐구"]} as const

export const questions: Question[] = [
  {
    "id": 1,
    "subject": "국어",
    "topic": "어휘·한자",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "다음 중 띄어쓰기가 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "할수있다"
      },
      {
        "label": "B",
        "text": "할 수 있다"
      },
      {
        "label": "C",
        "text": "할수 있다"
      },
      {
        "label": "D",
        "text": "할 수있다"
      },
      {
        "label": "E",
        "text": "할수있 다"
      }
    ]
  },
  {
    "id": 2,
    "subject": "국어",
    "topic": "어휘·한자",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "다음 중 ‘환하다’와 가장 가까운 뜻의 단어는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "어둡다"
      },
      {
        "label": "B",
        "text": "밝다"
      },
      {
        "label": "C",
        "text": "차갑다"
      },
      {
        "label": "D",
        "text": "무겁다"
      }
    ]
  },
  {
    "id": 3,
    "subject": "국어",
    "topic": "어휘·한자",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "‘새옹지마(塞翁之馬)’의 뜻으로 가장 알맞은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "좋은 일 뒤에는 반드시 나쁜 일이 온다"
      },
      {
        "label": "B",
        "text": "인생의 길흉화복은 예측하기 어렵다"
      },
      {
        "label": "C",
        "text": "말은 사람에게 해를 끼친다"
      },
      {
        "label": "D",
        "text": "이웃과 사이좋게 지내야 한다"
      },
      {
        "label": "E",
        "text": "노력하면 반드시 성공한다"
      }
    ]
  },
  {
    "id": 4,
    "subject": "국어",
    "topic": "어휘·한자",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "‘역지사지(易地思之)’의 뜻을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 5,
    "subject": "국어",
    "topic": "문법",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "다음 중 품사가 나머지와 다른 하나는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "달리다"
      },
      {
        "label": "B",
        "text": "빠르다"
      },
      {
        "label": "C",
        "text": "예쁘다"
      },
      {
        "label": "D",
        "text": "높다"
      },
      {
        "label": "E",
        "text": "맑다"
      }
    ]
  },
  {
    "id": 6,
    "subject": "국어",
    "topic": "문법",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "‘먹었다’의 구성으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "어간 + 어미"
      },
      {
        "label": "B",
        "text": "어간 + 선어말어미 + 어미"
      },
      {
        "label": "C",
        "text": "접두사 + 어근"
      },
      {
        "label": "D",
        "text": "어근 + 접미사"
      }
    ]
  },
  {
    "id": 7,
    "subject": "국어",
    "topic": "문법",
    "type": "short",
    "difficulty": 3,
    "prompt": "문장 ‘비가 와서 길이 젖었다.’에서 ‘와서’가 나타내는 문법 기능은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 8,
    "subject": "국어",
    "topic": "문법",
    "type": "multi",
    "difficulty": 4,
    "prompt": "다음 중 높임 표현이 바르게 쓰인 것을 모두 고르시오.",
    "passage": "",
    "code": "",
    "hint": "복수 선택 (2개)",
    "options": [
      {
        "label": "A",
        "text": "할아버지께서 진지를 드신다."
      },
      {
        "label": "B",
        "text": "할아버지가 밥을 먹는다."
      },
      {
        "label": "C",
        "text": "선생님께서 오셨다."
      },
      {
        "label": "D",
        "text": "선생님이 왔다."
      },
      {
        "label": "E",
        "text": "부모님께 말했다."
      }
    ]
  },
  {
    "id": 9,
    "subject": "국어",
    "topic": "독해",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "다음 글의 중심 내용으로 가장 알맞은 것은?",
    "passage": "공유지의 비극이란 여러 사람이 공동으로 쓰는 자원을 각자 이익을 위해 과도하게 사용해 결국 모두가 피해를 보는 현상을 말한다. 개인은 자원을 아껴 쓸 유인이 적고, 비용은 공동체가 나누어 부담하기 때문이다. 이를 해결하려면 사용 규칙을 정하고 감시와 처벌을 마련하거나, 자원을 사유화하거나, 공동체가 직접 관리하는 방식이 쓰인다.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "공유 자원은 항상 사유화해야 한다"
      },
      {
        "label": "B",
        "text": "공유 자원의 과도한 사용 문제와 해결 방안"
      },
      {
        "label": "C",
        "text": "개인의 이익 추구는 항상 억제해야 한다"
      },
      {
        "label": "D",
        "text": "감시와 처벌은 비효율적이다"
      },
      {
        "label": "E",
        "text": "공동체 관리는 실패한다"
      }
    ]
  },
  {
    "id": 10,
    "subject": "국어",
    "topic": "독해",
    "type": "reading",
    "difficulty": 3,
    "prompt": "글에서 ‘이를’이 가리키는 것은?",
    "passage": "공유지의 비극이란 여러 사람이 공동으로 쓰는 자원을 각자 이익을 위해 과도하게 사용해 결국 모두가 피해를 보는 현상을 말한다. 개인은 자원을 아껴 쓸 유인이 적고, 비용은 공동체가 나누어 부담하기 때문이다. 이를 해결하려면 사용 규칙을 정하고 감시와 처벌을 마련하거나, 자원을 사유화하거나, 공동체가 직접 관리하는 방식이 쓰인다.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "공유지의 비극"
      },
      {
        "label": "B",
        "text": "개인의 이익"
      },
      {
        "label": "C",
        "text": "자원의 사유화"
      },
      {
        "label": "D",
        "text": "감시와 처벌"
      },
      {
        "label": "E",
        "text": "공동체 관리"
      }
    ]
  },
  {
    "id": 11,
    "subject": "국어",
    "topic": "독해",
    "type": "short",
    "difficulty": 4,
    "prompt": "글에서 제시한 해결 방식 중 ‘자원을 개인에게 나누어 주는 것’을 가리키는 말은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 12,
    "subject": "국어",
    "topic": "독해",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "공유지의 비극이 발생하는 이유를 글에 근거해 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 13,
    "subject": "영어",
    "topic": "어휘",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "Choose the word closest in meaning to “rapid”.",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "slow"
      },
      {
        "label": "B",
        "text": "quick"
      },
      {
        "label": "C",
        "text": "late"
      },
      {
        "label": "D",
        "text": "heavy"
      },
      {
        "label": "E",
        "text": "weak"
      }
    ]
  },
  {
    "id": 14,
    "subject": "영어",
    "topic": "어휘",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "Choose the antonym of “scarce”.",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "rare"
      },
      {
        "label": "B",
        "text": "plentiful"
      },
      {
        "label": "C",
        "text": "tiny"
      },
      {
        "label": "D",
        "text": "brief"
      }
    ]
  },
  {
    "id": 15,
    "subject": "영어",
    "topic": "어휘",
    "type": "short",
    "difficulty": 3,
    "prompt": "Fill in the blank with one word: The theory was widely accepted because it was supported by ___ evidence.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 16,
    "subject": "영어",
    "topic": "어휘",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "Explain the difference between “affect” and “effect”.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 17,
    "subject": "영어",
    "topic": "문법",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "Choose the correct sentence.",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "She go to school."
      },
      {
        "label": "B",
        "text": "She goes to school."
      },
      {
        "label": "C",
        "text": "She going school."
      },
      {
        "label": "D",
        "text": "She gone school."
      },
      {
        "label": "E",
        "text": "She go school."
      }
    ]
  },
  {
    "id": 18,
    "subject": "영어",
    "topic": "문법",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "Choose the correct preposition: I am interested ___ biology.",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "on"
      },
      {
        "label": "B",
        "text": "in"
      },
      {
        "label": "C",
        "text": "at"
      },
      {
        "label": "D",
        "text": "for"
      }
    ]
  },
  {
    "id": 19,
    "subject": "영어",
    "topic": "문법",
    "type": "short",
    "difficulty": 3,
    "prompt": "Fill in the blank with the correct form: If I ___ (be) you, I would apologize.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 20,
    "subject": "영어",
    "topic": "문법",
    "type": "multi",
    "difficulty": 4,
    "prompt": "Choose all grammatically correct sentences.",
    "passage": "",
    "code": "",
    "hint": "복수 선택 (2개)",
    "options": [
      {
        "label": "A",
        "text": "She has lived here for ten years."
      },
      {
        "label": "B",
        "text": "She have lived here for ten years."
      },
      {
        "label": "C",
        "text": "Each of the students has a book."
      },
      {
        "label": "D",
        "text": "Each of the students have a book."
      },
      {
        "label": "E",
        "text": "The news are bad."
      }
    ]
  },
  {
    "id": 21,
    "subject": "영어",
    "topic": "독해",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "What is the main idea of the passage?",
    "passage": "Many students believe that studying longer always leads to better results. However, research on memory shows that spaced repetition—reviewing material at increasing intervals—produces stronger long-term retention than cramming the night before an exam. Sleep also matters: the brain consolidates new memories during sleep, so pulling an all-nighter can reduce recall.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "Long study hours guarantee success"
      },
      {
        "label": "B",
        "text": "Spaced repetition and sleep improve retention"
      },
      {
        "label": "C",
        "text": "Cramming is the best method"
      },
      {
        "label": "D",
        "text": "Sleep has no effect on memory"
      },
      {
        "label": "E",
        "text": "Exams should be shorter"
      }
    ]
  },
  {
    "id": 22,
    "subject": "영어",
    "topic": "독해",
    "type": "reading",
    "difficulty": 3,
    "prompt": "According to the passage, what happens during sleep?",
    "passage": "Many students believe that studying longer always leads to better results. However, research on memory shows that spaced repetition—reviewing material at increasing intervals—produces stronger long-term retention than cramming the night before an exam. Sleep also matters: the brain consolidates new memories during sleep, so pulling an all-nighter can reduce recall.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "Memories are consolidated"
      },
      {
        "label": "B",
        "text": "Material is forgotten"
      },
      {
        "label": "C",
        "text": "Cramming becomes easier"
      },
      {
        "label": "D",
        "text": "Study time increases"
      },
      {
        "label": "E",
        "text": "Recall is reduced"
      }
    ]
  },
  {
    "id": 23,
    "subject": "영어",
    "topic": "독해",
    "type": "short",
    "difficulty": 4,
    "prompt": "What is the term for reviewing material at increasing intervals?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 24,
    "subject": "영어",
    "topic": "독해",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "Why can an all-nighter reduce recall, according to the passage?",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 25,
    "subject": "수학",
    "topic": "대수",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "x + 3 = 7일 때 x는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "3"
      },
      {
        "label": "B",
        "text": "4"
      },
      {
        "label": "C",
        "text": "5"
      },
      {
        "label": "D",
        "text": "10"
      },
      {
        "label": "E",
        "text": "21"
      }
    ]
  },
  {
    "id": 26,
    "subject": "수학",
    "topic": "대수",
    "type": "calc",
    "difficulty": 2,
    "prompt": "2^5 + 3^2 = ?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 27,
    "subject": "수학",
    "topic": "대수",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "다음 중 일차방정식인 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "x^2 = 1"
      },
      {
        "label": "B",
        "text": "2x + 1 = 5"
      },
      {
        "label": "C",
        "text": "1/x = 2"
      },
      {
        "label": "D",
        "text": "x^3 = 8"
      }
    ]
  },
  {
    "id": 28,
    "subject": "수학",
    "topic": "대수",
    "type": "short",
    "difficulty": 3,
    "prompt": "다항식 (x+2)(x-2)를 전개하면?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 29,
    "subject": "수학",
    "topic": "대수",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "방정식 x^2 - 5x + 6 = 0의 두 근의 합은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "2"
      },
      {
        "label": "B",
        "text": "3"
      },
      {
        "label": "C",
        "text": "5"
      },
      {
        "label": "D",
        "text": "6"
      },
      {
        "label": "E",
        "text": "-5"
      }
    ]
  },
  {
    "id": 30,
    "subject": "수학",
    "topic": "기하",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "삼각형 내각의 합은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "90°"
      },
      {
        "label": "B",
        "text": "120°"
      },
      {
        "label": "C",
        "text": "180°"
      },
      {
        "label": "D",
        "text": "270°"
      },
      {
        "label": "E",
        "text": "360°"
      }
    ]
  },
  {
    "id": 31,
    "subject": "수학",
    "topic": "기하",
    "type": "calc",
    "difficulty": 2,
    "prompt": "반지름이 3인 원의 넓이는? (π를 사용해 쓰시오)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 32,
    "subject": "수학",
    "topic": "기하",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "직각삼각형에서 빗변의 제곱은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "두 변의 합"
      },
      {
        "label": "B",
        "text": "두 변의 곱"
      },
      {
        "label": "C",
        "text": "다른 두 변의 제곱의 합"
      },
      {
        "label": "D",
        "text": "넓이의 두 배"
      }
    ]
  },
  {
    "id": 33,
    "subject": "수학",
    "topic": "기하",
    "type": "short",
    "difficulty": 4,
    "prompt": "한 변의 길이가 6인 정사각형의 대각선 길이는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 34,
    "subject": "수학",
    "topic": "기하",
    "type": "calc",
    "difficulty": 4,
    "prompt": "원의 둘레가 10π일 때 반지름은?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 35,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "주사위 한 개를 던질 때 3이 나올 확률은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "1/2"
      },
      {
        "label": "B",
        "text": "1/3"
      },
      {
        "label": "C",
        "text": "1/6"
      },
      {
        "label": "D",
        "text": "1/12"
      },
      {
        "label": "E",
        "text": "3/6"
      }
    ]
  },
  {
    "id": 36,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "calc",
    "difficulty": 2,
    "prompt": "1부터 10까지 자연수의 평균은?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 37,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "다음 중 중앙값이 3인 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "1, 2, 3"
      },
      {
        "label": "B",
        "text": "1, 2, 100"
      },
      {
        "label": "C",
        "text": "2, 2, 2"
      },
      {
        "label": "D",
        "text": "1, 3, 3"
      }
    ]
  },
  {
    "id": 38,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "short",
    "difficulty": 3,
    "prompt": "5명 중 2명을 뽑는 경우의 수는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 39,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "calc",
    "difficulty": 4,
    "prompt": "공정한 동전을 3번 던져 모두 앞면이 나올 확률은? (분수)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 40,
    "subject": "수학",
    "topic": "확률·통계",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "표준정규분포의 평균과 표준편차는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "0, 0"
      },
      {
        "label": "B",
        "text": "0, 1"
      },
      {
        "label": "C",
        "text": "1, 0"
      },
      {
        "label": "D",
        "text": "1, 1"
      },
      {
        "label": "E",
        "text": "2, 1"
      }
    ]
  },
  {
    "id": 41,
    "subject": "과학",
    "topic": "물리",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "힘의 단위는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "J"
      },
      {
        "label": "B",
        "text": "N"
      },
      {
        "label": "C",
        "text": "W"
      },
      {
        "label": "D",
        "text": "Pa"
      },
      {
        "label": "E",
        "text": "kg"
      }
    ]
  },
  {
    "id": 42,
    "subject": "과학",
    "topic": "물리",
    "type": "calc",
    "difficulty": 2,
    "prompt": "질량 2kg인 물체에 3m/s²의 가속도가 생길 때 힘은? (단위 N)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 43,
    "subject": "과학",
    "topic": "물리",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "빛의 속도에 가장 가까운 값은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "3×10^5 km/s"
      },
      {
        "label": "B",
        "text": "3×10^5 m/s"
      },
      {
        "label": "C",
        "text": "3×10^8 km/s"
      },
      {
        "label": "D",
        "text": "3×10^3 m/s"
      }
    ]
  },
  {
    "id": 44,
    "subject": "과학",
    "topic": "물리",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "뉴턴의 제3법칙(작용·반작용)을 설명하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 45,
    "subject": "과학",
    "topic": "화학",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "물의 화학식은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "CO2"
      },
      {
        "label": "B",
        "text": "H2O"
      },
      {
        "label": "C",
        "text": "O2"
      },
      {
        "label": "D",
        "text": "NaCl"
      },
      {
        "label": "E",
        "text": "CH4"
      }
    ]
  },
  {
    "id": 46,
    "subject": "과학",
    "topic": "화학",
    "type": "calc",
    "difficulty": 2,
    "prompt": "H2O 1몰의 질량은? (H=1, O=16)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 47,
    "subject": "과학",
    "topic": "화학",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "산성 용액의 pH 범위는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "0~6"
      },
      {
        "label": "B",
        "text": "7"
      },
      {
        "label": "C",
        "text": "8~14"
      },
      {
        "label": "D",
        "text": "14 이상"
      }
    ]
  },
  {
    "id": 48,
    "subject": "과학",
    "topic": "화학",
    "type": "short",
    "difficulty": 4,
    "prompt": "원자번호 6번 원소의 기호는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 49,
    "subject": "과학",
    "topic": "생물·지구과학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "세포에서 에너지를 생산하는 소기관은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "리보솜"
      },
      {
        "label": "B",
        "text": "미토콘드리아"
      },
      {
        "label": "C",
        "text": "골지체"
      },
      {
        "label": "D",
        "text": "핵"
      },
      {
        "label": "E",
        "text": "액포"
      }
    ]
  },
  {
    "id": 50,
    "subject": "과학",
    "topic": "생물·지구과학",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "지구 대기에서 가장 많은 비율을 차지하는 기체는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "산소"
      },
      {
        "label": "B",
        "text": "이산화탄소"
      },
      {
        "label": "C",
        "text": "질소"
      },
      {
        "label": "D",
        "text": "아르곤"
      }
    ]
  },
  {
    "id": 51,
    "subject": "과학",
    "topic": "생물·지구과학",
    "type": "short",
    "difficulty": 4,
    "prompt": "DNA를 구성하는 4가지 염기 중 아데닌(A)과 짝을 이루는 염기는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 52,
    "subject": "과학",
    "topic": "생물·지구과학",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "광합성의 기본 과정을 간단히 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 53,
    "subject": "사회",
    "topic": "경제",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "경제학에서 ‘희소성’의 의미로 가장 알맞은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "자원이 무한하다"
      },
      {
        "label": "B",
        "text": "자원이 욕구에 비해 부족하다"
      },
      {
        "label": "C",
        "text": "가격이 계속 오른다"
      },
      {
        "label": "D",
        "text": "소비자가 돈이 없다"
      },
      {
        "label": "E",
        "text": "수요가 없다"
      }
    ]
  },
  {
    "id": 54,
    "subject": "사회",
    "topic": "경제",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "수요가 증가할 때 일반적으로 가격은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "하락한다"
      },
      {
        "label": "B",
        "text": "상승한다"
      },
      {
        "label": "C",
        "text": "변하지 않는다"
      },
      {
        "label": "D",
        "text": "0이 된다"
      }
    ]
  },
  {
    "id": 55,
    "subject": "사회",
    "topic": "경제",
    "type": "short",
    "difficulty": 3,
    "prompt": "GDP의 우리말은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 56,
    "subject": "사회",
    "topic": "경제",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "인플레이션이 소비자에게 미치는 영향을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 57,
    "subject": "사회",
    "topic": "법·정치",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "대한민국 헌법상 국민의 의무가 아닌 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "교육의 의무"
      },
      {
        "label": "B",
        "text": "근로의 의무"
      },
      {
        "label": "C",
        "text": "납세의 의무"
      },
      {
        "label": "D",
        "text": "국방의 의무"
      },
      {
        "label": "E",
        "text": "투표의 의무"
      }
    ]
  },
  {
    "id": 58,
    "subject": "사회",
    "topic": "법·정치",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "민법상 성년의 기준 나이는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "18세"
      },
      {
        "label": "B",
        "text": "19세"
      },
      {
        "label": "C",
        "text": "20세"
      },
      {
        "label": "D",
        "text": "21세"
      }
    ]
  },
  {
    "id": 59,
    "subject": "사회",
    "topic": "법·정치",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "권력분립 원리의 목적을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 60,
    "subject": "사회",
    "topic": "지리",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "우리나라에서 가장 긴 강은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "한강"
      },
      {
        "label": "B",
        "text": "낙동강"
      },
      {
        "label": "C",
        "text": "금강"
      },
      {
        "label": "D",
        "text": "영산강"
      },
      {
        "label": "E",
        "text": "대동강"
      }
    ]
  },
  {
    "id": 61,
    "subject": "사회",
    "topic": "지리",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "다음 중 고위도 지역에서 나타나는 기후는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "열대우림"
      },
      {
        "label": "B",
        "text": "사막"
      },
      {
        "label": "C",
        "text": "툰드라"
      },
      {
        "label": "D",
        "text": "지중해성"
      }
    ]
  },
  {
    "id": 62,
    "subject": "사회",
    "topic": "지리",
    "type": "short",
    "difficulty": 4,
    "prompt": "지구의 자전 주기는 약 몇 시간인가?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 63,
    "subject": "역사",
    "topic": "한국사",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "훈민정음을 창제한 왕은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "태조"
      },
      {
        "label": "B",
        "text": "세종"
      },
      {
        "label": "C",
        "text": "정조"
      },
      {
        "label": "D",
        "text": "영조"
      },
      {
        "label": "E",
        "text": "광개토대왕"
      }
    ]
  },
  {
    "id": 64,
    "subject": "역사",
    "topic": "한국사",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "임진왜란 때 수군을 이끈 장군은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "강감찬"
      },
      {
        "label": "B",
        "text": "이순신"
      },
      {
        "label": "C",
        "text": "을지문덕"
      },
      {
        "label": "D",
        "text": "김유신"
      }
    ]
  },
  {
    "id": 65,
    "subject": "역사",
    "topic": "한국사",
    "type": "short",
    "difficulty": 3,
    "prompt": "고려를 건국한 인물은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 66,
    "subject": "역사",
    "topic": "한국사",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "대한민국 임시정부가 수립된 해는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "1910"
      },
      {
        "label": "B",
        "text": "1919"
      },
      {
        "label": "C",
        "text": "1945"
      },
      {
        "label": "D",
        "text": "1948"
      },
      {
        "label": "E",
        "text": "1950"
      }
    ]
  },
  {
    "id": 67,
    "subject": "역사",
    "topic": "한국사",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "조선 후기 실학의 특징을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 68,
    "subject": "역사",
    "topic": "세계사",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "프랑스 혁명이 시작된 해는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "1776"
      },
      {
        "label": "B",
        "text": "1789"
      },
      {
        "label": "C",
        "text": "1815"
      },
      {
        "label": "D",
        "text": "1848"
      },
      {
        "label": "E",
        "text": "1914"
      }
    ]
  },
  {
    "id": 69,
    "subject": "역사",
    "topic": "세계사",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "산업혁명이 가장 먼저 시작된 나라는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "프랑스"
      },
      {
        "label": "B",
        "text": "독일"
      },
      {
        "label": "C",
        "text": "영국"
      },
      {
        "label": "D",
        "text": "미국"
      }
    ]
  },
  {
    "id": 70,
    "subject": "역사",
    "topic": "세계사",
    "type": "short",
    "difficulty": 4,
    "prompt": "제1차 세계대전이 끝난 해는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 71,
    "subject": "역사",
    "topic": "세계사",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "마그나 카르타가 체결된 나라는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "프랑스"
      },
      {
        "label": "B",
        "text": "영국"
      },
      {
        "label": "C",
        "text": "독일"
      },
      {
        "label": "D",
        "text": "스페인"
      },
      {
        "label": "E",
        "text": "이탈리아"
      }
    ]
  },
  {
    "id": 72,
    "subject": "역사",
    "topic": "세계사",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "르네상스의 의미를 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 73,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "다음 중 변수 선언 없이 값을 바로 사용하는 언어는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "C"
      },
      {
        "label": "B",
        "text": "Java"
      },
      {
        "label": "C",
        "text": "Python"
      },
      {
        "label": "D",
        "text": "Rust"
      },
      {
        "label": "E",
        "text": "Go"
      }
    ]
  },
  {
    "id": 74,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "calc",
    "difficulty": 2,
    "prompt": "다음 코드의 출력은?",
    "passage": "",
    "code": "print(2 + 3 * 4)",
    "hint": "계산",
    "options": []
  },
  {
    "id": 75,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "다음 중 컴파일 언어는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "Python"
      },
      {
        "label": "B",
        "text": "JavaScript"
      },
      {
        "label": "C",
        "text": "C"
      },
      {
        "label": "D",
        "text": "Ruby"
      }
    ]
  },
  {
    "id": 76,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "short",
    "difficulty": 3,
    "prompt": "Python에서 리스트의 길이를 구하는 내장 함수는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 77,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "code",
    "difficulty": 4,
    "prompt": "다음 코드의 출력은?",
    "passage": "",
    "code": "print([1, 2, 3][::-1])",
    "hint": "코드 출력",
    "options": []
  },
  {
    "id": 78,
    "subject": "IT·코딩",
    "topic": "프로그래밍",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "재귀 함수의 장단점을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 79,
    "subject": "IT·코딩",
    "topic": "자료구조·알고리즘",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "스택의 특징은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "FIFO"
      },
      {
        "label": "B",
        "text": "LIFO"
      },
      {
        "label": "C",
        "text": "랜덤 접근만 가능"
      },
      {
        "label": "D",
        "text": "항상 정렬 상태"
      },
      {
        "label": "E",
        "text": "해시 기반"
      }
    ]
  },
  {
    "id": 80,
    "subject": "IT·코딩",
    "topic": "자료구조·알고리즘",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "정렬된 배열에서 이진 탐색의 평균 시간 복잡도는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "O(n)"
      },
      {
        "label": "B",
        "text": "O(log n)"
      },
      {
        "label": "C",
        "text": "O(n log n)"
      },
      {
        "label": "D",
        "text": "O(1)"
      }
    ]
  },
  {
    "id": 81,
    "subject": "IT·코딩",
    "topic": "자료구조·알고리즘",
    "type": "short",
    "difficulty": 4,
    "prompt": "큐에서 먼저 들어온 것이 먼저 나가는 규칙을 영문 약자로 쓰시오.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 82,
    "subject": "IT·코딩",
    "topic": "자료구조·알고리즘",
    "type": "calc",
    "difficulty": 4,
    "prompt": "정렬된 배열 8개에서 이진 탐색으로 찾을 때 최대 비교 횟수는?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 83,
    "subject": "IT·코딩",
    "topic": "네트워크·보안",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "HTTPS의 기본 포트 번호는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "21"
      },
      {
        "label": "B",
        "text": "80"
      },
      {
        "label": "C",
        "text": "443"
      },
      {
        "label": "D",
        "text": "22"
      },
      {
        "label": "E",
        "text": "25"
      }
    ]
  },
  {
    "id": 84,
    "subject": "IT·코딩",
    "topic": "네트워크·보안",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "다음 중 대칭키 암호 방식은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "RSA"
      },
      {
        "label": "B",
        "text": "AES"
      },
      {
        "label": "C",
        "text": "ECC"
      },
      {
        "label": "D",
        "text": "Diffie-Hellman"
      }
    ]
  },
  {
    "id": 85,
    "subject": "IT·코딩",
    "topic": "네트워크·보안",
    "type": "short",
    "difficulty": 4,
    "prompt": "IP 주소를 도메인 이름으로 바꾸는 시스템을 영문 약자로 쓰시오.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 86,
    "subject": "IT·코딩",
    "topic": "네트워크·보안",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "SQL 인젝션을 막는 기본 방법을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 87,
    "subject": "논리·추리",
    "topic": "명제",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "‘모든 사람은 죽는다. 소크라테스는 사람이다.’에서 따라나는 결론은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "소크라테스는 죽는다"
      },
      {
        "label": "B",
        "text": "소크라테스는 사람이 아니다"
      },
      {
        "label": "C",
        "text": "모든 사람은 소크라테스다"
      },
      {
        "label": "D",
        "text": "아무도 죽지 않는다"
      },
      {
        "label": "E",
        "text": "소크라테스는 신이다"
      }
    ]
  },
  {
    "id": 88,
    "subject": "논리·추리",
    "topic": "명제",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "명제 ‘p이면 q’의 대우는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "q이면 p"
      },
      {
        "label": "B",
        "text": "not q이면 not p"
      },
      {
        "label": "C",
        "text": "not p이면 not q"
      },
      {
        "label": "D",
        "text": "p 그리고 q"
      }
    ]
  },
  {
    "id": 89,
    "subject": "논리·추리",
    "topic": "명제",
    "type": "short",
    "difficulty": 3,
    "prompt": "‘p 또는 q’가 거짓일 때 p와 q의 진리값은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 90,
    "subject": "논리·추리",
    "topic": "명제",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "명제 ‘p → q’가 거짓이 되는 경우는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "p 참, q 참"
      },
      {
        "label": "B",
        "text": "p 참, q 거짓"
      },
      {
        "label": "C",
        "text": "p 거짓, q 참"
      },
      {
        "label": "D",
        "text": "p 거짓, q 거짓"
      },
      {
        "label": "E",
        "text": "항상 참"
      }
    ]
  },
  {
    "id": 91,
    "subject": "논리·추리",
    "topic": "명제",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "귀납 추론과 연역 추론의 차이를 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 92,
    "subject": "논리·추리",
    "topic": "수열·추리",
    "type": "calc",
    "difficulty": 2,
    "prompt": "2, 4, 8, 16, ? 다음 수는?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 93,
    "subject": "논리·추리",
    "topic": "수열·추리",
    "type": "short",
    "difficulty": 3,
    "prompt": "1, 4, 9, 16, ? 다음 수는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 94,
    "subject": "논리·추리",
    "topic": "수열·추리",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "3, 7, 15, 31, ? 다음 수는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "47"
      },
      {
        "label": "B",
        "text": "55"
      },
      {
        "label": "C",
        "text": "63"
      },
      {
        "label": "D",
        "text": "64"
      },
      {
        "label": "E",
        "text": "71"
      }
    ]
  },
  {
    "id": 95,
    "subject": "논리·추리",
    "topic": "수열·추리",
    "type": "calc",
    "difficulty": 4,
    "prompt": "1 + 2 + 3 + … + 10 = ?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 96,
    "subject": "논리·추리",
    "topic": "수열·추리",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "다음 수열의 규칙을 설명하고 빈칸의 값을 쓰시오: 1, 1, 2, 3, 5, 8, ?",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 97,
    "subject": "상식·시사",
    "topic": "일반상식",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "태양계에서 가장 큰 행성은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "지구"
      },
      {
        "label": "B",
        "text": "화성"
      },
      {
        "label": "C",
        "text": "목성"
      },
      {
        "label": "D",
        "text": "금성"
      },
      {
        "label": "E",
        "text": "수성"
      }
    ]
  },
  {
    "id": 98,
    "subject": "상식·시사",
    "topic": "일반상식",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "국제연합(UN) 본부가 있는 도시는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "제네바"
      },
      {
        "label": "B",
        "text": "뉴욕"
      },
      {
        "label": "C",
        "text": "파리"
      },
      {
        "label": "D",
        "text": "런던"
      }
    ]
  },
  {
    "id": 99,
    "subject": "상식·시사",
    "topic": "일반상식",
    "type": "choice3",
    "difficulty": 3,
    "prompt": "대한민국의 수도는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "서울"
      },
      {
        "label": "B",
        "text": "부산"
      },
      {
        "label": "C",
        "text": "인천"
      }
    ]
  },
  {
    "id": 100,
    "subject": "상식·시사",
    "topic": "일반상식",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "노벨상이 수여되지 않는 분야는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "물리학"
      },
      {
        "label": "B",
        "text": "화학"
      },
      {
        "label": "C",
        "text": "문학"
      },
      {
        "label": "D",
        "text": "수학"
      },
      {
        "label": "E",
        "text": "평화"
      }
    ]
  },
  {
    "id": 101,
    "subject": "상식·시사",
    "topic": "시사",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "2015년 유엔 기후변화회의에서 채택된 협정은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "교토 의정서"
      },
      {
        "label": "B",
        "text": "파리 협정"
      },
      {
        "label": "C",
        "text": "몬트리올 의정서"
      },
      {
        "label": "D",
        "text": "바젤 협약"
      },
      {
        "label": "E",
        "text": "람사르 협약"
      }
    ]
  },
  {
    "id": 102,
    "subject": "상식·시사",
    "topic": "시사",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "유럽연합(EU)의 공용 통화는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "달러"
      },
      {
        "label": "B",
        "text": "파운드"
      },
      {
        "label": "C",
        "text": "유로"
      },
      {
        "label": "D",
        "text": "프랑"
      }
    ]
  },
  {
    "id": 103,
    "subject": "상식·시사",
    "topic": "시사",
    "type": "short",
    "difficulty": 4,
    "prompt": "세계보건기구의 영문 약자는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 104,
    "subject": "상식·시사",
    "topic": "시사",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "생성형 AI가 사회에 미치는 영향 한 가지를 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 105,
    "subject": "기타",
    "topic": "예술",
    "type": "choice5",
    "difficulty": 1,
    "prompt": "‘모나리자’를 그린 화가는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "미켈란젤로"
      },
      {
        "label": "B",
        "text": "레오나르도 다 빈치"
      },
      {
        "label": "C",
        "text": "라파엘로"
      },
      {
        "label": "D",
        "text": "보티첼리"
      },
      {
        "label": "E",
        "text": "카라바조"
      }
    ]
  },
  {
    "id": 106,
    "subject": "기타",
    "topic": "예술",
    "type": "choice4",
    "difficulty": 2,
    "prompt": "베토벤 교향곡 9번 4악장에 포함된 합창은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "환희의 송가"
      },
      {
        "label": "B",
        "text": "운명"
      },
      {
        "label": "C",
        "text": "월광"
      },
      {
        "label": "D",
        "text": "영웅"
      }
    ]
  },
  {
    "id": 107,
    "subject": "기타",
    "topic": "예술",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "인상주의 미술의 특징을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 108,
    "subject": "기타",
    "topic": "한자",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "한자 ‘學生’의 뜻은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "선생"
      },
      {
        "label": "B",
        "text": "학생"
      },
      {
        "label": "C",
        "text": "학교"
      },
      {
        "label": "D",
        "text": "공부"
      },
      {
        "label": "E",
        "text": "시험"
      }
    ]
  },
  {
    "id": 109,
    "subject": "기타",
    "topic": "한자",
    "type": "ox",
    "difficulty": 3,
    "prompt": "한자 ‘大’는 ‘크다’라는 뜻이다.",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "O"
      },
      {
        "label": "B",
        "text": "X"
      }
    ]
  },
  {
    "id": 110,
    "subject": "기타",
    "topic": "한자",
    "type": "choice5",
    "difficulty": 4,
    "prompt": "다음 중 뜻이 서로 반대인 한자끼리 짝지어진 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "上 - 下"
      },
      {
        "label": "B",
        "text": "山 - 川"
      },
      {
        "label": "C",
        "text": "日 - 月"
      },
      {
        "label": "D",
        "text": "木 - 林"
      },
      {
        "label": "E",
        "text": "水 - 江"
      }
    ]
  },
  {
    "id": 111,
    "subject": "컴퓨터공학",
    "topic": "운영체제",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "프로세스와 스레드의 차이로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "스레드는 독립적인 메모리 공간을 가진다"
      },
      {
        "label": "B",
        "text": "프로세스는 코드와 데이터를 공유한다"
      },
      {
        "label": "C",
        "text": "스레드는 같은 프로세스의 자원을 공유한다"
      },
      {
        "label": "D",
        "text": "프로세스가 스레드보다 가볍다"
      },
      {
        "label": "E",
        "text": "스레드는 항상 병렬로 실행된다"
      }
    ]
  },
  {
    "id": 112,
    "subject": "컴퓨터공학",
    "topic": "운영체제",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "가상 메모리의 목적을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 113,
    "subject": "컴퓨터공학",
    "topic": "데이터베이스",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "ACID에서 ‘원자성(Atomicity)’의 의미는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "일부만 반영해도 된다"
      },
      {
        "label": "B",
        "text": "모두 반영되거나 전혀 반영되지 않는다"
      },
      {
        "label": "C",
        "text": "동시에 여러 트랜잭션을 허용한다"
      },
      {
        "label": "D",
        "text": "결과가 영구히 저장된다"
      }
    ]
  },
  {
    "id": 114,
    "subject": "컴퓨터공학",
    "topic": "데이터베이스",
    "type": "short",
    "difficulty": 4,
    "prompt": "관계형 데이터베이스 정규화의 주된 목적은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 115,
    "subject": "전자공학",
    "topic": "회로이론",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "옴의 법칙으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "V = IR"
      },
      {
        "label": "B",
        "text": "V = I / R"
      },
      {
        "label": "C",
        "text": "I = VR"
      },
      {
        "label": "D",
        "text": "R = VI"
      },
      {
        "label": "E",
        "text": "V = I²R"
      }
    ]
  },
  {
    "id": 116,
    "subject": "전자공학",
    "topic": "회로이론",
    "type": "calc",
    "difficulty": 4,
    "prompt": "10V 전압에 5Ω 저항이 연결될 때 전류는? (단위 A)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 117,
    "subject": "전자공학",
    "topic": "신호처리",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "나이퀴스트 정리에 따르면 최대 주파수 f인 신호를 복원하려면 샘플링 주파수가 최소 얼마여야 하는가?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "f"
      },
      {
        "label": "B",
        "text": "2f"
      },
      {
        "label": "C",
        "text": "f/2"
      },
      {
        "label": "D",
        "text": "4f"
      }
    ]
  },
  {
    "id": 118,
    "subject": "전자공학",
    "topic": "신호처리",
    "type": "short",
    "difficulty": 4,
    "prompt": "푸리에 변환은 시간 영역 신호를 무엇의 영역으로 바꾸는가?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 119,
    "subject": "기계공학",
    "topic": "열역학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "열역학 제1법칙의 내용은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "엔트로피는 항상 증가한다"
      },
      {
        "label": "B",
        "text": "에너지는 보존된다"
      },
      {
        "label": "C",
        "text": "열은 저온에서 고온으로 흐른다"
      },
      {
        "label": "D",
        "text": "압력은 항상 일정하다"
      },
      {
        "label": "E",
        "text": "부피는 온도에 반비례한다"
      }
    ]
  },
  {
    "id": 120,
    "subject": "기계공학",
    "topic": "열역학",
    "type": "calc",
    "difficulty": 4,
    "prompt": "이상기체 상태방정식 PV = nRT에서 n=1, R=8.31, T=300K, V=8.31L일 때 P는? (kPa)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 121,
    "subject": "기계공학",
    "topic": "재료역학",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "응력(stress)의 정의는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "힘 / 면적"
      },
      {
        "label": "B",
        "text": "면적 / 힘"
      },
      {
        "label": "C",
        "text": "변형량 / 원래 길이"
      },
      {
        "label": "D",
        "text": "힘 × 거리"
      }
    ]
  },
  {
    "id": 122,
    "subject": "기계공학",
    "topic": "재료역학",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "탄성 변형과 소성 변형의 차이를 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 123,
    "subject": "화학공학",
    "topic": "반응공학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "촉매의 역할로 가장 알맞은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "평형 상수를 바꾼다"
      },
      {
        "label": "B",
        "text": "활성화 에너지를 낮춘다"
      },
      {
        "label": "C",
        "text": "반응열을 증가시킨다"
      },
      {
        "label": "D",
        "text": "생성물을 제거한다"
      },
      {
        "label": "E",
        "text": "반응물 농도를 높인다"
      }
    ]
  },
  {
    "id": 124,
    "subject": "화학공학",
    "topic": "반응공학",
    "type": "calc",
    "difficulty": 4,
    "prompt": "1차 반응의 반감기가 10분일 때, 초기 농도의 1/4로 줄어드는 데 걸리는 시간은? (분)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 125,
    "subject": "화학공학",
    "topic": "공정열역학",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "발열 반응에서 엔탈피 변화(ΔH)의 부호는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "양(+)"
      },
      {
        "label": "B",
        "text": "음(−)"
      },
      {
        "label": "C",
        "text": "0"
      },
      {
        "label": "D",
        "text": "정의할 수 없다"
      }
    ]
  },
  {
    "id": 126,
    "subject": "화학공학",
    "topic": "공정열역학",
    "type": "short",
    "difficulty": 4,
    "prompt": "자발적 과정에서 계와 주변을 합친 전체 엔트로피 변화는 항상 어떻게 되는가?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 127,
    "subject": "경영학",
    "topic": "재무관리",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "순현재가치(NPV)가 0보다 크면?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "투자를 기각해야 한다"
      },
      {
        "label": "B",
        "text": "기업 가치를 창출한다"
      },
      {
        "label": "C",
        "text": "반드시 손실이 난다"
      },
      {
        "label": "D",
        "text": "회수할 수 없다"
      },
      {
        "label": "E",
        "text": "이자가 없다"
      }
    ]
  },
  {
    "id": 128,
    "subject": "경영학",
    "topic": "재무관리",
    "type": "calc",
    "difficulty": 4,
    "prompt": "100만원을 연 10%로 1년 투자할 때 이자는? (만원)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 129,
    "subject": "경영학",
    "topic": "마케팅",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "전통적인 마케팅 4P에 해당하지 않는 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "Product"
      },
      {
        "label": "B",
        "text": "Price"
      },
      {
        "label": "C",
        "text": "Place"
      },
      {
        "label": "D",
        "text": "People"
      }
    ]
  },
  {
    "id": 130,
    "subject": "경영학",
    "topic": "마케팅",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "시장 세분화의 목적을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 131,
    "subject": "경제학",
    "topic": "미시경제",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "수요의 가격탄력성이 1보다 클 때 가격을 인상하면 총수입은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "증가한다"
      },
      {
        "label": "B",
        "text": "감소한다"
      },
      {
        "label": "C",
        "text": "변하지 않는다"
      },
      {
        "label": "D",
        "text": "0이 된다"
      },
      {
        "label": "E",
        "text": "예측할 수 없다"
      }
    ]
  },
  {
    "id": 132,
    "subject": "경제학",
    "topic": "미시경제",
    "type": "calc",
    "difficulty": 4,
    "prompt": "가격이 10% 오를 때 수요가 20% 감소하면 수요의 가격탄력성 절댓값은?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 133,
    "subject": "경제학",
    "topic": "거시경제",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "GDP 디플레이터는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "명목 GDP / 실질 GDP"
      },
      {
        "label": "B",
        "text": "실질 GDP / 명목 GDP"
      },
      {
        "label": "C",
        "text": "소비 / 투자"
      },
      {
        "label": "D",
        "text": "수출 / 수입"
      }
    ]
  },
  {
    "id": 134,
    "subject": "경제학",
    "topic": "거시경제",
    "type": "short",
    "difficulty": 4,
    "prompt": "중앙은행이 경기 침체에 대응해 기준금리를 어떻게 하는가?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 135,
    "subject": "법학",
    "topic": "민법",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "민법상 계약이 성립하려면 필요한 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "공증"
      },
      {
        "label": "B",
        "text": "청약과 승낙의 합치"
      },
      {
        "label": "C",
        "text": "등기"
      },
      {
        "label": "D",
        "text": "인증"
      },
      {
        "label": "E",
        "text": "신고"
      }
    ]
  },
  {
    "id": 136,
    "subject": "법학",
    "topic": "민법",
    "type": "choice4",
    "difficulty": 4,
    "prompt": "불법행위 성립 요건이 아닌 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "고의 또는 과실"
      },
      {
        "label": "B",
        "text": "위법성"
      },
      {
        "label": "C",
        "text": "손해의 발생"
      },
      {
        "label": "D",
        "text": "계약의 체결"
      }
    ]
  },
  {
    "id": 137,
    "subject": "법학",
    "topic": "형법",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "죄형법정주의의 내용으로 가장 알맞은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "죄를 자유롭게 정할 수 있다"
      },
      {
        "label": "B",
        "text": "법률이 없으면 처벌할 수 없다"
      },
      {
        "label": "C",
        "text": "관습으로 처벌할 수 있다"
      },
      {
        "label": "D",
        "text": "행정명령으로 처벌할 수 있다"
      },
      {
        "label": "E",
        "text": "재판관 재량으로 처벌할 수 있다"
      }
    ]
  },
  {
    "id": 138,
    "subject": "법학",
    "topic": "형법",
    "type": "short",
    "difficulty": 4,
    "prompt": "형법상 만 14세 미만인 자를 부르는 말은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 139,
    "subject": "심리학",
    "topic": "인지심리",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "단기기억의 대표적인 용량은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "3±2개"
      },
      {
        "label": "B",
        "text": "7±2개"
      },
      {
        "label": "C",
        "text": "20±5개"
      },
      {
        "label": "D",
        "text": "100개"
      },
      {
        "label": "E",
        "text": "무제한"
      }
    ]
  },
  {
    "id": 140,
    "subject": "심리학",
    "topic": "인지심리",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "인지 부하 이론을 간단히 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 141,
    "subject": "심리학",
    "topic": "연구방법",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "상관관계가 인과관계를 의미하지 않는 이유로 가장 알맞은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "제3의 변수나 우연이 작용할 수 있다"
      },
      {
        "label": "B",
        "text": "측정이 불가능하다"
      },
      {
        "label": "C",
        "text": "표본이 크면 안 된다"
      },
      {
        "label": "D",
        "text": "항상 음의 관계만 나타난다"
      }
    ]
  },
  {
    "id": 142,
    "subject": "심리학",
    "topic": "연구방법",
    "type": "calc",
    "difficulty": 4,
    "prompt": "평균 50, 표준편차 10인 정규분포에서 z점수가 1.5인 원점수는?",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 143,
    "subject": "의학·간호",
    "topic": "생리학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "심장에서 혈액을 전신으로 내보내는 주된 펌프는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "좌심방"
      },
      {
        "label": "B",
        "text": "좌심실"
      },
      {
        "label": "C",
        "text": "우심방"
      },
      {
        "label": "D",
        "text": "우심실"
      },
      {
        "label": "E",
        "text": "판막"
      }
    ]
  },
  {
    "id": 144,
    "subject": "의학·간호",
    "topic": "생리학",
    "type": "short",
    "difficulty": 4,
    "prompt": "적혈구에서 산소를 운반하는 단백질은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 145,
    "subject": "의학·간호",
    "topic": "약리학",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "약물의 치료지수가 작을수록?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "안전성이 높다"
      },
      {
        "label": "B",
        "text": "안전성이 낮다"
      },
      {
        "label": "C",
        "text": "효과가 없다"
      },
      {
        "label": "D",
        "text": "반감기가 길다"
      }
    ]
  },
  {
    "id": 146,
    "subject": "의학·간호",
    "topic": "약리학",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "항생제 남용의 위험을 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 147,
    "subject": "건축·토목",
    "topic": "구조역학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "경간 L인 단순보 중앙에 집중하중 P가 작용할 때 최대 휨모멘트는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "PL"
      },
      {
        "label": "B",
        "text": "PL/2"
      },
      {
        "label": "C",
        "text": "PL/4"
      },
      {
        "label": "D",
        "text": "PL/8"
      },
      {
        "label": "E",
        "text": "0"
      }
    ]
  },
  {
    "id": 148,
    "subject": "건축·토목",
    "topic": "구조역학",
    "type": "calc",
    "difficulty": 4,
    "prompt": "길이 4m 단순보 중앙에 8kN 집중하중이 작용할 때 최대 휨모멘트는? (kN·m)",
    "passage": "",
    "code": "",
    "hint": "계산",
    "options": []
  },
  {
    "id": 149,
    "subject": "건축·토목",
    "topic": "건축계획",
    "type": "choice4",
    "difficulty": 3,
    "prompt": "용적률 계산에 쓰이는 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "대지면적에 대한 연면적의 비율"
      },
      {
        "label": "B",
        "text": "건축면적에 대한 층수의 비율"
      },
      {
        "label": "C",
        "text": "높이에 대한 폭의 비율"
      },
      {
        "label": "D",
        "text": "대지면적에 대한 건축면적의 비율"
      }
    ]
  },
  {
    "id": 150,
    "subject": "건축·토목",
    "topic": "건축계획",
    "type": "descriptive",
    "difficulty": 4,
    "prompt": "건축계획에서 동선 계획이 중요한 이유를 서술하시오.",
    "passage": "",
    "code": "",
    "hint": "서술형",
    "options": []
  },
  {
    "id": 151,
    "subject": "수능",
    "topic": "국어",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "다음 글에서 ‘매개’가 문맥상 의미하는 바로 가장 적절한 것은?",
    "passage": "기술은 인간과 세계를 잇는 매개로 기능한다. 다만 그 매개가 투명할수록 우리는 기술이 개입하고 있다는 사실을 잊기 쉽다.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "기술을 거부하는 태도"
      },
      {
        "label": "B",
        "text": "인간과 세계를 연결하는 수단"
      },
      {
        "label": "C",
        "text": "세계를 있는 그대로 보는 능력"
      },
      {
        "label": "D",
        "text": "기술 발전을 비판하는 이론"
      },
      {
        "label": "E",
        "text": "인간의 감각을 차단하는 장치"
      }
    ]
  },
  {
    "id": 152,
    "subject": "수능",
    "topic": "국어",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "다음 글의 필자가 강조하는 내용으로 가장 적절한 것은?",
    "passage": "공공재는 한 사람이 소비해도 다른 사람의 소비가 줄지 않고, 대가를 지불하지 않은 사람도 배제하기 어렵다. 그래서 시장에만 맡기면 공공재는 과소 공급되기 쉽다.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "공공재는 시장에서 항상 효율적으로 공급된다"
      },
      {
        "label": "B",
        "text": "공공재는 배제 가능성과 경합성이 모두 높다"
      },
      {
        "label": "C",
        "text": "공공재 공급에는 정부나 공동체의 역할이 필요할 수 있다"
      },
      {
        "label": "D",
        "text": "공공재는 소비할수록 다른 사람의 몫이 줄어든다"
      },
      {
        "label": "E",
        "text": "공공재는 가격을 올리면 수요가 무한히 늘어난다"
      }
    ]
  },
  {
    "id": 153,
    "subject": "수능",
    "topic": "국어",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "다음 시의 표현상 특징으로 가장 적절한 것은?",
    "passage": "창가에 놓인 빈 의자오후의 햇빛이 앉았다 가면먼지 한 줄이 천천히 눈을 뜬다",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "대상에 인격을 부여해 정서를 드러낸다"
      },
      {
        "label": "B",
        "text": "계절의 변화를 대조적으로 제시한다"
      },
      {
        "label": "C",
        "text": "특정 인물과의 대화를 직접 인용한다"
      },
      {
        "label": "D",
        "text": "과거와 현재를 역순으로 배열한다"
      },
      {
        "label": "E",
        "text": "수미상관으로 운율을 형성한다"
      }
    ]
  },
  {
    "id": 154,
    "subject": "수능",
    "topic": "국어",
    "type": "short",
    "difficulty": 4,
    "prompt": "다음 문장에서 ‘밝혀졌다’는 사동인지 피동인지 쓰시오: “진실이 마침내 밝혀졌다.”",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 155,
    "subject": "수능",
    "topic": "수학",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "방정식 2x + 3 = 11의 해는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "2"
      },
      {
        "label": "B",
        "text": "3"
      },
      {
        "label": "C",
        "text": "4"
      },
      {
        "label": "D",
        "text": "5"
      },
      {
        "label": "E",
        "text": "6"
      }
    ]
  },
  {
    "id": 156,
    "subject": "수능",
    "topic": "수학",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "함수 f(x) = x² - 4x + 5의 최솟값은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "0"
      },
      {
        "label": "B",
        "text": "1"
      },
      {
        "label": "C",
        "text": "2"
      },
      {
        "label": "D",
        "text": "3"
      },
      {
        "label": "E",
        "text": "4"
      }
    ]
  },
  {
    "id": 157,
    "subject": "수능",
    "topic": "수학",
    "type": "short",
    "difficulty": 3,
    "prompt": "함수 f(x) = x³ - 3x의 극댓값을 구하시오.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 158,
    "subject": "수능",
    "topic": "수학",
    "type": "short",
    "difficulty": 4,
    "prompt": "서로 다른 두 주사위를 던질 때 눈의 합이 8일 확률을 기약분수로 쓰시오.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 159,
    "subject": "수능",
    "topic": "영어",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "빈칸에 들어갈 말로 가장 적절한 것은?",
    "passage": "The new policy is intended to ___ the gap between urban and rural schools.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "enlarge"
      },
      {
        "label": "B",
        "text": "narrow"
      },
      {
        "label": "C",
        "text": "ignore"
      },
      {
        "label": "D",
        "text": "measure"
      },
      {
        "label": "E",
        "text": "double"
      }
    ]
  },
  {
    "id": 160,
    "subject": "수능",
    "topic": "영어",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "빈칸에 들어갈 말로 가장 적절한 것은?",
    "passage": "Had I known the meeting was canceled, I ___ earlier.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "would not have left"
      },
      {
        "label": "B",
        "text": "would not leave"
      },
      {
        "label": "C",
        "text": "did not leave"
      },
      {
        "label": "D",
        "text": "had not left"
      },
      {
        "label": "E",
        "text": "will not leave"
      }
    ]
  },
  {
    "id": 161,
    "subject": "수능",
    "topic": "영어",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "다음 글의 주제로 가장 적절한 것은?",
    "passage": "Many people believe that creativity is a sudden flash of insight. Yet studies of artists and scientists show that most creative work begins with a long period of preparation, followed by repeated revision. The flash, when it comes, is usually the result of that groundwork.",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "Creativity depends mainly on luck"
      },
      {
        "label": "B",
        "text": "Creative work usually grows from preparation and revision"
      },
      {
        "label": "C",
        "text": "Insight cannot be studied"
      },
      {
        "label": "D",
        "text": "Artists avoid revision"
      },
      {
        "label": "E",
        "text": "Scientists are more creative than artists"
      }
    ]
  },
  {
    "id": 162,
    "subject": "수능",
    "topic": "영어",
    "type": "short",
    "difficulty": 4,
    "prompt": "빈칸에 들어갈 단어를 쓰시오: The results were ___ with the hypothesis, supporting the researcher’s claim.",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 163,
    "subject": "수능",
    "topic": "한국사",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "고려 시대 중앙 관제에서 최고 기구는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "의정부"
      },
      {
        "label": "B",
        "text": "삼정승"
      },
      {
        "label": "C",
        "text": "중서문하성"
      },
      {
        "label": "D",
        "text": "집현전"
      },
      {
        "label": "E",
        "text": "승정원"
      }
    ]
  },
  {
    "id": 164,
    "subject": "수능",
    "topic": "한국사",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "조선 후기 실학자 중 『목민심서』를 쓴 인물은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "정약용"
      },
      {
        "label": "B",
        "text": "박지원"
      },
      {
        "label": "C",
        "text": "홍대용"
      },
      {
        "label": "D",
        "text": "유형원"
      },
      {
        "label": "E",
        "text": "이익"
      }
    ]
  },
  {
    "id": 165,
    "subject": "수능",
    "topic": "한국사",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "대한제국 시기 독립협회의 활동으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "만민공동회 개최"
      },
      {
        "label": "B",
        "text": "갑오개혁 주도"
      },
      {
        "label": "C",
        "text": "동학농민운동 주도"
      },
      {
        "label": "D",
        "text": "한일병합 조약 체결"
      },
      {
        "label": "E",
        "text": "3·1 운동 주도"
      }
    ]
  },
  {
    "id": 166,
    "subject": "수능",
    "topic": "한국사",
    "type": "short",
    "difficulty": 4,
    "prompt": "1919년 3·1 운동에 영향을 준 미국 대통령 윌슨의 민족 운동 원칙은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 167,
    "subject": "수능",
    "topic": "사회탐구",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "기회비용에 대한 설명으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "선택하지 않은 대안 중 가장 가치가 큰 것"
      },
      {
        "label": "B",
        "text": "실제로 지불한 금액"
      },
      {
        "label": "C",
        "text": "정부가 부과하는 세금"
      },
      {
        "label": "D",
        "text": "저축으로 얻는 이자"
      },
      {
        "label": "E",
        "text": "생산에 든 총비용"
      }
    ]
  },
  {
    "id": 168,
    "subject": "수능",
    "topic": "사회탐구",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "문화의 속성으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "문화는 고정되어 변하지 않는다"
      },
      {
        "label": "B",
        "text": "문화는 학습을 통해 습득된다"
      },
      {
        "label": "C",
        "text": "문화는 개인마다 완전히 다르다"
      },
      {
        "label": "D",
        "text": "문화는 자연적으로 타고난다"
      },
      {
        "label": "E",
        "text": "문화는 경제와 무관하다"
      }
    ]
  },
  {
    "id": 169,
    "subject": "수능",
    "topic": "사회탐구",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "민주주의 국가에서 권력 분립의 핵심 목적은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "행정부 권한 강화"
      },
      {
        "label": "B",
        "text": "권력의 집중과 효율"
      },
      {
        "label": "C",
        "text": "권력의 상호 견제와 균형"
      },
      {
        "label": "D",
        "text": "사법부의 입법"
      },
      {
        "label": "E",
        "text": "시민의 정치 참여 금지"
      }
    ]
  },
  {
    "id": 170,
    "subject": "수능",
    "topic": "사회탐구",
    "type": "short",
    "difficulty": 4,
    "prompt": "한 국가의 일정 기간 생산량을 시장 가격으로 평가한 것은?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  },
  {
    "id": 171,
    "subject": "수능",
    "topic": "과학탐구",
    "type": "choice5",
    "difficulty": 2,
    "prompt": "속력 10m/s로 5초 동안 이동한 거리는?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "2m"
      },
      {
        "label": "B",
        "text": "5m"
      },
      {
        "label": "C",
        "text": "10m"
      },
      {
        "label": "D",
        "text": "50m"
      },
      {
        "label": "E",
        "text": "100m"
      }
    ]
  },
  {
    "id": 172,
    "subject": "수능",
    "topic": "과학탐구",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "산성 수용액에 대한 설명으로 옳은 것은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "pH가 7보다 크다"
      },
      {
        "label": "B",
        "text": "리트머스 종이를 파랗게 한다"
      },
      {
        "label": "C",
        "text": "수소 이온 농도가 수산화 이온보다 크다"
      },
      {
        "label": "D",
        "text": "전류가 흐르지 않는다"
      },
      {
        "label": "E",
        "text": "금속과 반응하지 않는다"
      }
    ]
  },
  {
    "id": 173,
    "subject": "수능",
    "topic": "과학탐구",
    "type": "choice5",
    "difficulty": 3,
    "prompt": "멘델의 유전 법칙에서 F1 잡종이 갖는 형질은?",
    "passage": "",
    "code": "",
    "hint": "",
    "options": [
      {
        "label": "A",
        "text": "열성만"
      },
      {
        "label": "B",
        "text": "우성만"
      },
      {
        "label": "C",
        "text": "우성과 열성이 섞인 중간"
      },
      {
        "label": "D",
        "text": "돌연변이"
      },
      {
        "label": "E",
        "text": "형질이 사라진다"
      }
    ]
  },
  {
    "id": 174,
    "subject": "수능",
    "topic": "과학탐구",
    "type": "short",
    "difficulty": 4,
    "prompt": "지진파 중 고체와 액체를 모두 통과할 수 있는 파는?",
    "passage": "",
    "code": "",
    "hint": "단답형",
    "options": []
  }
]
