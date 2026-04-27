// =========================================================
// 자석 실험 - 메인 스크립트 (app.js)
// Three.js로 3D 장면을 만들고 드래그/충돌/단계 플로우를 관리합니다.
// 초보자 팁: 각 섹션마다 주석이 상세히 붙어 있으니 천천히 읽어보세요.
// =========================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }   from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }  from 'three/addons/loaders/DRACOLoader.js';

// 전역 에러 핸들러 (문제가 생기면 화면 상단에 빨갛게 표시)
window.addEventListener('error', (e) => {
  const bar = document.getElementById('status-bar');
  if (bar) {
    bar.style.background = '#ffebee';
    bar.style.color = '#c62828';
    bar.textContent = '❌ 오류: ' + e.message;
  }
  console.error('[전역 에러]', e.error || e.message);
});

// =========================================================
// 0. 전역 데이터 설정
// =========================================================

// =========================================================
// 물체 카탈로그 (확장 가능한 마스터 목록)
// - 이 배열에 새 물체를 추가하면 해당 탭의 선택지에 자동으로 반영됩니다.
// 필드 설명:
//   file:       models/ 안의 glb 파일명
//   name:       화면에 보여줄 한글 이름
//   magnetic:   자석에 붙는지 (true = 철)
//   emoji:      커스텀 선택 화면의 아이콘
//   scale:      크기 배율 (기본 1.0)
//   rotationX/Y/Z:  눕히기 등의 축 회전 (라디안, 생략 가능)
//   yOffset:    책상 위에서 추가로 띄우는 높이 (모델 원점 보정용)
//   isStandard: "탐구 활동 실험하기" 탭에 포함되는지 여부
//                → true일 때는 defaultPos 필수
//   isCustom:   "내가 정한 물체로 실험하기" 탭의 선택지에 포함되는지 여부
// =========================================================
const ITEMS_CATALOG = [
  // ── "탐구 활동 실험하기" 탭용 7개 (기존 유지) ──
  {
    file: 'plastic_ruler.glb', name: '플라스틱자', magnetic: false, emoji: '📏',
    scale: 1.0, rotationZ: Math.PI / 2, rotationY: Math.PI / 2,
    isStandard: true, isCustom: false,
    defaultPos: [-1.7, -0.4],
  },
  {
    file: 'iron_clip.glb', name: '철 클립', magnetic: true, emoji: '📎',
    scale: 0.67, rotationZ: Math.PI / 2, rotationY: Math.PI / 4,
    isStandard: true, isCustom: false,
    defaultPos: [-0.7, -0.4],
  },
  {
    file: 'pencil.glb', name: '연필', magnetic: false, emoji: '✏️',
    scale: 1.5, rotationY: Math.PI / 2,
    isStandard: true, isCustom: false,
    defaultPos: [0.1, -0.4],
  },
  {
    file: 'bead.glb', name: '구슬', magnetic: false, emoji: '🔵',
    scale: 0.5,
    isStandard: true, isCustom: false,
    defaultPos: [0.95, -0.4],
  },
  {
    file: 'aluminum_foil_dish.glb', name: '알루미늄호일 접시', magnetic: false, emoji: '🥄',
    scale: 1.5,
    isStandard: true, isCustom: false,
    defaultPos: [-1.3, 0.4],
  },
  {
    file: 'iron_tongs.glb', name: '철 집게', magnetic: true, emoji: '🗜️',
    scale: 0.5,
    isStandard: true, isCustom: false,
    defaultPos: [0.05, 0.4],
  },
  {
    file: 'eraser.glb', name: '지우개', magnetic: false, emoji: '🧽',
    scale: 0.67,
    isStandard: true, isCustom: false,
    defaultPos: [1.05, 0.4],
  },

  // ── "내가 정한 물체로 실험하기" 탭용 7개 (커스텀 모드 선택지) ──
  {
    file: 'band.glb', name: '고무줄', magnetic: false, emoji: '➰',
    scale: 1.0,
    isStandard: false, isCustom: true,
  },
  {
    file: 'can.glb', name: '알루미늄 캔', magnetic: false, emoji: '🥫',
    scale: 1.0,
    isStandard: false, isCustom: true,
  },
  {
    file: 'iron nail.glb', name: '철 못', magnetic: true, emoji: '🔩',
    scale: 0.8,
    isStandard: false, isCustom: true,
  },
  {
    file: 'memo.glb', name: '붙임쪽지', magnetic: false, emoji: '📝',
    scale: 1.0,
    isStandard: false, isCustom: true,
  },
  {
    file: 'mug.glb', name: '유리컵', magnetic: false, emoji: '🥛',
    scale: 1.0,
    isStandard: false, isCustom: true,
  },
  {
    // 가위 — 특수 항목 (isScissors: true)
    // 로드 시 "가위 날"(철)과 "가위 손잡이"(플라스틱)로 분리해 두 개의 물체처럼 동작
    file: 'scissors.glb', name: '가위', magnetic: false, emoji: '✂️',
    scale: 1.33,                 // 2/3 = 0.67 → 1.5배 / 원문 "2/3 늘려"의 해석이 애매하니
                                  //  기존 0.8 → 1.33 (약 1.67배)로 약간 크게
    rotationY: Math.PI / 2,      // 90도 회전
    isStandard: false, isCustom: true,
    isScissors: true,            // 특수 처리 플래그
  },
  {
    file: 'wooden_chopsticks.glb', name: '나무젓가락', magnetic: false, emoji: '🥢',
    scale: 1.3,
    rotationY: Math.PI / 2,                // Y축 90도 (자체적으로 자전)
    // 평평한 물체라 가장 넓은 면이 xz 평면(책상)에 닿도록 자동 정렬
    flattenOnSurface: true,
    isStandard: false, isCustom: true,
  },
];

// 현재 모드 ('standard' = 실험하기 탭, 'custom' = 내가 정한 물체로 실험하기 탭)
let currentMode = 'standard';

// 현재 실험에 사용되는 물체 목록
// - standard 모드: ITEMS_CATALOG에서 isStandard=true 인 것들 + 각자의 defaultPos
// - custom 모드: 사용자가 선택한 것들 + 랜덤 위치
// 각 원소는 { file, name, magnetic, scale, rotationX/Y/Z, pos: [x, z], yOffset } 형태
let currentItems = [];

// 선택한 커스텀 물체 파일명들 (custom 모드에서 사용)
const customSelection = new Set();

/**
 * standard 모드에서 사용할 기본 물체 목록 만들기
 * - ITEMS_CATALOG의 isStandard 항목에 defaultPos를 pos로 복사
 */
function buildStandardItems() {
  return ITEMS_CATALOG
    .filter(c => c.isStandard)
    .map(c => ({ ...c, pos: [c.defaultPos[0], c.defaultPos[1]] }));
}

/**
 * 물체 크기 캐시 (파일명 → { halfWidth, halfDepth })
 * - 한 번 측정한 glb는 반복 재측정하지 않기 위함
 */
const itemSizeCache = new Map();

/**
 * 단일 물체의 실제 XZ 방향 반지름(halfWidth, halfDepth)을 측정
 * - glb를 임시로 로드해 fitToSize 및 회전까지 적용한 상태에서 Box3로 계산
 * - Y축(위아래)은 배치에 영향 없으므로 무시
 */
async function measureItemFootprint(item) {
  if (itemSizeCache.has(item.file)) {
    return itemSizeCache.get(item.file);
  }

  // 물체를 임시로 로드해서 실제 크기 측정
  const obj = await loadGLB('models/' + item.file);

  // 실제 배치될 때와 동일한 회전 먼저 적용
  if (item.rotationX) obj.rotation.x = item.rotationX;
  if (item.rotationY) obj.rotation.y = item.rotationY;
  if (item.rotationZ) obj.rotation.z = item.rotationZ;
  obj.updateMatrixWorld(true);

  // 동일한 fitToSize 적용
  fitToSize(obj, 0.5 * (item.scale || 1));
  obj.updateMatrixWorld(true);

  // XZ 반지름 측정
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const footprint = {
    halfWidth: size.x / 2,   // x축 반지름
    halfDepth: size.z / 2,   // z축 반지름
  };

  itemSizeCache.set(item.file, footprint);
  return footprint;
}

/**
 * custom 모드: 선택된 물체들에 "겹치지 않는 랜덤 위치" 부여
 * - 전략: 실제 바운딩 박스로 크기 측정 → 격자 배치 → 각 칸 안에서 랜덤 오프셋
 * - 어떤 큰 물체가 섞여도 겹치지 않도록 보장
 */
async function buildCustomItems(selectedFiles) {
  const picked = ITEMS_CATALOG.filter(c => selectedFiles.has(c.file));
  if (picked.length === 0) return [];

  // 1) 모든 물체의 실제 크기 측정 (병렬)
  const footprints = await Promise.all(picked.map(measureItemFootprint));

  // 2) 책상 위 배치 가능 영역 (바구니 영역 제외)
  const xMin = -2.0, xMax = 1.3;
  const zMin = -0.7, zMax = 0.7;
  const areaWidth = xMax - xMin;
  const areaDepth = zMax - zMin;

  // 3) 격자 칸 수 계산
  //    - 물체 개수를 담을 수 있는 가장 적합한 cols × rows 찾기
  //    - 책상이 가로로 긴 편이라 cols를 더 많게 설정
  const count = picked.length;
  let cols = Math.ceil(Math.sqrt(count * (areaWidth / areaDepth)));
  let rows = Math.ceil(count / cols);
  if (cols * rows < count) rows++;

  // 각 칸의 크기
  const cellWidth = areaWidth / cols;
  const cellDepth = areaDepth / rows;

  // 4) 큰 물체부터 칸에 배치 (여유 있는 공간에 큰 것부터 놓기)
  const indexed = picked.map((item, i) => ({
    item,
    footprint: footprints[i],
    originalIndex: i,
  }));
  indexed.sort((a, b) => {
    const sA = a.footprint.halfWidth + a.footprint.halfDepth;
    const sB = b.footprint.halfWidth + b.footprint.halfDepth;
    return sB - sA;  // 큰 것부터
  });

  // 5) 사용 가능한 칸 목록을 섞어서 무작위 배정 ("랜덤 느낌")
  const cellIndices = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellIndices.push([c, r]);
    }
  }
  // Fisher-Yates 셔플
  for (let i = cellIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
  }

  // 6) 각 물체에 칸 배정 + 칸 안에서 작은 랜덤 오프셋
  const results = new Array(picked.length);
  indexed.forEach((entry, idx) => {
    const [col, row] = cellIndices[idx];
    // 칸의 중심 좌표
    const cellCenterX = xMin + cellWidth * (col + 0.5);
    const cellCenterZ = zMin + cellDepth * (row + 0.5);

    // 칸 안에서 움직일 수 있는 여유 공간 (물체 크기를 고려)
    // - 물체가 칸 경계를 넘지 않도록 허용 범위를 제한
    const marginX = Math.max(0, (cellWidth / 2) - entry.footprint.halfWidth - 0.05);
    const marginZ = Math.max(0, (cellDepth / 2) - entry.footprint.halfDepth - 0.05);

    // 칸 중심 ± margin 안에서 랜덤 오프셋
    const offsetX = (Math.random() * 2 - 1) * marginX;
    const offsetZ = (Math.random() * 2 - 1) * marginZ;

    const finalX = cellCenterX + offsetX;
    const finalZ = cellCenterZ + offsetZ;

    results[entry.originalIndex] = {
      ...entry.item,
      pos: [finalX, finalZ],
    };
  });

  return results;
}

// 단계 관리용 상태 변수
const state = {
  predictions: {},          // 예상 값 저장: { '철 클립': true/false, ... }
  results: {},              // 실제 실험 결과
  attachedToMagnet: null,
  attachedHalfHeight: 0,    // 붙은 물체의 중심→윗면 거리
  attachedBottomDist: 0,    // 붙은 물체의 중심→아랫면 거리 (책상 면 침범 방지용)
  lastTouchedName: null,    // 마지막으로 자석이 닿은 물체 이름 (효과음 중복 재생 방지)
  collectedInBasket: [],
  testedItems: new Set(),
  predictionSkipped: false, // 예상하기를 건너뛴 경우 true
  step: 'intro',
};

// 모든 물체 수집 후 다음 화면(비교하기/정리하기)을 띄우는 setTimeout의 ID
// - 사용자가 도중에 '메인 화면'으로 돌아가면 이 타이머를 취소해서
//   비교하기/정리하기 화면이 메인 화면 위에 뜨는 일이 없도록 함
let pendingFinishTimer = null;

// 실험 흐름 세대(generation) 토큰
// - 사용자가 '메인 화면' 버튼을 누를 때마다 1 증가
// - async 함수(switchMode, custom-start-btn 등) 시작 시 현재 값을 캡처해두고,
//   await에서 깨어났을 때 캡처값과 다르면 도중에 메인 화면으로 돌아간 것이므로 중단
// - 단순한 state.step 체크가 안 되는 이유:
//   custom 모드에선 물체 선택 화면 동안 step이 'menu'에 머물러 있어서 false-positive 발생
let flowGeneration = 0;

// 정답지 갱신 (현재 모드의 물체들로부터 "붙는지/안 붙는지" 기록)
// - 실험 시작 시점에 호출됨
// - 가위는 "가위 날"(철) / "가위 손잡이"(플라스틱) 두 개로 전개
function buildResultsFromCurrentItems() {
  state.results = {};
  currentItems.forEach(it => {
    if (it.isScissors) {
      state.results['가위 날']     = true;    // 철
      state.results['가위 손잡이'] = false;   // 플라스틱
    } else {
      state.results[it.name] = it.magnetic;
    }
  });
}

/**
 * 실험 진행 패널/예상표/비교표에서 쓸 "표시용 물체 목록" 생성
 * - currentItems의 가위 항목을 날/손잡이로 풀어서 반환
 */
function getDisplayItems() {
  const out = [];
  currentItems.forEach(it => {
    if (it.isScissors) {
      out.push({ name: '가위 날',     magnetic: true  });
      out.push({ name: '가위 손잡이', magnetic: false });
    } else {
      out.push({ name: it.name, magnetic: it.magnetic });
    }
  });
  return out;
}

// =========================================================
// 1. Three.js 기본 장면 설정
// =========================================================

const container = document.getElementById('scene-container');
const appFrame = document.getElementById('app-frame') || document.body;
const VIEW_ASPECT = 16 / 9;

function getFrameSize() {
  const rect = appFrame.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect.height || window.innerHeight)),
  };
}

// 1-1. 장면(Scene)
const scene = new THREE.Scene();
// 배경판 뒤쪽이나 사이드 여백에 보일 색 (배경판이 안 보이는 영역용 폴백)
scene.background = new THREE.Color(0xf5faff);

// 1-2. 카메라 (원근법)
const camera = new THREE.PerspectiveCamera(
  45,                                    // 시야각
  VIEW_ASPECT,                            // 16:9 기준 화면 비율
  0.1,                                    // 가까운 거리
  100                                     // 먼 거리
);
// 책상을 정면에서 약간 위에서 내려다보는 위치
camera.position.set(0, 3.5, 6);
camera.lookAt(0, 1, 0);

// 1-3. 렌더러 (그림을 그려주는 엔진)
const renderer = new THREE.WebGLRenderer({ antialias: true });
const initialRenderSize = getFrameSize();
renderer.setSize(initialRenderSize.width, initialRenderSize.height, false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;  // 그림자 활성화
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 1-4. 조명
// 은은한 전체 조명 (강도 ↑: 0.6 → 1.1)
const ambient = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambient);

// 방향성 조명 (햇빛처럼 그림자를 만드는 조명) (강도 ↑: 0.8 → 1.2)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left   = -10;
dirLight.shadow.camera.right  =  10;
dirLight.shadow.camera.top    =  10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

// 반대편 보조 조명 (그림자 쪽 어둡지 않도록 살짝 채워주는 빛)
const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
fillLight.position.set(-5, 6, -5);
scene.add(fillLight);

// 하늘-바닥 조명 (위는 밝은 하늘색, 아래는 따뜻한 반사광 느낌)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 0.5);
scene.add(hemiLight);

// 1-5. OrbitControls (상하좌우 ±30도 회전 + 줌 허용)
// - 책상 평면 드래그 방식이라 팬은 비활성화하지만,
//   3D 느낌을 살리기 위해 상하좌우로 30도씩 회전할 수 있게 합니다.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;   // 부드러운 움직임
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 12;
controls.enableRotate = true;
controls.enablePan = false;      // 팬(이동) 비활성화
// 좌우 회전 범위: -30도 ~ +30도
controls.minAzimuthAngle = -Math.PI / 6;
controls.maxAzimuthAngle =  Math.PI / 6;
// 상하 회전 범위: 초기 각도 기준 ±30도
// (position(0,3.5,6) + target(0,1,0) 으로부터 초기 polar angle 계산)
const _initDx = 0, _initDy = 3.5 - 1, _initDz = 6;
const _initialPolar = Math.atan2(
  Math.sqrt(_initDx * _initDx + _initDz * _initDz),
  _initDy
);
controls.minPolarAngle = Math.max(0.01,              _initialPolar - Math.PI / 6);
controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.01, _initialPolar + Math.PI / 6);

// =========================================================
// 2. 모델 불러오기
// =========================================================

// DRACO 압축된 glb를 풀기 위한 디코더 설정
// (models/ 폴더의 glb 파일들이 KHR_draco_mesh_compression 으로 압축돼 있어서 필요)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// glb 파일 하나를 불러와서 Promise로 돌려주는 헬퍼 함수
function loadGLB(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      gltf => resolve(gltf.scene),
      undefined,
      err => reject(err)
    );
  });
}

// 오브젝트를 적당한 크기로 맞추는 함수
// 오브젝트를 적당한 크기로 맞추는 함수
// - 모델마다 원본 크기가 다르므로 targetSize(최대 변의 길이)에 맞춰 스케일 조정
// - 회전이 이미 적용된 상태에서도 정확히 동작하도록 matrixWorld를 명시적으로 갱신
function fitToSize(obj, targetSize) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    obj.scale.setScalar(scale);
    obj.updateMatrixWorld(true);   // 크기 변경 반영
  }
  return obj;
}

// 오브젝트의 바닥(Y 최하점)이 특정 y값에 오도록 맞추는 함수
// - 회전/스케일이 모두 반영된 실제 월드 바운딩 박스로 계산
function placeOnSurface(obj, surfaceY) {
  obj.updateMatrixWorld(true);

  // 실제 mesh의 모든 vertex 중 최저 y를 찾기 (Box3보다 정확)
  let minY = Infinity;
  let vertexCount = 0;
  obj.traverse(child => {
    if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) return;
    const pos = child.geometry.attributes.position;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      tmp.applyMatrix4(child.matrixWorld);
      if (tmp.y < minY) minY = tmp.y;
      vertexCount++;
    }
  });

  // vertex가 없으면 Box3로 대체
  if (!isFinite(minY)) {
    const box = new THREE.Box3().setFromObject(obj);
    minY = box.min.y;
  }

  const adjustY = surfaceY - minY;
  obj.position.y += adjustY;
  obj.updateMatrixWorld(true);

  // 디버그: 나무젓가락 위치 정보 출력
  if (obj.userData?._debugName === '나무젓가락') {
    console.log(`🥢 placeOnSurface: 최저Y=${minY.toFixed(4)}, surfaceY=${surfaceY.toFixed(4)}, adjustY=${adjustY.toFixed(4)}, vertexCount=${vertexCount}`);
    console.log(`🥢 후 position.y=${obj.position.y.toFixed(4)}, rotation:`, obj.rotation);
    // 후처리 후 다시 측정해서 진짜 최저점이 책상 면에 맞는지 검증
    obj.updateMatrixWorld(true);
    let verifyMinY = Infinity;
    obj.traverse(c => {
      if (!c.isMesh || !c.geometry?.attributes.position) return;
      const p = c.geometry.attributes.position;
      const t = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        t.fromBufferAttribute(p, i).applyMatrix4(c.matrixWorld);
        if (t.y < verifyMinY) verifyMinY = t.y;
      }
    });
    console.log(`🥢 검증: 최저점이 ${verifyMinY.toFixed(4)} (책상 ${surfaceY.toFixed(4)}와 차이: ${(verifyMinY - surfaceY).toFixed(4)})`);
  }
}

// 오브젝트의 모든 mesh가 그림자를 만들고 받도록 설정
function enableShadow(obj) {
  obj.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * 길쭉/평평한 물체를 책상 면(xz 평면)에 전체적으로 닿게 정렬
 * - bounding box 측정 → 가장 짧은 차원이 Y축이 되도록 회전
 * - 즉 물체의 가장 넓은 면(긴 두 축)이 자연스럽게 xz 평면(책상)에 닿게 됨
 *   예) 나무젓가락처럼 납작한 물체 → 길이/너비는 책상에 펼쳐지고 두께가 위쪽
 */
function autoFlattenObject(obj) {
  obj.updateMatrixWorld(true);

  // 1) 현재 bounding box 측정
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  // 2) 세 차원 중 가장 작은 차원이 어느 축인지 찾음
  //    그 축이 Y축(=수직)이 되어야 가장 넓은 면이 xz 평면에 닿음
  const sx = size.x, sy = size.y, sz = size.z;
  const minDim = Math.min(sx, sy, sz);

  let action = '회전 없음';
  if (minDim === sy) {
    // 이미 Y가 가장 작음 → 이미 평평하게 누워있음, 회전 불필요
  } else if (minDim === sx) {
    // X가 가장 작음 → X와 Y를 swap (Z축 기준 90도 회전)
    obj.rotation.z += Math.PI / 2;
    action = 'Z축 90도 회전 (X→Y swap)';
  } else {
    // Z가 가장 작음 → Y와 Z를 swap (X축 기준 90도 회전)
    obj.rotation.x += Math.PI / 2;
    action = 'X축 90도 회전 (Z→Y swap)';
  }

  if (obj.userData?._debugName) {
    console.log(`🥢 [평탄화 전] X=${sx.toFixed(3)} Y=${sy.toFixed(3)} Z=${sz.toFixed(3)}, 작업: ${action}`);
    obj.updateMatrixWorld(true);
    const newBox = new THREE.Box3().setFromObject(obj);
    const newSize = new THREE.Vector3();
    newBox.getSize(newSize);
    console.log(`🥢 [평탄화 후] X=${newSize.x.toFixed(3)} Y=${newSize.y.toFixed(3)} Z=${newSize.z.toFixed(3)} (Y가 가장 작아야 정상)`);
  }

  obj.updateMatrixWorld(true);
}

/**
 * 오브젝트를 다른 물체보다 항상 위에 보이도록 설정
 * (자석에 붙은 물체가 다른 물체에 가려지지 않게 하기 위함)
 * - renderOrder를 높여 가장 나중에 그림 (다른 물체 위에 표시됨)
 * - depthTest는 켜둠 → 같은 오브젝트 내 mesh 간 앞/뒤 관계는 유지 (모양 정상)
 */
function bringObjectToFront(obj) {
  obj.renderOrder = 999;
  obj.traverse(child => {
    if (child.isMesh) {
      // 원래 값 백업 (해제 시 복원용)
      if (child.userData._origRenderOrder === undefined) {
        child.userData._origRenderOrder = child.renderOrder;
      }
      child.renderOrder = 999;
    }
  });
}

/**
 * bringObjectToFront로 변경한 렌더 설정을 원래대로 되돌림
 * (바구니에 떨어뜨릴 때 호출)
 */
function restoreObjectRender(obj) {
  obj.renderOrder = 0;
  obj.traverse(child => {
    if (child.isMesh) {
      if (child.userData._origRenderOrder !== undefined) {
        child.renderOrder = child.userData._origRenderOrder;
        delete child.userData._origRenderOrder;
      }
    }
  });
}

// =========================================================
// 3D 실험실 배경 만들기 (초등학교 과학실 느낌)
// - 바닥, 뒷벽, 좌우 벽, 창문, 천장 조명
// =========================================================
function buildClassroomBackground() {
  // --- 1. 바닥 (연한 베이지 타일 느낌) ---
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf5ecd9,    // 연한 베이지
    roughness: 0.9,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;   // 눕히기 (수평)
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- 2. 뒷벽 (민트색 벽) ---
  const backWallGeo = new THREE.PlaneGeometry(30, 12);
  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0xcfe9e2,    // 연한 민트색
    roughness: 0.95,
  });
  const backWall = new THREE.Mesh(backWallGeo, backWallMat);
  backWall.position.set(0, 6, -8);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // --- 3. 좌우 벽 (더 밝은 흰색) ---
  const sideWallMat = new THREE.MeshStandardMaterial({
    color: 0xfbfdff,
    roughness: 0.95,
  });
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), sideWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-10, 6, -2);
  scene.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), sideWallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(10, 6, -2);
  scene.add(rightWall);

  // --- 4. 창문 (오른쪽 벽에) ---
  const windowFrameGeo = new THREE.BoxGeometry(0.15, 3.5, 3.5);
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });
  const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
  windowFrame.position.set(9.92, 6.5, -2);
  scene.add(windowFrame);
  // 창문 내부 (하늘색 유리)
  const windowGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 3.1, 3.1),
    new THREE.MeshStandardMaterial({
      color: 0xbde0fe,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
    })
  );
  windowGlass.position.set(9.88, 6.5, -2);
  scene.add(windowGlass);

  // --- 5. 천장 조명(형광등) ---
  const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1 });
  for (let i = 0; i < 2; i++) {
    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.1, 0.5),
      lightBarMat
    );
    lightBar.position.set(-3 + i * 6, 11.95, -2);
    scene.add(lightBar);
  }

  console.log('✅ 실험실 배경 구성 완료');
}

// =========================================================
// 3. 장면 구성하기 (책상 + 물체들 + 자석 + 바구니)
// =========================================================

/**
 * 현재 currentItems를 씬에 로드해서 책상 위에 배치
 * - 한 개씩 순차적으로 로드해서 하나씩 나타나는 느낌 (for ... await)
 * - buildScene 최초 실행 시 및 모드 전환 시 호출
 */
// loadItemsToScene 호출의 epoch (세대) 추적
// - 새 호출이 들어오면 이 값을 1 증가시키고 기존 진행 중 호출은 자기 epoch와
//   비교해 다르면 중단(+자기가 추가한 물체는 다시 제거).
// - 사용자가 빠르게 모드를 바꾸거나 카드를 더블클릭할 때 두 로드가 병렬로
//   돌면서 씬에 같은 모델이 두 번 추가되는 문제(자석에 붙어도 원래 자리에
//   유령 클립이 남는 현상)를 방지함.
let loadItemsEpoch = 0;

/**
 * 현재 모드의 currentItems를 씬에 로드
 * - 한 개씩 순차적으로 로드해서 하나씩 나타나는 느낌 (for ... await)
 * - buildScene 최초 실행 시 및 모드 전환 시 호출
 * - 도중에 다시 호출되면 자동으로 이전 호출은 중단되고 자기가 추가했던 물체는 제거
 */
async function loadItemsToScene() {
  // 새 로드 시작 → epoch 증가. 기존 진행 중이던 같은 함수는 이걸 보고 중단됨.
  const myEpoch = ++loadItemsEpoch;
  // 이번 호출이 추가한 오브젝트들 (중도 중단 시 제거하기 위해 따로 추적)
  const myAdded = [];

  for (const item of currentItems) {
    // [경합 방지] 더 새로운 loadItemsToScene 호출이 시작됐으면 즉시 중단 + 자기 흔적 정리
    if (myEpoch !== loadItemsEpoch) {
      myAdded.forEach(obj => {
        scene.remove(obj);
        obj.traverse(child => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          }
        });
      });
      return;
    }

    const obj = await loadGLB('models/' + item.file);

    // await 직후에도 한 번 더 체크 (await 도중 새 호출이 들어왔을 수 있음)
    if (myEpoch !== loadItemsEpoch) {
      // 방금 로드한 obj는 아직 scene에 추가 전이지만, 메모리 정리
      obj.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
      // 이전에 추가한 것들도 정리
      myAdded.forEach(o => {
        scene.remove(o);
        o.traverse(child => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          }
        });
      });
      return;
    }

    // 디버그용: 나무젓가락 식별 + 원본 bounding box 측정
    if (item.name === '나무젓가락') {
      obj.userData._debugName = '나무젓가락';
      // 회전/스케일 적용 전 원본 차원 측정
      obj.updateMatrixWorld(true);
      const origBox = new THREE.Box3().setFromObject(obj);
      const origSize = new THREE.Vector3();
      origBox.getSize(origSize);
      console.log(`🥢 [원본] 차원 X=${origSize.x.toFixed(3)} Y=${origSize.y.toFixed(3)} Z=${origSize.z.toFixed(3)}`);
      console.log(`🥢 [원본] 가장 짧은 축: ${
        origSize.x === Math.min(origSize.x, origSize.y, origSize.z) ? 'X' :
        origSize.y === Math.min(origSize.x, origSize.y, origSize.z) ? 'Y' : 'Z'
      } (이게 두께, Y가 두께가 되어야 평평하게 누움)`);
    }

    // 회전을 먼저 적용 (크기/바닥 계산 전에)
    // - flattenOnSurface가 있는 물체는 Y축 회전을 잠시 빼고 평탄화 후 다시 적용
    //   (Y축 회전이 적용된 상태에서 평탄화하면 X축 보정이 의도대로 안 됨)
    if (item.rotationX) obj.rotation.x = item.rotationX;
    if (item.rotationZ) obj.rotation.z = item.rotationZ;
    if (!item.flattenOnSurface && item.rotationY) {
      obj.rotation.y = item.rotationY;
    }
    obj.updateMatrixWorld(true);

    // 회전이 적용된 상태에서 목표 크기로 스케일 맞춤
    fitToSize(obj, 0.5 * item.scale);   // 물체들은 약 50cm 크기 × scale
    enableShadow(obj);

    // 책상 위 x/z 위치 지정 (y는 일단 0)
    // - scene에 먼저 추가해서 worldMatrix가 올바르게 계산되도록
    obj.position.set(item.pos[0], 0, item.pos[1]);
    scene.add(obj);
    myAdded.push(obj);
    obj.updateMatrixWorld(true);

    // [자동 평탄화] flattenOnSurface 플래그가 있는 길쭉한 물체(예: 나무젓가락)는
    // 양 끝의 Y 차이를 측정해 자동으로 X/Z축 회전 보정 → 책상에 평평하게 눕도록
    if (item.flattenOnSurface) {
      autoFlattenObject(obj);
      // 평탄화 후 의도된 Y축 회전 적용 (수평면 안에서의 회전이라 평탄화에 영향 없음)
      if (item.rotationY) {
        obj.rotation.y = item.rotationY;
        obj.updateMatrixWorld(true);
      }
    }

    // 모든 회전이 끝난 후에 Y 바닥을 책상 윗면에 정확히 맞춤
    // (이전에 placeOnSurface가 회전 전에 호출되면 회전 후 떠 보이는 문제 발생)
    placeOnSurface(obj, deskTopY);

    // 개별 yOffset이 있으면 추가로 올려줌
    if (item.yOffset) {
      obj.position.y += item.yOffset;
    }

    // 철로 된 물체(자석에 붙는 물체)는 비철 물체보다 항상 위에 그려지도록
    // renderOrder를 살짝 높여둠 (자석에 붙으면 999, 떨어지면 이 값으로 복원됨)
    const isMagneticItem = item.isScissors ? true : item.magnetic;
    if (isMagneticItem) {
      obj.renderOrder = 10;
      obj.traverse(child => {
        if (child.isMesh) child.renderOrder = 10;
      });
    }

    // 참조 저장 (드래그 감지용)
    // 가위는 전체 오브젝트로 자석 판정하되, 개념상 "날(철) + 손잡이(플라스틱)"로 취급
    // 자석 접촉 시 "가위 날"이 반응한 것으로 기록됨 (magnetic: true)
    sceneRefs.items.push({
      name: item.isScissors ? '가위 날' : item.name,
      object3d: obj,
      magnetic: item.isScissors ? true : item.magnetic,
      originalPos: obj.position.clone(),
      isScissors: item.isScissors || false,
    });
  }
}


/**
 * 씬에서 모든 실험 물체 제거 (모드 전환 시 호출)
 */
function clearItemsFromScene() {
  sceneRefs.items.forEach(({ object3d }) => {
    scene.remove(object3d);
    // 메모리 해제
    object3d.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
  });
  sceneRefs.items.length = 0;
}

// 씬에 추가된 물체 레퍼런스를 담는 곳
const sceneRefs = {
  desk: null,
  magnet: null,
  basket: null,
  items: [],        // [{ name, object3d, magnetic, originalPos }]
};

// 책상 윗면의 Y 좌표 (물체들을 여기에 올려놓음) - 모델을 불러온 뒤 계산됩니다
let deskTopY = 0;

// 책상의 XZ 범위 (자석이 이 범위를 벗어나지 않도록 드래그 제한용)
// - 책상 모델 로드 후 채워집니다
let deskBoundsXZ = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };

async function buildScene() {
  try {
    // ---- 3D 실험실 배경 만들기 (초등학교 과학실 느낌) ----
    // - 바닥, 뒷벽, 좌우 벽, 창문, 천장 조명
    // - Three.js 기본 도형(Box, Plane)만으로 구성하여 가볍고 빠름
    buildClassroomBackground();

    // ---- 책상 불러오기 ----
    const desk = await loadGLB('models/desk.glb');
    // 책상 크기 조정: 가로 4.5m 정도 크기로 맞춤
    fitToSize(desk, 4.5);
    desk.position.set(0, 0, 0);
    enableShadow(desk);

    // 책상의 "가로가 긴 쪽이 정면"을 향하도록 90도 회전
    // - 만약 반대 방향이어서 이상하게 보이면 Math.PI / 2 대신 -Math.PI / 2 로 바꿔보세요
    desk.rotation.y = Math.PI / 2;

    scene.add(desk);
    sceneRefs.desk = desk;

    // 책상 다리 바닥이 바닥면(y=0)에 정확히 닿도록 위치 보정
    // (모델 원점이 책상 가운데 또는 윗면일 수 있어 다리가 바닥을 뚫고 들어가는 것 방지)
    placeOnSurface(desk, 0);

    // 책상 윗면 Y 좌표 계산
    // (회전이 적용된 상태에서 계산되도록 matrix 먼저 업데이트)
    desk.updateMatrixWorld(true);
    const deskBox = new THREE.Box3().setFromObject(desk);
    deskTopY = deskBox.max.y;

    // 책상 XZ 범위 저장 (자석 드래그 제한용)
    // - 바구니가 책상 밖으로 살짝 나갈 수 있으므로 약간의 여유(padding) 추가
    const pad = 0.15;
    deskBoundsXZ.minX = deskBox.min.x - pad;
    deskBoundsXZ.maxX = deskBox.max.x + pad;
    deskBoundsXZ.minZ = deskBox.min.z - pad;
    deskBoundsXZ.maxZ = deskBox.max.z + pad;

    // 카메라와 OrbitControls의 타겟을 책상 윗면 높이로 맞춤
    // → 책상이 화면 정중앙에 보이도록 정렬
    controls.target.set(0, deskTopY, 0);
    camera.position.set(0, deskTopY + 2.5, 6);
    controls.update();

    // ---- 물체들 불러오기 (책상 위에 배치) ----
    await loadItemsToScene();

    // ---- 바구니 불러오기 (오른쪽) ----
    const basket = await loadGLB('models/basket.glb');
    fitToSize(basket, 0.9);
    enableShadow(basket);
    basket.position.set(1.75, 0, 0);   // 왼쪽으로 더 이동 (1.9 → 1.75). 바닥은 placeOnSurface가 맞춰줌
    scene.add(basket);
    placeOnSurface(basket, deskTopY);
    sceneRefs.basket = basket;

    // ---- 막대자석 불러오기 (책상 왼쪽 빈 공간, 공중에 띄움) ----
    const magnet = await loadGLB('models/bar_magnet.glb');
    fitToSize(magnet, 0.8);   // 크기 2/3로 축소 (1.2 → 0.8)
    enableShadow(magnet);

    // N극이 아래, S극이 위가 되도록 세로로 세움
    // (일반적으로 glb 모델의 y축이 위쪽이라 가정 - 필요시 rotation 조정)
    magnet.rotation.z = 0; // 세로 세움 (필요하면 Math.PI 를 넣어 뒤집기)
    // N/S 글자가 화면 정면(카메라 쪽)을 바라보도록 y축 90도 회전
    // - 글자가 뒤쪽을 향한다면 -Math.PI / 2 로 바꾸세요
    // - 글자가 여전히 옆을 향한다면 Math.PI (180도)로 돌려보세요
    magnet.rotation.y = Math.PI / 2;
    magnet.position.set(-2.5, deskTopY + 1.4, 0);  // 책상 왼쪽 위 공중

    // 자석은 다른 모든 물체보다 위에 그려지도록 renderOrder 설정
    // (드래그하면서 책상 위 물체에 가려지지 않게)
    magnet.renderOrder = 20;
    magnet.traverse(child => {
      if (child.isMesh) child.renderOrder = 20;
    });

    // 드래그를 쉽게 하기 위한 투명 hitbox 추가
    // - 자석 mesh보다 약간 큰 박스를 자식으로 붙여 클릭 영역 확대
    // - 보이지 않지만 raycaster는 인식 (visible:false면 raycast 무시되므로 transparent material 사용)
    magnet.updateMatrixWorld(true);
    const magnetBox = new THREE.Box3().setFromObject(magnet);
    const magnetSize = new THREE.Vector3();
    magnetBox.getSize(magnetSize);
    const hitboxGeo = new THREE.BoxGeometry(
      magnetSize.x * 1.8,   // 자석 너비의 1.8배 → 클릭 쉬워짐
      magnetSize.y * 1.2,   // 세로는 살짝만
      magnetSize.z * 1.8
    );
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,            // 완전 투명
      depthWrite: false,
    });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.name = 'magnet-hitbox';
    // 자석의 로컬 바운딩 박스 중심에 위치시킴 (자석이 회전돼 있어도 정확히 따라감)
    const localBox = new THREE.Box3().setFromObject(magnet);
    const localCenter = new THREE.Vector3();
    localBox.getCenter(localCenter);
    // 월드 좌표를 자석의 로컬 좌표로 변환
    magnet.worldToLocal(localCenter);
    hitbox.position.copy(localCenter);
    magnet.add(hitbox);

    scene.add(magnet);
    sceneRefs.magnet = magnet;

    console.log('✅ 장면 구성 완료! 책상 윗면 Y =', deskTopY);

  } catch (err) {
    console.error('❌ 모델 불러오기 실패:', err);
    document.getElementById('status-bar').textContent =
      '모델 파일을 불러오지 못했어요. models/ 폴더의 glb 파일을 확인해주세요.';
  }
}

// =========================================================
// 4. 막대자석 드래그 구현
// =========================================================

// 드래그는 마우스 클릭한 지점의 카메라→마우스 방향 광선을 이용합니다.
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();   // 화면 좌표(-1~1)
const dragPlane = new THREE.Plane();    // 드래그 평면 (카메라 시선에 수직)
const dragOffset = new THREE.Vector3(); // 클릭 지점과 오브젝트 중심의 차이
const planeIntersect = new THREE.Vector3(); // 임시 변수
let isDragging = false;

// 마우스 좌표를 -1~1 범위로 변환
function updateMouseNDC(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// 자석이 평상시 떠 있는 높이 (책상 윗면 기준)
// 값이 작을수록 자석이 책상에 가까이 떠 있음
// - 자석에 붙은 물체가 다른 책상 위 물체보다 명백히 위에 있도록 충분히 높게 설정
const MAGNET_HOVER_HEIGHT = 0.85;

// 자석이 물체 위에 왔을 때 "접촉"하기 위해 내려가는 높이
// - 자석 길이(fitToSize 0.8) 기준 세로 반지름이 약 0.4 이므로
//   이 값을 0.42로 두면 N극 끝이 책상 면 바로 위에 닿는 수준이 됩니다.
// - 값이 더 작으면 자석이 책상 면 아래로 내려가므로 주의!
const MAGNET_CONTACT_HEIGHT = 0.42;

// 마우스 다운: 자석을 클릭했는지 판정
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!sceneRefs.magnet) return;
  if (state.step !== 'experiment') return;  // 실험 단계일 때만 드래그 가능

  updateMouseNDC(event);
  raycaster.setFromCamera(mouseNDC, camera);

  // 자석의 모든 mesh와 교차 검사
  const intersects = raycaster.intersectObject(sceneRefs.magnet, true);
  if (intersects.length > 0) {
    isDragging = true;
    controls.enabled = false;  // 드래그 중에는 카메라 회전 잠시 막기

    // 마우스가 캔버스 밖으로 나가도 계속 추적 (드래그 끊김 방지)
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch(e){}

    // 드래그 평면을 호버 높이에 고정 (자석이 움직여도 평면은 그대로)
    // → 마우스 위치 ↔ 자석 위치 변환이 일관되게 처리됨
    const dragPlaneY = deskTopY + MAGNET_HOVER_HEIGHT;
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, dragPlaneY, 0)
    );

    // 자석을 호버 높이로 즉시 올림 (물체 위에 닿아 있던 상태에서 드래그 시작 시 점프 방지)
    sceneRefs.magnet.position.y = dragPlaneY;

    // 클릭한 지점과 자석 위치의 차이(드래그 오프셋) 저장
    // → 자석 어느 부분을 잡든 그 부분이 마우스 커서를 따라옴
    if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
      dragOffset.x = planeIntersect.x - sceneRefs.magnet.position.x;
      dragOffset.z = planeIntersect.z - sceneRefs.magnet.position.z;
    } else {
      dragOffset.x = 0;
      dragOffset.z = 0;
    }

    // 드래그 시작 시 cursor 변경 (시각적 피드백)
    renderer.domElement.style.cursor = 'grabbing';
  }
});

// 마우스 이동: 자석 위치만 즉시 갱신 (가볍게)
// - 무거운 충돌/접촉/바구니 체크는 렌더 루프(animate)에서 프레임당 1회만 수행
//   → pointermove 이벤트가 빠른 속도로 와도 마우스를 부드럽게 따라옴
let needsPhysicsUpdate = false;   // 드래그 중 다음 프레임에 물리 체크 필요?

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isDragging) return;

  updateMouseNDC(event);
  raycaster.setFromCamera(mouseNDC, camera);

  if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
    // 마우스 평면 좌표 - 처음 잡은 오프셋 = 자석 새 위치
    let newX = planeIntersect.x - dragOffset.x;
    let newZ = planeIntersect.z - dragOffset.z;

    // 책상 XZ 범위 제한
    newX = Math.min(Math.max(newX, deskBoundsXZ.minX), deskBoundsXZ.maxX);
    newZ = Math.min(Math.max(newZ, deskBoundsXZ.minZ), deskBoundsXZ.maxZ);

    // 자석 위치 즉시 업데이트 (Y는 호버 높이 유지)
    // - 이 부분만 이벤트에서 처리 → 마우스 움직임에 즉각 반응
    sceneRefs.magnet.position.x = newX;
    sceneRefs.magnet.position.z = newZ;
    sceneRefs.magnet.position.y = deskTopY + MAGNET_HOVER_HEIGHT;

    // 다음 프레임에 물리 체크 수행하라고 표시
    needsPhysicsUpdate = true;
  }
});

// 마우스 업: 드래그 끝
renderer.domElement.addEventListener('pointerup', (event) => {
  if (isDragging) {
    // 드래그 종료 직전에 마지막 물리 체크 1회 보장
    // - 드래그 도중 attach나 basketDrop 판정이 마지막 프레임에 누락되지 않도록
    if (needsPhysicsUpdate) {
      needsPhysicsUpdate = false;
      autoContactItem();
      checkMagnetCollision();
      checkBasketDrop();
    }
    isDragging = false;
    controls.enabled = true;
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch(e){}
    renderer.domElement.style.cursor = '';
  }
});

// 마우스가 자석 위에 있을 때 cursor 변경 (호버 피드백)
renderer.domElement.addEventListener('pointermove', (event) => {
  if (isDragging) return;  // 드래그 중에는 무시 (위에서 처리)
  if (!sceneRefs.magnet) return;

  updateMouseNDC(event);
  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObject(sceneRefs.magnet, true);
  renderer.domElement.style.cursor = intersects.length > 0 ? 'grab' : '';
});

// =========================================================
// 자동 접촉: 자석이 물체의 XZ 평면 위에 오면 살짝 내려가 닿게
// - 물체마다 높이가 다르므로 각 물체의 실제 최대 Y(윗면) 위에
//   자석 N극이 바로 오도록 동적으로 내려갑니다.
// =========================================================
function autoContactItem() {
  if (state.attachedToMagnet) return;  // 이미 뭔가 붙었으면 패스
  if (!sceneRefs.magnet) return;

  const magnetPos = sceneRefs.magnet.position;

  // 자석의 N극(아래쪽 끝)이 자석 중심에서 얼마만큼 아래에 있는지 계산
  // (자석 중심 Y - N극 Y = 자석 높이의 절반)
  sceneRefs.magnet.updateMatrixWorld(true);
  const magnetBox = new THREE.Box3().setFromObject(sceneRefs.magnet);
  const magnetHalfHeight = magnetPos.y - magnetBox.min.y;

  // [바구니 체크] 자석이 바구니 위에 있으면 바구니 안으로 못 들어가게
  // - 바구니에 담긴 철 물체에 다시 붙는 걸 방지하고 시각적으로도 자연스럽게
  if (sceneRefs.basket) {
    sceneRefs.basket.updateMatrixWorld(true);
    const basketBox = new THREE.Box3().setFromObject(sceneRefs.basket);
    const inBasketXZ =
      magnetPos.x >= basketBox.min.x && magnetPos.x <= basketBox.max.x &&
      magnetPos.z >= basketBox.min.z && magnetPos.z <= basketBox.max.z;

    if (inBasketXZ) {
      // 자석 N극이 바구니 윗면 위 5cm에 오도록 자석 중심 Y 설정
      const gapAboveBasket = 0.05;   // 5cm 여유
      const targetY = basketBox.max.y + gapAboveBasket + magnetHalfHeight;
      sceneRefs.magnet.position.y = targetY;
      return;  // 바구니 위에선 물체 접촉 체크도 건너뜀
    }
  }

  // 각 물체와 XZ 평면상의 거리 체크
  for (const item of sceneRefs.items) {
    if (state.collectedInBasket.includes(item.name)) continue;

    item.object3d.updateMatrixWorld(true);
    const itemBox = new THREE.Box3().setFromObject(item.object3d);

    // 자석이 물체의 실제 XZ 영역 안에 정확히 위치한 경우에만 자동 접촉
    // (이전 0.3m 반경은 너무 커서 자석이 시각적으로 멀리 있어도 끌어내려져
    //  닿기 전에 효과음이 울리는 문제 발생)
    const tolerance = 0.05;   // 5cm 정도 여유 (정확한 정렬은 어려우므로)
    const inItemXZ =
      magnetPos.x >= itemBox.min.x - tolerance &&
      magnetPos.x <= itemBox.max.x + tolerance &&
      magnetPos.z >= itemBox.min.z - tolerance &&
      magnetPos.z <= itemBox.max.z + tolerance;

    if (inItemXZ) {
      // [정확한 접촉 지점 측정]
      // 자석 N극의 X,Z 위치에서 수직 아래로 raycast → 그 지점의 실제 mesh 표면 Y 찾기
      const rayOrigin = new THREE.Vector3(magnetPos.x, magnetPos.y + 5, magnetPos.z);
      const rayDir = new THREE.Vector3(0, -1, 0);
      const surfaceRay = new THREE.Raycaster(rayOrigin, rayDir);
      const hits = surfaceRay.intersectObject(item.object3d, true);

      let surfaceY;
      if (hits.length > 0) {
        surfaceY = hits[0].point.y;
      } else {
        surfaceY = itemBox.max.y;
      }

      // 자석 N극 끝이 그 지점에 정확히 닿도록 자석 중심 Y를 계산
      let targetY = surfaceY + magnetHalfHeight;

      // N극이 책상 면 아래로 내려가지 않도록 안전장치
      const minMagnetY = deskTopY + magnetHalfHeight;
      if (targetY < minMagnetY) targetY = minMagnetY;

      sceneRefs.magnet.position.y = targetY;
      return;
    }
  }
}

// =========================================================
// 5. 자석 충돌 감지 (가까이 가면 반응)
// =========================================================

// 자석 N극(아래쪽 끝)의 월드 좌표 구하기
function getMagnetNorthTip() {
  // 자석의 로컬 아래쪽 끝 (y = -0.6 정도) 위치를 월드 좌표로 변환
  const magnetBox = new THREE.Box3().setFromObject(sceneRefs.magnet);
  return new THREE.Vector3(
    sceneRefs.magnet.position.x,
    magnetBox.min.y,        // 자석의 가장 아래쪽
    sceneRefs.magnet.position.z
  );
}

/**
 * 가위의 어느 부분(날/손잡이)에 자석이 접촉했는지 판정
 * - 가위 오브젝트는 rotationY = π/2 로 회전되어 가위가 Z축 방향으로 긴 모양
 * - 자석 N극의 Z가 가위의 Z 중심보다 "작은 쪽"이면 날,
 *   "큰 쪽"이면 손잡이로 판정 (glb 모델 방향에 따라 SCISSOR_BLADE_IS_NEG_Z 플래그로 뒤집기 가능)
 * - 반환값: { name: '가위 날'|'가위 손잡이', magnetic: true|false }
 */
const SCISSOR_BLADE_IS_NEG_Z = true;   // 날이 -Z(앞) 쪽인지 여부. 반대면 false로 바꾸면 됨.

function getScissorPart(scissorObj, magnetTip) {
  scissorObj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scissorObj);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const isNegSide = magnetTip.z < center.z;   // 자석이 -Z 쪽에 있는지
  const isBlade = (isNegSide === SCISSOR_BLADE_IS_NEG_Z);

  return isBlade
    ? { name: '가위 날',     magnetic: true  }
    : { name: '가위 손잡이', magnetic: false };
}

function checkMagnetCollision() {
  if (!sceneRefs.magnet) return;

  const nTip = getMagnetNorthTip();

  // 이미 자석에 붙은 물체가 있다면 → 자석과 함께 움직이게
  if (state.attachedToMagnet) {
    const attached = state.attachedToMagnet;
    attached.position.x = nTip.x;
    attached.position.z = nTip.z;
    // 물체 윗면이 자석 N극에 딱 붙도록 저장된 halfHeight 사용
    // 단, 물체 아랫면이 책상 면 아래로는 안 내려가도록 보정
    const targetY  = nTip.y - state.attachedHalfHeight;
    const minY     = deskTopY + state.attachedBottomDist + 0.01;
    attached.position.y = Math.max(targetY, minY);
    return;
  }

  // 자석의 현재 바운딩 박스 (월드 좌표 기준)
  sceneRefs.magnet.updateMatrixWorld(true);
  const magnetBox = new THREE.Box3().setFromObject(sceneRefs.magnet);

  // 각 물체와 "실제로 접촉(바운딩 박스 교차)"하는지 판정
  let touchingItem = null;       // 지금 막 닿은 물체
  let nearestItem = null;        // 근처에 있는 물체 (안내 문구용)
  let nearestDist = Infinity;

  for (const item of sceneRefs.items) {
    // 이미 바구니에 담긴 것은 제외
    if (state.collectedInBasket.includes(item.name)) continue;

    // 물체의 월드 바운딩 박스
    item.object3d.updateMatrixWorld(true);
    const itemBox = new THREE.Box3().setFromObject(item.object3d);

    // 두 박스가 실제로 교차(접촉)하는지
    if (magnetBox.intersectsBox(itemBox)) {
      touchingItem = item;
      break;   // 닿은 물체를 찾으면 더 볼 필요 없음
    }

    // 교차하지 않은 경우, 박스 간 최단 거리(근접 안내용)
    // - Box3에는 distanceTo(point)만 있으므로 각 박스의 중심으로 근사
    const itemCenter = new THREE.Vector3();
    itemBox.getCenter(itemCenter);
    const dist = magnetBox.distanceToPoint(itemCenter);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestItem = item;
    }
  }

  // 상태 바 업데이트 + 자석에 붙이기 판정
  const statusBar = document.getElementById('status-bar');

  if (touchingItem) {
    // 가위일 경우: 자석이 날 쪽인지 손잡이 쪽인지 판정
    // - 기본 "가위 날"로 등록돼 있지만 위치에 따라 "가위 손잡이"로 바꿀 수 있음
    let effectiveName = touchingItem.name;
    let effectiveMagnetic = touchingItem.magnetic;

    if (touchingItem.isScissors) {
      const part = getScissorPart(touchingItem.object3d, nTip);
      effectiveName = part.name;
      effectiveMagnetic = part.magnetic;
    }

    // 실험한 물체로 기록 (날 쪽 실험과 손잡이 쪽 실험은 독립적으로 기록됨)
    if (!state.testedItems.has(effectiveName)) {
      state.testedItems.add(effectiveName);
      updateTestedPanel();
      checkAllCollected();
    }

    // 접촉 효과음 (붙음/안붙음 구분)
    // - 같은 물체와 연속 접촉할 땐 재생 안 함 (lastTouchedName으로 추적)
    if (state.lastTouchedName !== effectiveName) {
      state.lastTouchedName = effectiveName;
      playSfx(effectiveMagnetic ? 'attach' : 'noattach');
    }

    // 접촉한 순간에만 반응
    if (effectiveMagnetic) {
      // 철로 된 물체(가위 날 포함) → 자석에 딱 붙음
      state.attachedToMagnet = touchingItem.object3d;
      // 물체를 자석 N극 바로 아래에 정확히 위치시키기
      const nTipNow = getMagnetNorthTip();
      touchingItem.object3d.position.x = nTipNow.x;
      touchingItem.object3d.position.z = nTipNow.z;

      // 물체의 바운딩 박스로 위/아래 거리 측정
      // - itemHalfHeight: 중심에서 윗면까지 거리 (자석 N극에 윗면 닿게 하기 위함)
      // - itemBottomDist: 중심에서 아랫면까지 거리 (책상 면 아래로 못 내려가게 하기 위함)
      touchingItem.object3d.updateMatrixWorld(true);
      const itemBoxNow = new THREE.Box3().setFromObject(touchingItem.object3d);
      const itemHalfHeight = itemBoxNow.max.y - touchingItem.object3d.position.y;
      const itemBottomDist = touchingItem.object3d.position.y - itemBoxNow.min.y;

      // 1) 자석에 윗면이 닿도록 한 Y
      const targetY = nTipNow.y - itemHalfHeight;
      // 2) 아랫면이 책상 면 아래로 안 내려가게 하는 최소 Y (중심 Y >= deskTopY + bottomDist)
      const minYByDesk = deskTopY + itemBottomDist + 0.01;
      // 두 조건 중 더 큰 값 적용
      touchingItem.object3d.position.y = Math.max(targetY, minYByDesk);

      // 나중에 자석이 움직일 때도 같은 Y 오프셋을 쓰도록 저장
      // - attachedHalfHeight: 윗면 거리 (자석 따라가기용)
      // - attachedBottomDist: 아랫면 거리 (책상 면 안 내려가게 하기용)
      state.attachedHalfHeight = itemHalfHeight;
      state.attachedBottomDist = itemBottomDist;

      // 자석에 붙은 물체는 다른 물체에 가려지지 않게 항상 위에 그려지도록 처리
      // 자석 자체도 함께 위로 올려서 일관성 유지
      bringObjectToFront(touchingItem.object3d);
      bringObjectToFront(sceneRefs.magnet);

      // 한국어 조사 자동 처리 (받침 있으면 "을/이/은", 없으면 "를/가/는")
      // 가위는 "가위 날" 대신 그냥 "가위"로 안내 (학생에게 더 자연스러움)
      const displayName = (effectiveName === '가위 날') ? '가위' : effectiveName;
      const eulReul = hasJongseong(displayName) ? '을' : '를';

      // 붙은 오브젝트가 가위인 경우 바구니에 넣을 때 "가위 날"로 기록되도록 item.name을 덮어씀
      if (touchingItem.isScissors) touchingItem.name = effectiveName;
      showExperimentMessage(`'${displayName}'${eulReul} 바구니에 옮겨요.`);
    }
    // status-bar는 항상 기본 안내 문구 유지 (자석 반응 정보 노출 안 함)
  } else {
    // 어떤 물체에도 안 닿음 → 다음에 같은 물체에 다시 닿아도 효과음 나도록 리셋
    state.lastTouchedName = null;
  }
  // 근접 시에도 status-bar는 기본 안내만 유지
  // (이전: 가까이 가면 "~에 가까워지고 있어요" 등을 표시했지만 정답 힌트가 될 수 있어 제거)
  document.getElementById('status-bar').textContent =
    '막대자석을 드래그해서 물체 위로 옮겨 보세요.';
}

// =========================================================
// 6. 바구니에 떨어뜨리기 판정
// =========================================================


// =========================================================
// 6. 바구니에 떨어뜨리기 판정
// =========================================================

function checkBasketDrop() {
  if (!state.attachedToMagnet) return;
  if (!sceneRefs.basket) return;

  const basketPos = sceneRefs.basket.position;
  const magnetPos = sceneRefs.magnet.position;

  // 자석이 바구니 근처에 왔는지 (xz 평면 거리)
  const dx = magnetPos.x - basketPos.x;
  const dz = magnetPos.z - basketPos.z;
  const distXZ = Math.sqrt(dx * dx + dz * dz);

  if (distXZ < 0.6) {
    // 바구니 위! → 물체를 떨어뜨림
    const droppedObj = state.attachedToMagnet;

    // 어떤 물체인지 찾기
    const item = sceneRefs.items.find(i => i.object3d === droppedObj);
    if (!item) return;

    // 바구니에 이미 담긴 물체들의 위치 수집 (겹침 회피용)
    const placedInBasket = sceneRefs.items.filter(i =>
      state.collectedInBasket.includes(i.name)
    );

    // 바구니의 실제 안쪽 크기 측정 (떨어뜨릴 영역의 한계)
    sceneRefs.basket.updateMatrixWorld(true);
    const basketBox = new THREE.Box3().setFromObject(sceneRefs.basket);
    const basketSize = new THREE.Vector3();
    basketBox.getSize(basketSize);
    // 바구니 안쪽 영역 = 가장자리 안쪽 (테두리 두께 감안 약 15% 안쪽)
    const basketInnerHalfX = (basketSize.x / 2) * 0.7;
    const basketInnerHalfZ = (basketSize.z / 2) * 0.7;

    // 떨어뜨릴 물체의 크기(반경) 측정
    droppedObj.updateMatrixWorld(true);
    const droppedBox = new THREE.Box3().setFromObject(droppedObj);
    const droppedSize = new THREE.Vector3();
    droppedBox.getSize(droppedSize);
    const droppedHalfX = droppedSize.x / 2;
    const droppedHalfZ = droppedSize.z / 2;
    const droppedRadius = Math.max(droppedSize.x, droppedSize.z) / 2;

    // 바구니 안에서 물체가 완전히 들어가는 영역의 범위 계산
    // (물체의 절반 크기만큼 안쪽으로 들어가야 가장자리 밖으로 안 삐져나감)
    let allowedHalfX = Math.max(0, basketInnerHalfX - droppedHalfX);
    let allowedHalfZ = Math.max(0, basketInnerHalfZ - droppedHalfZ);

    // 물체가 바구니보다 크면 바구니에 맞게 축소
    // (예: 가위 같은 큰 물체)
    if (droppedHalfX > basketInnerHalfX || droppedHalfZ > basketInnerHalfZ) {
      const scaleX = basketInnerHalfX / droppedHalfX;
      const scaleZ = basketInnerHalfZ / droppedHalfZ;
      // 두 축 중 더 작은 비율로 축소 (양쪽 다 들어가도록)
      const fitScale = Math.min(scaleX, scaleZ) * 0.95;   // 5% 여유
      droppedObj.scale.multiplyScalar(fitScale);
      droppedObj.updateMatrixWorld(true);

      // 축소한 후 다시 크기 재측정 + 허용 범위 재계산
      const newBox = new THREE.Box3().setFromObject(droppedObj);
      const newSize = new THREE.Vector3();
      newBox.getSize(newSize);
      allowedHalfX = Math.max(0, basketInnerHalfX - newSize.x / 2);
      allowedHalfZ = Math.max(0, basketInnerHalfZ - newSize.z / 2);
    }

    // 겹치지 않는 위치 찾기 (최대 30번 시도)
    const dropY = deskTopY + 0.1;
    let dropX = basketPos.x;
    let dropZ = basketPos.z;

    for (let tries = 0; tries < 30; tries++) {
      // 바구니 안쪽 + 물체 크기 고려한 허용 범위 안에서만 랜덤
      const candX = basketPos.x + (Math.random() - 0.5) * 2 * allowedHalfX;
      const candZ = basketPos.z + (Math.random() - 0.5) * 2 * allowedHalfZ;

      // 이미 담긴 모든 물체와의 거리 체크
      const ok = placedInBasket.every(other => {
        other.object3d.updateMatrixWorld(true);
        const otherBox = new THREE.Box3().setFromObject(other.object3d);
        const otherSize = new THREE.Vector3();
        otherBox.getSize(otherSize);
        const otherRadius = Math.max(otherSize.x, otherSize.z) / 2;

        const ddx = candX - other.object3d.position.x;
        const ddz = candZ - other.object3d.position.z;
        const dist = Math.sqrt(ddx * ddx + ddz * ddz);
        // 두 반경의 합 + 약간의 여유 이상 떨어져야 함
        return dist >= (droppedRadius + otherRadius + 0.03);
      });

      if (ok) {
        dropX = candX;
        dropZ = candZ;
        break;
      }
    }

    // 바구니 안으로 이동
    droppedObj.position.set(dropX, dropY, dropZ);

    // 자석에 붙어있을 때 적용했던 "항상 위에 보이기" 효과 해제 (물체 + 자석 모두)
    restoreObjectRender(droppedObj);
    restoreObjectRender(sceneRefs.magnet);

    // 상태 업데이트
    state.attachedToMagnet = null;
    state.attachedHalfHeight = 0;
    state.attachedBottomDist = 0;
    state.collectedInBasket.push(item.name);

    // status-bar는 기본 안내만 유지 (자석 반응/바구니 정보 노출 안 함)
    document.getElementById('status-bar').textContent =
      '막대자석을 드래그해서 물체 위로 옮겨 보세요.';

    hideExperimentMessage();

    // 모든 철로 된 물체가 바구니에 들어갔는지 체크
    checkAllCollected();
  }
}

function checkAllCollected() {
  const displayItems = getDisplayItems();

  // 조건 1) 철로 된 물체가 모두 바구니에 담겼는가
  const allIronItems = displayItems.filter(i => i.magnetic).map(i => i.name);
  const allCollected = allIronItems.every(n => state.collectedInBasket.includes(n));

  // 조건 2) 모든 물체(철/비철)를 한 번씩 자석에 가까이 대 보았는가
  // - 단, "가위 손잡이"는 가위 날이 이미 바구니에 담겼다면(=가위가 더 이상 책상에 없음)
  //   실험할 수 없으므로 자동으로 완료된 것으로 간주하고 testedItems에도 추가
  const allNames = displayItems.map(i => i.name);
  if (state.collectedInBasket.includes('가위 날') && !state.testedItems.has('가위 손잡이')) {
    state.testedItems.add('가위 손잡이');
    updateTestedPanel();
  }
  const allTested = allNames.every(n => state.testedItems.has(n));

  if (allCollected && allTested) {
    // 다음 단계 진행 (지연 후 다음 화면으로)
    // - 타이머 ID를 추적해서 사용자가 도중에 '메인 화면'을 누르면 취소할 수 있게 함
    // - 콜백 안에서도 세대(flowGeneration) + state.step 이중 체크
    if (pendingFinishTimer !== null) clearTimeout(pendingFinishTimer);
    const genAtSchedule = flowGeneration;
    pendingFinishTimer = setTimeout(() => {
      pendingFinishTimer = null;
      // 사용자가 그 사이 메인 화면으로 돌아간 경우 아무 화면도 띄우지 않음
      if (genAtSchedule !== flowGeneration) return;
      if (state.step === 'menu') return;

      if (state.predictionSkipped) {
        // 예상을 건너뛴 경우 → 비교하기 생략하고 바로 정리/다시 하기 화면
        document.getElementById('tested-panel').classList.add('hidden');
        showFinishScreen();
      } else {
        // 정상 흐름 → 비교하기
        showCompareScreen();
      }
    }, 800);
  } else if (allCollected && !allTested) {
    // 철 물체는 다 담았지만 아직 실험 안 한 물체가 있음 → 안내
    const remaining = allNames.filter(n => !state.testedItems.has(n));
    document.getElementById('status-bar').textContent =
      `다른 물체도 자석에 가까이 해 보세요! (남은 물체: ${remaining.join(', ')})`;
  }
}

// =========================================================
// 7. 나레이션 (TTS - 브라우저의 Web Speech API)
// =========================================================

/**
 * 한국어 단어 마지막 글자에 받침이 있는지 판정
 * - 한글 유니코드: 0xAC00(가) ~ 0xD7A3(힣)
 * - (코드 - 0xAC00) % 28 != 0 이면 받침 있음
 * - 한국어가 아닌 글자(영어 등)는 false 반환
 *
 * 사용 예: hasJongseong('철 클립') → true ("ㅂ" 받침)
 *        hasJongseong('가위')   → false (받침 없음)
 */
function hasJongseong(word) {
  if (!word || word.length === 0) return false;
  const lastChar = word.charCodeAt(word.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return false;
  return (lastChar - 0xAC00) % 28 !== 0;
}

// 미리 등록된 음성 파일 매핑 (텍스트 → mp3 파일 경로)
// - 정확히 일치하는 텍스트가 들어오면 mp3 재생
// - 그 외에는 기존 TTS(브라우저 음성)로 폴백
const AUDIO_MAP = {
  '막대자석에 어떤 물체가 붙고 붙지 않을지 실험 전에 예상해 보세요.': 'audio/음성1.mp3',
  // 바구니 안내 (가위는 "가위", 그 외는 그대로)
  "'철 클립'을 바구니에 옮겨요.": 'audio/음성2.mp3',
  "'철 집게'를 바구니에 옮겨요.": 'audio/음성3.mp3',
  "'철 못'을 바구니에 옮겨요.":   'audio/음성4.mp3',
  "'가위'를 바구니에 옮겨요.":     'audio/음성5.mp3',
  // 비교하기 안내
  '실험 결과와 나의 예상을 비교해 봐요.': 'audio/음성6.mp3',
  // 정리하기 안내 (두 문장을 순차 재생)
  '철로 된 물체와 자석은 붙습니다.': 'audio/음성7.mp3',
  '유리, 나무, 알루미늄, 플라스틱으로 된 물체와 자석은 붙지 않습니다.': 'audio/음성8.mp3',
};

// 미리 로드된 Audio 객체 캐시 (재생 빠르게 + 메모리 효율)
const audioCache = {};
function getAudio(path) {
  if (!audioCache[path]) {
    audioCache[path] = new Audio(path);
    audioCache[path].preload = 'auto';
  }
  return audioCache[path];
}

// 현재 재생 중인 mp3 (겹쳐 재생 방지용)
let currentAudio = null;

/**
 * 진행 중인 모든 음성(mp3 + TTS)을 즉시 멈추고 리셋
 * - 버튼/탭 클릭 시 자동 호출되어 사용자 인터랙션 우선
 */
function stopAllSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      // onended 핸들러도 정리 (순차 재생 중인 경우 다음 음성도 막힘)
      currentAudio.onended = null;
    } catch (e) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
}

// 모든 버튼/탭/박스 클릭 시 진행 중 음성 정지 (캡처 단계에서 가로채기)
// - capture: true로 두면 다른 클릭 핸들러보다 먼저 실행됨
document.addEventListener('click', (e) => {
  const target = e.target.closest('button, .tab-btn, .finish-box, .pick-item, .intro-close');
  if (target) {
    stopAllSpeech();
    playSfx('click');   // 버튼 클릭 효과음
  }
}, true);

// =========================================================
// 효과음 시스템 (Web Audio API로 직접 생성)
// - mp3 파일 없이 다양한 효과음을 즉시 재생
// =========================================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // 일부 브라우저는 사용자 인터랙션 후 resume 필요
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// SFX 음소거 상태
let sfxMuted = false;

/**
 * 효과음 재생
 * - 'click': 버튼 클릭 (짧고 높은 톤)
 * - 'attach': 자석에 붙는 순간 (매력적인 딩 종소리)
 * - 'noattach': 자석에 안 붙음 (둔탁한 툭)
 */
function playSfx(type) {
  if (sfxMuted) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (type === 'click') {
      // 짧은 "딸깍" - 높은 주파수, 빠른 감쇠
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);

    } else if (type === 'attach') {
      // 매력적인 "딩~" 종소리 - 두 톤 화음
      // 배경음악(0.10)보다 훨씬 크게 (0.5) → 자석 붙는 순간 또렷하게 들림
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.02);
        osc.stop(now + 0.65);
      });

    } else if (type === 'noattach') {
      // 둔탁한 "툭" 소리 - 잘 들리도록 볼륨 키우고 음색 명확하게
      // - triangle 파형(sine보다 또렷) + 더 긴 지속시간
      // - 두 톤 동시 재생으로 풍부한 사운드
      [330, 165].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      });
    }
  } catch (err) {
    // 오디오 컨텍스트 생성 실패 등은 조용히 무시
  }
}

// =========================================================
// 배경음악 (music.mp3 반복 재생)
// =========================================================
let bgMusic = null;
let bgMusicMuted = false;

function initBgMusic() {
  if (bgMusic) return;
  bgMusic = new Audio('audio/music.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.10;   // 배경음악은 작게 (효과음/음성보다 훨씬 작게)
  // 자동재생 정책 우회: muted 상태로 시작하면 사용자 클릭 없이도 재생 가능
  // 첫 사용자 인터랙션 시 unmute 됨 (아래 클릭 리스너 참고)
  bgMusic.muted = true;
}

function playBgMusic() {
  initBgMusic();
  if (!bgMusicMuted) {
    bgMusic.play().catch(err => {
      console.log('배경음악 재생 실패:', err.message);
    });
  }
}

function toggleSound() {
  bgMusicMuted = !bgMusicMuted;
  sfxMuted = bgMusicMuted;   // 배경음악과 효과음 함께 토글

  // 두 개의 소리 버튼(상단 우측 + 메인 메뉴)을 함께 업데이트
  const btn = document.getElementById('sound-toggle-btn');
  const menuBtn = document.getElementById('menu-sound-toggle-btn');
  if (bgMusicMuted) {
    if (bgMusic) bgMusic.pause();
    if (btn) { btn.textContent = '🔇'; btn.title = '소리 켜기'; }
    if (menuBtn) { menuBtn.textContent = '🔇'; menuBtn.title = '소리 켜기'; }
  } else {
    if (bgMusic) bgMusic.play().catch(()=>{});
    if (btn) { btn.textContent = '🔊'; btn.title = '소리 끄기'; }
    if (menuBtn) { menuBtn.textContent = '🔊'; menuBtn.title = '소리 끄기'; }
  }
}

function speak(text) {
  // 진행 중인 음성/TTS 중단
  stopAllSpeech();

  // 1) 등록된 mp3 음성이 있으면 그걸 재생
  const audioPath = AUDIO_MAP[text];
  if (audioPath) {
    try {
      const audio = getAudio(audioPath);
      audio.currentTime = 0;
      currentAudio = audio;
      audio.play().catch(err => {
        // 재생 실패(자동재생 차단 등) 시 콘솔에만 표시
        console.log('🔇 음성 파일 재생 실패:', err);
      });
      return;
    } catch (err) {
      console.log('🔇 음성 파일 로드 실패:', err);
    }
  }

  // 2) 등록된 mp3가 없으면 TTS(브라우저 기본 음성)로 재생
  if (!('speechSynthesis' in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = 1.0;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.log('TTS 재생 실패:', err);
  }
}

// =========================================================
// 8. 실험 중 캐릭터 말풍선 (아래쪽에 잠깐 뜸)
// =========================================================

function showExperimentMessage(text) {
  const box = document.getElementById('experiment-message');
  const txt = document.getElementById('experiment-message-text');
  txt.textContent = text;
  box.classList.remove('hidden');
  speak(text);
}

function hideExperimentMessage() {
  const box = document.getElementById('experiment-message');
  box.classList.add('hidden');
}

// =========================================================
// 9. 단계별 화면 관리 (UI 흐름)
// =========================================================

/**
 * 인트로 화면을 "초기 상태"로 열기
 * - 실험 방법 카드 보임, 예상하기 박스는 숨김
 * - X 버튼 클릭 시 예상하기 박스가 나타남
 */
function showIntroScreen() {
  document.getElementById('intro-screen').classList.remove('hidden');
  document.getElementById('intro-method-card').classList.remove('hidden');
  document.getElementById('intro-predict-box').classList.add('hidden');
}

// 실험 방법 카드의 X 버튼 클릭 → 카드 닫고 예상하기 박스 표시
document.getElementById('intro-close-btn').addEventListener('click', () => {
  document.getElementById('intro-method-card').classList.add('hidden');
  document.getElementById('intro-predict-box').classList.remove('hidden');
  // 예상하기 박스가 뜰 때 나레이션
  speak('막대자석에 어떤 물체가 붙고 붙지 않을지 실험 전에 예상해 보세요.');
});

// --- 9-1. 시작 화면 → 예상하기 버튼 ---
document.getElementById('start-predict-btn').addEventListener('click', () => {
  state.predictionSkipped = false;   // 정상 흐름
  document.getElementById('intro-screen').classList.add('hidden');
  showPredictScreen();
});

// --- 9-1-b. 건너뛰기 버튼 (예상하기 생략하고 바로 실험) ---
document.getElementById('skip-predict-btn').addEventListener('click', () => {
  state.predictionSkipped = true;
  state.predictions = {};   // 예상 없음
  document.getElementById('intro-screen').classList.add('hidden');
  state.step = 'experiment';

  // 실험 진행 패널 초기화 후 표시
  initTestedPanel();
  document.getElementById('tested-panel').classList.remove('hidden');

  document.getElementById('status-bar').textContent =
    '막대자석을 드래그해서 물체 위로 옮겨 보세요.';
});

// =========================================================
// 9-0. 메인 메뉴 화면 (페이지 첫 로드 시 보이는 카드 선택 화면)
// =========================================================

/**
 * 메인 메뉴 화면 보여주기
 * - 다른 모든 오버레이 숨김
 * - 진행 중이던 실험 상태도 정리 (자석 원위치, 물체 정리)
 * - 상단 탭/실험 진행 패널 숨김 (메뉴에서는 단순하게)
 */
function showMainMenu() {
  // 흐름 세대 갱신 → 진행 중이던 async 함수들이 자기 캡처값과 비교해 자동 중단
  flowGeneration++;

  // 진행 예약된 타이머(비교하기/정리하기로 넘어가는 800ms 타이머) 취소
  // → 사용자가 마지막 물체를 바구니에 넣은 직후 '메인 화면'을 누르면
  //   이 타이머가 살아있어 메인 화면 위로 다음 화면이 떠오르는 문제를 막음
  if (pendingFinishTimer !== null) {
    clearTimeout(pendingFinishTimer);
    pendingFinishTimer = null;
  }

  // 모든 오버레이 숨기기
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('experiment-message').classList.add('hidden');
  document.getElementById('tested-panel').classList.add('hidden');

  // 메인 메뉴 표시
  document.getElementById('main-menu-screen').classList.remove('hidden');

  // 상단 탭은 메인 메뉴에서는 숨김 (모드 선택을 카드로 이미 하므로)
  const topTabs = document.getElementById('top-tabs');
  if (topTabs) topTabs.style.display = 'none';

  // 상단 우측 버튼들도 숨김 (메인 메뉴에선 다시하기/홈 버튼이 의미 없음)
  const topRight = document.getElementById('top-right-buttons');
  if (topRight) topRight.style.display = 'none';

  // 자석 원위치 (이전에 실험 중이었다면)
  if (sceneRefs.magnet) {
    sceneRefs.magnet.position.set(-2.5, deskTopY + 1.4, 0);
  }

  // 진행 상태 초기화 (메뉴로 돌아오면 깨끗한 상태)
  state.step = 'menu';
  state.attachedToMagnet = null;
  state.attachedHalfHeight = 0;
  state.attachedBottomDist = 0;
  state.collectedInBasket = [];
  state.testedItems = new Set();

  // 음성 정지
  stopAllSpeech();

  // 메인 메뉴 소리 버튼 아이콘을 현재 음소거 상태와 동기화
  const menuBtn = document.getElementById('menu-sound-toggle-btn');
  if (menuBtn) {
    menuBtn.textContent = bgMusicMuted ? '🔇' : '🔊';
    menuBtn.title = bgMusicMuted ? '소리 켜기' : '소리 끄기';
  }

  // 배경음악 재생 시도 (메인 화면 등장 시점부터 음악이 흐르도록)
  // - 음소거 상태로 자동재생 시작 → 첫 사용자 클릭 시 자동으로 unmute 됨
  playBgMusic();
}

/**
 * 메뉴에서 실험 모드를 선택했을 때 공통 처리
 * - 상단 탭 다시 보이기 + 활성 탭 표시
 * - 해당 모드로 전환 (switchMode가 화면 이동까지 처리)
 */
async function startFromMenu(mode) {
  // 상단 탭 다시 보이게
  const topTabs = document.getElementById('top-tabs');
  if (topTabs) topTabs.style.display = '';

  // 상단 우측 버튼들도 다시 보이게
  const topRight = document.getElementById('top-right-buttons');
  if (topRight) topRight.style.display = '';

  // 탭 활성화 표시 동기화
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeTab = document.querySelector(`.tab-btn[data-tab="${mode}"]`);
  if (activeTab) activeTab.classList.add('active');

  // 메인 메뉴 숨기기
  document.getElementById('main-menu-screen').classList.add('hidden');

  // 실제 모드 전환 (standard → 인트로 화면, custom → 물체 선택 화면)
  await switchMode(mode);
}

// 메뉴 카드 클릭: 탐구 활동 실험하기
document.getElementById('menu-standard-box').addEventListener('click', async () => {
  await startFromMenu('standard');
});

// 메뉴 카드 클릭: 내가 정한 물체로 실험하기
document.getElementById('menu-custom-box').addEventListener('click', async () => {
  await startFromMenu('custom');
});

// 상단 우측 "메인" 버튼: 언제든 메인 메뉴로 복귀
const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
  homeBtn.addEventListener('click', () => {
    // 진행 중이던 실험 정리: 씬에서 물체 제거하고 자석 원위치
    clearItemsFromScene();
    currentItems = [];
    showMainMenu();
  });
}

// 페이지 첫 로드 시: 메인 메뉴부터 보여주기
showMainMenu();

// --- 9-2. 예상 표 만들기 ---
function showPredictScreen() {
  state.step = 'predict';
  const tbody = document.querySelector('#predict-table tbody');
  tbody.innerHTML = '';
  getDisplayItems().forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td><input type="radio" class="predict-radio" name="pred_${item.name}" value="O"></td>
      <td><input type="radio" class="predict-radio" name="pred_${item.name}" value="X"></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('predict-screen').classList.remove('hidden');
}

// --- 9-3. 예상 완료 → 실험 시작 ---
document.getElementById('finish-predict-btn').addEventListener('click', () => {
  // 라디오 값 수집
  getDisplayItems().forEach(item => {
    const checked = document.querySelector(`input[name="pred_${item.name}"]:checked`);
    if (checked) {
      state.predictions[item.name] = (checked.value === 'O');  // O=붙음(true)
    } else {
      state.predictions[item.name] = null;  // 선택 안함
    }
  });
  document.getElementById('predict-screen').classList.add('hidden');
  state.step = 'experiment';
  document.getElementById('status-bar').textContent =
    '막대자석을 드래그해서 물체 위로 옮겨 보세요.';

  // 실험 진행 패널 초기화 후 표시
  initTestedPanel();
  document.getElementById('tested-panel').classList.remove('hidden');
});

// --- 실험 진행 패널: 초기화(각 물체를 "실험 전" 상태로) ---
function initTestedPanel() {
  const ul = document.getElementById('tested-list');
  ul.innerHTML = '';
  getDisplayItems().forEach(item => {
    const li = document.createElement('li');
    li.dataset.name = item.name;
    // 철/비철 구분 클래스는 넣지 않음 (정답 힌트가 되지 않도록)
    li.innerHTML = `
      <span class="icon">⬜</span>
      <span class="item-name">${item.name}</span>
    `;
    ul.appendChild(li);
  });
}

// --- 실험 진행 패널: 실험 완료 상태로 갱신 ---
function updateTestedPanel() {
  const ul = document.getElementById('tested-list');
  Array.from(ul.children).forEach(li => {
    const name = li.dataset.name;
    if (state.testedItems.has(name)) {
      li.classList.add('tested');
      // 철/비철 구분 없이 동일한 체크 아이콘 (정답 힌트 방지)
      li.querySelector('.icon').textContent = '✅';
    }
  });
}

// --- 9-4. 비교하기 화면 ---
function showCompareScreen() {
  state.step = 'compare';
  document.getElementById('compare-screen').classList.remove('hidden');
  document.getElementById('tested-panel').classList.add('hidden');   // 실험 패널 숨김
  speak('실험 결과와 나의 예상을 비교해 봐요.');
}

document.getElementById('compare-btn').addEventListener('click', () => {
  document.getElementById('compare-screen').classList.add('hidden');
  showCompareResult();
});

// --- 9-5. 비교 결과 표 ---
function showCompareResult() {
  const tbody = document.querySelector('#compare-table tbody');
  tbody.innerHTML = '';
  getDisplayItems().forEach(item => {
    const predict = state.predictions[item.name];
    const actual = state.results[item.name];
    const predictText = predict === null ? '-' : (predict ? 'O (붙음)' : 'X (안 붙음)');
    const actualText  = actual ? 'O (붙음)' : 'X (안 붙음)';
    const correct = (predict === actual);
    const resultText = predict === null
      ? ''
      : (correct ? '<span class="correct">✓ 정답</span>'
                 : '<span class="wrong">✗ 오답</span>');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${predictText}</td>
      <td>${actualText}</td>
      <td>${resultText}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('compare-result-screen').classList.remove('hidden');
}

document.getElementById('to-finish-btn').addEventListener('click', () => {
  document.getElementById('compare-result-screen').classList.add('hidden');
  showFinishScreen();
});

// --- 9-6. 정리/다시 화면 ---
function showFinishScreen() {
  state.step = 'finish';
  // 모드에 따라 가운데 박스 표시:
  // - standard 모드(탐구 활동) → '내가 정한 물체로 실험하기' 박스 (custom-box) 보임
  // - custom 모드 → '탐구 활동 실험하기' 박스 (standard-box) 보임
  // → 사용자가 다른 모드로 쉽게 전환할 수 있도록 안내
  const customBox = document.getElementById('custom-box');
  const standardBox = document.getElementById('standard-box');
  if (currentMode === 'standard') {
    customBox.classList.remove('hidden');
    standardBox.classList.add('hidden');
  } else {
    customBox.classList.add('hidden');
    standardBox.classList.remove('hidden');
  }
  document.getElementById('finish-screen').classList.remove('hidden');
}

document.getElementById('summary-box').addEventListener('click', () => {
  document.getElementById('finish-screen').classList.add('hidden');
  document.getElementById('summary-screen').classList.remove('hidden');
  // 두 음성 순차 재생 (음성7 끝나면 음성8 자동 재생)
  speak('철로 된 물체와 자석은 붙습니다.');
  // 음성7 길이만큼 기다린 후 음성8 재생
  // - 첫 음성이 끝났을 때 두 번째 음성 재생 (onended 이벤트 활용)
  if (currentAudio) {
    currentAudio.onended = () => {
      speak('유리, 나무, 알루미늄, 플라스틱으로 된 물체와 자석은 붙지 않습니다.');
    };
  }
});

document.getElementById('summary-close-btn').addEventListener('click', () => {
  document.getElementById('summary-screen').classList.add('hidden');
  document.getElementById('finish-screen').classList.remove('hidden');
});

document.getElementById('retry-box').addEventListener('click', () => {
  resetAll();
});

// --- 9-6-b. '내가 정한 물체로 실험하기' 박스 ---
// 정리/다시하기 화면에서 가운데 박스를 누르면 커스텀 모드로 즉시 전환
// (상단 탭의 '내가 정한 물체로 실험하기' 클릭과 동일한 효과)
document.getElementById('custom-box').addEventListener('click', async () => {
  // 현재 화면(finish-screen) 숨김
  document.getElementById('finish-screen').classList.add('hidden');

  // 상단 탭 UI 활성화 갱신
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const customTab = document.querySelector('.tab-btn[data-tab="custom"]');
  if (customTab) customTab.classList.add('active');

  // 커스텀 모드로 전환 (물체 선택 화면 자동 표시)
  await switchMode('custom');
});

// --- 9-6-c. '탐구 활동 실험하기' 박스 ---
// 정리/다시하기 화면에서 누르면 standard 모드로 즉시 전환
// (상단 탭의 '탐구 활동 실험하기' 클릭과 동일한 효과)
document.getElementById('standard-box').addEventListener('click', async () => {
  document.getElementById('finish-screen').classList.add('hidden');

  // 상단 탭 UI 활성화 갱신
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const standardTab = document.querySelector('.tab-btn[data-tab="standard"]');
  if (standardTab) standardTab.classList.add('active');

  // standard 모드로 전환
  await switchMode('standard');
});

// --- 9-7. 초기화 버튼 ---
document.getElementById('reset-btn').addEventListener('click', () => {
  resetAll();
});

// --- 9-8. 소리 토글 버튼 ---
const soundToggleBtn = document.getElementById('sound-toggle-btn');
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    toggleSound();
  });
}

// 메인 메뉴 화면의 소리 토글 버튼도 동일하게 동작
const menuSoundToggleBtn = document.getElementById('menu-sound-toggle-btn');
if (menuSoundToggleBtn) {
  menuSoundToggleBtn.addEventListener('click', (e) => {
    // 카드 클릭(메뉴 진입)으로 이벤트가 전파되지 않게 차단
    e.stopPropagation();
    toggleSound();
  });
}

// 첫 사용자 인터랙션 시 배경음악 음소거 해제 (브라우저 자동재생 정책 우회)
// - 음악은 이미 muted 상태로 자동재생 중 → 첫 클릭 시 muted=false 로 전환
// - 사용자가 직접 음소거 토글로 끈 경우(bgMusicMuted=true)는 건드리지 않음
document.addEventListener('click', () => {
  if (bgMusic && bgMusic.muted && !bgMusicMuted) {
    bgMusic.muted = false;
    // 일부 브라우저는 muted=true 로 시작한 audio가 일시정지될 수 있으니 안전하게 재생 보장
    bgMusic.play().catch(()=>{});
  }
}, { once: false });

// =========================================================
// 10. 전체 초기화
// =========================================================

function resetAll() {
  // 진행 예약된 타이머도 취소 (resetAll 도중 다음 화면이 뜨는 것 방지)
  if (pendingFinishTimer !== null) {
    clearTimeout(pendingFinishTimer);
    pendingFinishTimer = null;
  }

  // 상태 초기화
  state.predictions = {};
  state.collectedInBasket = [];
  state.attachedToMagnet = null;
  state.attachedHalfHeight = 0;
    state.attachedBottomDist = 0;
  state.testedItems = new Set();
  state.predictionSkipped = false;   // 건너뛰기 플래그 초기화
  state.step = 'intro';

  // 자석 원위치
  if (sceneRefs.magnet) {
    sceneRefs.magnet.position.set(-2.5, deskTopY + 1.4, 0);
  }

  // 모든 오버레이 숨기기
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('experiment-message').classList.add('hidden');

  // 실험 진행 패널도 숨기기
  document.getElementById('tested-panel').classList.add('hidden');

  // 모드에 따라 보여주는 시작 화면 분기
  if (currentMode === 'custom') {
    // 커스텀 모드 → 이전 물체들 완전히 제거 후 물체 고르기 화면부터
    clearItemsFromScene();
    currentItems = [];
    showCustomPickScreen();
  } else {
    // standard 모드 → 물체 위치만 원래대로 되돌리고 인트로 화면
    sceneRefs.items.forEach(item => {
      item.object3d.position.copy(item.originalPos);
      // 자석에 붙어있던 물체의 렌더 상태도 원래대로 되돌림
      restoreObjectRender(item.object3d);
    });
    showIntroScreen();
  }

  document.getElementById('status-bar').textContent =
    '막대자석을 드래그해서 물체 위로 옮겨 보세요.';

  // 음성 취소 (TTS + mp3 모두)
  stopAllSpeech();
}

// =========================================================
// 10-1. 탭 전환 로직 (실험하기 / 내가 정한 물체로 실험하기)
// =========================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tabName = btn.dataset.tab;
    if (tabName === currentMode) return;   // 같은 탭이면 무시

    // 탭 UI 활성화 갱신
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 모드 전환
    await switchMode(tabName);
  });
});

/**
 * 모드 전환 (standard ↔ custom)
 * - 기존 물체들 씬에서 제거
 * - 새 모드에 맞춰 currentItems 갱신
 * - standard 모드: 즉시 물체 로드 후 인트로 화면
 * - custom 모드: 물체 선택 화면부터 (실제 로드는 "실험 시작" 클릭 시)
 */
async function switchMode(mode) {
  currentMode = mode;
  // 이 호출의 흐름 세대를 캡처 → await 후 비교
  const myGen = flowGeneration;

  // 진행 예약된 타이머 취소 (모드 전환 도중 이전 모드의 다음 화면이 뜨는 것 방지)
  if (pendingFinishTimer !== null) {
    clearTimeout(pendingFinishTimer);
    pendingFinishTimer = null;
  }

  // 기존 물체들 모두 제거
  clearItemsFromScene();
  state.attachedToMagnet = null;
  state.attachedHalfHeight = 0;
    state.attachedBottomDist = 0;
  state.collectedInBasket = [];
  state.testedItems = new Set();

  // 자석 원위치
  if (sceneRefs.magnet) {
    sceneRefs.magnet.position.set(-2.5, deskTopY + 1.4, 0);
  }

  // 모든 오버레이 숨기기
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('experiment-message').classList.add('hidden');
  document.getElementById('tested-panel').classList.add('hidden');

  if (mode === 'standard') {
    // standard 모드: 기본 7개 물체 즉시 배치 + 인트로 (실험 방법 먼저)
    currentItems = buildStandardItems();
    buildResultsFromCurrentItems();
    await loadItemsToScene();
    // [경합 방지] await 도중 사용자가 '메인 화면' 버튼을 눌렀다면 중단
    if (myGen !== flowGeneration) return;
    showIntroScreen();
  } else {
    // custom 모드: 물체 선택 화면부터
    currentItems = [];
    showCustomPickScreen();
  }
}

// =========================================================
// 10-2. 커스텀 모드 - 물체 선택 화면
// =========================================================

/**
 * 커스텀 물체 선택 화면 열기
 * - ITEMS_CATALOG의 모든 항목을 그리드로 표시
 * - 사용자 선택을 customSelection(Set)에 기록
 */
function showCustomPickScreen() {
  const grid = document.getElementById('custom-pick-grid');
  grid.innerHTML = '';
  customSelection.clear();

  // isCustom: true 인 물체들만 선택지로 표시
  const customItems = ITEMS_CATALOG.filter(c => c.isCustom);

  customItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'pick-item';
    div.dataset.file = item.file;
    div.innerHTML = `
      <span class="emoji">${item.emoji || '📦'}</span>
      <span class="item-name">${item.name}</span>
    `;
    div.addEventListener('click', () => {
      if (customSelection.has(item.file)) {
        customSelection.delete(item.file);
        div.classList.remove('selected');
      } else {
        customSelection.add(item.file);
        div.classList.add('selected');
      }
      updateCustomPickCount();
    });
    grid.appendChild(div);
  });

  updateCustomPickCount();
  document.getElementById('custom-pick-screen').classList.remove('hidden');
}

/**
 * 선택 개수 표시 갱신 + 시작 버튼 활성화 여부 결정
 */
function updateCustomPickCount() {
  const count = customSelection.size;
  document.getElementById('custom-pick-count').textContent = `선택: ${count}개`;
  const startBtn = document.getElementById('custom-start-btn');
  // 2개 이상 7개 이하일 때만 활성화
  startBtn.disabled = !(count >= 2 && count <= 7);
}

// 커스텀 모드 "실험 시작" 버튼
document.getElementById('custom-start-btn').addEventListener('click', async () => {
  if (customSelection.size < 2) return;

  // 이 호출의 흐름 세대를 캡처 → await 후 비교 (도중 '메인 화면' 누르면 중단)
  const myGen = flowGeneration;

  document.getElementById('custom-pick-screen').classList.add('hidden');

  // 선택한 물체들로 currentItems 생성 (실제 크기 측정 + 겹침 없는 랜덤 배치)
  currentItems = await buildCustomItems(customSelection);
  if (myGen !== flowGeneration) return;

  buildResultsFromCurrentItems();

  // 씬에 로드
  await loadItemsToScene();
  if (myGen !== flowGeneration) return;

  // 인트로 화면 표시 (실험 방법 먼저 → X 누르면 예상하기)
  showIntroScreen();
});

// =========================================================
// 11. 렌더 루프 & 리사이즈
// =========================================================

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // 드래그 중이면 프레임당 1회 물리 체크
  // - pointermove 이벤트가 60Hz보다 빠르게 들어오는 환경(고주사율 마우스)에서도
  //   무거운 Box3 계산은 화면 그리는 빈도와 동일하게 제한 → 마우스 따라가기는 쾌적하게
  if (isDragging && needsPhysicsUpdate) {
    needsPhysicsUpdate = false;
    autoContactItem();        // 물체 위에 왔으면 살짝 내려가 닿게
    checkMagnetCollision();   // 자석에 붙일지 체크
    checkBasketDrop();        // 바구니에 떨어뜨리는지 체크
  }

  // 드래그 중이 아니어도 자석에 붙어있는 오브젝트는 자석을 따라다니게
  if (state.attachedToMagnet && sceneRefs.magnet && !isDragging) {
    const nTip = getMagnetNorthTip();
    state.attachedToMagnet.position.x = nTip.x;
    state.attachedToMagnet.position.z = nTip.z;
    // 물체 윗면이 자석 N극에 딱 붙도록 저장된 halfHeight 사용
    // 단, 아랫면이 책상 면 아래로 안 내려가게 보정
    const targetY = nTip.y - state.attachedHalfHeight;
    const minY    = deskTopY + state.attachedBottomDist + 0.01;
    state.attachedToMagnet.position.y = Math.max(targetY, minY);
  }

  renderer.render(scene, camera);
}

function resizeRendererToFrame() {
  const { width, height } = getFrameSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
}

window.addEventListener('resize', resizeRendererToFrame);
window.addEventListener('orientationchange', resizeRendererToFrame);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeRendererToFrame);
}
if (window.ResizeObserver) {
  const frameResizeObserver = new ResizeObserver(resizeRendererToFrame);
  frameResizeObserver.observe(appFrame);
}

// =========================================================
// 12. 시작!
// =========================================================

// 최초는 standard 모드로 시작
currentItems = buildStandardItems();
buildResultsFromCurrentItems();

buildScene().then(() => {
  animate();
});
