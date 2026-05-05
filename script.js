document.addEventListener("DOMContentLoaded", function () {

  // ========== 题库 ==========
  var SENTENCES = {
    easy: [
      "The quick brown fox jumps over the lazy dog.",
      "Practice makes perfect.",
      "Hello world this is a typing test.",
      "The sun rises in the east and sets in the west.",
      "I love coding and building cool projects.",
      "A journey of a thousand miles begins with a single step.",
      "Keep calm and carry on typing fast.",
      "Learning to type quickly takes time and practice.",
      "Every day is a new chance to improve yourself.",
      "Open your eyes look up to the sky and see."
    ],
    medium: [
      "Typing speed is measured in words per minute.",
      "The best way to improve is to practice regularly.",
      "JavaScript is a versatile programming language.",
      "Consistency is the key to mastering any skill.",
      "Technology has transformed the way we communicate.",
      "A good programmer writes clean and readable code.",
      "The internet connects billions of people worldwide.",
      "Focus on hitting each key correctly every time."
    ],
    hard: [
      "The phenomenon of quantum entanglement challenges our understanding of physics.",
      "Asynchronous JavaScript programming uses callbacks promises and async await.",
      "Cryptographic algorithms ensure secure data transmission over public networks.",
      "Machine learning models grow exponentially with the dimensionality of input.",
      "Distributed systems handle network partitions latency and fault tolerance.",
      "Polymorphism encapsulation and inheritance are pillars of object oriented design.",
      "Refactoring legacy code reduces technical debt and improves maintainability.",
      "The Fibonacci sequence appears in many biological structures and patterns."
    ]
  };

  var DIFF_TIME = { easy: 60, medium: 90, hard: 120 };

  // ========== 状态 ==========
  var currentText = "";
  var timer = null;
  var timeLeft = 60;
  var isRunning = false;
  var startTime = null;
  var correctChars = 0;
  var errorChars = 0;
  var combo = 0;
  var currentDifficulty = "easy";
  var history = [];
  var usedIndices = [];

  // ========== DOM ==========
  var textDisplay = document.getElementById("textDisplay");
  var inputBox = document.getElementById("inputBox");
  var wpmDisp = document.getElementById("wpmDisplay");
  var accDisp = document.getElementById("accuracyDisplay");
  var timerDisp = document.getElementById("timerDisplay");
  var comboDisp = document.getElementById("comboDisplay");
  var progressBar = document.getElementById("progressBar");
  var startBtn = document.getElementById("startBtn");
  var resetBtn = document.getElementById("resetBtn");
  var resultOverlay = document.getElementById("resultOverlay");
  var playAgainBtn = document.getElementById("playAgainBtn");
  var historyList = document.getElementById("historyList");

  // ========== localStorage 安全读写 ==========
  function safeGet() {
    try { return JSON.parse(localStorage.getItem("typingHistory")) || []; }
    catch (e) { return []; }
  }
  function safeSet(d) {
    try { localStorage.setItem("typingHistory", JSON.stringify(d)); }
    catch (e) { /* 忽略 */ }
  }

  // ========== 初始化 ==========
  loadHistory();
  resetGame(false);

  // ========== 难度按钮 ==========
  var diffBtns = document.querySelectorAll(".diff-btn");
  for (var d = 0; d < diffBtns.length; d++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        if (isRunning) return;
        for (var j = 0; j < diffBtns.length; j++) diffBtns[j].classList.remove("active");
        btn.classList.add("active");
        currentDifficulty = btn.dataset.level;
        timeLeft = DIFF_TIME[currentDifficulty];
        timerDisp.textContent = timeLeft;
      });
    })(diffBtns[d]);
  }

  // ========== 按钮事件 ==========
  startBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", function () {
    resultOverlay.classList.remove("show");
    startGame();
  });
  resetBtn.addEventListener("click", function () { resetGame(true); });

  // ========== 开始游戏 ==========
  function startGame() {
    resetGame(false);
    loadSentence();
    inputBox.disabled = false;
    inputBox.focus();
    startBtn.disabled = true;
    isRunning = false;
    inputBox.placeholder = "开始打字，计时自动启动……";
  }

  // ========== 加载句子 ==========
  function loadSentence() {
    var pool = SENTENCES[currentDifficulty];
    if (usedIndices.length >= pool.length) usedIndices = [];
    var idx;
    do { idx = Math.floor(Math.random() * pool.length); }
    while (usedIndices.indexOf(idx) !== -1);
    usedIndices.push(idx);
    currentText = pool[idx];
    renderText();
  }

  // ========== 渲染文本 ==========
  function renderText() {
    var html = "";
    for (var i = 0; i < currentText.length; i++) {
      var ch = currentText[i];
      if (ch === " ") ch = "&nbsp;";
      html += '<span class="char" id="c' + i + '">' + ch + '</span>';
    }
    textDisplay.innerHTML = html;
    var first = document.getElementById("c0");
    if (first) first.classList.add("current");
  }

  // ========== 输入事件 ==========
  inputBox.addEventListener("input", function () {
    var typed = inputBox.value;
    var len = typed.length;

    // 第一次输入开始计时
    if (!isRunning && len === 1) {
      isRunning = true;
      startTime = Date.now();
      startCountdown();
    }

    // 逐字对比
    correctChars = 0;
    errorChars = 0;
    for (var i = 0; i < currentText.length; i++) {
      var span = document.getElementById("c" + i);
      if (!span) continue;
      span.classList.remove("correct", "wrong", "current");
      if (i < len) {
        if (typed[i] === currentText[i]) {
          span.classList.add("correct");
          correctChars++;
        } else {
          span.classList.add("wrong");
          errorChars++;
        }
      } else if (i === len) {
        span.classList.add("current");
      }
    }

    // 连击
    if (len > 0) {
      if (typed[len - 1] === currentText[len - 1]) {
        combo++;
        comboDisp.classList.remove("combo-flash");
        void comboDisp.offsetWidth;
        comboDisp.classList.add("combo-flash");
      } else {
        combo = 0;
      }
    }
    comboDisp.textContent = combo;

    // 正确率
    var total = correctChars + errorChars;
    var acc = total > 0 ? Math.round(correctChars / total * 100) : 100;
    accDisp.textContent = acc + "%";

    // 进度条
    var pct = Math.min(len / currentText.length * 100, 100);
    progressBar.style.width = pct + "%";

    // 实时WPM
    if (isRunning && startTime) {
      var elapsed = (Date.now() - startTime) / 60000;
      var wpm = elapsed > 0 ? Math.round(correctChars / 5 / elapsed) : 0;
      wpmDisp.textContent = wpm;
    }

    // 打完一句，换下一句
    if (len >= currentText.length && typed === currentText) {
      inputBox.value = "";
      progressBar.style.width = "0%";
      loadSentence();
    }
  });

  // ========== 倒计时 ==========
  function startCountdown() {
    timeLeft = DIFF_TIME[currentDifficulty];
    timer = setInterval(function () {
      timeLeft--;
      timerDisp.textContent = timeLeft;
      timerDisp.style.color = timeLeft <= 10 ? "#e94560" : "#4ecca3";
      if (timeLeft <= 0) {
        clearInterval(timer);
        endGame();
      }
    }, 1000);
  }

  // ========== 游戏结束 ==========
  function endGame() {
    isRunning = false;
    inputBox.disabled = true;
    startBtn.disabled = false;

    var elapsed = (Date.now() - startTime) / 60000;
    var wpm = elapsed > 0 ? Math.round(correctChars / 5 / elapsed) : 0;
    var total = correctChars + errorChars;
    var acc = total > 0 ? Math.round(correctChars / total * 100) : 100;
    var rank = getRank(wpm, acc);

    document.getElementById("resultEmoji").textContent = rank.emoji;
    document.getElementById("resultTitle").textContent = rank.title;
    document.getElementById("finalWpm").textContent = wpm;
    document.getElementById("finalAccuracy").textContent = acc;
    document.getElementById("finalCorrect").textContent = correctChars;
    document.getElementById("finalError").textContent = errorChars;

    var rb = document.getElementById("rankBadge");
    rb.textContent = rank.badgeText;
    rb.style.background = rank.badgeBg;
    rb.style.color = rank.badgeColor;

    resultOverlay.classList.add("show");
    saveRecord(wpm, acc, currentDifficulty);
  }

  // ========== 等级评定 ==========
  function getRank(wpm, acc) {
    if (wpm >= 80 && acc >= 95) return { emoji: "🏆", title: "神级打字员！", badgeText: "S级 传说", badgeBg: "rgba(247,215,22,0.15)", badgeColor: "#f7d716" };
    if (wpm >= 60 && acc >= 90) return { emoji: "🥇", title: "优秀！超过大多数人", badgeText: "A级 优秀", badgeBg: "rgba(78,204,163,0.15)", badgeColor: "#4ecca3" };
    if (wpm >= 40 && acc >= 85) return { emoji: "🥈", title: "不错！继续加油", badgeText: "B级 良好", badgeBg: "rgba(100,149,237,0.15)", badgeColor: "#6495ed" };
    if (wpm >= 20) return { emoji: "🥉", title: "继续练习，进步很快！", badgeText: "C级 进阶中", badgeBg: "rgba(255,165,0,0.15)", badgeColor: "#ffa500" };
    return { emoji: "💪", title: "初学者，多练就会快！", badgeText: "D级 新手", badgeBg: "rgba(200,200,200,0.1)", badgeColor: "#aaa" };
  }

  // ========== 历史记录 ==========
  function saveRecord(wpm, acc, diff) {
    var record = {
      wpm: wpm, acc: acc, difficulty: diff,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    };
    history.unshift(record);
    if (history.length > 5) history.pop();
    safeSet(history);
    renderHistory();
  }

  function loadHistory() {
    history = safeGet();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<p class="no-record">暂无记录，快来挑战吧！</p>';
      return;
    }
    var diffLabel = { easy: "简单", medium: "中等", hard: "困难" };
    var icons = ["1", "2", "3", "4", "5"];
    var html = "";
    for (var i = 0; i < history.length; i++) {
      var r = history[i];
      html += '<div class="history-item">'
        + '<span class="h-rank">#' + icons[i] + '</span>'
        + '<span class="h-wpm">' + r.wpm + ' WPM</span>'
        + '<span class="h-info">正确率 ' + r.acc + '%</span>'
        + '<span class="h-info">' + diffLabel[r.difficulty] + '</span>'
        + '<span class="h-info">' + r.time + '</span>'
        + '</div>';
    }
    historyList.innerHTML = html;
  }

  // ========== 重置游戏 ==========
  function resetGame(enableStart) {
    if (timer) clearInterval(timer);
    isRunning = false;
    startTime = null;
    correctChars = 0;
    errorChars = 0;
    combo = 0;
    timeLeft = DIFF_TIME[currentDifficulty];
    timerDisp.textContent = timeLeft;
    timerDisp.style.color = "#4ecca3";
    wpmDisp.textContent = "0";
    accDisp.textContent = "100%";
    comboDisp.textContent = "0";
    progressBar.style.width = "0%";
    inputBox.value = "";
    inputBox.disabled = true;
    inputBox.placeholder = "点击「开始游戏」后即可开始打字……";
    textDisplay.innerHTML = '<span style="color:#555">点击「开始游戏」按钮加载文章……</span>';
    if (enableStart) startBtn.disabled = false;
    resultOverlay.classList.remove("show");
  }

});
