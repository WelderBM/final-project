// src/server.js
const express = require("express");
const app = express();
const db = require("./db"); // Importa nosso módulo de conexão

const port = 3000;

// Middleware para o Express entender JSON no corpo das requisições
app.use(express.json());

// Middleware de Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Essencial para passar para o próximo middleware ou rota!
});

// Middleware de Autenticação
function autenticar(req, res, next) {
  const token = req.headers["x-token"]; // O cliente deve enviar o token neste cabeçalho

  if (token !== "123456") {
    // Se o token não for válido, bloqueamos a requisição com erro 401
    return res.status(401).json({ erro: "Token inválido. Acesso negado." });
  }

  // Se o token for válido, continuamos para a rota
  next();
}

// Um array para simular nosso "banco de dados" em memória
let tasks = [
  { id: 1, descricao: "Estudar Node.js", concluida: true },
  { id: 2, descricao: "Criar API com Express", concluida: false },
];

// Rota principal
app.get("/", (req, res) => {
  res.send("Bem-vindo à API de tasks!");
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// GET /tasks - Retorna todas as tasks
app.get("/tasks", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tasks ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

app.get("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Tarefa não encontrada.");
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// POST /tasks - Cria uma nova tarefa
app.post("/tasks", async (req, res) => {
  const { title, description, status, user_id } = req.body;

  // Validação simples
  if (!title || !user_id) {
    return res.status(400).send("Título e user_id são obrigatórios.");
  }

  const query = `
    INSERT INTO tasks (title, description, status, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [title, description || null, status || "pendente", user_id];

  try {
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// PUT /tasks/:id - Atualiza uma tarefa existente
app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  // Para ser mais robusto, vamos buscar a tarefa atual primeiro
  // e depois construir a query de UPDATE dinamicamente.
  try {
    const currentTaskResult = await db.query(
      "SELECT * FROM tasks WHERE id = $1",
      [id],
    );
    if (currentTaskResult.rows.length === 0) {
      return res.status(404).send("Tarefa não encontrada.");
    }

    const currentTask = currentTaskResult.rows[0];

    const newTitle = title || currentTask.title;
    const newDescription = description || currentTask.description;
    const newStatus = status || currentTask.status;

    const updateQuery = `
      UPDATE tasks
      SET title = $1, description = $2, status = $3
      WHERE id = $4
      RETURNING *;
    `;
    const values = [newTitle, newDescription, newStatus, id];

    const result = await db.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// DELETE /tasks/:id - Deleta uma tarefa
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Tarefa não encontrada.");
    }

    res.status(204).send(); // 204 No Content é a resposta padrão para um DELETE bem-sucedido
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});
