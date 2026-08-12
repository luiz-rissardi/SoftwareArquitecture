# CQRS com CDC — MySQL + Debezium + Kafka + Redis

## Estrutura

```
CQRS/
├── write/                # Command side: grava no MySQL
│   ├── index.js
│   ├── db.js
│   └── schema.sql
├── KafkaReader/           # Consome os eventos do Debezium e popula o Redis
│   └── index.js
├── read/                  # Query side: expõe GET /users lendo do Redis
│   └── index.js
├── docker-compose.yml
├── mysql-connector.json
├── .env
└── README.md
```

## Fluxo

1. `write/index.js` recebe `POST /users` e grava direto no MySQL (fonte da verdade / write model).
2. O MySQL tem o **binlog** ligado (não uma "tabela de log" — o Debezium lê o binlog
   nativo de replicação, não uma tabela SQL).
3. O **Debezium**, rodando dentro do Kafka Connect, lê o binlog e publica um evento
   por linha alterada no tópico Kafka `cqrs-demo.appdb.users`.
4. `KafkaReader/index.js` assina esse tópico e faz upsert/delete no **Redis**, que
   vira o read model (Query side) — otimizado para leitura simples por chave.
5. `read/index.js` expõe `GET /users` e `GET /users/:id`, lendo **exclusivamente do
   Redis**. Esse serviço nunca toca o MySQL — é o lado Query do CQRS.

`write/` (Command) e `read/` (Query) são deploys independentes de propósito: podem
escalar separadamente e um pode cair sem derrubar o outro.

## Rodando local

```bash
# a partir da pasta CQRS/
docker compose down -v   # se já tentou subir antes e deu erro, limpa o volume
docker compose up -d

npm install --prefix write express mysql2
npm install --prefix KafkaReader kafkajs ioredis
npm install --prefix read express ioredis

# registrar o conector no Kafka Connect
curl -X POST -H "Content-Type: application/json" \
  --data @mysql-connector.json \
  http://localhost:8083/connectors
```

### Variáveis de ambiente

Um `.env` já vem pronto na raiz, com valores compatíveis com o
`docker-compose.yml`/`write/schema.sql`. Rode os serviços carregando ele
(Node 20+ tem suporte nativo, sem precisar da lib `dotenv`):

```bash
node --env-file=.env write/index.js
node --env-file=.env KafkaReader/index.js
node --env-file=.env read/index.js
```

### Testando

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Luiz","email":"luiz@example.com"}'

# via Redis direto (debug)
redis-cli HGETALL user:<id-retornado>

# via read/ (o jeito "certo", como um cliente real consumiria)
curl http://localhost:3001/users/<id-retornado>
curl http://localhost:3001/users
```
