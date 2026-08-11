import pg from 'pg';

const { Client } = pg;

const databases = [
{ name: 'Coordinator', host: '127.0.0.1', port: 5432 },
{ name: 'Shard 1 - Write', host: '127.0.0.1', port: 5001 },
{ name: 'Shard 1 - Read', host: '127.0.0.1', port: 5101 },
{ name: 'Shard 2 - Write', host: '127.0.0.1', port: 5002 },
{ name: 'Shard 2 - Read', host: '127.0.0.1', port: 5102 },
{ name: 'Shard 3 - Write', host: '127.0.0.1', port: 5003 },
{ name: 'Shard 3 - Read', host: '127.0.0.1', port: 5103 }
];

async function testConnection(database) {
const client = new Client({
host: database.host,
port: database.port,
user: 'postgres',
password: 'postgrespassword',
database: 'postgres',
connectionTimeoutMillis: 5000
});

try {
const start = Date.now();

await client.connect();

const result = await client.query(`
  SELECT
    current_database() AS database,
    inet_server_addr() AS server_ip,
    inet_server_port() AS server_port,
    version() AS version
`);

const latency = Date.now() - start;

console.log(
  `✓ ${database.name.padEnd(20)} | ` +
  `ONLINE | ` +
  `${latency}ms | ` +
  `${result.rows[0].server_ip ?? 'local'}:${result.rows[0].server_port}`
);

await client.end();

return true;


} catch (error) {
console.log(
`✗ ${database.name.padEnd(20)} | ` +
`OFFLINE | ` +
`${error.message}`
);


try {
  await client.end();
} catch {}

return false;


}
}

async function main() {
console.log('\n==============================================');
console.log('       TESTE DE CONECTIVIDADE POSTGRESQL');
console.log('==============================================\n');

let success = 0;

for (const database of databases) {
const connected = await testConnection(database);


if (connected) {
  success++;
}


}

console.log('\n==============================================');
console.log(`Resultado: ${success}/${databases.length} conexões OK`);
console.log('==============================================\n');

process.exit(success === databases.length ? 0 : 1);
}

main();
