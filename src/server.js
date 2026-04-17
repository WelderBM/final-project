// src/server.js
const express = require("express");
const app = express();
const db = require("./db");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const basicAuth = require("express-basic-auth");

// Configurações do Swagger JSDoc
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Tarefas",
      version: "1.0.0",
      description: "Uma API simples para gerenciar tarefas (CRUD)",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: [__filename], // Usa o caminho absoluto do próprio arquivo
};

const specs = swaggerJsdoc(options);

const port = 3000;

// Middleware para o Express entender JSON no corpo das requisições
app.use(express.json());

// Middleware de Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware de Autenticação
function autenticar(req, res, next) {
  const token = req.headers["x-token"];

  if (token !== "123456") {
    return res.status(401).json({ erro: "Token inválido. Acesso negado." });
  }

  next();
}

// Rota para a documentação do Swagger (pública, sem autenticação)
app.use("/api-docs", auth, swaggerUi.serve, swaggerUi.setup(specs));

const auth = basicAuth({
  users: { admin: "supersecret" }, // Define um usuário 'admin' com a senha 'supersecret'
  challenge: true, // Faz com que o navegador exiba um pop-up de login.
  unauthorizedResponse: "Acesso não autorizado. Credenciais inválidas.",
});

// Rota principal (pública)
app.get("/", (req, res) => {
  res.send("Bem-vindo à API de tasks!");
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     tokenAuth:
 *       type: apiKey
 *       in: header
 *       name: x-token
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: O ID gerado automaticamente para a tarefa
 *         title:
 *           type: string
 *           description: O título da tarefa
 *         description:
 *           type: string
 *           description: A descrição detalhada da tarefa
 *         status:
 *           type: string
 *           description: O status da tarefa
 *           example: pendente
 *         user_id:
 *           type: integer
 *           description: O ID do usuário dono da tarefa
 *       example:
 *         id: 1
 *         title: "Aprender Swagger"
 *         description: "Estudar a documentação oficial"
 *         status: "pendente"
 *         user_id: 42
 *     TaskInput:
 *       type: object
 *       required:
 *         - title
 *         - user_id
 *       properties:
 *         title:
 *           type: string
 *           description: O título da tarefa
 *         description:
 *           type: string
 *           description: A descrição detalhada da tarefa (opcional)
 *         status:
 *           type: string
 *           description: O status da tarefa (opcional, padrão "pendente")
 *           example: pendente
 *         user_id:
 *           type: integer
 *           description: O ID do usuário dono da tarefa
 *       example:
 *         title: "Documentar minha API"
 *         description: "Adicionar Swagger ao projeto"
 *         status: "pendente"
 *         user_id: 42
 *     TaskUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: O novo título da tarefa (opcional)
 *         description:
 *           type: string
 *           description: A nova descrição da tarefa (opcional)
 *         status:
 *           type: string
 *           description: O novo status da tarefa (opcional)
 *       example:
 *         title: "Título atualizado"
 *         status: "concluida"
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Retorna a lista de todas as tarefas
 *     tags: [Tasks]
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: A lista de tarefas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro interno no servidor
 */
app.get("/tasks", autenticar, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tasks ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Retorna uma tarefa pelo ID
 *     tags: [Tasks]
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O ID da tarefa
 *     responses:
 *       200:
 *         description: A tarefa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Tarefa não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
app.get("/tasks/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Cria uma nova tarefa
 *     tags: [Tasks]
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: A tarefa foi criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Dados inválidos (title e user_id são obrigatórios)
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro interno no servidor
 */
app.post("/tasks", autenticar, async (req, res) => {
  const { title, description, status, user_id } = req.body;

  if (!title || !user_id) {
    return res.status(400).json({ erro: "Título e user_id são obrigatórios." });
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

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Atualiza uma tarefa existente
 *     tags: [Tasks]
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O ID da tarefa a ser atualizada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *     responses:
 *       200:
 *         description: A tarefa foi atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Tarefa não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
app.put("/tasks/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    const currentTaskResult = await db.query(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    if (currentTaskResult.rows.length === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    const currentTask = currentTaskResult.rows[0];

    const newTitle = title !== undefined ? title : currentTask.title;
    const newDescription =
      description !== undefined ? description : currentTask.description;
    const newStatus = status !== undefined ? status : currentTask.status;

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

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Remove uma tarefa pelo ID
 *     tags: [Tasks]
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O ID da tarefa a ser removida
 *     responses:
 *       204:
 *         description: Tarefa removida com sucesso (sem conteúdo)
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Tarefa não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
app.delete("/tasks/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Documentação Swagger em http://localhost:${port}/api-docs`);
});