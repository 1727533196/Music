<script setup lang="ts" name="Home">
import { ref } from 'vue'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import VideoSection from './components/VideoSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import recommendImage from '@/assets/recommend.png'

const activeTab = ref('popular')

// Artist Info
const artistInfo = {
  name: "Some Artist's Name Here",
  listeners: '364,461',
  description: 'Is an Australian pop artist who has won passionate fans of the drip pop scene with his unobtrusive and slow melody.',
  likedSongs: '436',
  lastRelease: '08.21.2019'
}

// Songs Data
const songs = ref([
  { id: 1, name: 'Modernism', artist: 'Some Nice Girls', cover: recommendImage },
  { id: 2, name: 'Dream About', artist: 'Well-Known Band', cover: recommendImage },
  { id: 3, name: 'Day In Life', artist: 'Well-Known Band', cover: recommendImage },
  { id: 4, name: 'This Hazy Morning', artist: 'Group of People', cover: recommendImage },
  { id: 5, name: 'Modernism', artist: 'Some Nice Girls', cover: recommendImage },
])

// Videos Data
const videos = ref([
  { 
    id: 1, 
    title: 'You Will Be Lucky To See Something Interesting This Week',
    thumbnail: recommendImage 
  },
])

// Albums Data
const albums = ref([
  { id: 1, name: 'Album 1', cover: recommendImage },
  { id: 2, name: 'Album 2', cover: recommendImage },
  { id: 3, name: 'Album 3', cover: recommendImage },
  { id: 4, name: 'Album 4', cover: recommendImage },
  { id: 5, name: 'Album 5', cover: recommendImage },
  { id: 6, name: 'Album 6', cover: recommendImage },
])

// Mixes Data
const mixes = ref([
  { id: 1, name: 'Mix 1', cover: recommendImage },
  { id: 2, name: 'Mix 2', cover: recommendImage },
  { id: 3, name: 'Mix 3', cover: recommendImage },
  { id: 4, name: 'Mix 4', cover: recommendImage },
  { id: 5, name: 'Mix 5', cover: recommendImage },
])

// Event Handlers
const handlePlay = (item: any) => {
  console.log('Play:', item)
}

const handleLike = (item: any) => {
  console.log('Like:', item)
}

const handleShare = () => {
  console.log('Share')
}

const handleNavigate = (direction: 'prev' | 'next') => {
  console.log('Navigate:', direction)
}
</script>

<template>
  <div class="home-container">
    <!-- Artist Banner -->
    <ArtistBanner
      :name="artistInfo.name"
      :listeners="artistInfo.listeners"
      :description="artistInfo.description"
      :liked-songs="artistInfo.likedSongs"
      :last-release="artistInfo.lastRelease"
      :cover-image="recommendImage"
      :background-image="recommendImage"
      @play="handlePlay"
      @like="handleLike"
      @share="handleShare"
    />
    
    <!-- Tabs Navigation -->
    <div class="tabs-container pa-6">
      <v-tabs v-model="activeTab" color="primary" align-tabs="start">
        <v-tab value="all">All</v-tab>
        <v-tab value="popular">Popular</v-tab>
        <v-tab value="tracks">Tracks</v-tab>
        <v-tab value="albums">Albums</v-tab>
        <v-tab value="about">About</v-tab>
      </v-tabs>
    </div>
    
    <!-- Content Area -->
    <div class="content-area pa-6">
      <v-window v-model="activeTab">
        <v-window-item value="all">
          <div class="content-grid">
            <!-- Left Column: Songs -->
            <div class="left-column">
              <SongsSection
                title="Songs"
                :songs="songs"
                @play="handlePlay"
                @like="handleLike"
                @navigate="handleNavigate"
              />
            </div>
            
            <!-- Right Column: Video & Others -->
            <div class="right-column">
              <VideoSection
                title="Video"
                :videos="videos"
                @play="handlePlay"
                @navigate="handleNavigate"
              />
              
              <AlbumsSection
                title="Albums"
                :albums="albums"
                @play="handlePlay"
                @like="handleLike"
                @navigate="handleNavigate"
              />
              
              <MixSection
                title="Mix"
                :mixes="mixes"
                @play="handlePlay"
                @like="handleLike"
                @navigate="handleNavigate"
              />
            </div>
          </div>
        </v-window-item>
        
        <v-window-item value="popular">
          <SongsSection
            title="Popular Songs"
            :songs="songs"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
        </v-window-item>
        
        <v-window-item value="tracks">
          <SongsSection
            title="All Tracks"
            :songs="songs"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
        </v-window-item>
        
        <v-window-item value="albums">
          <AlbumsSection
            title="All Albums"
            :albums="albums"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
        </v-window-item>
        
        <v-window-item value="about">
          <v-card rounded="xl" elevation="0" class="pa-6">
            <h2 class="text-h5 font-weight-bold mb-4">About the Artist</h2>
            <p class="text-body-1 text-medium-emphasis mb-4">
              {{ artistInfo.description }}
            </p>
            <div class="text-body-2 text-medium-emphasis">
              <div class="mb-2"><strong>Listeners:</strong> {{ artistInfo.listeners }}</div>
              <div class="mb-2"><strong>Liked Songs:</strong> {{ artistInfo.likedSongs }}</div>
              <div><strong>Last Release:</strong> {{ artistInfo.lastRelease }}</div>
            </div>
          </v-card>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<style lang="less" scoped>
.home-container {
  min-height: 100vh;
}

.tabs-container {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.content-area {
  min-height: 500px;
}

.content-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  height: calc(100vh - 400px);
  min-height: 600px;
  
  .left-column {
    overflow-y: auto;
    padding-right: 8px;
    
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
  
  .right-column {
    overflow-y: auto;
    padding-left: 8px;
    
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>
