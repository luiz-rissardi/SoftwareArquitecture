import pg from 'pg';

const { Client } = pg;

const nodes = [
{ name: 'worker-1', port: 5433 },
{ name: 'worker-1-replica', port: 5434 },

{ name: 'worker-2', port: 5435 },
{ name: 'worker-2-replica', port: 5436 },

{ name: 'worker-3', port: 5437 },
{ name: 'worker-3-replica', port: 5438 }
];

async function checkNode(node) {
const client = new Client({
host: '127.0.0.1',
port: node.port,
user: 'postgres',
password: 'postgrespassword',
database: 'postgres',
connectionTimeoutMillis: 2000
});

try {
await client.connect();


const result = await client.query(`
  SELECT pg_is_in_recovery() AS replica;
`);

const isReplica = result.rows[0].replica;

return {
  name: node.name,
  status: isReplica ? 'REPLICA' : 'PRIMARY'
};


} catch (error) {
return {
name: node.name,
status: 'OFFLINE'
};

} finally {
await client.end().catch(() => {});
}
}

async function main() {
console.clear();

console.log('==========================================');
console.log('       STATUS DOS SHARDS CITUS');
console.log('==========================================');

for (const node of nodes) {
const result = await checkNode(node);


console.log(
  `${result.name.padEnd(22)} → ${result.status}`
);


}

console.log('==========================================');
}

main();
