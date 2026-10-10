// 진도표(합격 공부 캘린더) — 계획표 데이터 + 진도표 화면 + 홈 배너.
// 계시록 통달(도통계시록/index.html)에서는 화면까지, 루트 index.html에서는 배너만 쓴다.
// 다른 과목 진도표를 추가할 때는 PLANS에 같은 모양으로 하나 더 넣으면 된다.
(function () {
    'use strict';

    const STORE_KEY = 'sion_plan_progress';          // { planId: { 'YYYY-MM-DD': { missionId: 완료시각 } } }
    const BANNER_OFF_KEY = 'sion_plan_banner_off';   // 루트 배너를 닫은 사람
    const MOCK_HISTORY_KEY = 'sion_tongdal_mockhistory';
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    const R = (ch, note) => ({ t: 'read', ch: [ch], note });
    const B = (...ch) => ({ t: 'blank', ch });
    const F = (...ch) => ({ t: 'blank', ch, first: true });   // 1~15장: 괄호 넣기 먼저
    const M = (goal) => ({ t: 'mock', goal });
    const FINAL = { tag: '모의', title: '마무리 · 매일 모의고사', noCommon: true, m: [M(90), { t: 'wrong' }, { t: 'star' }] };

    const PLANS = {
        'tongdal-grade1': {
            name: '계시록 통달 1급',
            start: '2026-10-15',
            exam: '2026-11-15',
            mockGrade: 'grade1',
            days: {
                '10-15': { tag: '16장', title: '16장 · 첫째 날', m: [M(0), R(16)] },
                '10-16': { tag: '16장', title: '16장 · 둘째 날', m: [B(16)] },
                '10-17': { tag: '17장', title: '17장 · 첫째 날', m: [R(17, '앞 절반')] },
                '10-18': { tag: '17장', title: '17장 · 둘째 날', m: [R(17, '뒤 절반')] },
                '10-19': { tag: '17장', title: '17장 · 셋째 날', m: [B(17)] },
                '10-20': { tag: '18장', title: '18장 · 첫째 날', m: [R(18)] },
                '10-21': { tag: '18장', title: '18장 · 둘째 날', m: [B(18)] },
                '10-22': { tag: '19장', title: '19장 · 첫째 날', m: [R(19)] },
                '10-23': { tag: '19장', title: '19장 · 둘째 날', m: [B(19)] },
                '10-24': { tag: '20장', title: '20장 · 하루에 끝내기', m: [R(20), B(20)] },
                '10-25': { tag: '21장', title: '21장 · 첫째 날', m: [R(21)] },
                '10-26': { tag: '21장', title: '21장 · 둘째 날', m: [B(21)] },
                '10-27': { tag: '22장', title: '22장 · 첫째 날', m: [R(22)] },
                '10-28': { tag: '22장', title: '22장 · 둘째 날 + 모의고사', m: [B(22), M(60)] },
                '10-29': { tag: '1~3장', title: '1~3장 빠르게', m: [F(1, 2, 3)] },
                '10-30': { tag: '4~6장', title: '4~6장 빠르게', m: [F(4, 5, 6)] },
                '10-31': { tag: '7~8장', title: '7~8장 빠르게', m: [F(7, 8)] },
                '11-01': { tag: '9~10장', title: '9~10장 빠르게', m: [F(9, 10)] },
                '11-02': { tag: '11~12장', title: '11~12장 빠르게', m: [F(11, 12)] },
                '11-03': { tag: '13장', title: '13장 빠르게', m: [F(13)] },
                '11-04': { tag: '14~15장', title: '14~15장 빠르게 + 모의고사', m: [F(14, 15), M(75)] },
                '11-05': { tag: '16~17장', title: '16~17장 두 번째', m: [B(16, 17)] },
                '11-06': { tag: '18~19장', title: '18~19장 두 번째', m: [B(18, 19)] },
                '11-07': { tag: '20~22장', title: '20~22장 두 번째', m: [B(20, 21, 22)] },
                '11-08': { tag: '점검', title: '16~22장 전체 점검 + 모의고사', m: [{ t: 'blank', ch: [16, 17, 18, 19, 20, 21, 22], check: true }, M(85)] },
                '11-09': FINAL, '11-10': FINAL, '11-11': FINAL, '11-12': FINAL, '11-13': FINAL,
                '11-14': { tag: '별표', title: '가볍게 마무리', noCommon: true, m: [{ t: 'star', light: true }, { t: 'rest' }] },
                '11-15': { tag: '시험', title: '시험일', exam: true, m: [] }
            }
        }
    };
    const PLAN_ID = 'tongdal-grade1';
    const PLAN = PLANS[PLAN_ID];

    // ---------- 날짜 ----------
    function parseDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function todayStr() { return fmtDate(new Date()); }
    function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
    function diffDays(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
    function shortDate(s) { const d = parseDate(s); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WEEKDAYS[d.getDay()] + ')'; }

    function rangeLabel(ch) {
        if (ch.length === 1) return String(ch[0]);
        const consecutive = ch.every((c, i) => i === 0 || c === ch[i - 1] + 1);
        return consecutive ? ch[0] + '~' + ch[ch.length - 1] : ch.join('·');
    }

    // ---------- 계획표 → 날짜별 미션 ----------
    function studyChapters(list) {
        const out = [];
        (list || []).forEach(x => { if (x.t === 'read' || x.t === 'blank') x.ch.forEach(c => { if (!out.includes(c)) out.push(c); }); });
        return out;
    }
    function decorate(x) {
        const rng = x.ch ? rangeLabel(x.ch) : '';
        if (x.t === 'read') return Object.assign(x, { id: 'read-' + x.ch.join('_'), label: rng + '장 전체 문답 읽기' + (x.note ? ' (' + x.note + ')' : ''), hint: '문답 5개씩 끊어 읽고, 화면을 가린 채 입으로 답해 보세요.' });
        if (x.t === 'blank') return Object.assign(x, { id: 'blank-' + x.ch.join('_'), label: rng + '장 ' + (x.check ? '전체 점검 (괄호 넣기)' : '괄호 넣기'), hint: x.first ? '괄호 넣기 먼저 → 틀린 문답만 전체 문답에서 다시 보고 ☆별표' : (x.check ? '틀렸던 문답 위주로 한 번 더 풉니다.' : '틀린 문답에는 ☆별표를 달아 두세요.') });
        if (x.t === 'review') return Object.assign(x, { id: 'review', label: '어제 본 ' + rng + '장 괄호 넣기 다시 풀기', hint: '15분 · 틀린 문답에는 ☆별표' });
        if (x.t === 'mock') return Object.assign(x, { id: 'mock', label: '1급 모의고사 1회' + (x.goal ? ' (목표 ' + x.goal + '점)' : ' (출발 점수 기록)'), hint: x.goal ? '풀고 나면 점수가 자동으로 기록됩니다.' : '낮아도 괜찮습니다. 지금 점수를 알아두는 것이 목적입니다.' });
        if (x.t === 'wrong') return Object.assign(x, { id: 'wrong', label: '틀린 문항 다시보기', hint: '모의고사 결과에서 틀린 문항만 다시 확인합니다.' });
        if (x.t === 'star') return Object.assign(x, { id: 'star', label: x.light ? '별표 모음만 한 번 가볍게' : '자기 전 별표 모음 보기', hint: x.light ? '새로운 것은 보지 않습니다.' : '10분 · 별표한 문답만 다시 봅니다.' });
        return Object.assign(x, { id: 'rest', label: '일찍 자기', hint: '내일이 시험입니다. 컨디션이 점수입니다.' });
    }
    const DAYS = [];
    const DAY_BY_DATE = {};
    (function buildDays() {
        for (let d = PLAN.start; d <= PLAN.exam; d = addDays(d, 1)) {
            const raw = PLAN.days[d.slice(5)] || { tag: '', title: '', m: [] };
            DAYS.push({ date: d, tag: raw.tag, title: raw.title, exam: !!raw.exam, noCommon: !!raw.noCommon, raw: raw.m });
        }
        DAYS.forEach((day, i) => {
            const ms = day.raw.map(x => Object.assign({}, x));
            if (!day.exam && !day.noCommon) {
                // 매일 공통 미션: 어제 본 장 다시 풀기(오늘 괄호 넣기와 같은 장이면 중복이라 생략), 자기 전 별표 모음
                const prev = i > 0 ? studyChapters(DAYS[i - 1].raw) : [];
                const todayBlank = [];
                ms.forEach(x => { if (x.t === 'blank') todayBlank.push(...x.ch); });
                if (prev.length && !prev.every(c => todayBlank.includes(c))) ms.unshift({ t: 'review', ch: prev });
                if (!ms.some(x => x.t === 'star')) ms.push({ t: 'star' });
            }
            day.missions = ms.map(decorate);
            DAY_BY_DATE[day.date] = day;
        });
    })();

    // ---------- 저장 ----------
    function loadAll() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
    function loadProgress() { return loadAll()[PLAN_ID] || {}; }
    function saveMission(date, id, done) {
        const all = loadAll();
        const plan = all[PLAN_ID] || (all[PLAN_ID] = {});
        const day = plan[date] || (plan[date] = {});
        if (done) day[id] = Date.now(); else delete day[id];
        try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* 무시 */ }
        // 시트 전송: 이 저장소에는 아직 전송 함수가 없다. 나중에 window.reportProgress가 생기면 그대로 연결된다.
        try { if (typeof window.reportProgress === 'function') window.reportProgress({ plan: PLAN_ID, date, mission: id, done }); } catch (e) { /* 무시 */ }
    }
    // 그날 푼 1급 모의고사 최고 점수(없으면 null) — 풀기만 하면 모의고사 미션이 자동으로 체크된다
    function mockScoreOn(date) {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(MOCK_HISTORY_KEY)) || []; } catch (e) { /* 무시 */ }
        let best = null;
        list.forEach(e => {
            if (!e || e.gradeKey !== PLAN.mockGrade || !e.savedAt) return;
            if (fmtDate(new Date(e.savedAt)) === date && (best === null || e.score > best)) best = e.score;
        });
        return best;
    }
    function isDone(progress, date, m) {
        if ((progress[date] || {})[m.id]) return true;
        return m.t === 'mock' && mockScoreOn(date) !== null;
    }
    function doneCount(progress, day) { return day.missions.filter(m => isDone(progress, day.date, m)).length; }
    function isDayDone(progress, day) { return !day.exam && day.missions.length > 0 && doneCount(progress, day) === day.missions.length; }
    function dayStatus(progress, day, today) {
        if (day.exam) return 'exam';
        if (isDayDone(progress, day)) return 'done';
        if (day.date > today) return 'future';
        return day.date === today ? 'today' : 'late';
    }
    function streak(progress, today) {
        let d = today;
        if (!DAY_BY_DATE[d] || !isDayDone(progress, DAY_BY_DATE[d])) d = addDays(today, -1);
        let n = 0;
        while (DAY_BY_DATE[d] && isDayDone(progress, DAY_BY_DATE[d])) { n++; d = addDays(d, -1); }
        return n;
    }
    function summary() {
        const today = todayStr();
        const progress = loadProgress();
        const studyDays = DAYS.filter(d => !d.exam);
        return {
            today, progress,
            before: today < PLAN.start, after: today > PLAN.exam,
            day: DAY_BY_DATE[today] || null,
            doneDays: studyDays.filter(d => isDayDone(progress, d)).length,
            totalDays: studyDays.length,
            lateDays: studyDays.filter(d => d.date < today && !isDayDone(progress, d)).length,
            streak: streak(progress, today),
            dday: diffDays(PLAN.exam, today)
        };
    }

    // ---------- 스타일 ----------
    const CSS = `
    .jd-wrap { width: 100%; max-width: 440px; margin: 0 auto; text-align: left; }
    .jd-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .jd-back { background: #fff; border: 2px solid #c7d2fe; color: #4f46e5; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 900; }
    .jd-dday { background: #1e1b4b; color: #fff; border-radius: 999px; padding: 7px 13px; font-size: 13px; font-weight: 900; }
    .jd-h1 { font-size: 21px; font-weight: 900; color: #1e1b4b; line-height: 1.25; }
    .jd-sub { font-size: 13px; font-weight: 700; color: #64748b; margin-top: 4px; line-height: 1.45; word-break: keep-all; }
    .jd-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 14px 0 8px; }
    .jd-stat { background: #fff; border-radius: 16px; padding: 10px 6px; text-align: center; box-shadow: 0 4px 12px rgba(30,27,75,.05); }
    .jd-stat b { display: block; font-size: 20px; font-weight: 900; color: #1e1b4b; line-height: 1.2; }
    .jd-stat span { font-size: 11px; font-weight: 800; color: #94a3b8; }
    .jd-bar { height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-bottom: 16px; }
    .jd-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #34d399, #059669); transition: width .4s ease; }
    .jd-card { background: #fff; border-radius: 22px; padding: 16px; box-shadow: 0 8px 20px rgba(30,27,75,.07); margin-bottom: 16px; border: 2px solid #e0e7ff; }
    .jd-card.is-done { border-color: #6ee7b7; background: #f0fdf4; }
    .jd-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .jd-kicker { font-size: 12px; font-weight: 900; color: #4f46e5; }
    .jd-card-title { font-size: 19px; font-weight: 900; color: #1e1b4b; margin-top: 2px; word-break: keep-all; }
    .jd-count { font-size: 13px; font-weight: 900; color: #059669; white-space: nowrap; }
    .jd-note { font-size: 12px; font-weight: 800; border-radius: 12px; padding: 8px 10px; margin-top: 10px; line-height: 1.45; word-break: keep-all; }
    .jd-note.late { background: #fff1f2; color: #be123c; }
    .jd-note.lock { background: #f1f5f9; color: #64748b; }
    .jd-note.info { background: #eef2ff; color: #4338ca; }
    .jd-mission { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-top: 1px solid #eef2f7; }
    .jd-mission:first-of-type { border-top: 0; }
    .jd-check { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 50%; border: 3px solid #cbd5e1; background: #fff; color: transparent; font-size: 22px; font-weight: 900; display: flex; align-items: center; justify-content: center; transition: transform .12s ease; }
    .jd-check:active { transform: scale(.9); }
    .jd-check.on { background: #10b981; border-color: #10b981; color: #fff; animation: jdPop .35s ease; }
    .jd-check[disabled] { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; font-size: 16px; }
    .jd-mbody { flex: 1 1 auto; min-width: 0; }
    .jd-mlabel { font-size: 16px; font-weight: 900; color: #1e1b4b; line-height: 1.35; word-break: keep-all; }
    .jd-mission.on .jd-mlabel { color: #94a3b8; text-decoration: line-through; }
    .jd-mhint { font-size: 12px; font-weight: 700; color: #94a3b8; margin-top: 2px; line-height: 1.4; word-break: keep-all; }
    .jd-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .jd-chip { background: #eef2ff; border: 1.5px solid #c7d2fe; color: #4338ca; border-radius: 12px; padding: 8px 12px; font-size: 13px; font-weight: 900; line-height: 1.2; text-align: left; }
    .jd-chip small { display: block; font-size: 10.5px; font-weight: 700; color: #818cf8; margin-top: 2px; }
    .jd-chip:active { background: #e0e7ff; }
    .jd-chip.amber { background: #fffbeb; border-color: #fde68a; color: #b45309; }
    .jd-score { display: inline-block; margin-top: 6px; font-size: 12px; font-weight: 900; border-radius: 999px; padding: 3px 10px; background: #ecfdf5; color: #047857; }
    .jd-score.low { background: #fff7ed; color: #c2410c; }
    .jd-sec { font-size: 15px; font-weight: 900; color: #1e1b4b; margin: 4px 0 8px; }
    .jd-cal { background: #fff; border-radius: 22px; padding: 12px 10px; box-shadow: 0 8px 20px rgba(30,27,75,.05); margin-bottom: 10px; }
    .jd-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .jd-wd { text-align: center; font-size: 11px; font-weight: 900; color: #94a3b8; padding-bottom: 4px; }
    .jd-wd:first-child { color: #f43f5e; }
    .jd-cell { position: relative; min-height: 52px; border-radius: 11px; border: 2px solid transparent; background: #f8fafc; padding: 4px 1px 3px; text-align: center; color: #475569; }
    .jd-cell.out { background: transparent; color: #cbd5e1; }
    .jd-cell .n { font-size: 13px; font-weight: 900; line-height: 1.1; }
    .jd-cell .t { font-size: 9.5px; font-weight: 800; line-height: 1.15; margin-top: 3px; letter-spacing: -.4px; white-space: nowrap; }
    .jd-cell.done { background: #d1fae5; color: #065f46; }
    .jd-cell.late { background: #ffe4e6; color: #be123c; }
    .jd-cell.exam { background: #dc2626; color: #fff; }
    .jd-cell.today { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.18); }
    .jd-cell.sel { border-color: #1e1b4b; }
    .jd-cell .dot { position: absolute; top: 3px; right: 3px; width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; }
    .jd-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 11px; font-weight: 800; color: #64748b; margin: 0 4px 18px; }
    .jd-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 4px; margin-right: 4px; vertical-align: -1px; }
    .jd-guide { background: #fff; border-radius: 18px; padding: 12px 14px; margin-bottom: 10px; font-size: 13px; font-weight: 700; color: #475569; line-height: 1.6; word-break: keep-all; }
    .jd-guide summary { font-size: 14px; font-weight: 900; color: #1e1b4b; cursor: pointer; }
    .jd-guide ol, .jd-guide ul { margin: 8px 0 0 18px; }
    .jd-guide ol { list-style: decimal; } .jd-guide ul { list-style: disc; }
    .jd-link { background: none; border: 0; color: #4f46e5; font-size: 12px; font-weight: 900; text-decoration: underline; padding: 0; }
    .jd-clear { position: fixed; inset: 0; z-index: 10000; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; animation: jdFade .2s ease; }
    .jd-clear-box { background: #fff; border-radius: 28px; padding: 28px 30px; text-align: center; animation: jdPop .45s ease; max-width: 80%; }
    .jd-clear-box .e { font-size: 54px; line-height: 1; }
    .jd-clear-box .h { font-size: 26px; font-weight: 900; color: #059669; margin-top: 8px; }
    .jd-clear-box .s { font-size: 14px; font-weight: 800; color: #475569; margin-top: 6px; word-break: keep-all; }
    .jd-conf { position: fixed; top: -30px; font-size: 22px; z-index: 10001; pointer-events: none; animation: jdFall 1.9s linear forwards; }
    @keyframes jdPop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
    @keyframes jdFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes jdFall { to { transform: translateY(110vh) rotate(540deg); opacity: .2; } }
    .jd-entry-sub { display: block; font-size: 12px; font-weight: 800; opacity: .85; margin-top: 3px; }
    .jd-banner { width: min(100%, 420px); margin: 0 auto 12px; display: flex; align-items: stretch; border-radius: 18px; overflow: hidden; background: #1f2a44; color: #fff; box-shadow: 0 10px 24px -12px rgba(31,42,68,.6); }
    .jd-banner a { flex: 1 1 auto; display: flex; align-items: center; gap: 12px; padding: 12px 6px 12px 16px; color: #fff; text-decoration: none; min-width: 0; text-align: left; }
    .jd-banner .ic { font-size: 26px; line-height: 1; }
    .jd-banner .k { font-size: 11px; font-weight: 800; color: #e9c77b; }
    .jd-banner .m { font-size: 15px; font-weight: 900; line-height: 1.35; word-break: keep-all; }
    .jd-banner .x { flex: 0 0 auto; background: none; border: 0; color: rgba(255,255,255,.55); font-size: 18px; padding: 0 14px; }
    `;
    function injectCss() {
        if (document.getElementById('jd-style')) return;
        const st = document.createElement('style');
        st.id = 'jd-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    // ---------- 루트 홈 배너 (푸시를 못 받는 환경용 안내) ----------
    function bannerContent(s) {
        if (s.after) return null;
        if (s.before) return { icon: '📅', kicker: '계시록 통달 1급 · 5주 진도표', msg: shortDate(PLAN.start) + ' 시작 · D-' + diffDays(PLAN.start, s.today) + ' · 미리 보기' };
        const day = s.day;
        if (day.exam) return { icon: '🙏', kicker: '계시록 통달 1급', msg: '오늘은 시험일입니다. 그동안 수고하셨습니다!' };
        const left = day.missions.length - doneCount(s.progress, day);
        const late = s.lateDays ? ' · 밀린 날 ' + s.lateDays + '일' : '';
        if (left === 0) return { icon: '✅', kicker: '1급 진도표 · 시험까지 D-' + s.dday, msg: '오늘 미션 클리어!' + (s.streak > 1 ? ' 연속 ' + s.streak + '일째' : '') + late };
        if (new Date().getHours() >= 18) return { icon: '🌙', kicker: '1급 진도표 · 시험까지 D-' + s.dday, msg: '아직 오늘 미션 ' + left + '개가 남았어요' + late };
        return { icon: '☀️', kicker: '1급 진도표 · 시험까지 D-' + s.dday, msg: '오늘의 미션 ' + left + '개 · ' + day.title + late };
    }
    function renderBanner() {
        const host = document.getElementById('sion-plan-banner');
        if (!host) return;
        let off = false;
        try { off = localStorage.getItem(BANNER_OFF_KEY) === '1'; } catch (e) { /* 무시 */ }
        const c = off ? null : bannerContent(summary());
        if (!c) { host.innerHTML = ''; return; }
        host.innerHTML = '<div class="jd-banner"><a href="' + (host.dataset.href || '도통계시록/index.html#plan') + '">' +
            '<span class="ic">' + c.icon + '</span><span><span class="k">' + c.kicker + '</span><br><span class="m">' + c.msg + '</span></span></a>' +
            '<button type="button" class="x" aria-label="진도표 안내 닫기">✕</button></div>';
        host.querySelector('.x').addEventListener('click', () => {
            try { localStorage.setItem(BANNER_OFF_KEY, '1'); } catch (e) { /* 무시 */ }
            host.innerHTML = '';
        });
    }

    // ---------- 계시록 통달 안의 진도표 화면 ----------
    let selDate = null;
    let planReturn = false;   // 진도표에서 공부 화면으로 넘어갔으면, 뒤로가기 때 진도표로 돌아온다
    let origShowScreen = null;

    function chapterCount(ch) {
        try { return (typeof quizDataStore !== 'undefined' && quizDataStore['ch' + ch]) ? quizDataStore['ch' + ch].length : 0; } catch (e) { return 0; }
    }
    function missionActions(m) {
        if (m.ch) {
            const mode = m.t === 'read' ? 'answer' : 'blank';
            return m.ch.map(c => {
                const n = chapterCount(c);
                return '<button type="button" class="jd-chip" data-go="chapter" data-ch="' + c + '" data-mode="' + mode + '">계 ' + c + '장 ›' + (n ? '<small>' + n + '문답</small>' : '') + '</button>';
            }).join('');
        }
        if (m.t === 'mock') return '<button type="button" class="jd-chip amber" data-go="mock">1급 모의고사 풀기 ›</button>';
        if (m.t === 'wrong') return '<button type="button" class="jd-chip amber" data-go="history">응시 기록에서 다시보기 ›</button>';
        if (m.t === 'star') return '<button type="button" class="jd-chip amber" data-go="star">⭐ 별표 모음 ›</button>';
        return '';
    }
    function missionHtml(s, day, m, locked) {
        const on = isDone(s.progress, day.date, m);
        let score = '';
        if (m.t === 'mock') {
            const sc = mockScoreOn(day.date);
            if (sc !== null) score = '<span class="jd-score' + (m.goal && sc < m.goal ? ' low' : '') + '">이날 점수 ' + sc + '점' + (m.goal ? (sc >= m.goal ? ' · 목표 달성' : ' · 목표까지 ' + (m.goal - sc) + '점') : '') + '</span>';
        }
        return '<div class="jd-mission' + (on ? ' on' : '') + '">' +
            '<button type="button" class="jd-check' + (on ? ' on' : '') + '" data-check="' + m.id + '"' + (locked ? ' disabled aria-label="아직 날짜가 안 됐습니다">🔒' : ' aria-label="' + m.label + ' 완료 체크">✓') + '</button>' +
            '<div class="jd-mbody"><div class="jd-mlabel">' + m.label + '</div><div class="jd-mhint">' + m.hint + '</div>' + score +
            '<div class="jd-chips">' + missionActions(m) + '</div></div></div>';
    }
    function cardHtml(s) {
        const day = DAY_BY_DATE[selDate];
        const isToday = selDate === s.today;
        const kicker = (isToday ? '오늘의 미션 · ' : '') + shortDate(selDate);
        const backToday = (!isToday && DAY_BY_DATE[s.today]) ? ' <button type="button" class="jd-link" data-go="today">오늘로</button>' : '';
        if (day.exam) {
            return '<div class="jd-card"><div class="jd-kicker">' + kicker + backToday + '</div><div class="jd-card-title">🙏 시험일입니다</div>' +
                '<div class="jd-note info">50문항 중 45개를 맞히면 합격입니다. 조사(은/는/이/가)는 채점하지 않으니 핵심 낱말만 정확히 쓰세요.</div></div>';
        }
        const locked = selDate > s.today;
        const done = doneCount(s.progress, day);
        const allDone = done === day.missions.length;
        let note = '';
        if (locked) note = '<div class="jd-note lock">아직 날짜가 안 됐습니다. 미리 공부하는 것은 얼마든지 괜찮아요. 체크는 그날부터 됩니다.</div>';
        else if (!isToday && !allDone) note = '<div class="jd-note late">밀린 날입니다. 지금 하고 체크하면 채워집니다.</div>';
        return '<div class="jd-card' + (allDone ? ' is-done' : '') + '" id="jd-card">' +
            '<div class="jd-card-head"><div><div class="jd-kicker">' + kicker + backToday + '</div><div class="jd-card-title">' + day.title + '</div></div>' +
            '<div class="jd-count">' + (allDone ? '🎉 클리어' : done + ' / ' + day.missions.length) + '</div></div>' + note +
            day.missions.map(m => missionHtml(s, day, m, locked)).join('') + '</div>';
    }
    function calendarHtml(s) {
        const start = parseDate(PLAN.start);
        const first = addDays(PLAN.start, -start.getDay());            // 시작 주의 일요일
        const end = parseDate(PLAN.exam);
        const last = addDays(PLAN.exam, 6 - end.getDay());             // 시험 주의 토요일
        let html = '<div class="jd-cal"><div class="jd-grid">' + WEEKDAYS.map(w => '<div class="jd-wd">' + w + '</div>').join('');
        for (let d = first, i = 0; d <= last; d = addDays(d, 1), i++) {
            const dt = parseDate(d);
            const num = (i === 0 || dt.getDate() === 1) ? (dt.getMonth() + 1) + '/' + dt.getDate() : dt.getDate();
            const day = DAY_BY_DATE[d];
            if (!day) { html += '<div class="jd-cell out"><div class="n">' + num + '</div></div>'; continue; }
            const st = dayStatus(s.progress, day, s.today);
            const cls = ['jd-cell', st === 'future' || st === 'today' ? '' : st, d === s.today ? 'today' : '', d === selDate ? 'sel' : ''].join(' ');
            const hasMock = day.missions.some(m => m.t === 'mock');
            html += '<button type="button" class="' + cls + '" data-date="' + d + '" aria-label="' + shortDate(d) + ' ' + day.title + '">' +
                (hasMock ? '<span class="dot"></span>' : '') + '<div class="n">' + num + '</div><div class="t">' + (st === 'done' ? '✓ ' : '') + day.tag + '</div></button>';
        }
        return html + '</div></div>' +
            '<div class="jd-legend"><span><i style="background:#d1fae5"></i>완료</span><span><i style="background:#ffe4e6"></i>밀림</span>' +
            '<span><i style="background:#fff;border:2px solid #4f46e5"></i>오늘</span><span><i style="background:#f59e0b;border-radius:50%"></i>모의고사일</span>' +
            '<span><i style="background:#dc2626"></i>시험일</span></div>';
    }
    function renderPlan() {
        const root = document.getElementById('jd-root');
        if (!root) return;
        const s = summary();
        if (!selDate || !DAY_BY_DATE[selDate]) selDate = DAY_BY_DATE[s.today] ? s.today : (s.before ? PLAN.start : PLAN.exam);
        const ddayText = s.dday > 0 ? '시험까지 D-' + s.dday : (s.dday === 0 ? '오늘 시험' : '시험 종료');
        let intro = '';
        if (s.before) {
            intro = '<div class="jd-note info" style="margin-bottom:14px">' + shortDate(PLAN.start) + '에 시작합니다 (D-' + diffDays(PLAN.start, s.today) + '). 그 전에 전장 기본 144문항으로 22장 뼈대를 잡아 두세요. ' +
                '<button type="button" class="jd-link" data-go="basic">전장 기본 144문항 가기</button></div>';
        } else if (s.lateDays > 0) {
            intro = '<div class="jd-note late" style="margin-bottom:14px">밀린 날이 ' + s.lateDays + '일 있습니다. 늦게 시작해도 괜찮습니다. 16~22장부터 채우고, 1~15장은 줄여도 됩니다.</div>';
        }
        root.innerHTML = '<div class="jd-wrap">' +
            '<div class="jd-top"><button type="button" class="jd-back" data-go="home">‹ 계시록 통달</button><span class="jd-dday">' + ddayText + '</span></div>' +
            '<div class="jd-h1">📅 1급 5주 진도표</div>' +
            '<div class="jd-sub">50문항 중 30문항이 16~22장에서 나옵니다. 그래서 16장부터 시작합니다. 하루 미션만 따라오세요.</div>' +
            '<div class="jd-stats"><div class="jd-stat"><b>🔥 ' + s.streak + '</b><span>연속 달성 일수</span></div>' +
            '<div class="jd-stat"><b>' + s.doneDays + '<small style="font-size:12px;color:#94a3b8"> / ' + s.totalDays + '</small></b><span>완료한 날</span></div>' +
            '<div class="jd-stat"><b>' + s.lateDays + '</b><span>밀린 날</span></div></div>' +
            '<div class="jd-bar"><i style="width:' + Math.round(s.doneDays / s.totalDays * 100) + '%"></i></div>' +
            intro + cardHtml(s) +
            '<div class="jd-sec">5주 캘린더 <span style="font-size:11px;color:#94a3b8;font-weight:800">날짜를 누르면 그날 미션이 보입니다</span></div>' + calendarHtml(s) +
            '<details class="jd-guide"><summary>하루 공부 순서 (60~90분)</summary><ol><li>어제 본 장 괄호 넣기 (15분) — 틀린 문답에 ☆별표</li><li>오늘 장 전체 문답 읽기 (30~40분)</li><li>오늘 장 괄호 넣기 한 번 (15분)</li><li>자기 전 별표 모음 (10분)</li></ol></details>' +
            '<details class="jd-guide"><summary>하루 30분뿐이라면</summary><ul><li>16~22장만 끝까지 갑니다. 점수의 60%가 여기서 나옵니다.</li><li>매일: 전체 문답 20개 읽기 + 어제 분량 괄호 넣기</li><li>11/9부터는 매일 1급 모의고사 한 번과 틀린 문항 다시보기만</li></ul></details>' +
            '<details class="jd-guide"><summary>모의고사 점검 기준</summary><ul><li>10/15 출발 점수 — 기록만</li><li>10/28 60점 이상</li><li>11/4 75점 이상</li><li>11/8 85점 이상</li><li>11/9~11/13 90점 이상 연속</li><li>점수가 모자라면 분량을 늘리지 말고, 틀린 문항만 다시 보세요.</li></ul></details>' +
            '<div style="height:60px"></div></div>';
        renderEntry(s);
    }
    function showClear(s) {
        const box = document.createElement('div');
        box.className = 'jd-clear';
        box.innerHTML = '<div class="jd-clear-box"><div class="e">🎉</div><div class="h">미션 클리어!</div><div class="s">' +
            (s.streak > 1 ? '🔥 연속 ' + s.streak + '일째 달성' : '오늘 할 일을 모두 마쳤습니다') + '<br>시험까지 D-' + Math.max(s.dday, 0) + '</div></div>';
        document.body.appendChild(box);
        const pieces = ['🎉', '⭐', '✨', '🎊', '💪'];
        const conf = [];
        for (let i = 0; i < 18; i++) {
            const c = document.createElement('span');
            c.className = 'jd-conf';
            c.textContent = pieces[i % pieces.length];
            c.style.left = (Math.random() * 96) + 'vw';
            c.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(c);
            conf.push(c);
        }
        const close = () => { box.remove(); conf.forEach(c => c.remove()); };
        box.addEventListener('click', close);
        setTimeout(close, 2200);
    }
    function onPlanClick(e) {
        const check = e.target.closest('[data-check]');
        if (check && !check.disabled) {
            const day = DAY_BY_DATE[selDate];
            const m = day.missions.find(x => x.id === check.dataset.check);
            const before = loadProgress();
            const wasDayDone = isDayDone(before, day);
            const stored = !!(before[selDate] || {})[m.id];
            // 모의고사를 실제로 풀어 자동 체크된 미션은 그대로 둔다
            if (!stored && isDone(before, selDate, m)) return;
            saveMission(selDate, m.id, !stored);
            renderPlan();
            if (!wasDayDone && isDayDone(loadProgress(), day)) showClear(summary());
            return;
        }
        const cell = e.target.closest('[data-date]');
        if (cell) {
            selDate = cell.dataset.date;
            renderPlan();
            const card = document.getElementById('jd-card');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const go = e.target.closest('[data-go]');
        if (!go) return;
        const kind = go.dataset.go;
        if (kind === 'today') { selDate = todayStr(); renderPlan(); return; }
        if (kind === 'home') { planReturn = false; origShowScreen('home'); return; }
        if (kind === 'history') { origShowScreen('gradeSelect'); planReturn = true; return; }
        planReturn = true;
        if (kind === 'chapter') window.openChapterStudy('ch' + go.dataset.ch, go.dataset.mode);
        else if (kind === 'mock') startGradeMock(PLAN.mockGrade);
        else if (kind === 'star') openStarredBank();
        else if (kind === 'basic') showGrade4Rooms();
    }
    function renderEntry(s) {
        const sub = document.getElementById('jindo-entry-sub');
        if (!sub) return;
        s = s || summary();
        if (s.after) sub.textContent = '시험이 끝났습니다. 수고하셨습니다!';
        else if (s.before) sub.textContent = shortDate(PLAN.start) + ' 시작 · 미리 보기';
        else if (s.day.exam) sub.textContent = '오늘은 시험일입니다';
        else {
            const left = s.day.missions.length - doneCount(s.progress, s.day);
            sub.textContent = (left ? '오늘의 미션 ' + left + '개 남음' : '오늘 미션 클리어!') + ' · 시험까지 D-' + s.dday + (s.streak ? ' · 🔥 ' + s.streak + '일' : '');
        }
    }
    function openPlan() {
        try { localStorage.removeItem(BANNER_OFF_KEY); } catch (e) { /* 무시 */ }
        planReturn = false;
        selDate = null;
        renderPlan();
        origShowScreen('plan');
        const scr = document.getElementById('screen-plan');
        if (scr) scr.scrollTop = 0;
    }
    function initPlanScreen() {
        const main = document.getElementById('app-main');
        if (!main || typeof els === 'undefined' || typeof showScreen !== 'function') return false;
        const scr = document.createElement('div');
        scr.id = 'screen-plan';
        scr.className = 'hidden flex-col items-center justify-start pt-16 px-5 z-10 bg-[#f4f6fc] fade-enter overflow-y-auto w-full h-full pb-10 relative';
        scr.innerHTML = '<div id="jd-root" style="width:100%"></div>';
        main.appendChild(scr);
        els.screens.plan = scr;
        scr.addEventListener('click', onPlanClick);
        // 진도표에서 넘어간 공부 화면의 "뒤로가기"는 진도표로 돌아오게 한다(그 밖의 이동은 원래대로).
        origShowScreen = showScreen;
        window.showScreen = function (name) {
            if (planReturn && (name === 'home' || name === 'gradeSelect')) { openPlan(); return; }
            return origShowScreen.apply(this, arguments);
        };
        renderEntry();
        window.addEventListener('load', () => {
            if (window.location.hash === '#plan' && localStorage.getItem('sion_auth') === '2') openPlan();
        });
        return true;
    }

    injectCss();
    const hasScreen = initPlanScreen();
    renderBanner();
    window.addEventListener('pageshow', () => { renderBanner(); renderEntry(); });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        renderBanner();
        const scr = document.getElementById('screen-plan');
        if (hasScreen && scr && !scr.classList.contains('hidden')) renderPlan(); else renderEntry();
    });

    window.SionPlan = { open: () => { if (hasScreen) openPlan(); }, renderBanner, summary, days: DAYS };
})();
