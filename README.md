# 🏦 Ledger Financeiro

Um aplicativo web moderno e responsivo para controlo financeiro pessoal. Construído com foco na precisão matemática através do modelo de "Livro-razão" (Ledger), onde o saldo é estritamente calculado através de **Entradas** e **Saídas**.

https://my-finance-dashboard-mocha.vercel.app/

## ✨ Funcionalidades

* **Autenticação Segura:** Sistema multi-utilizador com login e registo. Cada utilizador tem o seu próprio espaço privado no banco de dados.
* **Modelo Ledger (Livro-razão):** A verdadeira fonte do saldo. Todo o dinheiro que entra ou sai é registado nestes dois blocos centrais, evitando duplicação de despesas.
* **Navegação Temporal:** Filtre todo o seu painel por Mês e Ano.
* **Despesas Recorrentes Inteligentes:** Adicione uma despesa e ela propagar-se-á para os meses seguintes. Funcionalidade de "Soft Delete" (cancelar a despesa num mês não a apaga do histórico passado).
* **Gestão de Faturas e Parcelas:** Controle cartões de crédito e acompanhe as suas compras parceladas ao longo do tempo.
* **Módulo de Investimentos:** Registe aportes (Saídas) e resgates (Entradas) de ativos como CDB e Bitcoin.
* **Módulo de Metas:** Acompanhe os seus desejos de compra e o valor alvo.
* **Dark Mode:** Suporte nativo para tema claro e escuro.

## 🛠️ Tecnologias Utilizadas

**Front-end:**
* [React](https://reactjs.org/) (com Hooks e Componentes Funcionais)
* [Vite](https://vitejs.dev/) (Bundler rápido)
* [Tailwind CSS](https://tailwindcss.com/) (Estilização utilitária e responsiva)
* [Shadcn UI](https://ui.shadcn.com/) / Radix UI (Componentes acessíveis)
* [Lucide React](https://lucide.dev/) (Ícones)
* [Date-fns](https://date-fns.org/) (Manipulação de datas)

**Back-end & Infraestrutura:**
* [Supabase](https://supabase.com/) (Banco de Dados PostgreSQL e Autenticação)
* [Vercel](https://vercel.com/) (Hospedagem e CI/CD)

## 🚀 Como executar o projeto localmente

### 1. Clonar o repositório
```bash
git clone [https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git](https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git)
cd SEU_REPOSITORIO
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um ficheiro .env.local na raiz do projeto e adicione as suas chaves do Supabase:

```bash
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### 4. Configurar o Banco de Dados (Supabase)
No painel do Supabase, execute o seguinte SQL no SQL Editor para criar a tabela e as regras de segurança (RLS):

```sql

-- Cria a tabela vinculada ao sistema de utilizadores
CREATE TABLE user_ledger (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dados JSONB NOT NULL DEFAULT '{"monthlyData": {}, "installments": [], "goals": [], "recurringExpenses": []}'::jsonb
);

-- Ativa a segurança (RLS)
ALTER TABLE user_ledger ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Utilizadores podem ver os seus próprios dados" ON user_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Utilizadores podem inserir os seus próprios dados" ON user_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utilizadores podem atualizar os seus próprios dados" ON user_ledger FOR UPDATE USING (auth.uid() = user_id);

```
### 5. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```
A aplicação estará disponível em http://localhost:5173 ou http://localhost:8080.

## ☁️ Hospedagem (Deploy)
Este projeto está configurado para ser hospedado facilmente na Vercel.
  Conecte o seu repositório GitHub à Vercel.
  Nas configurações do projeto na Vercel, adicione as mesmas variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
  Clique em Deploy. Qualquer novo git push irá atualizar o site automaticamente.

