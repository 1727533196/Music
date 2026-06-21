<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId = 0
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let startTime = 0

// ── GLSL 着色器 ────────────────────────────────────────────────────────────────
const VS = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FS = `
  precision highp float;
  uniform float u_time;
  uniform vec2  u_res;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(
      mix(dot(hash2(i+vec2(0,0)),f-vec2(0,0)), dot(hash2(i+vec2(1,0)),f-vec2(1,0)), u.x),
      mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)), dot(hash2(i+vec2(1,1)),f-vec2(1,1)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for(int i=0;i<4;i++){ v += a*noise(p); p = p*2.1+vec2(1.3,0.7); a*=0.5; }
    return v;
  }

  vec2 blobPos(float seed, float t) {
    float ax = 0.30 + 0.05*sin(seed*1.1), ay = 0.26 + 0.04*cos(seed*0.9);
    float fx = 0.08 + 0.03*sin(seed*0.7), fy = 0.09 + 0.02*cos(seed*1.3);
    return vec2(
      0.5 + ax*sin(fx*t + seed),
      0.5 + ay*cos(fy*t + seed*1.6)
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float t  = u_time * 0.3;

    // 极轻的空间扭曲
    float warpStr = 0.022;
    vec2 warpUv = uv + warpStr * vec2(fbm(uv*1.8+t*0.12), fbm(uv*1.8-t*0.12+vec2(5.2,1.3)));

    // 底色：极深海军蓝紫
    vec3 base = vec3(0.055, 0.048, 0.12);

    // 5 个克制的颜色球，全部在深紫/靛蓝/深蓝范围内
    vec3 cols[5];
    cols[0] = vec3(0.30, 0.18, 0.72); // 深紫
    cols[1] = vec3(0.18, 0.22, 0.68); // 靛蓝
    cols[2] = vec3(0.36, 0.20, 0.80); // 中紫
    cols[3] = vec3(0.14, 0.18, 0.55); // 深海蓝
    cols[4] = vec3(0.42, 0.26, 0.78); // 薰衣草紫

    float seeds[5];
    seeds[0]=0.0; seeds[1]=1.8; seeds[2]=3.5; seeds[3]=5.2; seeds[4]=7.0;

    vec3  color  = vec3(0.0);
    float wtotal = 0.0;

    for(int i=0;i<5;i++){
      float sd = seeds[i];
      vec2 center = blobPos(sd, t);

      vec2 localWarp = 0.03 * vec2(
        fbm(warpUv * 1.5 + sd*0.4 + t*0.08),
        fbm(warpUv * 1.5 + sd*0.4 - t*0.08 + vec2(3.1,1.7))
      );
      vec2 sampleUv = warpUv + localWarp;

      float d = distance(sampleUv, center);
      float sz = 0.32 + 0.05*sin(sd*0.8 + t*0.25);
      float w  = exp(-d*d / (2.0*sz*sz));
      color  += cols[i] * w;
      wtotal += w;
    }

    if(wtotal > 0.001) color /= wtotal;

    // 与底色混合，使整体偏暗
    color = mix(base, color, clamp(wtotal * 0.7, 0.0, 0.75));

    // 轻度 gamma 提亮，保持深色
    color = pow(color, vec3(0.92));

    // 饱和度略降，更克制
    float lum = dot(color, vec3(0.299,0.587,0.114));
    color = mix(vec3(lum), color, 1.6);

    // 整体压暗
    color *= 0.72;

    // 强暗角，四周更黑
    vec2 d2 = uv - 0.5;
    float vig = 1.0 - dot(d2,d2)*2.2;
    color *= clamp(vig, 0.0, 1.0);

    // 极轻胶片颗粒
    float grain = fract(sin(dot(gl_FragCoord.xy*0.017+u_time*0.3, vec2(12.9898,78.233)))*43758.5453) * 0.018;
    color += grain;

    gl_FragColor = vec4(clamp(color,0.0,1.0), 1.0);
  }
`

function createShader(type: number, src: string): WebGLShader | null {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src)
  gl!.compileShader(s)
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
    console.error(gl!.getShaderInfoLog(s))
    return null
  }
  return s
}

function init(canvas: HTMLCanvasElement) {
  gl = canvas.getContext('webgl', { antialias: false }) as WebGLRenderingContext
  if (!gl) return

  const vert = createShader(gl.VERTEX_SHADER, VS)
  const frag = createShader(gl.FRAGMENT_SHADER, FS)
  if (!vert || !frag) return

  program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)

  const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1])
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  startTime = performance.now()
  render()
}

function render() {
  animId = requestAnimationFrame(render)
  if (!gl || !program) return

  const canvas = canvasRef.value!
  const W = canvas.clientWidth
  const H = canvas.clientHeight
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W
    canvas.height = H
    gl.viewport(0, 0, W, H)
  }

  gl.useProgram(program)
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), (performance.now() - startTime) / 1000)
  gl.uniform2f(gl.getUniformLocation(program, 'u_res'), W, H)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

onMounted(() => {
  if (canvasRef.value) init(canvasRef.value)
})
onUnmounted(() => {
  cancelAnimationFrame(animId)
})
</script>

<template>
  <canvas ref="canvasRef" class="fluid-canvas" />
</template>

<style scoped>
.fluid-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
}
</style>

