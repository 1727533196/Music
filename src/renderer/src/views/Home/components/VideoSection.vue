<script setup lang="ts">
interface Video {
  id: number
  title: string
  thumbnail: string
  artist?: string
}

interface Props {
  title: string
  videos: Video[]
  showNavigation?: boolean
}

withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [video: Video]
  navigate: [direction: 'prev' | 'next']
}>()
</script>

<template>
  <div class="video-section mb-8">
    <!-- Section Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5 font-weight-bold">{{ title }}</h2>
      
      <div v-if="showNavigation" class="d-flex gap-2">
        <v-btn
          icon
          variant="tonal"
          size="small"
          @click="emit('navigate', 'prev')"
        >
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          @click="emit('navigate', 'next')"
        >
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </div>
    
    <!-- Video Grid -->
    <v-row>
      <v-col cols="12">
        <v-card
          rounded="xl"
          elevation="0"
          class="video-card"
          @click="emit('play', videos[0])"
        >
          <div class="video-thumbnail">
            <v-img :src="videos[0]?.thumbnail" cover class="video-img" />
            
            <div class="play-overlay">
              <div class="play-circle">
                <v-icon icon="mdi-play" size="x-large" />
              </div>
            </div>
            
            <div class="video-info pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-1">
                {{ videos[0]?.title }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style lang="less" scoped>
.video-card {
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.02);
  }
  
  .video-thumbnail {
    position: relative;
    
    .video-img {
      min-height: 300px;
    }
    
    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.2);
      
      .play-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s;
        
        .v-icon {
          color: white;
          font-size: 40px;
          margin-left: 4px;
        }
      }
      
      &:hover .play-circle {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.1);
      }
    }
    
    .video-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    }
  }
}
</style>
