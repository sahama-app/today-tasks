const FREE_TASK_LIMIT = 20;
const TODAY_TASK_LIMIT = 3;

const IS_PREMIUM = false; // ← 今は無料版


let todayTaskIds = [];
let todayDate = null;
let tasks = [];
let isUrgent = false;
let isImportant = false;
let isLongTask = false;


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
    ttasks = [
  {
    id: crypto.randomUUID(),
    title: "タスクを追加する",
    urgent: false,
    important: false,
    longTask: false,
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

  if (task.urgent) score += 30;
  if (task.important) score += 20;
  if (!task.longTask) score += 10;

  if (task.lastTouched) {
    const diffDays = Math.floor(
      (Date.now() - new Date(task.lastTouched)) / 86400000
    );
    if (diffDays >= 3) score += 10;
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
  const progressEl = document.getElementById("todayProgress");

if (progressEl) {
  const { completed, total } = getTodayProgress();
  progressEl.textContent = `（${completed} / ${total}件）`;
}

  
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
    <div class="task-title">${task.title}</div>
    <div class="task-flags">
      ${renderFlags(task)}
    </div>
  </div>
  <div class="today-actions">
  <button class="postpone-btn" data-id="${task.id}">あとで</button>
  <button class="done-btn" data-id="${task.id}">完了</button>
</div>

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
    <div class="task-title">${task.title}</div>
    <div class="task-flags">
      ${renderFlags(task)}
    </div>
  </div>
  <button class="delete-btn" data-id="${task.id}">削除</button>
`;


    container.appendChild(div);
  });
  updateTaskCount(); // ← ここ
}

function renderFlags(task) {
  let html = "";

  if (task.urgent) {
    html += `<span class="flag-tag urgent">至急</span>`;
  }
  if (task.important) {
    html += `<span class="flag-tag important">重要</span>`;
  }
  if (task.longTask) {
    html += `<span class="flag-tag long">長時間</span>`;
  }

  return html;
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
   今日の時間設定
===================== */
function today() {
  const now = new Date();

  // 朝6時より前なら「昨日扱い」
  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }

  return now.toISOString().slice(0, 10);
}


/* =====================
   今日の完了件数計算
===================== */
function getTodayProgress() {
  const total = todayTaskIds.length;

  const completed = todayTaskIds.filter(id => {
    const task = tasks.find(t => t.id === id);
    return task && task.status === "done";
  }).length;

  return { completed, total };
}



/* =====================
   フラグボタン
===================== */
document.addEventListener("DOMContentLoaded", () => {

  const urgentBtn = document.getElementById("urgentBtn");
  const importantBtn = document.getElementById("importantBtn");
  const longBtn = document.getElementById("longBtn");

  urgentBtn.addEventListener("click", () => {
    isUrgent = !isUrgent;
    urgentBtn.classList.toggle("active", isUrgent);
  });

  importantBtn.addEventListener("click", () => {
    isImportant = !isImportant;
    importantBtn.classList.toggle("active", isImportant);
  });

  longBtn.addEventListener("click", () => {
    isLongTask = !isLongTask;
    longBtn.classList.toggle("active", isLongTask);
  });

});




/* =====================
   完了ボタン・あとでボタン
===================== */
document.getElementById("tasks").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  const taskId = e.target.dataset.id;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // ✅ 完了
  if (e.target.classList.contains("done-btn")) {
    task.status = "done";
    task.lastTouched = today();
  }

  // ⏸ 後回し
  if (e.target.classList.contains("postpone-btn")) {
    task.lastTouched = today();

    // 今日のIDリストから外す
    todayTaskIds = todayTaskIds.filter(id => id !== taskId);
    localStorage.setItem("todayTaskIds", JSON.stringify(todayTaskIds));
  }

  saveTasks();
  renderTodayTasks();
  renderAllTasks();
});



/* =====================
   タスク追加
===================== */
document.getElementById("addTaskBtn").addEventListener("click", () => {
  console.log("追加ボタン押された");
  const title = document.getElementById("taskTitle").value;
  const duration = Number(
    document.querySelector('input[name="duration"]:checked')?.value
  );

  if (!title) return;


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

tasks.push({
  id: crypto.randomUUID(),
  title,
  status: "todo",
  urgent: isUrgent,
  important: isImportant,
  longTask: isLongTask,
  lastTouched: null
});



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

isUrgent = false;
isImportant = false;
isLongTask = false;

document
  .querySelectorAll(".flag-btn")
  .forEach(btn => btn.classList.remove("active"));


});




/* =====================
   削除
===================== */
document.getElementById("allTasks").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  const taskId = e.target.dataset.id;
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) return;
  const ok = confirm("このタスクを削除しますか？");
if (!ok) return;

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

