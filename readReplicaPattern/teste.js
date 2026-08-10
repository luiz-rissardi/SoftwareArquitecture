import mysql from 'mysql2/promise';

async function checkAllDatabases() {
    // Portas mapeadas no docker-compose para cada container do cluster
    const nodes = [
        { name: 'mysql-primary', port: 33061 },
        { name: 'mysql-replica-1', port: 33071 },
        { name: 'mysql-replica-2', port: 33081 },
        { name: 'mysql-replica-3', port: 33091 }
    ];

    console.log('==========================================');
    console.log(' STATUS DOS NÓS (CONEXÃO DIRETA)');
    console.log('==========================================\n');

    const containerStatus = [];

    for (const node of nodes) {
        try {
            const conn = await mysql.createConnection({
                host: '127.0.0.1',
                port: node.port,
                user: 'root',
                password: 'root_password',
                connectTimeout: 2000
            });

            const [rows] = await conn.execute(
                'SELECT @@hostname AS hostname, @@server_id AS server_id, @@read_only AS read_only'
            );
            await conn.end();

            const isReadOnly = rows[0].read_only;
            containerStatus.push({
                'Container': node.name,
                'Porta Externa': node.port,
                'Server ID': rows[0].server_id,
                'Função': isReadOnly === 0 ? '🟢 PRIMARY (Escrita/Leitura)' : '🔵 RÉPLICA (Read-Only)'
            });
        } catch (err) {
            containerStatus.push({
                'Container': node.name,
                'Porta Externa': node.port,
                'Server ID': '-',
                'Função': '🔴 OFFLINE / INACESSÍVEL'
            });
        }
    }

    console.table(containerStatus);

    // Consulta o ProxySQL para ver o status do pool de servidores
    try {
        console.log('\n==========================================');
        console.log(' STATUS NO PROXYSQL (RUNTIME SERVERS)');
        console.log('==========================================');

        const proxyConn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 6033,
            user: 'app_user',
            password: 'app_password',
            database: 'myapp'
        });

        // Consulta inspirada nas métricas de runtime do ProxySQL[cite: 2]
        const [proxyRows] = await proxyConn.execute(
            'SELECT @@hostname AS hostname, @@server_id AS server_id, @@read_only AS read_only'
        );
        await proxyConn.end();

        console.table(proxyRows);
        console.log('Legenda Hostgroup: 0 = Primary (Escritas), 1 = Réplicas (Leituras)');
    } catch (err) {
        console.log('⚠️ Não foi possível conectar ao ProxySQL Admin (porta 6032):', err.message);
    }
}

checkAllDatabases();

