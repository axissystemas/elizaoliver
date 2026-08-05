# 🎨 Manual de Configurações da Clínica & Especificações da Imagem de LOGO

Este manual descreve o passo a passo para personalizar as informações da clínica no sistema **Axis GC**, incluindo as especificações técnicas exatas para a imagem de **LOGO**.

---

### 📐 Especificações Técnicas da Imagem de LOGO

Para garantir a melhor qualidade visual na página pública de pré-agendamento (`/pre-agendamento`), no cabeçalho (*TopBar*) e no menu lateral (*Sidebar*), siga as recomendações abaixo:

#### 1. Dimensões em Pixels
- **Logo Quadrada (Proporção 1:1)**:
  - **Dimensão Ideal**: `250 x 250 pixels` ou `512 x 512 pixels` *(Excelente para displays de alta densidade/Retina)*.
- **Logo Retangular / Horizontal**:
  - **Dimensão Ideal**: `300 x 100 pixels` ou `400 x 150 pixels`.

#### 2. Formato e Peso do Arquivo
- **Formato do Arquivo**: **PNG** com **fundo transparente** (altamente recomendado para adaptação aos temas claro e escuro).
- **Tamanho Máximo do Arquivo**: Até **2 MB**.
- **Redimensionamento Automático**: O sistema aplica adaptação proporcional automática (`object-contain`), garantindo que a imagem **nunca fique distorcida ou esticada**.

---

### 🛠️ Como Alterar as Informações e a LOGO no Sistema

1. **Acessar as Configurações**:
   - Faça login no sistema com uma conta de **Administrador**.
   - No menu lateral esquerdo, clique em **Configurações**.

2. **Abrir os Dados da Clínica**:
   - Na seção **Clínica e Serviços**, clique em **Dados da Clínica**.

3. **Alterar as Informações**:
   - **Logo da Clínica**: Clique no botão **Fazer Upload da Logo** e selecione a imagem do seu computador, ou insira o link/URL direto de uma imagem.
   - **Nome da Clínica**: Informe o nome oficial (ex: *Clínica Axis GC*).
   - **Subtítulo / Descrição**: Defina o texto exibido abaixo do nome na página pública (ex: *Pré-Agendamento de Consultas*).
   - **Endereço Completo**: Informe o endereço comercial.
   - **Telefone / WhatsApp Comercial**: Informe o número para contato.

4. **Salvar**:
   - Clique em **Salvar Dados**. As alterações serão aplicadas instantaneamente no painel, no menu lateral e na página pública de pré-agendamento.

---

### ⚙️ Arquitetura Técnica & Sincronização

- **Persistência**: As configurações são salvas localmente no `localStorage` (`auriculocare_clinic`) e sincronizadas no Supabase nas tabelas `system_settings` (`clinic_info`) e `organizations`.
- **Acesso Público**: Visitantes não autenticados na página `/pre-agendamento` consultam a tabela `system_settings` para carregar dinamicamente a logo, nome e subtítulo da clínica.
- **Sincronização em Tempo Real**: É disparado o evento customizado `clinic_settings_updated` na janela do navegador para atualizar os componentes em tempo real sem necessidade de recarregar a página.
