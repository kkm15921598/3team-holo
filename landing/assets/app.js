// =============================================================
// HOLO 랜딩 — UTM 캡처 + 사전등록 (Supabase 연동)
// 의존성: ESM CDN (esm.sh) 의 @supabase/supabase-js
// =============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } from './supabase.js';

// ---------- 1. UTM 자동 캡처 ----------
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function captureUtm() {
  const params = new URLSearchParams(location.search);
  UTM_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v) localStorage.setItem(k, v);
  });
  // 첫 진입 시각도 기록 (어트리뷰션 last/first 비교용)
  if (!localStorage.getItem('first_seen_at')) {
    localStorage.setItem('first_seen_at', new Date().toISOString());
  }
}

function readUtm() {
  return Object.fromEntries(
    UTM_KEYS.map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => !!v)
  );
}

captureUtm();

// ---------- 2. 사전등록 폼 ----------
const form = document.getElementById('waitlist-form');
const msg = document.getElementById('form-msg');
const btn = document.getElementById('submit-btn');
const agree = document.getElementById('agree');

function setMsg(text, kind) {
  msg.textContent = text;
  msg.className = 'form-msg ' + (kind || '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const region = form.region.value.trim();

  if (!isValidEmail(email)) {
    setMsg('이메일 형식을 확인해주세요.', 'err');
    form.email.focus();
    return;
  }
  if (!agree.checked) {
    setMsg('개인정보 수집·이용 동의가 필요해요.', 'err');
    return;
  }

  btn.disabled = true;
  setMsg('등록 중…');

  const utm = readUtm();
  const payload = {
    email,
    region: region || null,
    utm: Object.keys(utm).length ? utm : null,
  };

  try {
    // Supabase 키가 placeholder 면 fallback (mailto)
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE')) {
      throw new Error('Supabase 미설정');
    }

    const supabase = await getSupabase();
    const { error } = await supabase.from('waitlist').insert(payload);

    if (error) {
      // unique 위반 = 이미 등록된 이메일
      if ((error.code || '').includes('23505') || /duplicate/i.test(error.message)) {
        setMsg('이미 사전 등록된 이메일이에요. 출시 알림을 보내드릴게요!', 'ok');
        form.reset();
      } else {
        throw error;
      }
    } else {
      setMsg('🎉 사전 등록 완료! 가장 먼저 출시 소식을 보내드릴게요.', 'ok');
      form.reset();
      // GA4 이벤트
      if (typeof gtag === 'function') {
        gtag('event', 'sign_up', {
          method: 'waitlist',
          ...utm,
        });
      }
    }
  } catch (err) {
    console.warn('[waitlist] insert failed, falling back to mailto', err);
    // Supabase 미설정 / 네트워크 실패 → mailto fallback
    const subject = encodeURIComponent('[HOLO] 사전 등록');
    const body = encodeURIComponent(
      `이메일: ${email}\n지역: ${region || '-'}\nUTM: ${JSON.stringify(utm)}`
    );
    setMsg('등록 서버에 연결할 수 없어 메일로 대신 보낼게요…');
    setTimeout(() => {
      location.href = `mailto:hello@holo.app?subject=${subject}&body=${body}`;
      setMsg('메일 앱이 열렸어요. 보내주시면 등록 처리해드릴게요!', 'ok');
    }, 500);
  } finally {
    btn.disabled = false;
  }
});
