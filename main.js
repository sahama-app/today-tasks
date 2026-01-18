const FREE_TASK_LIMIT = 20;
const TODAY_TASK_LIMIT = 3;

const IS_PREMIUM = false; // ← 今は無料版


let todayTaskIds = [];
let todayDate = null;


let tasks = [];

const COMPLETE_MESSAGES = [
  "今日はここまででOKです",
  "今日の分はきちんと終わりました",
  "無理しなかったのがえらいです",
  "今日はここで一区切り",
  "今日もちゃんと前に進みました",
  "続きはまた明日で大丈夫です",
  "今日はもう十分やりました",
  "今日やることは完了です",
  "休む準備に入ってください",
  "今日はこれ以上やらなくて大丈夫",
  "今日は自分に合格を出していい日です",
  "今日はちゃんと終われました",
  "今日は力を抜いても大丈夫です",
  "今日のタスクはここまで",
  "これで今日の分はOKです",
  "お疲れさまでした",
  "すばらしい"
];


let todayCompleteMessage = null;

/* =====================
   タスクカウント
===================== */
function updateTaskCount() {
  const count = tasks.filter(
    task => task.status === "todo"
  ).length;

  const el = document.getElementById("taskCount");
  el.textContent = `（${count} / ${FREE_TASK_LIMIT}件）`;
}


/* =====================
   今日のメッセージを決める
===================== */
function getTodayCompleteMessage() {
  const todayStr = today();
  const savedDate = localStorage.getItem("completeMessageDate");
  const savedMsg = localStorage.getItem("completeMessage");

  if (savedDate === todayStr && savedMsg) {
    todayCompleteMessage = savedMsg;
    return savedMsg;
  }

  const msg =
    COMPLETE_MESSAGES[
      Math.floor(Math.random() * COMPLETE_MESSAGES.length)
    ];

  localStorage.setItem("completeMessageDate", todayStr);
  localStorage.setItem("completeMessage", msg);

  todayCompleteMessage = msg;
  return msg;
}




/* =====================
   保存・読み込み
===================== */
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem("tasks");

  if (saved) {
    tasks = JSON.parse(saved);
  } else {
    tasks = [
      {
        id: crypto.randomUUID(),
        title: "タスクを追加する",
        duration: 10,
        importance: 0,
        status: "todo",
        lastTouched: null
      }
    ];
    saveTasks();
  }

  const savedDate = localStorage.getItem("todayDate");
  const savedIds = localStorage.getItem("todayTaskIds");

  // ★ ここが重要
  if (savedDate === today() && savedIds) {
    const ids = JSON.parse(savedIds);

    // 今日だが中身が空 → 未決定として扱う
    if (ids.length > 0) {
      todayDate = savedDate;
      todayTaskIds = ids;
      return;
    }
  }

  // 今日のタスクは未確定
  todayDate = null;
  todayTaskIds = [];
}


/* =====================
   日付
===================== */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/* =====================
   優先度計算
===================== */
function calculateTaskScore(task) {
  let score = 0;
  let isImportant = false;


  // 重要度（1〜3想定）
  if (task.importance === 1) {
  score += 30;
}


  // 所要時間（短いほど高スコア）
  if (task.duration <= 10) score += 20;
  else if (task.duration <= 30) score += 10;
  else if (task.duration <= 60) score += 5;

  // 放置日数
  if (task.lastTouched) {
    const today = new Date();
    const last = new Date(task.lastTouched);
    const diffDays = Math.floor(
      (today - last) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 7) score += 20;
    else if (diffDays >= 3) score += 10;
  }

  return score;
}


/* =====================
   今日やるタスク取得
===================== */
function getTodayTasks() {
  const todayStr = today();

  // 現在の todo タスク
  const activeTasks = tasks.filter(task => task.status === "todo");

  // 🔥 自己修復条件
  const isBrokenTodayState =
    todayDate === todayStr &&
    todayTaskIds.length > 0 &&
    activeTasks.length > 0 &&
    activeTasks.every(t => !todayTaskIds.includes(t.id));

  // 今日未確定 or 壊れている場合は再計算
  if (todayDate !== todayStr) {
    todayDate = todayStr;

    todayTaskIds = activeTasks
      .sort((a, b) =>
        calculateTaskScore(b) - calculateTaskScore(a)
      )
      .slice(0, TODAY_TASK_LIMIT)
      .map(task => task.id);

    localStorage.setItem("todayDate", todayDate);
    localStorage.setItem(
      "todayTaskIds",
      JSON.stringify(todayTaskIds)
    );
  }

  return tasks.filter(
    task =>
      todayTaskIds.includes(task.id) &&
      task.status === "todo"
  );
}




/* =====================
   描画
===================== */
function renderTodayTasks() {
  const container = document.getElementById("tasks");
  const todayTasks = getTodayTasks();

  container.innerHTML = "";

  // ★ 今日のタスクIDはあるが、全部 done の場合
  if (
    todayTaskIds.length > 0 &&
    todayTasks.length === 0
  ) {
    const message = getTodayCompleteMessage();

    container.innerHTML = `
      <div class="complete-message">
        🎉 ${message}
      </div>
    `;
    return;
  }

  if (todayTasks.length === 0) {
    container.innerHTML = "<p>今日やるタスクがありません</p>";
    return;
  }

  todayTasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item today-task";

    div.innerHTML = `
      <div class="task-info">
        <div class="task-title ${task.importance ? 'important-task' : ''}">
          ${task.title}
        </div>
        <div class="task-time">${task.duration}分</div>
      </div>
      <button class="done-btn" data-id="${task.id}">完了</button>
    `;

    container.appendChild(div);
  });
}


function renderAllTasks() {
  const container = document.getElementById("allTasks");
  container.innerHTML = "";

const todoTasks = tasks
  .filter(task => task.status === "todo")
  .sort((a, b) =>
    calculateTaskScore(b) - calculateTaskScore(a)
  );


  if (todoTasks.length === 0) {
    container.innerHTML = "<p>未完了のタスクはありません 🎉</p>";
	updateTaskCount(); // ← ここ
    return;
  }

  todoTasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";

    div.innerHTML = `
      <div class="task-info">
        <div class="task-title ${task.importance ? 'important-task' : ''}">
  ${task.title}
</div>

        <div class="task-time">${task.duration}分</div>
      </div>
      <button class="delete-btn" data-id="${task.id}">削除</button>
    `;

    container.appendChild(div);
  });
  updateTaskCount(); // ← ここ
}

/* =====================
   今日の分完了チェック
===================== */
function checkTodayCompleted() {
  if (todayTaskIds.length === 0) return false;

  return todayTaskIds.every(id => {
    const task = tasks.find(t => t.id === id);
    return task && task.status === "done";
  });
}



/* =====================
   重要ボタン
===================== */
let isImportant = false;

const importantBtn = document.getElementById("importantBtn");
if (!IS_PREMIUM) {
  importantBtn.style.display = "none";
}
importantBtn.addEventListener("click", () => {
  isImportant = !isImportant;
  importantBtn.classList.toggle("active", isImportant);
});



/* =====================
   完了ボタン
===================== */
document.getElementById("tasks").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  const task = tasks.find(t => t.id === e.target.dataset.id);
  if (!task) return;

task.status = "done";
task.lastTouched = today();

saveTasks();
renderTodayTasks();
renderAllTasks(); // ← 追加


});

/* =====================
   タスク追加
===================== */
document.getElementById("addTaskBtn").addEventListener("click", () => {
  const title = document.getElementById("taskTitle").value;
  const duration = Number(
    document.querySelector('input[name="duration"]:checked')?.value
  );

  if (!title || !duration) return;

  const activeTaskCount = tasks.filter(
    task => task.status === "todo"
  ).length;

  if (activeTaskCount >= FREE_TASK_LIMIT) {
    alert("無料プランではアクティブなタスクは20件までです");
    return;
  }

const newTask = {
  id: crypto.randomUUID(),
  title,
  duration,
  importance: isImportant ? 1 : 0,
  status: "todo",
  lastTouched: null
};

tasks.push(newTask);

// ★ ここがB仕様の肝 ★
if (
  todayDate === today() &&
  todayTaskIds.length < TODAY_TASK_LIMIT
) {
  todayTaskIds.push(newTask.id);
  localStorage.setItem(
    "todayTaskIds",
    JSON.stringify(todayTaskIds)
  );
}


  saveTasks();
  renderTodayTasks();
  renderAllTasks();

  document.getElementById("taskTitle").value = "";
  isImportant = false;
  importantBtn.classList.remove("active");
});




/* =====================
   削除
===================== */
document.getElementById("allTasks").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  const taskId = e.target.dataset.id;
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) return;

  tasks.splice(index, 1);

  saveTasks();
  renderTodayTasks();
  renderAllTasks();
});


/* =====================
   初期化
===================== */
loadTasks();
renderTodayTasks();
renderAllTasks();

