import express, { json } from 'express';
import { randomUUID } from 'crypto';
import { pool } from './db.js';

const app = express();
app.use(json());

// ---- COMMAND: CreateUser ----
// Isso é o "handler" do comando. Repare que ele NÃO sabe nada
// sobre Redis, Debezium ou qualquer coisa do lado de leitura.
// O write-service só fala com a fonte da verdade (MySQL).
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name e email são obrigatórios' });
  }

  const id = randomUUID();

  try {
    await pool.query(
      'INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, NOW())',
      [id, name, email]
    );

    // Não escrevemos no Redis aqui. A propagação para o read model
    // é responsabilidade do pipeline de CDC (Debezium -> Kafka -> consumer),
    // não do write-service. Isso é o que torna o acoplamento fraco.
    return res.status(201).json({ id, name, email });
  } catch (err) {
    console.error('Erro ao inserir usuário:', err);
    return res.status(500).json({ error: 'Falha ao criar usuário' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`write-service ouvindo na porta ${PORT}`));
