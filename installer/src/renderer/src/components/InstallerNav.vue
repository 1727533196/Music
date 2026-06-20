<script setup lang="ts">
defineProps<{
  steps: { id: string; label: string }[]
  currentStep: number
  installing: boolean
}>()

const emit = defineEmits<{
  'go-to-step': [index: number]
}>()

function handleGoToStep(i: number) {
  emit('go-to-step', i)
}
</script>

<template>
  <nav class="installer-nav">
    <div class="nav-logo">
      <img src="../assets/logo.png" class="logo-img" alt="logo" />
      <div class="logo-info">
        <span class="logo-text">音乐</span>
        <span class="logo-sub">Music Player</span>
      </div>
    </div>

    <div class="nav-steps">
      <div
        v-for="(step, i) in steps"
        :key="step.id"
        :class="[
          'nav-step',
          {
            active: i === currentStep,
            done: i < currentStep,
            clickable: i < currentStep && !installing
          }
        ]"
        @click="handleGoToStep(i)"
      >
        <div class="step-dot">
          <svg v-if="i < currentStep" viewBox="0 0 24 24" class="step-check">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
          <span v-else class="step-num">{{ i + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
        <div v-if="i < steps.length - 1" class="step-line" :class="{ done: i < currentStep }" />
      </div>
    </div>

    <div class="nav-footer">
      <span class="nav-version">v 1.0.0</span>
    </div>
  </nav>
</template>

<style scoped>
.installer-nav {
  width: 196px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 46px 16px 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: #1c1c26;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 28px;
  padding: 12px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  .logo-img {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    flex-shrink: 0;
    object-fit: cover;
  }
  .logo-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .logo-text {
    font-size: 15px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.3px;
    line-height: 1.2;
  }
  .logo-sub {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.5px;
    font-weight: 400;
  }
}
.nav-steps {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-step {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  padding: 8px 10px;
  border-radius: 9px;
  transition: background 0.2s;
  &.clickable {
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.3s;
  .step-num {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.28);
  }
  .step-check {
    width: 11px;
    height: 11px;
    fill: #4ade80;
  }
}
.nav-step.active {
  background: rgba(99, 102, 241, 0.14);
  .step-dot {
    border-color: rgba(99, 102, 241, 0.9);
    background: rgba(99, 102, 241, 0.22);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.35);
    .step-num {
      color: #a5b4fc;
      font-weight: 700;
    }
  }
}
.nav-step.done .step-dot {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(74, 222, 128, 0.1);
}
.step-label {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
  transition: color 0.2s;
  white-space: nowrap;
  line-height: 1;
}
.nav-step.active .step-label {
  color: #a5b4fc;
  font-weight: 600;
}
.nav-step.done .step-label {
  color: rgba(255, 255, 255, 0.5);
}
.step-line {
  display: none;
}
.nav-footer {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  .nav-version {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.16);
    letter-spacing: 0.8px;
  }
}
</style>
