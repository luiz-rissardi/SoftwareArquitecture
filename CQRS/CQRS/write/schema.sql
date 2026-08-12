CREATE DATABASE IF NOT EXISTS appdb;
USE appdb;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL
);

-- Usuário dedicado para o write-service (só escreve)
CREATE USER IF NOT EXISTS 'app_writer'@'%' IDENTIFIED BY 'writer_pw';
GRANT INSERT, UPDATE, DELETE, SELECT ON appdb.users TO 'app_writer'@'%';

-- Usuário dedicado para o Debezium (precisa de privilégios de replicação)
CREATE USER IF NOT EXISTS 'debezium'@'%' IDENTIFIED BY 'debezium_pw';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'debezium'@'%';

FLUSH PRIVILEGES;
