<script setup lang="ts">
interface Album {
  id: number
  name: string
  cover: string
  artist?: string
}

interface Props {
  title: string
  albums: Album[]
  showNavigation?: boolean
}

withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [album: Album]
  like: [album: Album]
  navigate: [direction: 'prev' | 'next']
}>()
</script>

<template>
  <div class="albums-section mb-8">
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
    
    <!-- Album Grid -->
    <v-row>
      <v-col
        v-for="album in albums"
        :key="album.id"
        cols="4"
        sm="3"
        md="2"
      >
        <div class="album-item">
          <v-card
            rounded="lg"
            elevation="0"
            class="album-card"
            @click="emit('play', album)"
          >
            <div class="album-cover">
              <v-img :src="album.cover" cover class="cover-img" />
              
              <v-btn
                icon
                variant="tonal"
                color="pink"
                size="small"
                class="album-heart"
                @click.stop="emit('like', album)"
              >
                <v-icon icon="mdi-heart" />
              </v-btn>
            </div>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style lang="less" scoped>
.album-item {
  .album-card {
    transition: all 0.3s;
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
    }
    
    .album-cover {
      position: relative;
      aspect-ratio: 1;
      
      .cover-img {
        border-radius: 8px;
      }
      
      .album-heart {
        position: absolute;
        top: 8px;
        right: 8px;
        opacity: 0;
        transition: opacity 0.3s;
        
        .v-icon {
          font-size: 18px;
        }
      }
      
      &:hover .album-heart {
        opacity: 1;
      }
    }
  }
}
</style>
