# FinControl - Controle Financeiro Pessoal

Aplicação web para Controle Financeiro Pessoal com autenticação JWT, PostgreSQL e design responsivo.

## Funcionalidades

- Autenticação completa com JWT (access token + refresh token)
- CRUD de despesas com categorias, formas de pagamento e locais
- Dashboard com estatísticas e resumo de despesas
- Paginação e filtros na listagem de despesas
- Autocomplete de descrições baseado no histórico
- Cálculo automático do valor total (valor unitário x quantidade)
- Dark mode nativo
- Design responsivo (mobile-first)
- Paleta de cores verde e branco

## Tecnologias

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query (TanStack Query)
- Wouter (roteamento)
- React Hook Form + Zod

### Backend
- Node.js + Express
- PostgreSQL
- Drizzle ORM
- JWT (jsonwebtoken)
- bcryptjs

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd fincontrol
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fincontrol
SESSION_SECRET=sua-chave-secreta-aqui
```

### 4. Configure o banco de dados

Crie o banco de dados PostgreSQL:

```bash
createdb fincontrol
```

Sincronize o schema:

```bash
npm run db:push
```

### 5. Inicie a aplicação

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

A aplicação estará disponível em `http://localhost:5000`.

## Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── lib/            # Utilitários e contextos
│   │   └── pages/          # Páginas da aplicação
│   └── index.html
├── server/                 # Backend Express
│   ├── auth.ts             # Autenticação JWT
│   ├── db.ts               # Conexão PostgreSQL
│   ├── routes.ts           # Rotas da API
│   └── storage.ts          # Camada de dados
├── shared/                 # Código compartilhado
│   └── schema.ts           # Schemas Drizzle + Zod
└── package.json
```

## API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Criar nova conta |
| POST | `/api/auth/login` | Fazer login |
| POST | `/api/auth/refresh` | Renovar access token |
| POST | `/api/auth/logout` | Fazer logout |
| GET | `/api/auth/me` | Obter usuário atual |

### Despesas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/expenses` | Listar despesas (com paginação) |
| GET | `/api/expenses/stats` | Estatísticas de despesas |
| GET | `/api/expenses/autocomplete` | Sugestões de descrição |
| GET | `/api/expenses/:id` | Obter despesa específica |
| POST | `/api/expenses` | Criar nova despesa |
| PATCH | `/api/expenses/:id` | Atualizar despesa |
| DELETE | `/api/expenses/:id` | Excluir despesa |

## Deploy

### Render (Backend + Frontend)

1. Crie um novo Web Service no Render
2. Conecte seu repositório
3. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Adicione as variáveis de ambiente:
   - `DATABASE_URL`: URL do PostgreSQL (Render oferece)
   - `SESSION_SECRET`: Chave secreta para JWT
   - `NODE_ENV`: `production`

### Vercel (Frontend) + Render (Backend)

Se preferir separar:

1. Deploy do backend no Render seguindo passos acima
2. No Vercel, adicione a variável `VITE_API_URL` apontando para o backend

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `SESSION_SECRET` | Chave para assinatura JWT | Sim |
| `PORT` | Porta do servidor (padrão: 5000) | Não |
| `NODE_ENV` | Ambiente (development/production) | Não |

## Segurança

- Senhas são hasheadas com bcrypt (10 rounds)
- Access tokens expiram em 15 minutos
- Refresh tokens expiram em 7 dias
- Todas as rotas de despesas validam o userId no backend
- Tokens são armazenados no localStorage (considere httpOnly cookies para produção)
- Headers de segurança com Helmet (CSP, HSTS, etc.)
- Rate limiting: 100 req/15min geral, 10 req/15min para auth
- CORS configurado para produção
- Compressão de respostas habilitada
- Logs estruturados com Winston

## Produção

### Pré-requisitos
- HTTPS obrigatório (use provedor que force SSL)
- Gere uma SESSION_SECRET segura (64+ caracteres aleatórios)
- Configure FRONTEND_URL no .env para CORS
- Monitore logs em `logs/` (error.log, combined.log)

### Deploy Recomendado
- **Railway** ou **Render** para full-stack (frontend + backend)
- **Vercel** (frontend) + **Railway/Render** (backend)
- Use variáveis de ambiente para segredos (não commite .env)

### Checklist de Produção
- [ ] Mudar SESSION_SECRET para string segura
- [ ] Configurar FRONTEND_URL
- [ ] Testar HTTPS
- [ ] Verificar logs
- [ ] Backup do banco (Supabase tem automático)

## Licença

MIT
