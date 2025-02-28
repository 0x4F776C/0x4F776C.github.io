import { ref } from 'vue'

export function useDarkMode() {
  const darkMode = ref(
    localStorage.getItem('darkMode') === 'true' || 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark-theme')
    } else {
      document.documentElement.classList.remove('dark-theme')
    }
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDark)
  }

  const toggleTheme = () => {
    darkMode.value = !darkMode.value
    applyTheme(darkMode.value)
  }

  return {
    darkMode,
    applyTheme,
    toggleTheme
  }
}