<script setup lang="ts">
interface Mix {
  id: number
  name: string
  cover: string
  description?: string
}

interface Props {
  title: string
  mixes: Mix[]
  showNavigation?: boolean
}

withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [mix: Mix]
  like: [mix: Mix]
  navigate: [direction: 'prev' | 'next']
}>()
</script>

<template>
  <div class="mix-section mb-8">
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
    
    <!-- Mix Grid -->
    <v-row>
      <v-col
        v-for="mix in mixes"
        :key="mix.id"
        cols="4"
        sm="3"
        md="2"
      >
        <div class="mix-item">
          <v-card
            rounded="lg"
            elevation="0"
            class="mix-card"
            @click="emit('play', mix)"
          >
            <div class="mix-cover">
              <v-img :src="mix.cover" cover class="cover-img" />
              
              <v-btn
                icon
                variant="tonal"
                color="pink"
                size="small"
                class="mix-heart"
                @click.stop="emit('like', mix)"
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
.mix-item {
  .mix-card {
    transition: all 0.3s;
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
    }
    
    .mix-cover {
      position: relative;
      aspect-ratio: 1;
      
      .cover-img {
        border-radius: 8px;
      }
      
      .mix-heart {
        position: absolute;
        top: 8px;
        right: 8px;
        opacity: 0;
        transition: opacity 0.3s;
        
        .v-icon {
          font-size: 18px;
        }
      }
      
      &:hover .mix-heart {
        opacity: 1;
      }
    }
  }
}
</style>
