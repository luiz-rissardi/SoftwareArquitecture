import { createPool } from 'mysql2/promise';


export class OrderRepository {
    pool;

    constructor() {
        this.pool = createPool({
            host: 'localhost',
            port: 3307,
            user: 'app_writer',
            password: 'writer_pw', // Certifique-se de que a senha bate com a que criamos no MySQL
            database: 'appdb',
            waitForConnections: true,
            connectionLimit: 10,
        });
    }

    async getConnection() {
        return await this.pool.getConnection();
    }

    async insertOne(order, conn = null) {
        const executor = conn || this.pool;
        await executor.query(
            `INSERT INTO ORDERS (orderId, userId, totalAmount, createdAt) VALUES (?, ?, ?, NOW())`,
            [order.orderId, order.userId, order.totalAmount]
        );
    }

    async createMessageBox(message, conn = null) {
        const executor = conn || this.pool;
        const [result] = await executor.query(
            `INSERT IGNORE INTO outbox_messages (messageId, event, payload) VALUES (?, ?, ?)`,
            [message.messageId, message.eventName, message.payload]
        );
        return result.affectedRows > 0;
    }
}