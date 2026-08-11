import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'citus',
  database: 'appdb',
});

async function main() {
  try {
    await client.connect();

    // 1. Busca TODOS os shards criados para a tabela 'users'
    const shardsResult = await client.query(`
      SELECT 
        s.shardid, 
        n.nodename AS worker,
        n.nodeport AS porta
      FROM pg_dist_shard s
      JOIN pg_dist_placement p ON p.shardid = s.shardid
      JOIN pg_dist_node n ON n.groupid = p.groupid
      WHERE s.logicalrelid = 'users'::regclass
      ORDER BY s.shardid;
    `);

    if (shardsResult.rows.length === 0) {
      console.log('❌ Nenhum shard encontrado para a tabela users.');
      return;
    }

    console.log(`\nFound ${shardsResult.rows.length} shards. Iniciando leitura de cada um...\n`);

    // 2. Percorre cada shard e traz os usuários/orders correspondentes
    for (const [index, shard] of shardsResult.rows.entries()) {
      const shardNumber = index + 1;

      console.log('======================================================================');
      console.log(`🔎 SHARD ${shardNumber} (ID: ${shard.shardid} | Worker: ${shard.worker}:${shard.porta})`);
      console.log('======================================================================\n');

      // Busca detalhada dos pedidos e usuários deste shard
      const ordersResult = await client.query(
        `
        SELECT 
          u.name AS usuario,
          u.email,
          o.order_id,
          o.total_amount AS valor,
          o.status
        FROM users u
        JOIN orders o ON u.user_id = o.user_id
        WHERE get_shard_id_for_distribution_column('users', u.user_id) = $1
        ORDER BY u.name, o.created_at;
        `,
        [shard.shardid]
      );

      // Resumo por usuário neste shard
      const summaryResult = await client.query(
        `
        SELECT 
          u.name AS usuario,
          COUNT(o.order_id) AS qtd_pedidos,
          COALESCE(SUM(o.total_amount), 0) AS total_gasto
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        WHERE get_shard_id_for_distribution_column('users', u.user_id) = $1
        GROUP BY u.user_id, u.name
        ORDER BY u.name;
        `,
        [shard.shardid]
      );

      console.log(`📋 Detalhamento dos Pedidos no Shard ID ${shard.shardid}:`);
      console.table(ordersResult.rows);

      console.log(`\n📊 Resumo de Usuários no Shard ID ${shard.shardid}:`);
      console.table(summaryResult.rows);

      console.log(`👤 Total de usuários neste shard: ${summaryResult.rows.length}`);
      console.log(`📦 Total de pedidos neste shard: ${ordersResult.rows.length}\n\n`);
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    await client.end();
  }
}

main();