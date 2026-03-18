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
