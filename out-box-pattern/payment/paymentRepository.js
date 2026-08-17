import { createPool } from 'mysql2/promise';


export class PaymentRepository {

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

    async insertOne(payment, conn = null) {
        const executor = conn || this.pool;
        await executor.query(
            `INSERT INTO payment_order (orderId, paymentId, totalAmount, createdAt, status) VALUES (?, ?, ?, NOW(), ?)`,
            [payment.orderId, payment.paymentId, payment.totalAmount, payment.status]
        );
    }

    async createProcessedMessage(message, conn = null) {
        console.log(message);
        const executor = conn || this.pool;
        const [result] = await executor.query(
            `INSERT IGNORE INTO processed_payment_messages (messageId, event, createdAt) VALUES (?, ?, NOW())`,
            [message.messageId, message.eventName]
        );
        return result.affectedRows > 0;
    }
}