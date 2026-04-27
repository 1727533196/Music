<script setup lang="ts">
interface Props {
  name: string
  artist: string
  album: string
  duration: string
  releaseDate: string
  playCount: string
  coverImage: string
  backgroundImage: string
}

defineProps<Props>()

const emit = defineEmits<{
  play: []
  like: []
  share: []
}>()
</script>

<template>
  <v-card class="artist-banner" rounded="xl" elevation="0">
    <div class="banner-background">
      <v-img :src="backgroundImage" cover class="banner-bg-img" />
    </div>

    <div class="banner-content d-flex pa-6">
      <!-- Artist Avatar -->
      <v-img
        :src="coverImage"
        cover
        class="artist-avatar"
        rounded="lg"
        max-width="200"
        max-height="200"
      />

      <!-- Song Info -->
      <div class="song-info d-flex flex-column justify-end flex-grow-1 pb-5">
        <div class="text-caption text-medium-emphasis mb-2">
          {{ artist }}
        </div>
        <h1 class="text-h4 font-weight-bold mb-3 text-white">
          {{ name }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 600px; line-height: 1.6;">
          专辑：{{ album }}
        </p>

        <div class="d-flex align-center button-group">
          <v-btn
            color="white"
            variant="tonal"
            rounded="pill"
            size="large"
            @click="emit('play')"
            class="px-6"
          >
            <v-icon start icon="mdi-play" />
            播放
          </v-btn>

          <v-btn
            color="pink"
            variant="tonal"
            rounded="circle"
            icon
            size="large"
            @click="emit('like')"
          >
            <v-icon icon="mdi-star" />
          </v-btn>
        </div>
      </div>

      <!-- Stats -->
      <div class="song-stats text-right">
        <div class="mb-2">
          <div class="text-caption text-medium-emphasis">时长</div>
          <div class="text-body-1 font-weight-bold">{{ duration }}</div>
        </div>
        <div class="mb-2">
          <div class="text-caption text-medium-emphasis">播放次数</div>
          <div class="text-body-1 font-weight-bold">{{ playCount }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">发行日期</div>
          <div class="text-body-1 font-weight-bold">{{ releaseDate }}</div>
        </div>
      </div>

      <!-- Share Button -->
      <v-btn
        icon
        variant="tonal"
        color="white"
        size="small"
        class="share-btn"
        @click="emit('share')"
      >
        <v-icon icon="mdi-share-variant" />
      </v-btn>
    </div>
  </v-card>
</template>

<style lang="less" scoped>
.artist-banner {
  position: relative;
  overflow: hidden;
  margin: 16px;

  .banner-background {
    position: absolute;
    inset: 0;
    opacity: 0.6;

    .banner-bg-img {
      filter: blur(20px);
    }
  }

  .banner-content {
    position: relative;
    z-index: 1;
    gap: 24px;
  }

  .song-info {
    position: relative;
    z-index: 1;
  }
  
  .song-stats {
    position: absolute;
    bottom: 24px;
    right: 60px;
  }

  .share-btn {
    position: absolute;
    top: 24px;
    right: 24px;
  }
}
</style>
