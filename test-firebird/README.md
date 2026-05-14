# Firebird de teste

Banco Firebird local para testar o PharmaConnector.

## Subir

```bash
docker compose up -d
```

## Dados de conexao no painel

```text
driver: Firebird
host: 127.0.0.1
port: 3050
database: /var/lib/firebird/data/pharma_test.fdb
user: SYSDBA
password: masterkey
```

## Mapping sugerido

```text
tabela: PRODUCTS
nome: NAME
preco: PRICE
estoque: STOCK
imagem: IMAGE
```

O arquivo do banco fica em:

```text
test-firebird/data/pharma_test.fdb
```
