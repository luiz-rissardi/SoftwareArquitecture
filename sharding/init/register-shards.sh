#!/bin/bash
set -e

echo "=== Registrando Shards no Coordinator ==="

psql -h coordinator -U postgres -d appdb <<EOSQL
SELECT citus_add_node('shard1', 5432) WHERE NOT EXISTS (
  SELECT 1 FROM citus_get_active_worker_nodes() WHERE node_name = 'shard1'
);
SELECT citus_add_node('shard2', 5432) WHERE NOT EXISTS (
  SELECT 1 FROM citus_get_active_worker_nodes() WHERE node_name = 'shard2'
);
SELECT citus_add_node('shard3', 5432) WHERE NOT EXISTS (
  SELECT 1 FROM citus_get_active_worker_nodes() WHERE node_name = 'shard3'
);
EOSQL

echo "=== Registros concluídos com sucesso! ==="