const { createApp, ref, computed, onMounted } = Vue

createApp({
    setup() {
        const matrixEnabled = ref(false)

        const toggleMatrix = () => {
            matrixEnabled.value = !matrixEnabled.value
            const canvas = document.getElementById('matrixCanvas')
            canvas.style.display = matrixEnabled.value ? 'block' : 'none'
            if (matrixEnabled.value) {
                startMatrix()
            }
        }

        onMounted(() => {
            loadMalware()
            document.getElementById('matrixToggle').addEventListener('click', toggleMatrix)
        })

        return {
            matrixEnabled,
            toggleMatrix
        }
    },
}).mount('#app')

function startMatrix() {
    const canvas = document.getElementById('matrixCanvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン'
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const nums = '0123456789'
    const alphabet = katakana + latin + nums

    const fontSize = 16
    const columns = canvas.width / fontSize

    const rainDrops = []

    for (let x = 0; x < columns; x++) {
        rainDrops[x] = 1
    }

    function draw() {
        ctx.fillStyle = 'rgba(10, 14, 23, 0.05)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = '#00ff00'
        ctx.font = fontSize + 'px monospace'

        for (let i = 0; i < rainDrops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length))
            ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize)

            if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                rainDrops[i] = 0
            }
            rainDrops[i]++
        }
    }

    setInterval(draw, 30)
}

window.addEventListener('resize', () => {
    const canvas = document.getElementById('matrixCanvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
})
