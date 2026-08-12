import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

const kafka = new Kafka({
  clientId: 'read-consumer',
  brokers: ['localhost:29092'],
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const TOPIC = 'cqrs-demo.appdb.users';

async function start() {
  const consumer = kafka.consumer({ groupId: 'read-model-builder' });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      // Envelope padrão do Debezium: { before, after, op, source, ts_ms }
      const event = JSON.parse(message.value.toString());
      const { op, after, before } = event;

      try {
        if (op === 'c' || op === 'u' || op === 'r') {
          // create, update ou snapshot inicial -> upsert no Redis
          await redis.hset(`user:${after.id}`, {
            id: after.id,
            name: after.name,
            email: after.email,
            created_at: after.created_at,
          });
        } else if (op === 'd' && before) {
          // delete -> remove do read model
          await redis.del(`user:${before.id}`);
        }
        // Nota: falta idempotência real aqui (ex: guardar o offset/LSN
        // processado) e tratamento de erro com retry/DLQ - ver avaliação.
      } catch (err) {
        console.error('Falha ao aplicar evento no read model:', err);
        // Em produção: mandar para uma dead-letter queue em vez de só logar.
      }
    },
  });

  console.log('read-consumer rodando, escutando', TOPIC);
}

start().catch((err) => {
  console.error('Erro fatal no read-consumer:', err);
  process.exit(1);
});
