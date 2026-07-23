// State Kalkulator
let currentInput = "0";
let formula = "";
let isCalculated = false;
let isDegrees = true;

// Pengaturan Suara & Tema (Persisten)
let soundEnabled = localStorage.getItem("soundEnabled") !== "false"; // default true
let currentTheme = localStorage.getItem("theme") || "dark"; // default dark
let scientificMode = localStorage.getItem("scientificMode") === "true"; // default false

// Riwayat kalkulasi
let calculationHistory = JSON.parse(localStorage.getItem("calcHistory")) || [];

// MathHelper untuk evaluasi fungsi ilmiah
const MathHelpers = {
    sin: (x) => isDegrees ? Math.sin(x * Math.PI / 180) : Math.sin(x),
    cos: (x) => isDegrees ? Math.cos(x * Math.PI / 180) : Math.cos(x),
    tan: (x) => {
        if (isDegrees && (x % 180 === 90 || x % 180 === -90)) return Infinity;
        return isDegrees ? Math.tan(x * Math.PI / 180) : Math.tan(x);
    },
    asin: (x) => isDegrees ? Math.asin(x) * 180 / Math.PI : Math.asin(x),
    acos: (x) => isDegrees ? Math.acos(x) * 180 / Math.PI : Math.acos(x),
    atan: (x) => isDegrees ? Math.atan(x) * 180 / Math.PI : Math.atan(x),
    ln: (x) => Math.log(x),
    log: (x) => Math.log10(x),
    sqrt: (x) => Math.sqrt(x)
};

// DOM Elements
const displayInput = document.getElementById("display");
const displayFormula = document.getElementById("formula-display");
const calculatorCard = document.getElementById("calculator");
const historyDrawer = document.getElementById("history-drawer");
const historyList = document.getElementById("history-list");

// Web Audio API click sound generator
let audioCtx = null;
function playClickSound() {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, audioCtx.currentTime); // Soft crisp tap
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.04);
        
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
        console.warn("Audio Context error", e);
    }
}

// Inisialisasi Tampilan & Pengaturan Awal
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initSound();
    initScientific();
    updateDisplay();
    setupEventListeners();
});

function initTheme() {
    document.documentElement.setAttribute("data-theme", currentTheme);
    const darkIcon = document.getElementById("theme-dark-icon");
    const lightIcon = document.getElementById("theme-light-icon");
    if (currentTheme === "light") {
        darkIcon.style.display = "none";
        lightIcon.style.display = "block";
    } else {
        darkIcon.style.display = "block";
        lightIcon.style.display = "none";
    }
}

function initSound() {
    const soundOnIcon = document.getElementById("sound-on-icon");
    const soundOffIcon = document.getElementById("sound-off-icon");
    const btn = document.getElementById("toggle-sound");
    if (soundEnabled) {
        soundOnIcon.style.display = "block";
        soundOffIcon.style.display = "none";
        btn.classList.add("active");
    } else {
        soundOnIcon.style.display = "none";
        soundOffIcon.style.display = "block";
        btn.classList.remove("active");
    }
}

function initScientific() {
    const btn = document.getElementById("toggle-sci");
    if (scientificMode) {
        calculatorCard.classList.add("scientific");
        btn.classList.add("active");
    } else {
        calculatorCard.classList.remove("scientific");
        btn.classList.remove("active");
    }
}

function setupEventListeners() {
    // Toggle Tema
    document.getElementById("toggle-theme").addEventListener("click", () => {
        playClickSound();
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        localStorage.setItem("theme", currentTheme);
        initTheme();
    });

    // Toggle Suara
    document.getElementById("toggle-sound").addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem("soundEnabled", soundEnabled);
        initSound();
        playClickSound(); // tes bunyi setelah diaktifkan
    });

    // Toggle Ilmiah
    document.getElementById("toggle-sci").addEventListener("click", () => {
        playClickSound();
        scientificMode = !scientificMode;
        localStorage.setItem("scientificMode", scientificMode);
        initScientific();
    });

    // Toggle Riwayat
    document.getElementById("toggle-history").addEventListener("click", () => {
        playClickSound();
        openHistory();
    });

    document.getElementById("close-history-btn").addEventListener("click", () => {
        playClickSound();
        closeHistory();
    });

    // Keyboard events
    document.addEventListener("keydown", handleKeyboardInput);
}

// Logic Input Kalkulator
function updateDisplay() {
    displayInput.innerText = formatDisplay(currentInput);
    displayFormula.innerText = formula;
    
    // Auto-scroll display ke kanan saat mengetik panjang
    displayInput.scrollLeft = displayInput.scrollWidth;
    displayFormula.scrollLeft = displayFormula.scrollWidth;
}

function formatDisplay(val) {
    if (val === "Error" || val === "Infinity" || val === "NaN") return val;
    // Ganti tanda operator untuk tampilan UI agar lebih estetis
    return val.replace(/\*/g, "×").replace(/\//g, "÷");
}

function appendNumber(num) {
    playClickSound();
    if (currentInput === "0" || isCalculated) {
        currentInput = num;
        isCalculated = false;
    } else {
        currentInput += num;
    }
    updateDisplay();
}

function appendDecimal() {
    playClickSound();
    if (isCalculated) {
        currentInput = "0.";
        isCalculated = false;
        updateDisplay();
        return;
    }
    
    // Dapatkan token/angka terakhir dalam input saat ini
    const lastToken = currentInput.split(/[\+\-\*\/\%\^\(\)]/).pop();
    if (!lastToken.includes(".")) {
        currentInput += ".";
    }
    updateDisplay();
}

function appendOperator(op) {
    playClickSound();
    if (isCalculated) {
        isCalculated = false;
    }
    
    // Jika input saat ini adalah "0" dan operator adalah "-", izinkan angka negatif
    if (currentInput === "0" && op === "-") {
        currentInput = "-";
        updateDisplay();
        return;
    }

    const lastChar = currentInput.slice(-1);
    const operators = ["+", "-", "*", "/", "%", "^"];
    
    if (operators.includes(lastChar)) {
        // Ganti operator terakhir jika ditekan operator baru
        currentInput = currentInput.slice(0, -1) + op;
    } else if (currentInput !== "" && currentInput !== "-") {
        currentInput += op;
    }
    updateDisplay();
}

function appendConstant(constVal) {
    playClickSound();
    if (currentInput === "0" || isCalculated) {
        currentInput = constVal;
        isCalculated = false;
    } else {
        const lastChar = currentInput.slice(-1);
        // Jika karakter terakhir angka atau konstanta lain, tambahkan tanda kali secara otomatis
        if (/[0-9eπ]/.test(lastChar)) {
            currentInput += "*" + constVal;
        } else {
            currentInput += constVal;
        }
    }
    updateDisplay();
}

function appendFunction(funcName) {
    playClickSound();
    if (currentInput === "0" || isCalculated) {
        currentInput = funcName + "(";
        isCalculated = false;
    } else {
        const lastChar = currentInput.slice(-1);
        if (/[0-9eπ\)]/.test(lastChar)) {
            currentInput += "*" + funcName + "(";
        } else {
            currentInput += funcName + "(";
        }
    }
    updateDisplay();
}

function toggleDegRad() {
    playClickSound();
    isDegrees = !isDegrees;
    document.getElementById("btn-degrad").innerText = isDegrees ? "DEG" : "RAD";
    document.getElementById("btn-degrad").classList.toggle("active", !isDegrees);
}

function clearDisplay() {
    playClickSound();
    currentInput = "0";
    formula = "";
    isCalculated = false;
    updateDisplay();
}

function deleteLast() {
    playClickSound();
    if (isCalculated) {
        clearDisplay();
        return;
    }
    
    if (currentInput.length > 1) {
        // Periksa jika menghapus fungsi ilmiah secara utuh (misal sin(, cos(, dll)
        const functions = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "ln(", "log(", "sqrt("];
        let deletedFunc = false;
        
        for (let func of functions) {
            if (currentInput.endsWith(func)) {
                currentInput = currentInput.slice(0, -func.length);
                deletedFunc = true;
                break;
            }
        }
        
        if (!deletedFunc) {
            currentInput = currentInput.slice(0, -1);
        }
    } else {
        currentInput = "0";
    }
    updateDisplay();
}

// Perhitungan Hasil
function calculate() {
    playClickSound();
    if (currentInput === "") return;
    
    // Perbaiki keseimbangan tanda kurung secara otomatis
    let openCount = (currentInput.match(/\(/g) || []).length;
    let closeCount = (currentInput.match(/\)/g) || []).length;
    let balancedInput = currentInput;
    while (openCount > closeCount) {
        balancedInput += ")";
        closeCount++;
    }

    try {
        const result = safeEvaluate(balancedInput);
        
        // Format hasil agar tidak terlalu panjang
        let formattedResult = Number(result);
        if (!Number.isInteger(formattedResult)) {
            // Batasi 8 angka di belakang koma untuk desimal
            formattedResult = parseFloat(formattedResult.toFixed(8)).toString();
        } else {
            formattedResult = formattedResult.toString();
        }
        
        formula = formatDisplay(balancedInput) + " =";
        
        // Simpan ke riwayat
        saveToHistory(balancedInput, formattedResult);
        
        currentInput = formattedResult;
        isCalculated = true;
    } catch (error) {
        console.error("Evaluation error:", error);
        currentInput = "Error";
        isCalculated = true;
    }
    updateDisplay();
}

function safeEvaluate(expr) {
    let jsExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/\^/g, '**');

    // Urutan penting: asin/acos/atan harus diganti sebelum sin/cos/tan
    const funcs = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt'];
    funcs.forEach(f => {
        const regex = new RegExp(`\\b${f}\\(`, 'g');
        jsExpr = jsExpr.replace(regex, `MathHelpers.${f}(`);
    });

    // Sanitasi ekstra: pastikan tidak ada kode berbahaya yang dieksekusi
    // Hanya perbolehkan angka, operator matematika, kurung, objek MathHelpers, dan Math.PI/E
    const sanitized = jsExpr.replace(/Math\.PI|Math\.E|MathHelpers\.(sin|cos|tan|asin|acos|atan|ln|log|sqrt)/g, '');
    if (/[a-zA-Z_$]/.test(sanitized)) {
        throw new Error("Ekspresi tidak aman");
    }

    // Evaluasi ekspresi aritmatika
    const evalResult = new Function(`return (${jsExpr})`)();
    
    if (evalResult === undefined || isNaN(evalResult)) {
        throw new Error("Bukan Angka");
    }
    if (!isFinite(evalResult)) {
        throw new Error("Nilai tak terhingga");
    }
    return evalResult;
}

// Riwayat Kalkulasi
function saveToHistory(expr, res) {
    const item = {
        id: Date.now(),
        expr: formatDisplay(expr),
        res: res
    };
    calculationHistory.unshift(item);
    // Batasi riwayat maksimal 30 item
    if (calculationHistory.length > 30) {
        calculationHistory.pop();
    }
    localStorage.setItem("calcHistory", JSON.stringify(calculationHistory));
    renderHistory();
}

function openHistory() {
    renderHistory();
    historyDrawer.classList.add("open");
}

function closeHistory() {
    historyDrawer.classList.remove("open");
}

function renderHistory() {
    historyList.innerHTML = "";
    if (calculationHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <svg viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                <span>Belum ada riwayat</span>
            </div>
        `;
        return;
    }

    calculationHistory.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `
            <div class="history-item-formula">${item.expr}</div>
            <div class="history-item-result">${item.res}</div>
        `;
        div.addEventListener("click", () => {
            playClickSound();
            currentInput = item.res;
            formula = item.expr + " =";
            isCalculated = true;
            updateDisplay();
            closeHistory();
        });
        historyList.appendChild(div);
    });
}

function clearHistory() {
    playClickSound();
    calculationHistory = [];
    localStorage.setItem("calcHistory", JSON.stringify(calculationHistory));
    renderHistory();
}

// Input Keyboard
function handleKeyboardInput(e) {
    // Abaikan jika user sedang mengetik di input field lain (jika ada)
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
    }

    const key = e.key;
    
    // Angka 0-9
    if (/[0-9]/.test(key)) {
        e.preventDefault();
        appendNumber(key);
    }
    // Desimal
    else if (key === "." || key === ",") {
        e.preventDefault();
        appendDecimal();
    }
    // Operator
    else if (key === "+" || key === "-" || key === "*" || key === "/" || key === "%" || key === "^") {
        e.preventDefault();
        appendOperator(key);
    }
    // Tanda Kurung
    else if (key === "(" || key === ")") {
        e.preventDefault();
        appendOperator(key);
    }
    // Enter / Hasil
    else if (key === "Enter" || key === "=") {
        e.preventDefault();
        calculate();
    }
    // Hapus satu karakter (Backspace)
    else if (key === "Backspace") {
        e.preventDefault();
        deleteLast();
    }
    // Hapus semua (Escape atau 'c' / 'C')
    else if (key === "Escape" || key.toLowerCase() === "c") {
        e.preventDefault();
        clearDisplay();
    }
}
