# Firebird test database

Scripts para criar um banco Firebird local na VM com 5 produtos.

## Criar banco

```bash
mkdir -p /home/ubuntu/firebird-test/data /home/ubuntu/firebird-test/lock
rm -f /home/ubuntu/firebird-test/data/pharma_vm_test.fdb

FIREBIRD_LOCK=/home/ubuntu/firebird-test/lock \
isql-fb -q -i firebird-test/create.sql
```

## Validar

```bash
FIREBIRD_LOCK=/home/ubuntu/firebird-test/lock \
isql-fb /home/ubuntu/firebird-test/data/pharma_vm_test.fdb \
-user SYSDBA \
-password masterkey \
-q \
-i firebird-test/check.sql
```

## Panel

```text
Driver: Firebird
Host: 127.0.0.1
Porta: 3050
Database: /home/ubuntu/firebird-test/data/pharma_vm_test.fdb
Usuario: SYSDBA
Senha: masterkey
```

Mapping:

```text
Tabela: PRODUCTS
Nome: NAME
Preco: PRICE
Estoque: STOCK
Imagem: IMAGE
```
