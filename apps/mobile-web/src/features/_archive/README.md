# Email-version archive

이 폴더에는 로그인 식별자가 "이메일"이었던 시절의 화면 구현이 보존되어 있습니다.
현재 본 코드(`features/auth/*`, `features/signup/account-screen.tsx`)는 "아이디" 기반으로
교체되었지만, 추후 이메일 검증/입력 흐름을 다시 사용할 가능성이 있어 참고용으로 남겨둡니다.

확장자가 `.tsx.bak` 이라 TypeScript 컴파일 대상에서 제외됩니다.
필요할 때 `.tsx` 로 확장자만 바꾸면 다시 import 가능한 상태로 복구됩니다.

## 보존 파일
- `login-screen.email-version.tsx.bak` - 이메일/비번 로그인 화면
- `account-screen.email-version.tsx.bak` - 가입 시 이메일 + 인증번호 입력
- `find-password-screen.email-version.tsx.bak` - 이메일 + 휴대폰 본인확인
- `find-id-screen.email-version.tsx.bak` - 결과로 마스킹 이메일 노출
