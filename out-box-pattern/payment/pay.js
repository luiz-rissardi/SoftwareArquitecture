import { Kafka } from "kafkajs";
import crypto from 'crypto';
import { PaymentFactory } from "./paymentFactory.js";


const paymentService = PaymentFactory.constroyService();

const kafka = new Kafka({
    clientId: 'order-fulfillment-service',
    brokers: ['localhost:29092']
});

const cosumer = kafka.consumer({
    groupId: 'fulfillment-group'
})

async function runPaymentWorker() {
    await cosumer.connect();

    await cosumer.subscribe({
        topic: "outbox.event.orderCreated",
        fromBeginning: true
    })

    console.log('🎧 Worker escutando o tópico "outbox.event.orderCreated"...');

    cosumer.run({
        eachMessage: ({ message, topic }) => {
            if (topic != "outbox.event.orderCreated") {
                return;
            }

            const rawKey = JSON.parse(message.key.toString());
            const rawValue = JSON.parse(message.value.toString());

            const messageId = rawKey.payload; // era só string antes, agora vem dentro de payload
            const eventPayload = JSON.parse(rawValue.payload); // o campo "payload" da sua tabela outbox_messages, que já é uma string JSON

            paymentService.createPayment(eventPayload,messageId);


        }
    })

}

runPaymentWorker()