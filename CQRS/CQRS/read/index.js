import express from 'express';
import Redis from 'ioredis';

const app = express();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // Opcional: uma réplica de leitura do Redis, se o volume de GET justificar.
});

// ---- QUERY: GetUserById ----
// Só lê. Nunca escreve, nunca fala com o MySQL. Se o Redis cair,
// esse serviço fica indisponível, mas o write-service continua
// aceitando comandos normalmente — os dois lados são independentes.
app.get('/users/:id', async (req, res) => {
  const key = `user:${req.params.id}`;
  const user = await redis.hgetall(key);

  if (!user || Object.keys(user).length === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  return res.json(user);
});

// ---- QUERY: ListUsers ----
// SCAN em vez de KEYS: KEYS bloqueia o Redis inteiro em produção
// com volume grande; SCAN itera em lotes sem travar outros clientes.
app.get('/users', async (req, res) => {
  const users = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      'user:*',
      'COUNT',
      100
    );
    cursor = nextCursor;

    for (const key of keys) {
      const user = await redis.hgetall(key);
      users.push(user);
    }
  } while (cursor !== '0');

  return res.json(users);
});

const PORT = process.env.QUERY_PORT || 3001;
app.listen(PORT, () => console.log(`query-api ouvindo na porta ${PORT}`));
