<template>
  <div ref="container" class="fluid-bg-container">
    <div v-if="showDebug" class="debug-panel">
      <div class="debug-title">🎨 Apple Music BG</div>
      <label>
        <span>速度</span>
        <input type="range" v-model.number="config.speed"
               min="0.001" max="0.6" step="0.001"/>
        <span class="val">{{ config.speed.toFixed(3) }}</span>
      </label>
      <label>
        <span>旋转强度</span>
        <input type="range" v-model.number="config.curlStrength"
               min="0.5" max="6.0" step="0.1"/>
        <span class="val">{{ config.curlStrength.toFixed(1) }}</span>
      </label>
      <label>
        <span>色块大小</span>
        <input type="range" v-model.number="config.blobScale"
               min="1.0" max="8.0" step="0.1"/>
        <span class="val">{{ config.blobScale.toFixed(1) }}</span>
      </label>
      <label>
        <span>亮度</span>
        <input type="range" v-model.number="config.brightness"
               min="0.5" max="2.5" step="0.05"/>
        <span class="val">{{ config.brightness.toFixed(2) }}</span>
      </label>
      <label>
        <span>饱和度</span>
        <input type="range" v-model.number="config.saturation"
               min="0.5" max="3.0" step="0.05"/>
        <span class="val">{{ config.saturation.toFixed(2) }}</span>
      </label>
      <label>
        <span>白化</span>
        <input type="range" v-model.number="config.whiten"
               min="0.0" max="0.6" step="0.01"/>
        <span class="val">{{ config.whiten.toFixed(2) }}</span>
      </label>
      <label>
        <span>暗角</span>
        <input type="range" v-model.number="config.vignette"
               min="0.0" max="0.8" step="0.02"/>
        <span class="val">{{ config.vignette.toFixed(2) }}</span>
      </label>
      <label>
        <span>噪点</span>
        <input type="range" v-model.number="config.grain"
               min="0.0" max="0.05" step="0.002"/>
        <span class="val">{{ config.grain.toFixed(3) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, reactive, nextTick } from 'vue'
import * as THREE from 'three'
const props = defineProps({
  /**
   * 主色调数组，每个颜色为 [R, G, B] 格式
   * 示例：[[255, 160, 210], [160, 120, 255]]
   */
  mainColor: {
    type: Array,
    default: () => [
      [255, 160, 210],
      [160, 120, 255],
      [255, 210, 130],
      [100, 180, 255],
    ],
  },
  /**
   * 流体动画速度
   * 范围：0.001 - 0.6，默认 0.5
   * 值越大，流动越快
   */
  speed:        { type: Number,  default: 0.5 },

  /**
   * 旋涡流场强度（Curl Noise 强度）
   * 范围：0.5 - 6.0，默认 2.2
   * 值越大，颜色的弧形扭曲越明显
   */
  curlStrength: { type: Number,  default: 2.2   },

  /**
   * 色块大小缩放比例
   * 范围：1.0 - 8.0，默认 2.9
   * 值越大，颜色区域越分散；值越小，颜色越集中
   */
  blobScale:    { type: Number,  default: 2.9   },

  /**
   * 整体亮度调整
   * 范围：0.5 - 2.5，默认 1.0
   * > 1.0 增亮，< 1.0 变暗
   */
  brightness:   { type: Number,  default: 1   },

  /**
   * 饱和度调整
   * 范围：0.5 - 3.0，默认 3.0
   * > 1.0 增加饱和度，< 1.0 降低饱和度
   */
  saturation:   { type: Number,  default: 3   },

  /**
   * 白化程度（向白色混合）
   * 范围：0.0 - 0.6，默认 0.0
   * Apple Music 风格关键参数，值约 0.12-0.25 时呈现粉嫩质感
   */
  whiten:       { type: Number,  default: 0  },

  /**
   * 暗角效果强度
   * 范围：0.0 - 0.8，默认 0.0
   * 值越大，边缘越暗，聚焦中心效果越明显
   */
  vignette:     { type: Number,  default: 0  },

  /**
   * 胶片噪点强度
   * 范围：0.0 - 0.05，默认 0.0
   * 添加细微的颗粒感，增强质感
   */
  grain:        { type: Number,  default: 0 },

  /**
   * 是否显示调试面板
   * true 时显示实时参数调节滑块
   */
  showDebug:    { type: Boolean, default: false },
})

const config = reactive({
    speed:        props.speed,
    curlStrength: props.curlStrength,
    blobScale:    props.blobScale,
    brightness:   props.brightness,
    saturation:   props.saturation,
    whiten:       props.whiten,
    vignette:     props.vignette,
    grain:        props.grain,
  })

;['speed','curlStrength','blobScale','brightness','saturation','whiten','vignette','grain']
.forEach(k => watch(() => props[k], v => { config[k] = v }))

const MAX_BLOBS    = 10
const instanceSeed = Math.random() * 100.0
const container    = ref(null)
let scene, camera, renderer, clock, uniforms, animFrameId
let targetColors = [] // 目标颜色数组
let blobPhaseOffset = 0 // 色球相位偏移（只影响色球位置，不影响流场）
let targetBlobPhaseOffset = 0 // 目标色球相位偏移

function parseRGB(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return new THREE.Color(1, 1, 1)
  return new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
}

function normalizeColors(arr) {
  const base = arr && arr.length > 0 ? arr : [[255, 150, 200]]
  return Array.from({ length: MAX_BLOBS }, (_, i) => parseRGB(base[i % base.length]))
}

onMounted(async () => {
  await nextTick()
  await new Promise(r => requestAnimationFrame(r))
  init()
  animate()
  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', onWindowResize)
  disposeScene()
})

watch(
  () => props.mainColor,
  (newVal) => {
    if (!uniforms) return
    const colors = normalizeColors(newVal)
    // 更新目标颜色，用于过渡动画
    targetColors = colors.map(c => c.clone())
    // 生成新的色球相位偏移，让色球切换到新轨迹（小数值）
    targetBlobPhaseOffset += 10.0 + Math.random() * 20.0
    const cnt = Math.min(newVal.length, MAX_BLOBS)
    uniforms.uColorCount.value = cnt
    uniforms.uBlobCount.value  = cnt
  },
  { deep: true }
)

watch(config, () => {
  if (!uniforms) return
  uniforms.uSpeed.value        = config.speed
  uniforms.uCurlStrength.value = config.curlStrength
  uniforms.uBlobScale.value    = config.blobScale
  uniforms.uBrightness.value   = config.brightness
  uniforms.uSaturation.value   = config.saturation
  uniforms.uWhiten.value       = config.whiten
  uniforms.uVignette.value     = config.vignette
  uniforms.uGrain.value        = config.grain
})

function init() {
  if (!container.value) return
  let w = container.value.clientWidth
  let h = container.value.clientHeight
  if (!w || !h) { w = window.innerWidth; h = window.innerHeight }

  scene  = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  renderer = new THREE.WebGLRenderer({
    antialias: false, alpha: false, powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  container.value.appendChild(renderer.domElement)
  clock = new THREE.Clock(true)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0]), 3
  ))
  geo.setAttribute('uv', new THREE.BufferAttribute(
    new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1]), 2
  ))

  const parsedColors  = normalizeColors(props.mainColor)
  targetColors = parsedColors.map(c => c.clone()) // 初始化目标颜色
  const colorUniforms = {}
  for (let i = 0; i < MAX_BLOBS; i++) {
    colorUniforms[`uColor${i}`] = { value: parsedColors[i].clone() }
  }
  const cnt = Math.min(props.mainColor.length, MAX_BLOBS)

  uniforms = {
    iTime:         { value: 0.0 },
    iResolution:   { value: new THREE.Vector2(w, h) },
    uSeed:         { value: instanceSeed },
    uBlobPhase:    { value: 0.0 },  // 新增：色球相位偏移 uniform
    uSpeed:        { value: config.speed        },
    uCurlStrength: { value: config.curlStrength },
    uBlobScale:    { value: config.blobScale    },
    uBrightness:   { value: config.brightness   },
    uSaturation:   { value: config.saturation   },
    uWhiten:       { value: config.whiten       },
    uVignette:     { value: config.vignette     },
    uGrain:        { value: config.grain        },
    uBlobCount:    { value: parseFloat(cnt)     },
    uColorCount:   { value: parseFloat(cnt)     },
    ...colorUniforms,
  }

  scene.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader:   buildVert(),
    fragmentShader: buildFrag(),
    depthWrite: false,
    depthTest:  false,
  })))

  onWindowResize()
}

function disposeScene() {
  if (renderer) {
    renderer.dispose()
    renderer.domElement?.parentNode?.removeChild(renderer.domElement)
    renderer = null
  }
  scene = camera = uniforms = clock = null
}

function onWindowResize() {
  if (!renderer || !uniforms || !container.value) return
  const w = container.value.clientWidth  || window.innerWidth
  const h = container.value.clientHeight || window.innerHeight
  renderer.setSize(w, h)
  uniforms.iResolution.value.set(w, h)
}

function animate() {
  animFrameId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !uniforms || !clock) return
  uniforms.iTime.value = clock.getElapsedTime()

  // 颜色过渡动画：每帧向目标颜色插值
  updateColorTransition()

  // 色球相位过渡：平滑切换到新的色球轨迹
  updateBlobPhaseTransition()

  renderer.render(scene, camera)
}

function updateBlobPhaseTransition() {
  if (!uniforms) return

  // 平滑插值到目标相位（过渡速度）
  const lerpSpeed = 0.02
  blobPhaseOffset += (targetBlobPhaseOffset - blobPhaseOffset) * lerpSpeed

  // 更新 uniform
  uniforms.uBlobPhase.value = blobPhaseOffset
}

function updateColorTransition() {
  if (!uniforms || targetColors.length === 0) return

  // 过渡速度（可调整）
  const lerpSpeed = 0.02

  for (let i = 0; i < MAX_BLOBS; i++) {
    const uniformKey = `uColor${i}`
    if (!uniforms[uniformKey]) continue

    const currentColor = uniforms[uniformKey].value
    const targetColor = targetColors[i]

    if (targetColor) {
      // 线性插值向目标颜色靠近
      currentColor.lerp(targetColor, lerpSpeed)
    }
  }
}

function buildVert() {
  return /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `
}

function buildFrag() {
  return /* glsl */`
    precision highp float;

    uniform vec2  iResolution;
    uniform float iTime;
    uniform float uSeed;
    uniform float uBlobPhase;  /* 新增：色球相位偏移（只影响色球位置） */
    uniform float uSpeed;
    uniform float uCurlStrength; /* 旋转流场强度 */
    uniform float uBlobScale;
    uniform float uBrightness;
    uniform float uSaturation;
    uniform float uWhiten;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uBlobCount;
    uniform float uColorCount;

    uniform vec3 uColor0;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform vec3 uColor5;
    uniform vec3 uColor6;
    uniform vec3 uColor7;
    uniform vec3 uColor8;
    uniform vec3 uColor9;

    varying vec2 vUv;

    /* ── 颜色查表 ─────────────────────────────────────────────────────────── */
    vec3 getColor(float idx) {
      float fi = mod(idx, uColorCount);
      if (fi < 0.5) return uColor0;
      if (fi < 1.5) return uColor1;
      if (fi < 2.5) return uColor2;
      if (fi < 3.5) return uColor3;
      if (fi < 4.5) return uColor4;
      if (fi < 5.5) return uColor5;
      if (fi < 6.5) return uColor6;
      if (fi < 7.5) return uColor7;
      if (fi < 8.5) return uColor8;
      return uColor9;
    }

    /* ── Hash ─────────────────────────────────────────────────────────────── */
    float hash11(float p) {
      p = fract(p * 0.1031 + uSeed * 0.0171);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
    }

    float hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031 + uSeed * 0.013);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    /* ── 梯度噪声（比值噪声更平滑，用于流场） ────────────────────────────── */
    vec2 grad(vec2 p) {
      float a = hash21(p) * 6.2832;
      return vec2(cos(a), sin(a));
    }

    float gnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(
        mix(dot(grad(i + vec2(0,0)), f - vec2(0,0)),
            dot(grad(i + vec2(1,0)), f - vec2(1,0)), u.x),
        mix(dot(grad(i + vec2(0,1)), f - vec2(0,1)),
            dot(grad(i + vec2(1,1)), f - vec2(1,1)), u.x),
        u.y
      ) * 0.5 + 0.5;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * Curl Noise 实现
     *
     * Curl Noise 的核心原理：
     *   给定标量噪声场 N(x,y)，其 curl 向量为：
     *   curl = ( dN/dy, -dN/dx )
     *   这个向量处处与梯度垂直，所以流线不会有"汇聚点"
     *   颜色会沿着漩涡状的曲线流动，而不是向中心/边缘聚拢
     *
     * 数值微分：用有限差分近似偏导数
     *   dN/dx ≈ (N(p + ε·x) - N(p - ε·x)) / (2ε)
     * ══════════════════════════════════════════════════════════════════════
     */
    vec2 curlNoise(vec2 p) {
      const float eps = 0.001;

      float n1 = gnoise(vec2(p.x, p.y + eps));
      float n2 = gnoise(vec2(p.x, p.y - eps));
      float n3 = gnoise(vec2(p.x + eps, p.y));
      float n4 = gnoise(vec2(p.x - eps, p.y));

      /* curl = (dN/dy, -dN/dx) */
      float dNdy = (n1 - n2) / (2.0 * eps);
      float dNdx = (n3 - n4) / (2.0 * eps);

      return vec2(dNdy, -dNdx);
    }

    /* ── 多层 Curl 噪声（叠加不同频率，产生多尺度旋涡）─────────────────── */
    vec2 fbmCurl(vec2 p, float t) {
      vec2 curl = vec2(0.0);
      float amp  = 1.0;
      float freq = 1.0;

      /* 3层叠加：大尺度主旋涡 + 中等涡旋 + 细节 */
      for (int i = 0; i < 3; i++) {
        /* 每层的噪声采样点加入时间偏移，让流场随时间演变 */
        vec2 sampleP = p * freq + float(i) * vec2(3.7, 1.3) + t * vec2(0.2, 0.15);
        curl += amp * curlNoise(sampleP);
        amp  *= 0.5;
        freq *= 2.0;
      }

      return curl;
    }

    /* ── 色球慢速基础漂移（在旋转流场基础上额外添加位置偏移）─────────────── */
    vec2 blobBasePos(float idx, float t) {
      float px = hash11(idx * 13.73 + 1.31) * 6.2832;
      float py = hash11(idx * 7.31  + 4.71) * 6.2832;
      float fx = 0.03 + hash11(idx * 3.17 + 0.57) * 0.02;
      float fy = 0.025 + hash11(idx * 5.71 + 1.23) * 0.02;
      /* 加入相位偏移，让色球轨迹可以平滑切换 */
      float phaseT = t + uBlobPhase;
      return vec2(
        0.5 + 0.3 * sin(phaseT * fx + px),
        0.5 + 0.3 * cos(phaseT * fy + py)
      );
    }

    /* ── 饱和度调整 ───────────────────────────────────────────────────────── */
    vec3 adjustSat(vec3 c, float s) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(l), c, s);
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 主函数
     *
     * 渲染流程：
     *
     * 1. 计算当前像素在旋转流场中经过"粒子追踪"后的位置
     *    即：从当前 uv 出发，沿 curl 向量场积分几步，得到 warpedUv
     *    这样颜色就会沿着旋涡线分布，而不是圆形分布
     *
     * 2. 用 warpedUv 做 IDW 颜色混合
     *    IDW 保证颜色填满整个屏幕
     *
     * 3. 后处理：白化、饱和度、亮度、暗角、噪点
     * ══════════════════════════════════════════════════════════════════════
     */
    void main() {
      vec2 uv = vUv;
      float t = iTime * uSpeed;  /* 流场使用正常时间 */
      float aspect = iResolution.x / iResolution.y;

      /* ── Step 1: 旋转流场域变形（核心！）────────────────────────────────
       *
       * 做 N 步欧拉积分，模拟粒子在旋转流场中的轨迹
       * 每步沿 curl 向量移动一小步
       *
       * 这就是为什么颜色会形成弧形条带：
       * - 每个像素的"采样坐标"被推离了原位，推的方向是旋涡方向
       * - 颜色沿着这些旋涡轨迹自然地被"拉伸"成弧形
       *
       * stepSize 越大、steps 越多 → 扭曲越强烈
       * uCurlStrength 控制每步大小
       */
      vec2 warpedUv = uv;
      float stepSize = uCurlStrength * 0.04;

      /* 4步积分，平衡效果与性能 */
      for (int step = 0; step < 4; step++) {
        /* 提高采样频率，让流场的漩涡更细密，拉丝感更强 */
        vec2 curl = fbmCurl(warpedUv * 1.0, t);
        warpedUv += curl * stepSize;
      }

      /* ── Step 2: IDW 颜色混合 ────────────────────────────────────────────
       *
       * 用 warpedUv（被旋涡扭曲后的坐标）做颜色采样
       * 色球在 warpedUv 空间中是圆形的
       * 但投影回屏幕空间后就变成了弧形/条带形
       */
      vec2  sampleAsp = vec2(warpedUv.x * aspect, warpedUv.y);
      vec3  colorSum  = vec3(0.0);
      float weightSum = 0.0;

      for (int i = 0; i < 6; i++) {
        if (float(i) >= uBlobCount) break;

        float fi  = float(i);
        vec2  pos = blobBasePos(fi, t);
        vec2  posAsp = vec2(pos.x * aspect, pos.y);

        float dist = distance(sampleAsp, posAsp) / uBlobScale;

        /* IDW power=2，柔和过渡 */
        float w = 1.0 / (dist * dist + 0.001);

        /* 呼吸动画：各色球周期性脉动 */
        float breath = 0.75 + 0.25 * sin(t * (0.4 + fi * 0.13) + fi * 1.9);
        w *= breath;

        colorSum  += getColor(fi) * w;
        weightSum += w;
      }

      vec3 col = colorSum / max(weightSum, 0.0001);

      /* ── Step 2.5: 色彩锐化（制造 Apple Music 式的交错感）──────────────
       * 核心技巧：通过 pow 函数提升对比度。
       * 这会让不同颜色的交界处变得更“硬”，产生类似大理石纹路的清晰边界，
       * 避免颜色过度融合成一团模糊的灰色。
       */
      col = pow(col, vec3(1.3));

      /* ── Step 3: 白化（还原 Apple Music 粉白质感）───────────────────────
       *
       * 这是最关键的一步：Apple Music 背景不是纯饱和色
       * 而是向白色混合了约 20~25%，形成"粉嫩"而非"浓郁"的观感
       */
      col = mix(col, vec3(1.0), uWhiten);

      /* ── Step 4: 饱和度 ──────────────────────────────────────────────── */
      col = adjustSat(col, uSaturation);

      /* ── Step 5: 亮度 ────────────────────────────────────────────────── */
      col *= uBrightness;

      /* ── Step 6: 暗角 ────────────────────────────────────────────────── */
      float vd  = distance(uv, vec2(0.5));
      float vig = smoothstep(0.85, 0.1, vd);
      col = mix(col * (1.0 - uVignette), col, vig);

      /* ── Step 7: 胶片噪点 ───────────────────────────────────────────── */
      float g = hash21(uv + fract(iTime * 17.13)) * 2.0 - 1.0;
      col += uGrain * g;

      /* ── Step 8: 输出 ────────────────────────────────────────────────── */
      col = clamp(col, 0.0, 1.0);
      col = pow(col, vec3(0.95));

      gl_FragColor = vec4(col, 1.0);
    }
  `
}
</script>

<style scoped lang="less">
.fluid-bg-container {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #e8c0f0;

  :deep(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
}

.debug-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 310px;
  user-select: none;

  .debug-title {
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  label {
    display: grid;
    grid-template-columns: 68px 1fr 44px;
    align-items: center;
    gap: 8px;
    color: rgba(255,255,255,0.85);
    font-size: 12px;

    input[type='range'] {
      width: 100%;
      accent-color: #fff;
      cursor: pointer;
    }

    .val {
      color: rgba(255,255,255,0.5);
      font-family: monospace;
      font-size: 11px;
      text-align: right;
    }
  }
}
</style>
