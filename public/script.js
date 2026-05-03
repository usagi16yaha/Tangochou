// =========================================
// データ管理
// =========================================
let cards = [];         // サーバーから取得した全カード
let queue = [];         // 今回の出題順（シャッフル済み）
let currentIndex = 0;  // 今何問目か
let score = { correct: 0, wrong: 0 };
let isShowingAnswer = false;

// サーバーから全単語を取得する
async function fetchWords() {
  const res = await fetch('/api/words');
  cards = await res.json();
}

// =========================================
// 勉強画面
// =========================================
const questionText   = document.getElementById('question-text');
const answerText     = document.getElementById('answer-text');
const cardFront      = document.getElementById('card-front');
const cardBack       = document.getElementById('card-back');
const cardEl         = document.getElementById('card');
const cardCounter    = document.getElementById('card-counter');
const cardArea       = document.getElementById('card-area');
const resultArea     = document.getElementById('result-area');
const resultText     = document.getElementById('result-text');

// カードをシャッフルして勉強を開始する
function startStudy() {
  if (cards.length === 0) {
    questionText.textContent = '単語がありません。「単語を管理」から追加してください！';
    return;
  }
  queue = [...cards].sort(() => Math.random() - 0.5);
  currentIndex = 0;
  score = { correct: 0, wrong: 0 };
  cardArea.classList.remove('hidden');
  resultArea.classList.add('hidden');
  showQuestion();
}

// 問題を表示する
function showQuestion() {
  isShowingAnswer = false;
  cardFront.classList.remove('hidden');
  cardBack.classList.add('hidden');

  const card = queue[currentIndex];
  questionText.textContent = card.question;
  answerText.textContent   = card.answer;
  cardCounter.textContent  = `${currentIndex + 1} / ${queue.length}`;
}

// 答えを表示する（カードフリップアニメーション付き）
function showAnswer() {
  if (isShowingAnswer) return;
  isShowingAnswer = true;

  cardEl.classList.add('flip');
  setTimeout(() => {
    cardFront.classList.add('hidden');
    cardBack.classList.remove('hidden');
    cardEl.classList.remove('flip');
  }, 200);
}

// 次の問題へ進む
function nextCard(result) {
  if (result === 'correct') score.correct++;
  if (result === 'wrong')   score.wrong++;

  currentIndex++;
  if (currentIndex >= queue.length) {
    showResult();
  } else {
    cardEl.classList.add('flip');
    setTimeout(() => {
      showQuestion();
      cardEl.classList.remove('flip');
    }, 200);
  }
}

// 結果を表示する
function showResult() {
  cardArea.classList.add('hidden');
  resultArea.classList.remove('hidden');
  const total = queue.length;
  const pct   = total > 0 ? Math.round((score.correct / total) * 100) : 0;
  resultText.innerHTML =
    `正解：<strong>${score.correct}</strong> 問 / 全 ${total} 問<br>正解率：<strong>${pct}%</strong>`;
}

// ボタン操作
document.getElementById('btn-correct').addEventListener('click', () => nextCard('correct'));
document.getElementById('btn-wrong').addEventListener('click',   () => nextCard('wrong'));
document.getElementById('btn-restart').addEventListener('click', startStudy);

// =========================================
// キーボード操作（PC）
// =========================================
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault(); // ページスクロールを防ぐ

  const studyView = document.getElementById('view-study');
  if (studyView.classList.contains('hidden')) return;
  if (!resultArea.classList.contains('hidden')) return; // 結果画面では無効

  if (!isShowingAnswer) {
    showAnswer();
  } else {
    nextCard(null);
  }
});

// =========================================
// スワイプ操作（スマホ）
// =========================================
let touchStartY = 0;
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const dy = touchStartY - e.changedTouches[0].clientY;
  const dx = Math.abs(touchStartX - e.changedTouches[0].clientX);

  if (Math.abs(dy) < 40 || dx > Math.abs(dy)) return; // 縦スワイプのみ反応

  const studyView = document.getElementById('view-study');
  if (studyView.classList.contains('hidden')) return;

  if (!isShowingAnswer) {
    if (dy > 0) showAnswer(); // 上スワイプ → 答えを表示
  } else {
    nextCard(null); // 答え画面でのスワイプ → 次へ
  }
});

// =========================================
// 単語管理画面
// =========================================
const wordList       = document.getElementById('word-list');
const wordForm       = document.getElementById('word-form');
const formTitle      = document.getElementById('form-title');
const editId         = document.getElementById('edit-id');
const inputQuestion  = document.getElementById('input-question');
const inputAnswer    = document.getElementById('input-answer');

// 一覧を描画する
function renderWordList() {
  wordList.innerHTML = '';
  cards.forEach(card => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="word-content">
        <div class="word-question">${escapeHtml(card.question)}</div>
        <div class="word-answer">→ ${escapeHtml(card.answer)}</div>
      </div>
      <button class="btn-edit"   data-id="${card.id}">編集</button>
      <button class="btn-delete" data-id="${card.id}">削除</button>
    `;
    wordList.appendChild(li);
  });
}

// XSS対策（ユーザー入力をそのままHTMLに入れないようにする）
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 追加ボタン
document.getElementById('btn-add-word').addEventListener('click', () => {
  formTitle.textContent = '単語を追加';
  editId.value     = '';
  inputQuestion.value = '';
  inputAnswer.value   = '';
  wordForm.classList.remove('hidden');
  inputQuestion.focus();
});

// キャンセルボタン
document.getElementById('btn-cancel-form').addEventListener('click', () => {
  wordForm.classList.add('hidden');
});

// 保存ボタン（追加 or 更新）
document.getElementById('btn-save-word').addEventListener('click', async () => {
  const question = inputQuestion.value.trim();
  const answer   = inputAnswer.value.trim();
  if (!question || !answer) {
    alert('問題と答えを両方入力してください！');
    return;
  }

  if (editId.value) {
    // 更新
    await fetch(`/api/words/${editId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
  } else {
    // 追加
    await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
  }

  wordForm.classList.add('hidden');
  await fetchWords();
  renderWordList();
});

// 編集・削除ボタン（一覧からクリックされたとき）
wordList.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('btn-edit')) {
    const card = cards.find(c => c.id == id);
    formTitle.textContent   = '単語を編集';
    editId.value            = card.id;
    inputQuestion.value     = card.question;
    inputAnswer.value       = card.answer;
    wordForm.classList.remove('hidden');
    inputQuestion.focus();
  }

  if (e.target.classList.contains('btn-delete')) {
    if (!confirm(`「${cards.find(c => c.id == id).question}」を削除しますか？`)) return;
    await fetch(`/api/words/${id}`, { method: 'DELETE' });
    await fetchWords();
    renderWordList();
  }
});

// =========================================
// 画面切り替え
// =========================================
const viewStudy  = document.getElementById('view-study');
const viewManage = document.getElementById('view-manage');
const btnStudy   = document.getElementById('btn-study');
const btnManage  = document.getElementById('btn-manage');

btnStudy.addEventListener('click', () => {
  viewStudy.classList.remove('hidden');
  viewManage.classList.add('hidden');
  btnStudy.classList.add('active');
  btnManage.classList.remove('active');
  startStudy();
});

btnManage.addEventListener('click', async () => {
  viewManage.classList.remove('hidden');
  viewStudy.classList.add('hidden');
  btnManage.classList.add('active');
  btnStudy.classList.remove('active');
  await fetchWords();
  renderWordList();
});

// =========================================
// アプリ起動
// =========================================
(async () => {
  await fetchWords();
  startStudy();
})();
