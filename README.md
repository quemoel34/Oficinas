# Carretômetro – Gestão Inteligente de Frotas (Documentação Completa)

## 1. Visão Geral do Projeto

O Carretômetro é um **Progressive Web App (PWA)** de alta fidelidade construído para a gestão e monitoramento de manutenção de frotas de veículos pesados. O aplicativo oferece uma interface moderna e responsiva, funcionalidades de tempo real, automação por Inteligência Artificial e foi projetado para funcionar de forma eficiente online e offline.

O objetivo principal é fornecer uma ferramenta visual, automatizada e centralizada para que gerentes de frota e equipes de manutenção possam acompanhar o ciclo de vida de cada visita à oficina, otimizar tempos operacionais e tomar decisões proativas baseadas em dados históricos e análises preditivas.

---

## 2. Pilha de Tecnologias (Tech Stack)

O aplicativo foi construído com uma seleção moderna de tecnologias focadas em performance, produtividade do desenvolvedor e uma excelente experiência do usuário.

-   **Framework Principal:** **Next.js 15** com **App Router** e **React 18**.
-   **Linguagem:** **TypeScript**.
-   **Estilização:** **Tailwind CSS** para estilização utilitária e **ShadCN UI** para um sistema de componentes pré-construídos, acessíveis e customizáveis.
    -   **Cores Principais (definidas em `src/app/globals.css`):**
        -   **Primária (Azul):** `#3B82F6` (Usada para botões principais, links e destaques).
        -   **Fundo (Azul Claro):** `hsl(220 20% 98%)` (Um tom de azul-acinzentado muito claro para o fundo geral).
        -   **Acento (Roxo):** `#818CF8` (Usada para elementos interativos e como cor de destaque).
    -   **Fontes:**
        -   **Corpo e Títulos:** `Inter` (Sans-serif, para um visual moderno e limpo).
        -   **Código:** `Source Code Pro` (Monoespaçada, para trechos de código).
-   **Ícones:** **Lucide React**.
-   **Gráficos e Visualização:** **Recharts** para gráficos de pizza e barras.
-   **Inteligência Artificial:** **Google Genkit** para orquestrar chamadas ao **Google Gemini AI**, utilizado em análises, diagnósticos e geração de relatórios.
-   **Gestão de Estado:** **React Context API** (`src/contexts/auth-context.tsx`) para o gerenciamento de estado de autenticação global.
-   **Armazenamento de Dados (Protótipo):** **LocalStorage** do navegador para persistência de dados (visitas, frotas, usuários, sessão), permitindo funcionamento offline.
-   **Formulários:** **React Hook Form** com **Zod** para validação de schemas.
-   **Exportação de Dados:**
    -   **Excel:** `xlsx`.
    -   **PDF:** `jspdf` e `html2canvas`.

---

## 3. Arquitetura e Estrutura de Arquivos

A estrutura do projeto é organizada para promover a escalabilidade e a manutenção.

```
/
├── public/                 # Arquivos estáticos
│   ├── icon.svg            # Ícone principal do PWA
│   ├── manifest.json       # Manifesto do PWA para instalação
│   └── sw.js               # Service Worker para funcionalidades PWA
├── src/
│   ├── app/                # Rotas e páginas do Next.js App Router
│   │   ├── (main)/         # (Ignorado) Grupo de rotas principal
│   │   │   └── page.tsx    # Página principal (Home)
│   │   ├── globals.css     # Estilos globais e variáveis de tema do ShadCN
│   │   ├── layout.tsx      # Layout raiz da aplicação
│   │   └── actions.ts      # Server Actions para comunicação com a IA
│   ├── components/         # Componentes React reutilizáveis
│   │   ├── auth/           # Diálogos de autenticação e gestão de usuários
│   │   ├── tabs/           # Componentes principais de cada aba da dashboard
│   │   ├── ui/             # Componentes base do ShadCN (Button, Card, etc.)
│   │   └── *.tsx           # Componentes gerais (Header, Dashboard, etc.)
│   ├── contexts/           # Contextos React para gestão de estado
│   │   └── auth-context.tsx # Contexto de autenticação e sessão do usuário
│   ├── hooks/              # Hooks customizados
│   │   ├── use-online-status.ts # Detecta se o app está online/offline
│   │   └── use-toast.ts    # Sistema de notificações (toasts)
│   ├── lib/                # Lógica de negócio, tipos e utilitários
│   │   ├── data-manager.ts # Funções para interagir com o LocalStorage
│   │   ├── data.ts         # Dados iniciais de exemplo (mock)
│   │   ├── types.ts        # Definições de tipos TypeScript globais
│   │   └── utils.ts        # Funções utilitárias (ex: cn para Tailwind)
│   └── ai/                 # Configuração e fluxos de IA com Genkit
│       ├── flows/          # Definição dos fluxos de IA
│       └── genkit.ts       # Configuração do cliente Genkit e do modelo Gemini
├── next.config.ts          # Configuração do Next.js
└── tailwind.config.ts      # Configuração do Tailwind CSS
```

---

## 4. Funcionalidades Detalhadas

### 4.1. Aba "Monitor" (Dashboard Principal)

-   **Componente Principal:** `src/components/tabs/time-monitor.tsx`
-   **Descrição:** A tela "Monitor" é o coração do Carretômetro, um dashboard dinâmico projetado para oferecer uma visão completa e em tempo real do status da oficina. Ela combina métricas de desempenho, listas de veículos, gráficos e filtros interativos para permitir que os gerentes de frota identifiquem gargalos e acompanhem o progresso. A tela é atualizada automaticamente a cada 1.5 segundos para refletir o andamento das operações.

-   **Filtros e Controles:**
    -   **Filtro por Data de Chegada:** Utiliza um componente `Popover` com um `Calendar` para selecionar um dia específico.
        -   **Com data selecionada:** Filtra todos os dados da tela para mostrar apenas veículos que chegaram naquela data.
        -   **Sem data selecionada (padrão):** As métricas de veículos *ativos* refletem todos os veículos atualmente na oficina (independente da data de chegada), enquanto as métricas de veículos *finalizados* consideram as últimas 24 horas.
    -   **Filtro por Oficina:** Um menu suspenso (`Select`) permite filtrar todos os dados da tela para uma oficina específica (`Monte Líbano`, `Vale das Carretas`, `CMC`) ou visualizar todas ("Todas as Oficinas").

-   **Layout Principal (Grid de 2 Colunas em telas grandes):**
    -   **Coluna Esquerda (Conteúdo Principal):**
        -   **Card "Métricas de Desempenho (Veículos Ativos)":**
            -   Exibe quatro `MetricCard`s principais, cada um com um ícone, título, o tempo médio atual e a contagem de veículos nesse estado.
            -   **Tempo em Fila:** Média de tempo que os veículos estão aguardando para iniciar a manutenção (status 'Em Fila').
            -   **Manut. Corretiva:** Média de tempo dos veículos em manutenção do tipo "Corretiva".
            -   **Manut. Preventiva:** Média de tempo dos veículos em manutenção de outros tipos (Preventiva, Preditiva, etc.).
            -   **Aguardando Peças:** Média de tempo dos veículos parados por falta de peças (status 'Aguardando Peça').
            -   **Cálculo do Tempo Médio (Ativo):** Para cada métrica, o tempo é um cronômetro contínuo. A fórmula é `(Data/Hora Atual - Timestamp de Início do Status)`. O `Timestamp de Início` varia: `arrivalTimestamp` para 'Em Fila', `maintenanceStartTimestamp` para 'Em Manutenção', etc. O tempo médio é a soma de todas as durações individuais dividida pelo número de veículos naquele estado.
            -   **Metas (SLA):** Cada card possui uma barra de progresso (`Progress`) que compara o tempo médio atual com uma meta pré-definida (SLA), ficando vermelha se a meta for ultrapassada. O cálculo é `(tempoMedioEmSegundos / metaEmSegundos) * 100`.
        -   **Card "Métricas de Visitas Finalizadas por Tipo de Ordem":**
            -   Apresenta uma `Table` que detalha o desempenho por tipo de ordem para as visitas concluídas no período filtrado.
            -   **Colunas:** Tipo de Ordem, Nº de Visitas, T. Médio Fila, T. Médio Manut.
            -   **Cálculos dos Tempos Médios (Finalizado):**
                -   *T. Médio Fila:* `(maintenanceStartTimestamp - arrivalTimestamp)` para cada visita, depois a média do total.
                -   *T. Médio Manut.:* `(finishTimestamp - maintenanceStartTimestamp)` para cada visita, depois a média do total.
            -   Permite uma análise precisa da eficiência de cada tipo de serviço, mostrando gargalos no tempo de fila ou de manutenção para ordens específicas.

    -   **Coluna Direita (Visão Geral):**
        -   **Card "Visão Geral da Operação":**
            -   Mostra um `MetricCard` com o número total de veículos finalizados no período (dia selecionado ou últimas 24h).
            -   Clicar neste card abre o `FinalizedVisitsDialog` com uma lista detalhada dos veículos finalizados correspondentes.
        -   **Gráfico de Pizza (`MaintenanceTypeChart`):**
            -   Exibe a distribuição percentual das ordens de serviço finalizadas por tipo. Utiliza a biblioteca `Recharts` e é carregado dinamicamente (`next/dynamic`) para otimizar o desempenho inicial da página.
        -   **Card "Veículos em Operação":**
            -   Lista todos os veículos ativos, agrupados por status (`Em Fila`, `Em Manutenção`, `Aguardando Peça`).
            -   Cada veículo listado mostra seu ID, placa, tipo de ordem e um cronômetro (`TimerDisplay`) em tempo real, indicando há quanto tempo ele está naquele status específico.

-   **Seção de Inteligência Artificial (`ProactiveAiSection`):**
    -   Localizada na parte inferior da tela, esta seção permite ao usuário selecionar um veículo da frota (filtrada pela oficina selecionada) e usar a IA para gerar sugestões de manutenção proativa com base no histórico de dados.

### 4.2. Cadastro e Edição de Visitas

-   **Componentes:** `new-visit-form.tsx`, `edit-visit-form.tsx`
-   **Cadastro (Nova Visita):**
    -   Formulário validado com Zod e React Hook Form.
    -   **Preenchimento Automático:** Ao digitar o ID de uma frota existente, os campos de placa e transportadora são preenchidos automaticamente.
    -   **Seleção de Ordem:** O tipo de ordem é selecionado através de um `DropdownMenu` que permite múltiplas seleções (`DropdownMenuCheckboxItem`).
    -   Permite anexar uma foto do veículo, com pré-visualização no formulário.
    -   Os dados são salvos no LocalStorage via `data-manager.ts`.
-   **Edição (Atualizar Serviço):**
    -   Permite atualizar o status da visita (`Em Fila`, `Em Manutenção`, etc.), o box, a oficina e outros detalhes.
    -   **Múltiplas Atividades:** Suporta o registro de múltiplas ordens de serviço em uma única visita. Ao marcar o status como "Movimentação", o serviço atual é salvo no histórico da visita (`serviceHistory`), e os campos são limpos para a próxima tarefa.
    -   Registra timestamps importantes (início da manutenção, aguardo de peça, finalização) automaticamente.
    -   Permite anexar ou alterar a foto do veículo.

### 4.3. Listagem e Histórico

-   **Componentes:** `visits-list.tsx`, `fleets-list.tsx`, `fleet-history.tsx`
-   **Lista de Visitas:**
    -   Exibe todas as visitas em uma tabela.
    -   Permite filtrar por status, tipo de ordem e oficina.
    -   Permite ordenar a tabela por qualquer coluna.
    -   Ao clicar em uma visita, abre o `VisitDetailsDialog` com todas as informações.
-   **Lista de Frotas:**
    -   Exibe todos os veículos cadastrados em formato de cards.
    -   Mostra estatísticas rápidas: total de visitas e data da última visita.
    -   Permite buscar frotas por ID, placa ou transportadora.
-   **Histórico da Frota:**
    -   Tela dedicada que mostra todas as visitas passadas de um veículo específico.
    -   **Análise com IA:** Possui um botão para invocar o fluxo `fleet-analysis-flow.ts`, que gera uma análise textual do histórico de manutenção do veículo.

### 4.4. Integração com Inteligência Artificial (Genkit)

O app utiliza Genkit para orquestrar chamadas à API do Gemini, trazendo inteligência para várias partes do fluxo.

-   **Server Actions (`app/actions.ts`):** Fazem a ponte entre os componentes React (cliente) e os fluxos Genkit (servidor).
-   **Fluxos de IA (`ai/flows/`):**
    -   **`diagnose-visit-flow.ts` (Não utilizado diretamente na UI, mas disponível):** Pode analisar notas e uma foto para sugerir o tipo de ordem, peça e serviço.
    -   **`generate-report-flow.ts`:** Analisa um conjunto de visitas (filtradas pelo usuário) e gera um relatório estruturado em JSON com título, resumo, métricas chave e insights acionáveis.
    -   **`fleet-analysis-flow.ts`:** Analisa o histórico JSON de um único veículo e retorna uma análise detalhada em texto.
    -   **`proactive-maintenance-suggestions.ts`:** Usa o histórico de um veículo e de veículos similares para sugerir manutenções futuras e evitar falhas.
    -   **`fleet-chat-flow.ts`:** Implementa um chatbot que responde perguntas sobre o histórico de manutenção de um veículo específico, usando o histórico como única fonte de conhecimento.

### 4.5. Autenticação e Gestão de Usuários

-   **Contexto:** `src/contexts/auth-context.tsx` gerencia o estado de autenticação.
-   **Armazenamento:** A sessão do usuário e a lista de usuários são salvas no LocalStorage, com uma senha de administrador "hard-coded" para fins de protótipo.
-   **Papéis (Roles):**
    -   `SUPER_ADMIN`: Pode gerenciar outros usuários.
    -   `EDITOR`: Pode criar e editar dados.
    -   `VIEWER`: Pode apenas visualizar.
-   **Funcionalidades:**
    -   Login (`LoginDialog`) e Logout.
    -   Cadastro de novos usuários (`RegisterUserDialog`), padrão como `EDITOR`.
    -   Painel de gerenciamento de usuários (`ManageUsersDialog`) para o `SUPER_ADMIN`, permitindo:
        -   Editar o papel e o status (Ativo/Bloqueado) de outros usuários (`EditUserDialog`).
        -   Remover usuários.
        -   Aprovar ou negar solicitações de redefinição de senha.
    -   Fluxo de "Esqueci minha senha" (`ForgotPasswordDialog`) que cria uma solicitação pendente para aprovação do admin.

### 4.6. Progressive Web App (PWA)

-   **Arquivos:** `public/manifest.json`, `public/sw.js`, `public/icon.svg`.
-   **Manifest:** Define o nome do app ("Carretômetro"), cores do tema, e ícones, permitindo que seja adicionado à tela inicial.
-   **Service Worker:** Um `sw.js` básico que permite ao navegador registrar o app para funcionalidades PWA, como a instalação.
-   **Instalável:** O app pode ser instalado em dispositivos móveis (Android e iOS via "Adicionar à Tela de Início") e desktops, funcionando como um aplicativo nativo.

### 4.7. Exportação de Dados

-   **Componente:** `src/components/export-dialog.tsx`
-   **Funcionalidades:**
    -   **Exportar para Excel:** Permite filtrar as visitas por período, tipo de ordem, oficina ou frota e exportar os dados filtrados para um arquivo `.xlsx`.
    -   **Gerar Relatório com IA:** Usa os mesmos filtros para enviar os dados ao fluxo `generate-report-flow`, que retorna um relatório analítico. O resultado é exibido no `ReportDisplayDialog`.
    -   **Exportar para PDF:** O relatório gerado pela IA pode ser baixado como um arquivo PDF, que captura uma imagem da tela do relatório.

---

## 5. Como Replicar e Rodar o Projeto

1.  **Pré-requisitos:**
    -   Node.js (v18 ou superior)
    -   `npm` ou `yarn`

2.  **Instalação:**
    -   Clone o repositório.
    -   Execute `npm install` para instalar todas as dependências.

3.  **Configuração do Ambiente:**
    -   Crie um arquivo `.env` na raiz do projeto.
    -   Para usar as funcionalidades de IA, você precisará de uma chave de API do Google AI Studio. Adicione-a ao arquivo `.env`:
        ```
        GOOGLE_API_KEY=SUA_CHAVE_DE_API_AQUI
        ```

4.  **Rodando em Desenvolvimento:**
    -   Execute `npm run dev` para iniciar o servidor de desenvolvimento do Next.js.
    -   Acesse `http://localhost:9002` no seu navegador.

5.  **Build de Produção:**
    -   Execute `npm run build` para criar uma versão otimizada do aplicativo para produção.
    -   Execute `npm run start` para servir a versão de produção.
