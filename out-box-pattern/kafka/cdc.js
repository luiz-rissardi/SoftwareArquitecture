import { Kafka } from 'kafkajs';
import crypto from 'crypto';

// 1. Configuração do Kafka apontando para o seu localhost:29092 (porta externa do compose)
const kafka = new Kafka({
    clientId: 'order-fulfillment-service',
    brokers: ['localhost:29092'] 
});

// O Consumer Group garante que, se você subir 3 instâncias desse worker, 
// eles vão dividir o trabalho e não ler a mesma mensagem 3 vezes.
const consumer = kafka.consumer({ groupId: 'fulfillment-group' });

// O Producer serve para gerarmos o "novo evento" após o processamento

async function runWorker() {
    await consumer.connect();

    // 2. Inscreve no tópico gerado pelo Debezium
    // O Debezium usa o formato: [topic.prefix].event.[nome_do_evento]
    await consumer.subscribe({ topic: 'outbox.event.orderCreated', fromBeginning: true });

    console.log('🎧 Worker escutando o tópico "outbox.event.orderCreated"...');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            // O Debezium envia a Key como uma string/buffer com aspas, ex: '"uuid-123"'
            // O Value é o payload JSON puro que você salvou no banco
            const messageId = message.key.toString().replace(/"/g, ''); 
            const payload = JSON.parse(message.value.toString());

            console.log(`\n📥 Nova mensagem recebida! ID: ${messageId}`);
            console.log(payload);
            try {
                // Roteador de Eventos
                if (topic === 'outbox.event.orderCreated') {
                    // await handleOrderCreated(messageId, payload);
                }
            } catch (error) {
                console.error(`❌ Erro ao processar mensagem ${messageId}:`, error);
                // Se der erro, o kafkajs vai tentar ler de novo automaticamente (retry)
                throw error; 
            }
        },
    });
}

runWorker().catch(console.error);