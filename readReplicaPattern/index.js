import mysql from 'mysql2/promise';

async function runTests() {
  console.log('==========================================');
  console.log(' TESTE DE ESCRITA E LEITURA VIA PROXYSQL');
  console.log('==========================================\n');

  try {
    // Conecta ao ProxySQL na porta de frontend (6033)
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 6033,
      user: 'app_user',
      password: 'app_password',
      database: 'myapp'
    });

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS teste_crud (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dado VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // const [insertResult] = await connection.execute(
    //   'INSERT INTO teste_crud (dado) VALUES (?)',
    //   ["um usuario simples"]
    // );

    const [result] = await connection.query("SELECT * from teste_crud")
    console.log(result);
    connection.end();

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

runTests();