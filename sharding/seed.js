import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'citus',
  database: 'appdb',
});

const nomes = [
  'Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda',
  'Gabriel', 'Helena', 'Igor', 'Julia', 'Lucas', 'Mariana',
  'Nicolas', 'Olivia', 'Pedro', 'Rafael', 'Sofia', 'Thiago',
  'Valentina', 'Vinicius', 'Alice', 'Beatriz', 'Caio', 'Diego',
  'Elisa', 'Felipe', 'Gustavo', 'Isabela', 'Joao', 'Larissa',
];

async function main() {
  try {
    await client.connect();

    console.log('🔌 Conectado ao Citus Coordinator');

    // ============================================================
    // LIMPA AS TABELAS ANTERIORES
    // ============================================================

    await client.query(`
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // ============================================================
    // CRIA USERS E ORDERS
    // ============================================================

    await client.query(`
      CREATE TABLE users (
        user_id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE orders (
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (order_id, user_id),
        CONSTRAINT fk_users FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);

    // ============================================================
    // DISTRIBUI AS TABELAS (COLOCALIZADAS NO MESMO SHARD)
    // ============================================================

    await client.query(`
      SELECT create_distributed_table(
        'users',
        'user_id',
        shard_count => 3,
        colocate_with => 'none'
      );

      SELECT create_distributed_table(
        'orders',
        'user_id',
        colocate_with => 'users'
      );
    `);

    console.log('⚡ Tabela users distribuída em 3 shards');
    console.log('⚡ Tabela orders colocalizada junto com users');

    // ============================================================
    // INSERE 30 USUÁRIOS E ORDERS PARA CADA UM
    // ============================================================

    console.log('\n🌱 Inserindo 30 usuários e 60 pedidos (2 por usuário)...\n');

    const usuarios = [];
    let totalOrdersInserted = 0;

    for (let i = 0; i < 30; i++) {
      const userId = uuidv7();
      const name = nomes[i];
      const email = `${name.toLowerCase()}${i + 1}@example.com`;

      await client.query(
        `
        INSERT INTO users (user_id, name, email)
        VALUES ($1, $2, $3);
        `,
        [userId, name, email]
      );

      usuarios.push({ user_id: userId, name, email });

      // Cria 2 pedidos aleatórios para cada usuário
      for (let j = 1; j <= 2; j++) {
        const orderId = uuidv7();
        const amount = (Math.random() * 200 + 20).toFixed(2);

        await client.query(
          `
          INSERT INTO orders (order_id, user_id, total_amount)
          VALUES ($1, $2, $3);
          `,
          [orderId, userId, amount]
        );

        totalOrdersInserted++;
      }
    }

    console.log('✅ 30 usuários inseridos com sucesso!');
    console.log(`✅ ${totalOrdersInserted} pedidos inseridos com sucesso!\n`);

    // ============================================================
    // MOSTRA RESUMO DE USERS COM SEUS PEDIDOS
    // ============================================================

    const result = await client.query(`
      SELECT
        u.user_id,
        u.name,
        COUNT(o.order_id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_gasto
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.user_id
      GROUP BY u.user_id, u.name
      ORDER BY u.name;
    `);

    console.log('👤 USERS E SUAS ORDERS (JOIN COLOCALIZADO)\n');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await client.end();
  }
}

main();