import { Result } from "../shared/result.js";
import { OrderRepository } from "./orderRepository.js";



export class OrderService {

    /**
   * @param {OrderRepository} orderRepository
   */
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }

    async createOrder(order) {
        const conn = await this.orderRepository.getConnection();

        try {
            await conn.beginTransaction();

            const message = {
                messageId: crypto.randomUUID(),
                eventName: "orderCreated",
                payload: JSON.stringify(order)
            }

            const wasCreated = await this.orderRepository.createMessageBox(message, conn);

            if (!wasCreated) {
                await conn.rollback();
                return Result.fail("operação já foi criada!")
            }

            await this.orderRepository.insertOne(order, conn);
            await conn.commit();
            return Result.ok({ message: "order created bee successfully" })

        } catch (error) {
            await conn.rollback();
            return Result.fail(`Erro ao criar o pedido: ${error.message}`);
        } finally {
            conn.release();
        }
    }
}