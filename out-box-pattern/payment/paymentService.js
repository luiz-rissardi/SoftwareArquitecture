import { PaymentRepository } from "./paymentRepository.js";
import { Result } from "../shared/result.js";

export class PaymentService {

    /**
      * @param {PaymentRepository} paymentRepository
      */
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    async createPayment(order, processId) {

        console.log(order, processId);
        const conn = await this.paymentRepository.getConnection();

        try {
            await conn.beginTransaction();
            const processedMessage = {
                messageId: processId,
                eventName: "createPayment"
            }
            const wasCreated = await this.paymentRepository.createProcessedMessage(processedMessage);

            if (!wasCreated) {
                await conn.rollback();
                return Result.fail("operação já foi criada!")
            }

            const payment = {
                orderId:order.orderId,
                paymentId:crypto.randomUUID(),
                totalAmount:order.totalAmount,
                status:"PENDING"
            }

            await this.paymentRepository.insertOne(payment,conn);
            await conn.commit();
            return Result.ok("Boleto gerado com sucesso!");

        } catch (error) {
            conn.rollback();
            console.log(error);
            return Result.fail(`Erro ao gerar boleto`);
        } finally {
            conn.release();
        }
    }

}