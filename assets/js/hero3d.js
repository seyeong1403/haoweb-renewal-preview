/* 메인 히어로 유리 오브젝트 (2026-08-13 세영 지시)
   ─ 사진을 빼고 Three.js 유리 도넛을 얹는다.
   ─ 글자는 DOM 그대로다. 캔버스는 글자 '위'에 투명하게 겹칠 뿐이라 글자가 굴절되지는 않는다
     (굴절시키려면 글자까지 3D 씬 안에 넣어야 하는데, 그러면 한글 폰트를 typeface JSON 으로
      변환해야 하고 파일이 수 MB 가 된다. interwise.co.kr 이 그 방식이고 우리는 안 쓴다).
   ─ 실패하거나 WebGL 이 없으면 캔버스를 지우고 조용히 끝낸다. 히어로 카피는 캔버스와 무관하게 나온다. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js';

const canvas = document.getElementById('hero-gl');
if (canvas) {
  try { initHero(canvas); }
  catch (e) { console.warn('hero3d 초기화 실패:', e); canvas.remove(); }
}

function initHero(canvas) {
  const hero = canvas.closest('.hero') || canvas.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  /* 환경맵 — 유리가 굴절·반사할 '주변 풍경'이다. 검은 바탕에서는 이게 없으면 유리가 보이지 않는다.
     HDRI 파일을 받아오지 않고 캔버스에 그린 그라데이션을 쓴다(무채색 + 아주 옅은 한기·온기). */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = makeEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(-4, -2, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const group = new THREE.Group();
  scene.add(group);

  /* ⚠ transmission(굴절 투과)은 쓰지 않는다.
     transmission 은 '씬 안에 있는 뒤쪽 물체'를 굴절시키는 기능인데, 우리 씬에는 글자가 없다
     (글자는 DOM 이다). 검은 바탕에서 이걸 켜면 굴절할 대상이 없어 회색 덩어리로 보인다.
     대신 알파를 낮춘 반투명 + 강한 환경반사로 '비눗방울 유리'를 만든다.
     이러면 캔버스 알파를 통해 뒤의 DOM 글자가 왜곡 없이 그대로 비친다(세영님 요구사항).
     ※ 2026-08-13 에 밝은 톤(mkt)에 맞춰 transmission .72 + iridescence 로 바꿨다가,
       색상을 다크로 되돌리면서 이 값으로 함께 되돌렸다. */
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.4, 72, 220),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1, roughness: 0.06,
      transparent: true, opacity: 0.34,
      clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 1000],
      envMapIntensity: 3.4,
      side: THREE.DoubleSide,   // 뒷면까지 보여야 유리 두께가 읽힌다
      depthWrite: false,        // 뒷면·앞면이 서로를 가리는 정렬 문제 방지
    })
  );
  torus.rotation.set(0.5, 0.35, 0);
  group.add(torus);

  /* 배치 — 카피는 좌측 하단이라 오브젝트는 우측에 둔다.
     좁은 화면에서는 가로로 놓을 자리가 없어 위쪽 중앙으로 올리고 줄인다. */
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    const aspect = w / h;
    const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI / 180) / 2);
    const visW = visH * aspect;

    if (w >= 1024) {
      group.position.set(visW * 0.27, visH * 0.04, 0);
      group.scale.setScalar(Math.min(0.95, visW * 0.115));
    } else if (w >= 640) {
      group.position.set(visW * 0.22, visH * 0.12, 0);
      group.scale.setScalar(Math.min(0.8, visW * 0.12));
    } else {
      group.position.set(visW * 0.1, visH * 0.22, 0);
      group.scale.setScalar(Math.min(0.62, visW * 0.24));
    }

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  layout();
  addEventListener('resize', layout);

  /* 마우스 — 그룹 전체가 아주 느리게 따라 기운다(관성 보간). 터치 기기에서는 동작하지 않는다. */
  let mx = 0, my = 0, tx = 0, ty = 0;
  if (matchMedia('(hover:hover)').matches) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* 히어로가 화면 밖이면 렌더를 멈춘다 — transmission 은 매 프레임 장면을 한 번 더 그려서 비싸다. */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; },
    { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const d = Math.min(clock.getDelta(), 0.05);   // 탭 복귀 시 튀는 것 방지

    if (!reduce) {
      torus.rotation.x += d * 0.32;
      torus.rotation.y += d * 0.45;
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      group.rotation.y = mx * 0.42;
      group.rotation.x = -my * 0.26;
    }
    renderer.render(scene, camera);
  });

  /* 무채색 환경맵 — 위쪽은 밝고 아래는 어둡게, 옆으로 아주 옅은 색 편차만 준다.
     색을 세게 주면 검은 바탕에서 오브젝트만 튀어 브랜드 톤과 어긋난다. */
  function makeEnvTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');

    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0.00, '#ffffff');
    v.addColorStop(0.42, '#d8d8d6');
    v.addColorStop(0.62, '#6f6f6f');
    v.addColorStop(1.00, '#101010');
    g.fillStyle = v; g.fillRect(0, 0, 1024, 512);

    const h = g.createLinearGradient(0, 0, 1024, 0);
    h.addColorStop(0.00, 'rgba(255,214,186,.30)');   // 온기
    h.addColorStop(0.50, 'rgba(255,255,255,0)');
    h.addColorStop(1.00, 'rgba(186,214,255,.30)');   // 한기
    g.fillStyle = h; g.fillRect(0, 0, 1024, 512);

    // 밝은 띠 두 개 = 유리 표면에 길게 흐르는 하이라이트
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.fillRect(0, 96, 1024, 26);
    g.fillRect(0, 208, 1024, 12);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
