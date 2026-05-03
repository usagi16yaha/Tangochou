const express = require('express');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// data フォルダがなければ作成
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const DB_PATH = path.join(dataDir, 'words.db');

let db;

// データベースをファイルに保存する
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// データベースを初期化する
async function initDatabase() {
  const SQL = await initSqlJs();

  // DBファイルがあれば読み込む、なければ新規作成
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // テーブルを作成（初回のみ）
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer   TEXT NOT NULL
    )
  `);

  // サンプルデータを挿入（テーブルが空のときだけ）
  const result = db.exec('SELECT COUNT(*) as cnt FROM cards');
  const count = result[0].values[0][0];

  if (count === 0) {
    const samples = [
      ['apple',  'りんご'],
      ['cat',    'ねこ'],
      ['dog',    'いぬ'],
      ['flower', 'はな'],
      ['sun',    'たいよう'],
    ];
    samples.forEach(([q, a]) => {
      db.run('INSERT INTO cards (question, answer) VALUES (?, ?)', [q, a]);
    });
    saveDb();
    console.log('サンプルデータを追加しました！');
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// sql.js の結果を { カラム名: 値 } の配列に変換するヘルパー
function toRows(result) {
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// 全単語を取得
app.get('/api/words', (req, res) => {
  const rows = toRows(db.exec('SELECT * FROM cards'));
  res.json(rows);
});

// 単語を追加
app.post('/api/words', (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: '問題と答えを入力してください' });
  }
  db.run('INSERT INTO cards (question, answer) VALUES (?, ?)', [question, answer]);
  saveDb();
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0].values[0][0];
  res.json({ id, question, answer });
});

// 単語を更新
app.put('/api/words/:id', (req, res) => {
  const { question, answer } = req.body;
  const id = Number(req.params.id);
  db.run('UPDATE cards SET question = ?, answer = ? WHERE id = ?', [question, answer, id]);
  saveDb();
  res.json({ id, question, answer });
});

// 単語を削除
app.delete('/api/words/:id', (req, res) => {
  db.run('DELETE FROM cards WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ message: '削除しました' });
});

// データベース初期化が終わってからサーバーを起動する
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`サーバーが起動しました → http://localhost:${PORT}`);
  });
});
