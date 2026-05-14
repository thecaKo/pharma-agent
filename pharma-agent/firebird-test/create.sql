CREATE DATABASE '/home/ubuntu/firebird-test/data/pharma_vm_test.fdb'
USER 'SYSDBA'
PASSWORD 'masterkey'
DEFAULT CHARACTER SET UTF8;

CREATE TABLE PRODUCTS (
  ID INTEGER NOT NULL PRIMARY KEY,
  NAME VARCHAR(120) NOT NULL,
  PRICE NUMERIC(12, 2),
  STOCK INTEGER,
  IMAGE VARCHAR(255)
);

INSERT INTO PRODUCTS (ID, NAME, PRICE, STOCK, IMAGE) VALUES (1, 'Dipirona 500mg 20 comprimidos', 12.90, 48, 'https://example.com/dipirona.jpg');
INSERT INTO PRODUCTS (ID, NAME, PRICE, STOCK, IMAGE) VALUES (2, 'Paracetamol 750mg 20 comprimidos', 15.50, 35, 'https://example.com/paracetamol.jpg');
INSERT INTO PRODUCTS (ID, NAME, PRICE, STOCK, IMAGE) VALUES (3, 'Ibuprofeno 400mg 10 capsulas', 18.75, 22, 'https://example.com/ibuprofeno.jpg');
INSERT INTO PRODUCTS (ID, NAME, PRICE, STOCK, IMAGE) VALUES (4, 'Loratadina 10mg 12 comprimidos', 21.30, 19, 'https://example.com/loratadina.jpg');
INSERT INTO PRODUCTS (ID, NAME, PRICE, STOCK, IMAGE) VALUES (5, 'Omeprazol 20mg 28 capsulas', 26.40, 41, 'https://example.com/omeprazol.jpg');

COMMIT;
QUIT;
