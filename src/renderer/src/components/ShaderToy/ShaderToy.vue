<template>
  <div ref="container" id="container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, defineProps, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  mainColor: {
    type: Array,
    default: () => [[255, 255, 255], [255, 255, 255]], // 默认颜色
  }
});

const container = ref(null);
let scene, camera, renderer, clock, uniforms;

// 解析 RGB 数组为 THREE.Color 对象
function parseRGB(rgbArray) {
  if (!Array.isArray(rgbArray) || rgbArray.length < 3) {
    return new THREE.Color(1, 1, 1); // 默认白色
  }
  const r = rgbArray[0] / 255;
  const g = rgbArray[1] / 255;
  const b = rgbArray[2] / 255;
  return new THREE.Color(r, g, b);
}

// 初始化颜色
const parsedColors = ref(props.mainColor.map(color => parseRGB(color)));

// 初始化随机种子
const randomSeed = Math.random();

onMounted(() => {
  init();
  animate();
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  disposeScene();
});

// 监听 mainColor 的变化
watch(() => props.mainColor, (newColors) => {
  parsedColors.value = newColors.map(color => parseRGB(color));
  disposeScene(); // 清理现有场景
  init(); // 重新初始化场景
});

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, container.value.clientWidth / container.value.clientHeight, 0.1, 1000);
  camera.position.z = 2;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  container.value.appendChild(renderer.domElement);
  clock = new THREE.Clock(true);

  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,

    -1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ]), 3));

  uniforms = {
    iTime: { value: 0 },
    iTimeScale: { value: 0.1 },
    iResolution: { value: new THREE.Vector2(container.value.clientWidth, container.value.clientHeight) },
    uMainColor: { value: parsedColors.value[0] }, // 使用解析后的颜色
    uRandomSeed: { value: randomSeed }, // 随机种子
  };

  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader(),
    fragmentShader: fragmentShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  onWindowResize();
}

function disposeScene() {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  if (scene) {
    scene = null;
  }
  if (camera) {
    camera = null;
  }
}

function onWindowResize() {
  if (renderer && uniforms && container.value) {
    const width = container.value.clientWidth;
    const height = container.value.clientHeight;
    renderer.setSize(width, height);
    uniforms.iResolution.value.x = width;
    uniforms.iResolution.value.y = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) {
    uniforms.iTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
}

function vertexShader() {
  return `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;
}

function fragmentShader() {
  return `
    uniform vec2 iResolution;
    uniform float iTime;
    uniform float iTimeScale;
    uniform vec3 uMainColor;
    uniform float uRandomSeed; // 随机种子

    float random(float n) {
      return fract(sin(n + uRandomSeed) * 43758.5453123);
    }

    float noise(float p) {
      float fl = floor(p);
      float fc = fract(p);
      return mix(random(fl), random(fl + 1.0), fc);
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / max(iResolution.x, iResolution.y);
      float scaledTime = iTime * iTimeScale;

      for(int i = 1; i < 5; i++) {
        vec2 newp = p;
        float angle = 0.3 * float(i);
        newp.x += 0.5 / float(i) * sin(float(i) * p.y + scaledTime + angle) + 1.0;
        newp.y += 0.5 / float(i) * cos(float(i) * p.x + scaledTime + angle * 2.0) - 1.0;
        newp += 0.03 * vec2(noise(newp.x + scaledTime), noise(newp.y + scaledTime));
        p = newp;
      }

      vec3 col = vec3(1.0 - abs(sin(p.x * cos(scaledTime))), 1.0 - abs(cos(p.x + p.y * sin(scaledTime))), 1.0 - abs(sin(p.y))) * uMainColor.rgb;
      fragColor = vec4(col, 1.0);
    }

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;
}
</script>

<style scoped lang="less">
#container {
  width: 100vw;
  height: 100vh;
  position: absolute;
}
</style>
