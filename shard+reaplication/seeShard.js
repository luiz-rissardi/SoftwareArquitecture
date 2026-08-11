import pg from 'pg';

const { Client } = pg;

const client = new Client({
host: '127.0.0.1',
port: 5432,
user: 'postgres',
password: 'postgrespassword',
database: 'postgres'
});

async function main() {
try {
await client.connect();


console.log('\n==========================================');
console.log('       SHARDS E USUÁRIOS');
console.log('==========================================\n');

const shards = await client.query(`
  SELECT
    s.shardid,
    n.nodename AS worker,
    n.nodeport AS port
  FROM pg_dist_shard s
  JOIN pg_dist_placement p
    ON p.shardid = s.shardid
  JOIN pg_dist_node n
    ON n.groupid = p.groupid
  WHERE s.logicalrelid = 'users'::regclass
  ORDER BY s.shardid;
`);

if (shards.rows.length === 0) {
  console.log('Nenhum shard encontrado.');
  return;
}

for (const shard of shards.rows) {
  console.log('==========================================');
  console.log(`SHARD: ${shard.shardid}`);
  console.log(`WORKER: ${shard.worker}:${shard.port}`);
  console.log('==========================================\n');

  const result = await client.query(`
    SELECT
      userid,
      nome,
      email
    FROM users
    WHERE get_shard_id_for_distribution_column(
      'users',
      userid
    ) = $1
    ORDER BY userid;
  `, [shard.shardid]);

  console.log(`Usuários: ${result.rows.length}\n`);

  if (result.rows.length === 0) {
    console.log('Nenhum usuário neste shard.\n');
    continue;
  }

  console.table(result.rows);
}

console.log('==========================================');
console.log('              RESUMO');
console.log('==========================================\n');

console.log(`Total de shards: ${shards.rows.length}`);

const total = await client.query(`
  SELECT COUNT(*) AS total
  FROM users;
`);

console.log(`Total de usuários: ${total.rows[0].total}`);


} catch (error) {
console.error('\n✗ ERRO:', error.message);
process.exitCode = 1;
} finally {
await client.end();
}
}

main();
