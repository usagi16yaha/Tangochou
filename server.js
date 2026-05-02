const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// data フォルダがなければ作成
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// SQLite データベースを開く（なければ自動作成）
const db = new Database(path.join(dataDir, 'words.db'));

// テーブルを作成（初回のみ）
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer   TEXT NOT NULL
  )
`);

// サンプルデータを挿入（テーブルが空のときだけ）
const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get();
if (count.cnt === 0) {
  const insert = db.prepare('INSERT INTO cards (question, answer) VALUES (?, ?)');
  const samples = [
    ['apple',  'りんご'],
    ['cat',    'ねこ'],
    ['dog',    'いぬ'],
    ['flower', 'はな'],
    ['sun',    'たいよう'],
  ];
  samples.forEach(([q, a]) => insert.run(q, a));
  console.log('サンプルデータを追加しました！');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 全単語を取得
app.get('/api/words', (req, res) => {
  const cards = db.prepare('SELECT * FROM cards').all();
  res.json(cards);
});

// 単語を追加
app.post('/api/words', (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: '問題と答えを入力してください' });
  }
  const result = db.prepare('INSERT INTO cards (question, answer) VALUES (?, ?)').run(question, answer);
  res.json({ id: result.lastInsertRowid, question, answer });
});

// 単語を更新
app.put('/api/words/:id', (req, res) => {
  const { question, answer } = req.body;
  const { id } = req.params;
  db.prepare('UPDATE cards SET question = ?, answer = ? WHERE id = ?').run(question, answer, id);
  res.json({ id: Number(id), question, answer });
});

// 単語を削除
app.delete('/api/words/:id', (req, res) => {
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  res.json({ message: '削除しました' });
});

app.listen(PORT, () => {
  console.log(`サーバーが起動しました → http://localhost:${PORT}`);
});
