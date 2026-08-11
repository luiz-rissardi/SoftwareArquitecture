import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';

const { Client } = pg;

const client = new Client({
host: '127.0.0.1',
port: 5432,
user: 'postgres',
password: 'postgrespassword',
database: 'postgres'
});

const users = [
['Carlos Silva', '[carlos.silva@gmail.com](mailto:carlos.silva@gmail.com)'],
['Ana Oliveira', '[ana.oliveira@gmail.com](mailto:ana.oliveira@gmail.com)'],
['Joao Santos', '[joao.santos@gmail.com](mailto:joao.santos@gmail.com)'],
['Mariana Costa', '[mariana.costa@gmail.com](mailto:mariana.costa@gmail.com)'],
['Lucas Pereira', '[lucas.pereira@gmail.com](mailto:lucas.pereira@gmail.com)'],
['Beatriz Almeida', '[beatriz.almeida@gmail.com](mailto:beatriz.almeida@gmail.com)'],
['Rafael Rodrigues', '[rafael.rodrigues@gmail.com](mailto:rafael.rodrigues@gmail.com)'],
['Juliana Ferreira', '[juliana.ferreira@gmail.com](mailto:juliana.ferreira@gmail.com)'],
['Gabriel Martins', '[gabriel.martins@gmail.com](mailto:gabriel.martins@gmail.com)'],
['Camila Barbosa', '[camila.barbosa@gmail.com](mailto:camila.barbosa@gmail.com)'],
['Felipe Carvalho', '[felipe.carvalho@gmail.com](mailto:felipe.carvalho@gmail.com)'],
['Larissa Gomes', '[larissa.gomes@gmail.com](mailto:larissa.gomes@gmail.com)'],
['Bruno Ribeiro', '[bruno.ribeiro@gmail.com](mailto:bruno.ribeiro@gmail.com)'],
['Amanda Lopes', '[amanda.lopes@gmail.com](mailto:amanda.lopes@gmail.com)'],
['Thiago Souza', '[thiago.souza@gmail.com](mailto:thiago.souza@gmail.com)'],
['Isabela Mendes', '[isabela.mendes@gmail.com](mailto:isabela.mendes@gmail.com)'],
['Matheus Dias', '[matheus.dias@gmail.com](mailto:matheus.dias@gmail.com)'],
['Leticia Teixeira', '[leticia.teixeira@gmail.com](mailto:leticia.teixeira@gmail.com)'],
['Gustavo Moreira', '[gustavo.moreira@gmail.com](mailto:gustavo.moreira@gmail.com)'],
['Natalia Correia', '[natalia.correia@gmail.com](mailto:natalia.correia@gmail.com)'],
['Pedro Nascimento', '[pedro.nascimento@gmail.com](mailto:pedro.nascimento@gmail.com)'],
['Sofia Araujo', '[sofia.araujo@gmail.com](mailto:sofia.araujo@gmail.com)'],
['Eduardo Monteiro', '[eduardo.monteiro@gmail.com](mailto:eduardo.monteiro@gmail.com)'],
['Manuela Cardoso', '[manuela.cardoso@gmail.com](mailto:manuela.cardoso@gmail.com)'],
['Vinicius Freitas', '[vinicius.freitas@gmail.com](mailto:vinicius.freitas@gmail.com)'],
['Clara Ramos', '[clara.ramos@gmail.com](mailto:clara.ramos@gmail.com)'],
['Diego Castro', '[diego.castro@gmail.com](mailto:diego.castro@gmail.com)'],
['Valentina Martins', '[valentina.martins@gmail.com](mailto:valentina.martins@gmail.com)'],
['Henrique Barbosa', '[henrique.barbosa@gmail.com](mailto:henrique.barbosa@gmail.com)'],
['Bianca Fernandes', '[bianca.fernandes@gmail.com](mailto:bianca.fernandes@gmail.com)']
];

async function main() {
try {
await client.connect();


console.log('\n==========================================');
console.log('             RESET USERS');
console.log('==========================================\n');

await client.query(`
  DROP TABLE IF EXISTS users CASCADE;
`);

console.log('✓ Tabela anterior removida');

/*
 * IMPORTANTE:
 * Não criamos PRIMARY KEY/UNIQUE antes
 * da distribuição do Citus.
 */
await client.query(`
  CREATE TABLE users (
    userid UUID NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL
  );
`);

console.log('✓ Tabela users criada');

/*
 * 3 shards lógicos.
 * userid = shard key.
 */
await client.query(`
  SELECT create_distributed_table(
    'users',
    'userid',
    shard_count => 3,
    colocate_with => 'none'
  );
`);

console.log('✓ 3 shards lógicos criados');
console.log('✓ Shard key: userid');

/*
 * Agora inserimos os 30 usuários.
 */
console.log('\n==========================================');
console.log('          INSERINDO USUÁRIOS');
console.log('==========================================\n');

const insertedUsers = [];

for (const [nome, email] of users) {
  const userid = uuidv7();

  await client.query(
    `
      INSERT INTO users (
        userid,
        nome,
        email
      )
      VALUES ($1, $2, $3);
    `,
    [userid, nome, email]
  );

  insertedUsers.push({
    userid,
    nome,
    email
  });

  console.log(
    `✓ ${nome.padEnd(22)} | ${email.padEnd(35)} | ${userid}`
  );
}

/*
 * SHARDS
 */
console.log('\n==========================================');
console.log('                SHARDS');
console.log('==========================================\n');

const shards = await client.query(`
  SELECT
    shardid,
    shardminvalue,
    shardmaxvalue
  FROM pg_dist_shard
  WHERE logicalrelid = 'users'::regclass
  ORDER BY shardid;
`);

console.table(shards.rows);

/*
 * PLACEMENTS
 */
console.log('\n==========================================');
console.log('              PLACEMENTS');
console.log('==========================================\n');

const placements = await client.query(`
  SELECT
    s.shardid,
    n.nodename AS worker,
    n.nodeport AS port,
    p.shardstate
  FROM pg_dist_shard s
  JOIN pg_dist_placement p
    ON p.shardid = s.shardid
  JOIN pg_dist_node n
    ON n.groupid = p.groupid
  WHERE s.logicalrelid = 'users'::regclass
  ORDER BY s.shardid;
`);

console.table(placements.rows);

/*
 * DISTRIBUIÇÃO DOS DADOS
 */
console.log('\n==========================================');
console.log('       DISTRIBUIÇÃO DOS USUÁRIOS');
console.log('==========================================\n');

const distribution = await client.query(`
  SELECT
    tableoid::regclass AS shard,
    COUNT(*) AS usuarios
  FROM users
  GROUP BY tableoid
  ORDER BY tableoid::text;
`);

console.table(distribution.rows);

/*
 * USUÁRIOS
 */
console.log('\n==========================================');
console.log('               USUÁRIOS');
console.log('==========================================\n');

const result = await client.query(`
  SELECT
    userid,
    nome,
    email
  FROM users
  ORDER BY userid;
`);

console.table(result.rows);

console.log('\n==========================================');
console.log('              RESULTADO');
console.log('==========================================\n');

console.log(`✓ Usuários inseridos: ${result.rows.length}`);
console.log(`✓ Shards lógicos: ${shards.rows.length}`);
console.log('✓ Workers físicos: 3');
console.log('✓ Shard key: userid');
console.log('✓ UUID: UUIDv7');


} catch (error) {
console.error('\n✗ ERRO:', error.message);
process.exitCode = 1;
} finally {
await client.end();
}
}

main();
