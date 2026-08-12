import { createPool } from 'mysql2/promise';

// Credenciais fixas no código (sem .env), batendo com o que o
// docker-compose.yml / write/schema.sql já criaram.
// Credencial dedicada de ESCRITA: em produção esse usuário deveria ter
// permissão só de INSERT/UPDATE na tabela `users`, nada de SELECT amplo.
export const pool = createPool({
  host: 'localhost',
  port: 3307, // porta externa mapeada no docker-compose.yml (interna é 3306)
  user: 'app_writer',
  password: 'writer_pw',
  database: 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
});

// Não fazemos pool.getConnection() aqui. Cada chamada a pool.query(...)
// no index.js pega uma conexão livre do pool, executa, e devolve
// automaticamente — inclusive reconectando sozinha se uma conexão cair.
