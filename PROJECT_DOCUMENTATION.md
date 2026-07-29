# MYOO 프로젝트 문서 (초안)

## 1. 프로젝트 개요

- **프로젝트명**: MYOO
- **타입**: Expo + React Native 기반 감정 기록 모바일 앱
- **핵심 목적**: 사용자가 하루를 한 단어, 감정 스케치, 메모, 미디어로 기록하고 회고할 수 있도록 지원
- **백엔드**: Supabase(Auth, Postgres, Storage, Edge Functions)

핵심 경험은 다음 흐름으로 구성된다.

1) 인증  
2) 온보딩(이름 + MYOO 설정)  
3) 하루 기록(단어 -> 감정 스케치 -> 메모 -> 미디어)  
4) 레이어 애니메이션 후 홈 반영  
5) 엔트리 상세 조회 및 AI 챗 보조

---

## 2. 기술 스택

### 앱
- `expo` `56`
- `react-native` `0.85`
- `react` `19`
- `expo-router`
- `react-native-svg`
- `expo-image-picker`
- `expo-file-system`

### 데이터/인증
- `@supabase/supabase-js` (세션 저장은 AsyncStorage 사용)
- Supabase Postgres + RLS
- Supabase Storage (다이어리 미디어 저장)
- Supabase Edge Function (`diary-chat`)

---

## 3. 앱 라우트 구조

`src/app/_layout.tsx` 기준 Stack 라우팅:

- `/` : 진입점 (세션/프로필 상태 검사 후 분기)
- `/auth` : 로그인/회원가입
- `/onboarding` : 초기 사용자 설정
- `/home` : 홈(오늘의 단어 입력, 버블 목록)
- `/feeling` : 감정 스케치 입력
- `/note` : 메모 입력
- `/media` : 사진/동영상 첨부 및 저장
- `/layer-added` : 기록 완료 애니메이션
- `/entry/[id]` : 기록 상세 조회
- `/profile` : 프로필/비밀번호/MYOO 스케치 편집
- `/chat` : AI 챗

참고: `/explore`는 Expo 템플릿 기본 샘플 화면으로, 서비스 핵심 플로우에서는 사용하지 않는다.

---

## 4. 화면별 기능 요약

## `src/app/index.tsx`
- 현재 사용자 세션 조회
- 프로필 존재 및 `onboarding_completed` 여부로 화면 자동 라우팅
  - 미로그인 -> `/auth`
  - 온보딩 미완료 -> `/onboarding`
  - 완료 -> `/home`

## `src/app/auth.tsx`
- 이메일/비밀번호 기반 로그인, 회원가입
- 인증 오류 메시지 사용자 친화적으로 매핑

## `src/app/onboarding.tsx`
- 3단계 온보딩
  - 환영
  - 이름 입력
  - 기본 얼굴 선택
- 완료 시 `upsertProfile()` 호출하여 `display_name`, `onboarding_completed` 저장

## `src/app/home.tsx`
- 사용자 이름 및 저장된 다이어리 엔트리 조회
- 엔트리에서 버블 텍스트 생성(단어 우선, 없으면 노트 첫 줄)
- 버블 랜덤 배치 + 애니메이션 진입
- 버블 탭 시 `/entry/[id]` 이동
- 프로필에서 저장한 `myoo_sketch`를 채팅 아이콘 UI에 반영

## `src/app/feeling.tsx`
- 제스처 기반 자유 스케치 입력
- 좌표를 정규화(JSON)하여 임시 draft 저장(`sketchDraft` 서비스)

## `src/app/note.tsx`
- 텍스트 메모 입력
- 입력값을 다음 화면(`/media`)로 파라미터 전달

## `src/app/media.tsx`
- 이미지/비디오 선택 (`expo-image-picker`)
- 선택 미디어를 Supabase Storage 업로드
- 감정 스케치 draft + 단어 + 메모와 함께 `diary_entries` 저장
- 저장 후 `/layer-added` 이동

## `src/app/layer-added.tsx`
- 방금 추가된 기록 강조 애니메이션
- 잠시 후 `/home` 복귀

## `src/app/entry/[id].tsx`
- 단일 엔트리 조회
- 단어/감정/메모/미디어 렌더링
- 미디어는 signed URL 해석 로직으로 접근 실패 시 재시도 처리

## `src/app/profile.tsx`
- 사용자 이메일(읽기 전용), 이름, 비밀번호 수정
- MYOO 스케치 편집 모달(PanResponder + SVG)
- 저장 시 `profiles.myoo_sketch` 포함 upsert

## `src/app/chat.tsx`
- 빠른 액션 메뉴:
  - `clear_advice`
  - `supportive_messages`
  - `write_apologies`
- 자유 입력 `free_chat` 지원
- 최신 다이어리 컨텍스트를 함께 전달해 응답 품질 강화
- 대화 로그를 `chat_logs`에 저장

---

## 5. 서비스 레이어 요약

## `src/services/supabaseClient.ts`
- 환경변수 기반 Supabase 클라이언트 생성
- 세션 영속화 및 토큰 자동 갱신 설정

## `src/services/auth.ts`
- 세션/유저 조회
- 로그인/회원가입/로그아웃
- 비밀번호 업데이트
- 프로필 조회/업서트 (`myoo_sketch` 포함)

## `src/services/diaryStorage.ts`
- 사용자별 다이어리 목록/단건 조회
- 미디어 업로드
- 미디어 경로를 signed/public URL로 해석
- 다이어리 엔트리 생성

## `src/services/sketchDraft.ts`
- 화면 간 임시 스케치 상태 저장/조회/초기화

## `src/services/chatApi.ts`
- Edge Function `diary-chat` 호출

## `src/services/chatStorage.ts`
- AI 대화 로그 `chat_logs` 테이블 저장

---

## 6. 데이터 모델 (Supabase)

`supabase/schema.sql` 기준:

## `public.profiles`
- `id` (auth.users FK, PK)
- `display_name`
- `myoo_sketch`
- `onboarding_completed`
- `created_at`, `updated_at`

## `public.diary_entries`
- `id`
- `user_id` (auth.users FK)
- `date`
- `word`
- `feeling` (스케치 JSON)
- `note`
- `media_url`
- `media_type`
- `created_at`

## `public.chat_logs`
- `id`
- `user_id` (auth.users FK)
- `entry_id` (diary_entries FK, nullable)
- `mode`
- `user_message`
- `ai_message`
- `created_at`

### RLS 정책
- `profiles`, `diary_entries`, `chat_logs` 모두 사용자 본인 데이터만 읽기/쓰기 가능하도록 정책 설정

---

## 7. AI 챗 아키텍처

`supabase/functions/diary-chat/index.ts`:

- 입력: `mode`, `userMessage`, `diaryEntry(optional)`
- 프롬프트 생성 시 diary context(date/word/note) 삽입
- Gemini `gemini-2.5-flash` 호출
- 응답 후처리:
  - 빈 응답 방지
  - 문장 종결부 보정(중간에 끊긴 문장 최소화)
- 출력: `{ text }`

필수 시크릿:
- `GEMINI_API_KEY` (Supabase Edge Function secret)

---

## 8. 환경 변수

`.env` 또는 실행 환경에 최소 다음 값 필요:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_MEDIA_BUCKET` (옵션, 기본값 `diary-media`)

Edge Function 환경:
- `GEMINI_API_KEY`

---

## 9. 로컬 실행 가이드

```bash
npm install
npm start
```

권장 사전 작업:
1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 적용
3. Storage bucket 생성 (`diary-media` 또는 환경변수에 맞는 이름)
4. Edge Function `diary-chat` 배포 및 `GEMINI_API_KEY` 설정

---

## 10. 현재 코드 기준 확인된 특이사항

- `README.md`는 Expo 기본 템플릿 문서 상태이므로, 프로젝트 실제 기능 기준 문서와 불일치 가능
- 감정 스케치 파서는 여러 화면에 유사 구현이 분산되어 있어 장기적으로 공용 유틸화 여지 있음
- `/explore`는 템플릿 페이지로 유지 중

---

## 11. 향후 문서 확장 제안

다음 문서를 추가하면 운영/협업이 쉬워진다.

1) API/함수 계약 문서 (`docs/api.md`)  
2) DB 마이그레이션 히스토리 (`docs/migrations.md`)  
3) 배포/운영 런북 (`docs/runbook.md`)  
4) 테스트 시나리오 문서 (`docs/test-plan.md`)

