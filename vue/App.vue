<template>
  <div id="app" :class="{ 'dark-theme': darkMode }">
    <header>
      <div class="theme-toggle">
        <button @click="toggleTheme">
          {{ darkMode ? 'Light Mode' : 'Dark Mode' }}
        </button>
      </div>
      
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="searchMalware" 
          placeholder="Search malware..." 
        />
        <button v-if="searchQuery" @click="clearSearch">Clear</button>
      </div>
      
      <div class="category-filter">
        <select v-model="selectedCategory" @change="searchMalware">
          <option value="">All Categories</option>
          <option v-for="category in categories" :key="category.name" :value="category.name">
            {{ category.name }} ({{ category.count }})
          </option>
        </select>
      </div>
    </header>
    
    <main>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div v-if="isLoading" class="loading">Loading malware data...</div>
      
      <div v-else class="malware-list">
        <div 
          v-for="item in visibleMalware" 
          :key="item.name" 
          class="malware-item"
          @click="openModal(item)"
        >
          <h3>{{ item.name }}</h3>
          <div class="category-badge">{{ item.category }}</div>
          <p>{{ item.description }}</p>
        </div>
      </div>
    </main>
    
    <MalwareModal 
      v-if="selectedMalware" 
      :malware="selectedMalware" 
      :activeTab="activeTab"
      :getLanguage="getLanguage"
      @close="closeModal"
      @change-tab="activeTab = $event"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import MalwareModal from 'components/MalwareModal.vue'
import { useMalwareData } from 'composables/useMalwareData'
import { useDarkMode } from 'composables/useDarkMode'
import { useUIHelpers } from 'composables/useUIHelpers'

export default {
  name: 'App',
  components: {
    MalwareModal
  },
  setup() {
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const selectedMalware = ref(null)
    const activeTab = ref('code') // For tab management
    
    const { 
      allMalware, 
      malware, 
      isLoading, 
      errorMessage, 
      loadMalware 
    } = useMalwareData()
    
    const { 
      darkMode, 
      toggleTheme, 
      applyTheme 
    } = useDarkMode()
    
    const { 
      escapeHtml, 
      getLanguage, 
      highlightAll 
    } = useUIHelpers()

    const categories = computed(() => {
      const categoryCounts = allMalware.value.reduce((acc, malware) => {
        acc[malware.category] = (acc[malware.category] || 0) + 1;
        return acc;
      }, {});

      return Object.keys(categoryCounts).map(category => ({
        name: category,
        count: categoryCounts[category]
      }));
    });

    const visibleMalware = computed(() => {
      if (searchQuery.value || selectedCategory.value) {
        return malware.value;
      } else {
        return malware.value.slice(0, 5);
      }
    });

    const searchMalware = () => {
      malware.value = allMalware.value.filter(malware =>
        (malware.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          malware.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
        (selectedCategory.value === '' || malware.category === selectedCategory.value)
      );
    };

    // Modal handling functions
    const openModal = (malware) => {
      selectedMalware.value = malware
      activeTab.value = 'code' // Reset to code tab when opening modal
      
      // Add class to body to prevent scrolling
      document.body.classList.add('modal-open')
      
      // Apply highlighting after modal is open
      nextTick(() => {
        highlightAll();
      });
    };

    const closeModal = () => {
      selectedMalware.value = null
      activeTab.value = 'code'
      
      // Remove class from body to re-enable scrolling
      document.body.classList.remove('modal-open')
    };

    // Set up keyboard listeners
    const setupKeyboardListeners = () => {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && selectedMalware.value) {
          closeModal();
        }
      });
    };

    onMounted(() => {
      loadMalware();
      highlightAll();
      setupKeyboardListeners();
      applyTheme(darkMode.value);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('darkMode') === null) {
          darkMode.value = e.matches;
          applyTheme(darkMode.value);
        }
      });
    });

    return {
      searchQuery,
      malware,
      visibleMalware,
      searchMalware,
      categories,
      selectedCategory,
      errorMessage,
      selectedMalware,
      escapeHtml,
      openModal,
      closeModal,
      getLanguage,
      highlightAll,
      isLoading,
      activeTab,
      darkMode,
      toggleTheme
    };
  },
  methods: {
    clearSearch() {
      this.searchQuery = '';
      this.searchMalware();
    }
  },
  updated() {
    this.highlightAll();
  }
}
</script>