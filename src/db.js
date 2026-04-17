// src/db.js

const { Pool } = require("pg");

// Configuração da conexão com o banco de dados
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "task_manager", // O nome do nosso banco de dados
  password: "iteam2026", // ATENÇÃO: Troque pela sua senha!
  port: 5432,
});

// Mensagem para verificar se a conexão foi bem-sucedida
pool.on("connect", () => {
  console.log("Conexão com o banco de dados estabelecida com sucesso!");
});

// Exportamos um objeto com um método 'query' que encapsula a execução de consultas
module.exports = {
  query: (text, params) => pool.query(text, params),
};