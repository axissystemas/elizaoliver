# Guia Passo a Passo: Implantação de Cópias Limpas em Novos Clientes

Este guia descreve todo o processo para gerar uma nova versão virgem do sistema **Axis GC / ElizaOliver** e implantá-la para um novo cliente de forma isolada, limpa e segura.

---

## 📋 Pré-requisitos
* Node.js instalado (v18+ ou superior).
* Uma conta no [Supabase](https://supabase.com).
* Uma conta na [Vercel](https://vercel.com) (ou servidor de hospedagem equivalente).

---

## 🛠️ Passo 1: Gerar a Cópia Limpa do Código

1. Abra o terminal na pasta do seu projeto principal.
2. Execute o comando de exportação automatizada:

```bash
npm run export:clean
```

3. O script criará automaticamente uma pasta limpa fora do projeto de desenvolvimento, por exemplo:
   `D:\Projetos antigravity\ElizaOliver\ElizaOliver-CopiaLimpa`

> **Nota:** Essa pasta estará totalmente desvinculada do seu Git local, sem histórico de desenvolvimento, sem `.env.local` e sem dados de pacientes de teste.

---

## 🗄️ Passo 2: Criar e Configurar o Banco no Supabase

1. Acesse o [Painel do Supabase](https://supabase.com/dashboard) e clique em **"New Project"**.
2. Preencha o nome do projeto (ex: `axis-gc-cliente-x`) e defina a senha do banco.
3. Após a criação do projeto no Supabase, abra a opção **SQL Editor** no menu lateral esquerdo.
4. Abra o arquivo de migração contido na cópia limpa:
   `ElizaOliver-CopiaLimpa/supabase/full_schema_migration.sql`
5. Copie todo o conteúdo do arquivo SQL, cole no **SQL Editor** do Supabase e clique em **"Run"**.
6. Isso criará toda a estrutura de tabelas, Row Level Security (RLS), planos e catálogos necessários.

---

## 🔑 Passo 3: Obter Chaves e Configurar Variáveis de Ambiente

1. No painel do Supabase do novo cliente, vá em **Project Settings** > **API**.
2. Copie os seguintes valores:
   - **Project URL** (ex: `https://xxxx.supabase.co`)
   - **anon / public key** (chave pública da API)
3. Na pasta do novo cliente (`ElizaOliver-CopiaLimpa`), faça uma cópia do arquivo `.env.example` renomeando-a para `.env.local`.
4. Preencha as chaves:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-instancia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## 🚀 Passo 4: Realizar o Deploy na Vercel

1. Suba a nova pasta do cliente para um repositório dedicado no GitHub do cliente (ou no seu GitHub).
2. Acesse a [Vercel](https://vercel.com), clique em **"Add New Project"** e importe o repositório.
3. Na seção **Environment Variables**, adicione as mesmas duas variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **"Deploy"**.

---

## 👤 Passo 5: Criar o Primeiro Usuário Administrador do Cliente

1. Acesse a URL final gerada pela Vercel (ex: `https://cliente-x.vercel.app`).
2. Faça o cadastro do primeiro usuário (e-mail do cliente).
3. No painel do Supabase desse cliente, vá em **Table Editor** > **profiles**.
4. Localize o perfil criado e altere o campo `role` para `'ADMIN'`.
5. O cliente agora possui acesso completo como Administrador do seu ambiente exclusivo!

---

## 🎨 Passo 6: Personalizar Marca, Nome e LOGO da Clínica

1. Acesse o sistema como Administrador e navegue até **Configurações** > **Dados da Clínica**.
2. Faça o upload da imagem de **LOGO** do cliente (recomendado: PNG com fundo transparente, `250x250px` ou `300x100px`).
3. Preencha o **Nome da Clínica**, **Subtítulo** (exibido na página pública de pré-agendamento), **Endereço** e **Telefone Comercial**.
4. Clique em **Salvar Dados**. Todas as páginas públicas e internas atualizarão a marca instantaneamente.

> Para especificações detalhadas da imagem de logo e dimensões em pixels, consulte o arquivo [docs/MANUAL_CONFIGURACOES_E_LOGO.md](file:///d:/Projetos%20antigravity/ElizaOliver/elizaoliver/docs/MANUAL_CONFIGURACOES_E_LOGO.md).

---

## 💡 Dicas e Boas Práticas
- Cada cliente possui banco e credenciais 100% isolados.
- Nunca compartilhe a chave de serviço (`service_role key`) do Supabase.
- Caso faça atualizações de código no projeto principal no futuro, basta gerar uma nova cópia limpa e implantar.
