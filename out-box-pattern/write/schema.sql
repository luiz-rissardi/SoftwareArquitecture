CREATE USER IF NOT EXISTS 'app_writer'@'%' IDENTIFIED BY 'writer_pw';
GRANT ALL PRIVILEGES ON appdb.* TO 'app_writer'@'%';
FLUSH PRIVILEGES;


-- write/schema.sql

CREATE TABLE IF NOT EXISTS ORDERS (
    orderId      VARCHAR(36) PRIMARY KEY,
    userId       VARCHAR(36) NOT NULL,
    totalAmount  DECIMAL(10,2) NOT NULL,
    createdAt     DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_order (
    orderId      VARCHAR(36) PRIMARY KEY,
    paymentId       VARCHAR(36) NOT NULL,
    totalAmount  DECIMAL(10,2) NOT NULL,
    createdAt     DATETIME NOT NULL,
    status VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_messages (
    messageId    VARCHAR(36) PRIMARY KEY,
    event        VARCHAR(100) NOT NULL,
    payload      JSON NOT NULL,
    createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_payment_messages (
    messageId    VARCHAR(36) PRIMARY KEY,
    event        VARCHAR(100) NOT NULL,
    createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (messageId) REFERENCES outbox_messages(messageId) ON DELETE CASCADE
);
