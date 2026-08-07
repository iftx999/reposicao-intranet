# Modernização visual do painel admin (intranet) com shadcn/ui

## Contexto

O painel administrativo (`intranet/`, Next.js 15 + React 19 + Tailwind) usa elementos HTML nativos (`<select>`, `<table>`, modais manuais em `<div>`) estilizados apenas com classes Tailwind na "moldura". Isso funciona para inputs de texto e botões, mas elementos nativos como `<select>` não podem ter sua lista de opções restilizada via CSS — o dropdown renderiza com a aparência padrão do sistema operacional/navegador, quebrando a identidade visual do produto.

O app já tem uma paleta de marca definida em `intranet/tailwind.config.ts`:
- `graphite` (#16191D), `charcoal` (#24282E) — escuros/texto
- `ice` (#F7F8FA) — fundo claro
- `lime` (#B6E85F) — sucesso/positivo
- `coral` (#FF5A4F) — erro/destrutivo
- `amber` (#F6B44B) — alerta
- `soda` (#48A9F8) — acento/foco
- `muted` (#6B727A) — texto secundário

Não há biblioteca de componentes hoje (sem shadcn/Radix/MUI). O objetivo é substituir os elementos nativos por componentes acessíveis e estilizáveis, sem introduzir nenhuma cor nova e sem alterar lógica de negócio.

## Escopo

Todas as telas administrativas dentro de `intranet/app/(admin)/`:
- `usuarios` (piloto/modelo)
- `dashboard`
- `produtos`
- `solicitacoes`
- `administrativo`

Fora de escopo: `agenda`, `deb`, `gbb`, `marketing`, `bbb360-adm` (sem link de navegação, não usadas ativamente), rotas de API, lógica Supabase, autenticação.

## Abordagem

### 1. Fundação: instalar shadcn/ui

Rodar o setup do shadcn/ui (`npx shadcn@latest init`) dentro de `intranet/`, configurando os tokens de tema do shadcn (`--background`, `--foreground`, `--primary`, `--destructive`, `--muted`, `--accent`, `--ring`, etc., em `app/globals.css`) para apontar para as cores já existentes no Tailwind config — **nenhuma cor nova é introduzida**:

| Token shadcn | Cor do projeto |
|---|---|
| `primary` | `graphite` |
| `destructive` | `coral` |
| `accent` / `ring` | `soda` |
| `success` (customizado) | `lime` |
| `warning` (customizado) | `amber` |
| `background` | `ice` (light) / `graphite` (dark, se aplicável) |
| `muted` | `muted` |

O `tailwind.config.ts` existente é estendido (não substituído) para incluir os tokens do shadcn mapeados às cores atuais.

### 2. Componentes shadcn a instalar

`select`, `table`, `input`, `button`, `badge`, `dialog`, `checkbox`, `dropdown-menu`, `label`.

Cada um é gerado como código dentro de `intranet/components/ui/` (padrão shadcn — não é uma dependência de pacote fechada), permitindo customização direta de cores/tamanhos depois.

### 3. Densidade visual: dashboard corporativo

Ajustar os componentes gerados para densidade compacta, no padrão "dashboard corporativo" (referência: Stripe):
- Altura de controles (`select`, `input`, botões de linha): `h-9`/`h-10` em vez do `h-11` atual
- Padding de célula de tabela: `py-2.5` / `px-3` em vez do `py-4` atual
- Espaçamento entre seções reduzido onde fizer sentido, mantendo legibilidade

### 4. Rollout por página

**Piloto: `usuarios/page.tsx` + `UserModal.tsx`**
- Filtros de Role e Ativo/Inativo → `Select` do shadcn
- Busca → `Input` do shadcn (mantém o ícone de lupa)
- Tabela de usuários → `Table` do shadcn (`TableHeader`, `TableRow`, `TableCell`)
- Badges de role e status → `Badge` do shadcn, variantes mapeadas para as cores de role já definidas em `lib/profile.ts` (`roleClasses`, `roleLabels`)
- Modal de criar/editar usuário (`UserModal.tsx`) → `Dialog` do shadcn substituindo o `<div className="fixed inset-0...">` manual
- Checkbox "Ativo" → `Checkbox` do shadcn

**Demais páginas (`dashboard`, `produtos`, `solicitacoes`, `administrativo`)**
- Aplicar os mesmos componentes (`Select`, `Table`, `Input`, `Button`, `Badge`, `Dialog` conforme o que cada página já usa hoje)
- Reaproveitar exatamente os componentes gerados no passo do piloto — não recriar variantes por página
- Preservar toda a lógica de dados, chamadas Supabase, filtros e handlers existentes; a mudança é só na camada de apresentação

### 5. Navegação (`AppShell.tsx`)

Fora do escopo principal — já está com Tailwind puro e visual limpo (links de texto, sem `<select>`/`<table>`), não precisa de componente shadcn. Não será alterado neste trabalho.

## Fora de escopo

- Alterar lógica de negócio, queries Supabase, RLS, rotas de API
- Dark mode (não solicitado)
- Páginas sem link de navegação (`agenda`, `deb`, `gbb`, `marketing`, `bbb360-adm`)
- Introduzir cores fora da paleta já existente
- Alterar comportamento de nenhum filtro, formulário ou fluxo — apenas a camada visual

## Critério de sucesso

- Nenhum `<select>` ou `<table>` nativo restante nas 5 páginas em escopo
- Visual consistente entre as páginas (mesmos componentes reutilizados, não recriados por página)
- Paleta de cores idêntica à atual (graphite/charcoal/ice/lime/coral/amber/soda/muted)
- Comportamento funcional idêntico ao atual (filtros, criação/edição de usuário, etc.)
- `npm run build` da intranet passa sem erros
