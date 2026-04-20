<script setup lang="ts">
interface Song {
  id: number
  name: string
  artist: string
  cover: string
  duration?: string
}

interface Props {
  title: string
  songs: Song[]
  showNavigation?: boolean
}

withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [song: Song]
  like: [song: Song]
  navigate: [direction: 'prev' | 'next']
}>()
</script>

<template>
  <div class="songs-section">
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

    <!-- Song List -->
    <div class="song-list">
      <div
        v-for="song in songs"
        :key="song.id"
        class="song-item"
        @click="emit('play', song)"
      >
        <div class="d-flex align-center gap-3">
          <v-img
            :src="song.cover"
            cover
            class="song-cover"
            rounded
            max-width="56"
            max-height="56"
          />

          <div class="d-flex flex-column flex-grow-1">
            <div class="text-subtitle-2 font-weight-bold">{{ song.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ song.artist }}</div>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              icon
              variant="text"
              size="small"
              class="action-btn"
              @click.stop="emit('play', song)"
            >
              <v-icon icon="mdi-play" size="small" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              class="action-btn"
            >
              <v-icon icon="mdi-playlist-play" size="small" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              class="action-btn"
            >
              <v-icon icon="mdi-dots-vertical" size="small" />
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>

.songs-section {
  .song-list {
    .song-item {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);

        .action-btn {
          opacity: 1;
        }
      }

      .song-cover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-radius: 8px;
      }

      .action-btn {
        opacity: 0.6;
        transition: opacity 0.3s;

        &:hover {
          opacity: 1;
        }
      }
    }
  }
}
</style>
