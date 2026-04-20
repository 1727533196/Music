<script setup lang="ts">
interface Props {
  name: string
  listeners: string
  description: string
  likedSongs: string
  lastRelease: string
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
      
      <!-- Artist Info -->
      <div class="artist-info d-flex flex-column justify-end flex-grow-1 pb-5">
        <div class="text-caption text-medium-emphasis mb-2">
          {{ listeners }} LISTENERS
        </div>
        <h1 class="text-h4 font-weight-bold mb-3 text-white">
          {{ name }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 600px; line-height: 1.6;">
          {{ description }}
        </p>
        
        <div class="d-flex align-center gap-3">
          <v-btn
            color="white"
            variant="tonal"
            rounded="pill"
            size="large"
            @click="emit('play')"
            class="px-6"
          >
            <v-icon start icon="mdi-play" />
            PLAY
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
      <div class="banner-stats text-right">
        <div class="mb-2">
          <div class="text-caption text-medium-emphasis">Liked Songs</div>
          <div class="text-body-1 font-weight-bold">{{ likedSongs }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Last Release</div>
          <div class="text-body-1 font-weight-bold">{{ lastRelease }}</div>
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
  
  .artist-avatar {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  .banner-stats {
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
