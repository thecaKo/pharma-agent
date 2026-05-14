# Pharma Panel

Painel MVP para controlar agentes PharmaTunnel.

## Rodar

```bash
npm install
npx prisma db push
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Fluxo

1. Acesse `/tokens/new` e gere um token.
2. Rode o `apps/tunnel-agent`.
3. No setup local do agente, clique em `Gerar Token` ou cole o token gerado.
4. O agente registra em `/api/agents/register` e conecta no WebSocket `/api/agents/socket`.
5. Use `/agents` para configurar banco, buscar schema, mapear campos e importar produtos.

## Variaveis

```text
DATABASE_URL="file:./dev.db"
PORT=3000
HOST=0.0.0.0
```

## HTTPS direto no panel

Para teste com certificado local:

```bash
HOST=0.0.0.0 \
PORT=3000 \
HTTPS_KEY_FILE=/caminho/privkey.pem \
HTTPS_CERT_FILE=/caminho/fullchain.pem \
npm run dev
```

Abra:

```text
https://localhost:3000
```

Em producao, prefira usar Caddy ou Nginx terminando HTTPS na frente do panel.
