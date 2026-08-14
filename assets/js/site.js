/* HAOWEB — 레퍼런스 골격 이식판 공통 스크립트
   모션 값은 레퍼런스 실측 기준:
   · 글자 등장 = translateX(+20px) → 0 + 페이드, 랜덤 스태거, 0.7s ease-out
   · 스크롤 리빌 = 'HAO' 글자 마스크가 중앙에서 scale 0.4→56.4 + 배경 사본 0→0.6 + 1px 룰 scaleX
*/
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* 화면 모드 전환(다크/라이트 토글)은 2026-08-12 세영 지시로 제거했다.
     사이트는 <html data-theme="dark"> 고정으로 나간다.
     base.css 의 :root[data-theme='light'] 블록은 되살릴 때를 위해 남겨 뒀다(현재 미사용). */

  /* ---------- 모바일 메뉴 ---------- */
  function initNav() {
    // 스크롤하면 내비에 어두운 띠 (레퍼런스 동작)
    var nav = document.querySelector('.nav');
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-stuck', window.scrollY > 40);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // 2뎁스 드롭다운 — 그룹 hover/focus 로 열고, 내비 밖으로 나가면 닫는다
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-navgroup]'));
    if (nav && groups.length) {
      var openT, closeT;

      var setOpen = function (g) {
        groups.forEach(function (o) {
          var on = o === g;
          o.setAttribute('data-open', on ? 'true' : 'false');
          var a = o.querySelector('.nav__link');
          if (a) a.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        nav.classList.toggle('is-open', !!g);
      };

      groups.forEach(function (g) {
        g.addEventListener('mouseenter', function () {
          clearTimeout(closeT);
          openT = setTimeout(function () { setOpen(g); }, 60);
        });
        g.addEventListener('focusin', function () {
          clearTimeout(closeT); setOpen(g);
        });
      });

      nav.addEventListener('mouseleave', function () {
        clearTimeout(openT);
        closeT = setTimeout(function () { setOpen(null); }, 180);
      });
      nav.addEventListener('focusout', function (e) {
        if (!nav.contains(e.relatedTarget)) setOpen(null);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var open = groups.filter(function (g) { return g.getAttribute('data-open') === 'true'; })[0];
        if (!open) return;
        setOpen(null);
        var a = open.querySelector('.nav__link');
        if (a) a.focus();
      });
    }

    var burger = document.querySelector('[data-burger]');
    var panel = document.querySelector('[data-navpanel]');
    if (!burger || !panel) return;
    burger.addEventListener('click', function () {
      var open = panel.getAttribute('data-open') === 'true';
      panel.setAttribute('data-open', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'false' : 'true');
      document.body.style.overflow = open ? '' : 'hidden';
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        panel.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- 텍스트 분해 ---------- */
  // 글자 단위 — 공백은 텍스트 노드로 보존해 "하오웹은" → "하오웹 은" 버그 방지
  function splitChars(el) {
    if (el.dataset.split === 'done') return;
    // <br> 는 줄바꿈으로 보존한다 (통째로 textContent 를 쓰면 사라짐)
    var chunks = el.innerHTML.split(/<br\s*\/?>/i);
    var frag = document.createDocumentFragment();
    chunks.forEach(function (chunk, ci) {
      var tmp = document.createElement('div');
      tmp.innerHTML = chunk;
      var text = tmp.textContent.replace(/\s+/g, ' ').trim();
      text.split(' ').forEach(function (word, wi, arr) {
        var w = document.createElement('span');
        w.style.display = 'inline-block';
        w.style.whiteSpace = 'nowrap';
        Array.prototype.forEach.call(word, function (ch) {
          var s = document.createElement('span');
          s.className = 'ta-char';
          s.textContent = ch;
          w.appendChild(s);
        });
        frag.appendChild(w);
        if (wi < arr.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      if (ci < chunks.length - 1) frag.appendChild(document.createElement('br'));
    });
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.split = 'done';

    var chars = el.querySelectorAll('.ta-char');
    chars.forEach(function (c, i) {
      // 랜덤 스태거(레퍼런스와 동일한 인상) — 순서 기반 + 소량 랜덤
      c.style.transitionDelay = (i * 0.016 + Math.random() * 0.09).toFixed(3) + 's';
    });
  }

  // 줄 단위 — 단어를 감싼 뒤 offsetTop으로 줄을 묶고 마스크 처리
  function splitLines(el) {
    if (el.dataset.splitBase === undefined) el.dataset.splitBase = el.textContent;
    var text = el.dataset.splitBase.replace(/\s+/g, ' ').trim();
    el.textContent = '';

    var probes = [];
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span');
      w.style.display = 'inline-block';
      w.textContent = word;
      el.appendChild(w);
      probes.push(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });

    var lines = [];
    var top = null;
    probes.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });

    el.textContent = '';
    lines.forEach(function (words) {
      var mask = document.createElement('span');
      mask.className = 'ta-mask';
      var line = document.createElement('span');
      line.className = 'ta-line';
      line.textContent = words.join(' ');
      mask.appendChild(line);
      el.appendChild(mask);
    });
    el.querySelectorAll('.ta-line').forEach(function (l, i) {
      l.style.transitionDelay = (i * 0.055).toFixed(3) + 's';
    });
  }

  /* ---------- 등장 관찰 ---------- */
  function initReveal() {
    var animEls = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
    var fadeEls = Array.prototype.slice.call(document.querySelectorAll('[data-fade]'));

    if (reduced) {
      animEls.concat(fadeEls).forEach(function (el) { el.dataset.played = 'true'; });
      return;
    }

    animEls.forEach(function (el) {
      if (el.dataset.anim === 'lines') splitLines(el); else splitChars(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = parseFloat(el.dataset.delay || '0');
        setTimeout(function () { el.dataset.played = 'true'; }, delay * 1000);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    animEls.concat(fadeEls).forEach(function (el) { io.observe(el); });

    // 히어로는 로드 직후 0.9s 뒤 (레퍼런스 실측). data-delay 가 있으면 그만큼 더 늦춘다.
    // ※ 히어로 요소를 IntersectionObserver 에만 맡기면 안 된다 —
    //   rootMargin 이 화면 하단 12% 를 관찰에서 빼기 때문에, 첫 화면 맨 아래에 있는
    //   CTA 는 threshold(0.15) 를 못 넘겨 스크롤하기 전까지 나타나지 않는다.
    window.addEventListener('load', function () {
      document.querySelectorAll('[data-anim-hero]').forEach(function (el) {
        var d = parseFloat(el.dataset.delay || '0');
        setTimeout(function () { el.dataset.played = 'true'; }, 900 + d * 1000);
      });
    });

    // 줄 분해는 폭이 바뀌면 다시 계산
    var t;
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(function () {
        document.querySelectorAll('[data-anim="lines"]').forEach(function (el) {
          var was = el.dataset.played;
          splitLines(el);
          el.dataset.played = was || 'true';
        });
      }, 220);
    });
  }

  /* ---------- 히어로 캔버스 (방사형 선) ---------- */
  function initHeroCanvas() {
    var cv = document.querySelector('[data-hero-canvas]');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, raf = 0, t0 = performance.now();

    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      var el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      var css = getComputedStyle(document.documentElement);
      var fg = css.getPropertyValue('--fg').trim() || '#f4f4f2';
      // 소실점 — 아주 느리게 표류
      var cx = W * 0.5 + Math.sin(el * 0.16) * W * 0.05;
      var cy = H * 0.5 + Math.cos(el * 0.12) * H * 0.05;
      var step = 30;
      var maxD = Math.sqrt(W * W + H * H) / 2;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      for (var x = step / 2; x < W; x += step) {
        for (var y = step / 2; y < H; y += step) {
          var dx = x - cx, dy = y - cy;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 6) continue;
          var ux = dx / d, uy = dy / d;
          var len = 5 + (d / maxD) * 26;
          var a = 0.08 + Math.min(d / maxD, 1) * 0.34;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.moveTo(x - ux * len / 2, y - uy * len / 2);
          ctx.lineTo(x + ux * len / 2, y + uy * len / 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', function () { resize(); if (reduced) draw(performance.now()); });
    if (reduced) { draw(performance.now()); } else { raf = requestAnimationFrame(draw); }
  }

  /* ---------- 스크롤 고정 리빌 ---------- */
  function initStickyReveal() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!secs.length) return;

    // 레퍼런스 clipPath 의 scale 실측 곡선 (0.4 → 56.4, 중앙 기준)
    var CURVE = [[0, .40], [.086, 1.98], [.17, 6.64], [.281, 12.86], [.392, 19.08],
                 [.503, 25.31], [.642, 33.08], [.781, 40.86], [.92, 48.64], [1, 56.42]];
    var maskText = document.querySelector('[data-hao-mask]');
    var ratio = 2.1;   // 'HAO' 글자폭 / font-size — 폰트 로드 후 실측으로 대체
    var measure = function () {
      if (!maskText) return;
      maskText.setAttribute('font-size', '200');
      try {
        var w = maskText.getBBox().width;
        if (w > 10) ratio = w / 200;
      } catch (e) {}
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    function tick() {
      secs.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        var span = sec.offsetHeight - window.innerHeight;
        var p = clamp(-r.top / (span || 1), 0, 1);

        var frame = sec.querySelector('[data-reveal-frame]');
        var bg = sec.querySelector('[data-reveal-bg]');
        var rule = sec.querySelector('[data-reveal-rule]');
        var copy = sec.querySelector('[data-reveal-copy]');
        var flow = sec.querySelector('[data-reveal-flow]');

        // 'HAO' 글자 마스크가 중앙에서 커진다 — 레퍼런스 clipPath scale 곡선 실측값을 구간 보간
        if (frame && maskText) {
          var s = CURVE[CURVE.length - 1][1];
          for (var i = 1; i < CURVE.length; i++) {
            if (p <= CURVE[i][0]) {
              var a = CURVE[i - 1], b = CURVE[i];
              s = a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0] || 1));
              break;
            }
          }
          var fr = frame.getBoundingClientRect();
          // 도형 폭 = 프레임 폭 × scale (레퍼런스가 objectBoundingBox 를 scale 하는 것과 같은 결과)
          var fs = clamp((fr.width * s) / ratio, 1, 400000);
          maskText.setAttribute('font-size', fs.toFixed(1));
          maskText.setAttribute('x', (fr.width / 2).toFixed(1));
          // 캡 높이 기준 세로 중앙 (Pretendard 대문자 cap-height ≈ .73em)
          maskText.setAttribute('y', (fr.height / 2 + fs * 0.365).toFixed(1));
        }
        // 배경 사본 0 → 0.6
        if (bg) bg.style.opacity = (clamp(p / 0.86, 0, 1) * 0.6).toFixed(3);
        // 1px 룰 중앙에서 확장 (.5 → .85)
        if (rule) rule.style.transform = 'scaleX(' + clamp((p - 0.5) / 0.35, 0, 1).toFixed(3) + ')';
        // 본문 (.68 이후)
        if (copy) copy.dataset.in = p > 0.68 ? 'true' : 'false';
        // 공정 표시는 사진이 다 열린 뒤 (.9 이후) — 본문보다 늦게, 마지막에 한 단계씩
        if (flow) flow.dataset.in = p > 0.9 ? 'true' : 'false';
      });
      raf = requestAnimationFrame(tick);
    }

    var raf = requestAnimationFrame(tick);
  }

  /* ---------- 병원 페이지 — BEFORE DESIGN 블록 등장 (2026-08-14) ----------
     ⚠ `hospital.html` 의 한 섹션 전용. `[data-hosp-row]` 가 없으면 즉시 반환하므로
        나머지 42개 페이지에는 영향이 없다.
     WACUS 는 블록이 화면에 들어올 때 텍스트가 올라오고 이미지가 아래에서 열린다.
     같은 타이밍을 IntersectionObserver 로 재현한다(한 번만). */
  function initHospitalRows() {
    var rows = [].slice.call(document.querySelectorAll('[data-hosp-row]'));
    if (!rows.length) return;
    if (!('IntersectionObserver' in window)) {
      rows.forEach(function (r) { r.dataset.in = 'true'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.dataset.in = 'true';
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    rows.forEach(function (r) {
      io.observe(r);
      var b = r.getBoundingClientRect();
      if (b.top < window.innerHeight && b.bottom > 0) { r.dataset.in = 'true'; io.unobserve(r); }
    });
  }

  /* ---------- 병원 페이지 진입 모션 (2026-08-14) ----------
     레퍼런스 이식: soijeong 의 WOW fadeInUp(1s, delay 0.1s 간격) + bravomedi 의 차오르는 축.
     ⚠ `hospital.html` 전용. [data-hin] 이 없으면 즉시 반환하므로 다른 42개 페이지는 영향받지 않는다.
     ⚠ 숨김(opacity:0)은 `html.js-hin` 이 붙었을 때만 걸린다 — JS 가 죽거나 관찰자가 빗나가도
       섹션이 통째로 사라지지 않게 하기 위한 것이다(예전에 실제로 겪은 사고). */
  function initHospital() {
    var els = [].slice.call(document.querySelectorAll('[data-hin]'));
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.setAttribute('data-in', 'true'); });
      return;
    }

    document.documentElement.classList.add('js-hin');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-in', 'true');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 한 줄 진단 진입 (2026-08-14) ----------
     업종 페이지의 `[data-quick]` 에 사이트 주소를 넣으면 그대로 무료 제안 폼으로 넘긴다.
     레퍼런스(pointweb)의 "URL만 주시면 담당자가 직접 봅니다" 를 우리 방식으로 옮긴 것이다.
     ⚠ 접수 기능이 아직 없으므로 **여기서 접수하는 척하지 않는다** — 값을 들고 폼으로 이동만 한다.
     받는 쪽(`free-proposal`)에서는 같은 함수가 ?site= 를 읽어 '현재 홈페이지 주소'를 채운다.
     두 요소 모두 없으면 즉시 반환하므로 다른 페이지에는 영향이 없다. */
  function initQuick() {
    var forms = [].slice.call(document.querySelectorAll('[data-quick]'));
    // 받는 쪽은 두 곳이다 — 무료 진단(diagnosis) 과 무료 제안(free-proposal).
    // 둘은 다른 서비스다: 진단은 검색·AI 노출을 보고, 제안은 제작 방향과 범위를 잡는다.
    var site = document.getElementById('dg-site') || document.getElementById('fp-site');
    if (!forms.length && !site) return;

    forms.forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = f.querySelector('input');
        var v = input && input.value ? input.value.trim() : '';
        var url = f.getAttribute('data-quick') || 'free-proposal.html';
        window.location.href = v ? url + '?site=' + encodeURIComponent(v) : url;
      });
    });

    if (site && !site.value) {
      var m = /[?&]site=([^&]*)/.exec(window.location.search);
      if (m && m[1]) {
        try { site.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (err) { /* 잘못된 인코딩은 무시 */ }
      }
    }
  }

  /* ---------- 리스트 행 마퀴 ---------- */
  function initMarquee() {
    document.querySelectorAll('[data-marquee]').forEach(function (m) {
      var label = m.dataset.marquee;
      if (!label) return;
      var html = '';
      for (var i = 0; i < 8; i++) html += '<span>' + label + '</span>';
      m.innerHTML = html;
    });
  }

  /* ---------- 푸터 워드마크 ---------- */
  function initFooterMark() {
    document.querySelectorAll('[data-mark]').forEach(function (mark) {
      var text = mark.dataset.mark || mark.textContent.trim();
      mark.innerHTML = Array.prototype.map.call(text, function (ch) {
        return '<span>' + ch + '</span>';
      }).join('');
      if (reduced) return;
      var spans = mark.querySelectorAll('span');
      mark.addEventListener('pointermove', function (e) {
        var mr = mark.getBoundingClientRect();
        spans.forEach(function (s) {
          var b = s.getBoundingClientRect();
          var d = Math.abs((b.left + b.width / 2) - e.clientX);
          var f = clamp(1 - d / (mr.width * 0.34), 0, 1);
          s.style.fontWeight = String(Math.round(200 + f * 500));
        });
      });
      mark.addEventListener('pointerleave', function () {
        spans.forEach(function (s) { s.style.fontWeight = ''; });
      });
    });
  }

  /* ---------- 폼 (전송 없음 — 준비 중 고지) ---------- */
  function initForm() {
    document.querySelectorAll('[data-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = f.querySelector('[data-form-note]');
        if (note) note.hidden = false;
      });
    });
  }

  /* ---------- 고정 상담 탭 ----------
     히어로에는 이미 CTA 두 개가 있으므로 첫 화면에서는 내보내지 않고,
     스크롤이 히어로를 지난 뒤에만 꺼낸다. 푸터에 닿으면 다시 숨긴다 —
     푸터에도 같은 링크가 있어 중복이고, 푸터 위에 겹쳐 뜨는 것도 막는다. */
  function initConsultTab() {
    var tab = document.querySelector('[data-ctab]');
    if (!tab) return;

    var hasIO = 'IntersectionObserver' in window;
    var hero = document.querySelector('.hero, .subhero');
    var useHero = !!(hero && hasIO);
    var heroIn = useHero;       // 히어로가 보이는 동안은 안 꺼낸다 (히어로에 같은 CTA 가 이미 있다)
    var main = document.querySelector('main');

    /* 푸터는 `position: sticky; bottom: 0` 라 항상 화면 안에 걸려 있다.
       그래서 푸터를 IntersectionObserver 로 보면 첫 화면부터 '푸터에 닿음'이 참이 되어
       탭이 영영 안 나왔다 (2026-08-13 발견·수정). 실제로 푸터가 '드러나는' 시점은
       본문(main)이 화면 아래로 다 지나간 때다 — 그 조건으로 바꾼다. */
    function footerShown() {
      return !!main && main.getBoundingClientRect().bottom <= window.innerHeight + 4;
    }

    function sync() {
      var past = useHero ? !heroIn : window.scrollY > 400;
      tab.setAttribute('data-show', past && !footerShown() ? 'true' : 'false');
    }

    if (hasIO && hero) {
      new IntersectionObserver(function (entries) {
        heroIn = entries[0].isIntersecting;
        sync();
      }).observe(hero);
    }

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  }

  /* ---------- 단계 타임라인 ----------
     haoc.co.kr 실측: IntersectionObserver(threshold .15) 로 발동해서 250ms 뒤 시작 →
     스텝마다 420ms 간격으로 is-on 을 붙이고 진행선을 그 단계 점 중심까지 채운다.

     ⚠ 원본(haoc)과 다른 점 = **볼 때마다 다시 재생한다** (2026-08-14 세영 지시).
     원본은 `io.unobserve` 로 1회만 재생하고 끝이라, 한 번 지나친 뒤 다시 올라오면
     이미 완성된 상태로 멈춰 있었다. 지금은 화면에서 완전히 벗어나면(ratio 0) 초기화하고
     다시 15% 들어오면 처음부터 재생한다. 되돌리려면 reset() 호출을 빼고 unobserve 를 되살리면 된다.

     초기화를 '완전히 벗어났을 때'로 잡은 이유 — 15% 아래로 내려갈 때 지우면 타임라인이
     화면에 조금 걸쳐 있는 동안 눈앞에서 글자가 사라진다. 안 보이는 동안에만 지워야 한다.
     ※ 1180 이하에서는 CSS 가 `.tstep{opacity:1!important}` 로 모션을 끄므로 화면상 변화가 없다. */
  function initTimeline() {
    var tls = [].slice.call(document.querySelectorAll('[data-timeline]'));
    if (!tls.length) return;

    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var make = function (tl) {
      var steps = [].slice.call(tl.querySelectorAll('.tstep'));
      var fill = tl.querySelector('.timeline__line i');
      var at = -1;
      var timers = [];
      var playing = false;

      /* 원본(haoc)은 마지막 단계에서 선을 100% 까지 채우는데, 점은 각 칸의 왼쪽에 있어서
         마지막 점 오른쪽으로 빈 선이 남는다. 하오웹은 칸 간격이 더 넓어 그게 눈에 띄므로
         채움을 '그 단계 점의 중심'까지로 맞춘다. (점: left 2px + 지름 12 → 중심 +8) */
      var paint = function () {
        if (!fill || at < 0) return;
        fill.style.width = (steps[at].offsetLeft + 8) + 'px';
      };

      var tip = function (s) {
        steps.forEach(function (o) { o.classList.remove('is-tip'); });
        s.classList.add('is-tip');        /* 지금 도달한 단계 = 레드 점 */
      };

      /* 재생 중 화면 밖으로 나가면 남은 타이머가 다음 재생과 겹친다 — 반드시 끊는다 */
      var stop = function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
      };

      var reset = function () {
        if (reduce || !playing) return;    /* reduce 는 모션이 없으니 켜 둔 채로 */
        stop();
        playing = false;
        at = -1;
        steps.forEach(function (s) {
          s.classList.remove('is-on');
          s.classList.remove('is-tip');
        });
        if (fill) fill.style.width = '0px';
      };

      var play = function () {
        if (playing) return;               /* 스크롤 중 콜백이 여러 번 와도 한 번만 */
        playing = true;
        if (reduce) {
          steps.forEach(function (s) { s.classList.add('is-on'); });
          at = steps.length - 1;
          tip(steps[at]);
          paint();
          return;
        }
        stop();
        steps.forEach(function (s, i) {
          timers.push(setTimeout(function () {
            s.classList.add('is-on');
            tip(s);
            at = i;
            paint();
          }, 250 + i * 420));
        });
      };

      /* 예전엔 run() 안에서 붙여 재생할 때마다 리스너가 쌓였다 — 타임라인당 한 번만 붙인다 */
      window.addEventListener('resize', paint);
      return { el: tl, play: play, reset: reset };
    };

    var list = tls.map(make);
    var ctl = function (el) {
      for (var i = 0; i < list.length; i++) if (list[i].el === el) return list[i];
      return null;
    };

    if (!('IntersectionObserver' in window)) {
      list.forEach(function (o) { o.play(); });
      return;
    }
    /* 0 = 완전히 벗어남(초기화), .15 = 발동 — 두 지점 모두에서 콜백을 받아야 한다 */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var c = ctl(e.target);
        if (!c) return;
        if (!e.isIntersecting) c.reset();
        else if (e.intersectionRatio >= .15) c.play();
      });
    }, { threshold: [0, .15] });
    list.forEach(function (o) { io.observe(o.el); });
  }

  /* ---------- 작업 카드 등장 ----------
     interwise 는 부모에 .on 을 붙여 자식 .motion-1 을 한꺼번에 올린다(스태거 없음). 같은 방식. */
  function initWork() {
    var grids = [].slice.call(document.querySelectorAll('[data-work]'));
    if (!grids.length) return;
    var on = function (g) { g.setAttribute('data-on', 'true'); };
    if (!('IntersectionObserver' in window)) { grids.forEach(on); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        on(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: .15 });
    grids.forEach(function (g) { io.observe(g); });
  }

  /* ---------- 보기 전환 (카드 / 목록) ----------
     interwise 의 그리드·리스트 스위치를 응용했다. 목록 모드는 카드 도입 전의
     리스트 행(.rows + 마퀴)을 그대로 쓴다 — 마크업 두 벌이 다 들어있고 CSS 로 전환한다. */
  function initWorkView() {
    [].slice.call(document.querySelectorAll('[data-workview]')).forEach(function (wrap) {
      var btns = [].slice.call(wrap.querySelectorAll('[data-view-btn]'));
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          wrap.setAttribute('data-view', btn.getAttribute('data-view-btn'));
          btns.forEach(function (o) {
            o.setAttribute('aria-pressed', o === btn ? 'true' : 'false');
          });
        });
      });
    });
  }

  /* ---------- FAQ 카테고리 칩 ----------
     아코디언 자체는 <details> 라 JS 가 필요 없다. 여기서는 거르기만 한다. */
  function initFaq() {
    var wrap = document.querySelector('[data-faq]');
    if (!wrap) return;
    var chips = [].slice.call(wrap.querySelectorAll('[data-cat]'));
    var items = [].slice.call(wrap.querySelectorAll('.faq__item'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.getAttribute('data-cat');
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        items.forEach(function (item) {
          var show = cat === 'all' || item.getAttribute('data-cat') === cat;
          item.hidden = !show;
          if (!show) item.removeAttribute('open');   // 접어두고 숨긴다
        });
      });
    });
  }

  /* ---------- AI VISIBILITY 장면 전환 (SEO / AEO / GEO) ---------- */
  function initViz() {
    [].slice.call(document.querySelectorAll('[data-viz]')).forEach(function (viz) {
      var tabs = [].slice.call(viz.querySelectorAll('[data-viz-tab]'));
      var panels = [].slice.call(viz.querySelectorAll('[data-viz-panel]'));
      var show = function (key) {
        tabs.forEach(function (t) {
          t.setAttribute('aria-pressed', t.getAttribute('data-viz-tab') === key ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          p.setAttribute('data-on', p.getAttribute('data-viz-panel') === key ? 'true' : 'false');
        });
      };
      tabs.forEach(function (t) {
        t.addEventListener('click', function () { show(t.getAttribute('data-viz-tab')); });
      });

      /* 노드가 위에서 아래로 이어지는 모션은 '화면에 들어왔을 때' 한 번 돈다.
         첫 패널은 로드 시점부터 열려 있어서, 이 표시가 없으면 스크롤해 내려오기 전에
         애니메이션이 끝나 버린다. 탭 전환 때는 display:none→block 이 다시 재생시킨다.
         관찰이 안 되는 환경에서는 그냥 켜 둔다 — 애니메이션이 없어도 내용은 다 보인다. */
      if (!('IntersectionObserver' in window)) { viz.setAttribute('data-seen', 'true'); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          viz.setAttribute('data-seen', 'true');
          io.unobserve(e.target);
        });
      }, { threshold: .2 });
      io.observe(viz);
    });
  }

  function start() {
    initNav();
    initReveal();
    initHeroCanvas();
    initStickyReveal();
    initMarquee();
    initFooterMark();
    initForm();
    initConsultTab();
    initTimeline();
    initHospitalRows();
    initHospital();
    initQuick();
    initWork();
    initWorkView();
    initFaq();
    initViz();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
