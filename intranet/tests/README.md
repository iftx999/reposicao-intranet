# Testes RLS/Postgres

Esta primeira suite usa pgTAP via Supabase CLI (`supabase test db`).

## Por que pgTAP

As regras cobertas aqui vivem no Postgres: RLS policies, helpers baseados em
`auth.uid()`, triggers de estoque e constraints. pgTAP exercita esse contrato
diretamente no banco local recriado pela Supabase CLI, sem depender de chaves
service-role, Auth API ou harness TypeScript.

## Como rodar

Pre-requisitos:

- Docker instalado e em execucao.
- Supabase CLI instalada e autenticada, se necessario.

Comandos:

```bash
cd intranet
test -f supabase/config.toml || supabase init
supabase start
npm run test:rls
```

O script `test:rls` executa:

```bash
supabase test db
```

## Fixtures

O teste `supabase/tests/database/rls_stock_test.sql` cria fixtures proprias,
com duas empresas e usuarios dos papeis operador, gestor, admin e super admin.
Os dados ficam dentro de uma transacao com `rollback`, entao nao persistem apos
a execucao. Os seeds de `supabase/seeds/` continuam sendo fixtures de cardapio
e nao sao necessarios para esta suite.
