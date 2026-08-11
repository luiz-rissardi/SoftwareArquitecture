import pg from 'pg';

const { Client } = pg;

// Configuração dos nós a serem testados
const nodes = [
  { name: 'Coordinator (Router)', host: 'localhost', port: 5432 },
  // Se você mapeou portas no docker-compose para os shards, altere aqui:
  // ex: { name: 'Shard 1', host: 'localhost', port: 5433 }
];

const connectionConfig = {
  user: 'postgres',
  password: 'citus',
  database: 'appdb',
};

async function testNode(node) {
  const client = new Client({
    ...connectionConfig,
    host: node.host,
    port: node.port,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    
    // Consulta a versão e o nome do host do nó conectado
    const res = await client.query(`
      SELECT 
        inet_server_addr() AS server_ip,
        current_database() AS db,
        version() AS version;
    `);

    console.log(`✅ [OK] Conectado ao ${node.name} (${node.host}:${node.port})`);
    console.log(`   └─ Database: ${res.rows[0].db}`);

    // Se for o Coordinator, verifica também se os shards estão registrados internamente
    if (node.port === 5432) {
      const workers = await client.query('SELECT node_name, node_port FROM citus_get_active_worker_nodes();');
      console.log(`   └─ Workers ativos no Citus: ${workers.rows.length}`);
      workers.rows.forEach(w => console.log(`      • ${w.node_name}:${w.node_port}`));
    }

  } catch (err) {
    console.error(`❌ [ERRO] Falha ao conectar ao ${node.name} (${node.host}:${node.port})`);
    console.error(`   └─ Mensagem: ${err.message}`);
  } finally {
    await client.end();
  }
}

async function runTests() {
  console.log('🚀 Iniciando teste de conectividade do Cluster...\n');
  for (const node of nodes) {
    await testNode(node);
    console.log('--------------------------------------------------');
  }
}

runTests();