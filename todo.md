# Affinity Financial Consulting Inc. - Project TODO

## Core Features
- [x] Hero Section with family images and CTAs (Calendly + WhatsApp)
- [x] Language Selector (PT/EN/ES) with persistent selection
- [x] Fixed Top Navigation with logo, menu, and language selector
- [x] Services Section (Seguro de Vida, Previdência Privada, Living Benefits)
- [x] Client Testimonials Carousel/Cards
- [x] About Us Section with mission and values
- [x] Contact Section with phone, address, email, WhatsApp, Calendly
- [x] Footer with Instagram, contact info, and navigation links
- [x] Floating WhatsApp Button (fixed on screen)

## Design & Styling
- [x] Black and Gold color palette implementation
- [x] Responsive design for mobile, tablet, desktop
- [x] Typography system with elegant fonts
- [x] Image optimization and placement
- [x] Smooth transitions and animations

## Internationalization (i18n)
- [x] Portuguese (Brazil) translations
- [x] English translations
- [x] Spanish translations
- [x] Language persistence in localStorage
- [x] Dynamic content switching based on language

## Integration & Functionality
- [x] Calendly embed/link integration
- [x] WhatsApp link integration (857-421-8325)
- [x] Instagram link (@affinity.fc)
- [x] Email link (info@affinityfc.org)
- [x] Address display (247 Washington St, Stoughton MA)
- [x] Form validation (optional feature - contact form not required for MVP)

## Testing & Optimization
- [x] Cross-browser testing
- [x] Mobile responsiveness testing
- [x] Language switching testing
- [x] Link functionality testing
- [x] Performance optimization
- [x] Typography system with elegant fonts (Playfair Display + Lato)
- [x] Dynamic WhatsApp messages per language

## Deployment
- [x] Final checkpoint creation
- [x] Site publication

## Melhorias Solicitadas
- [x] Aumentar significativamente o tamanho da logo (usar como referência visual mas não como padrão)
- [x] Logo maior na navegação superior
- [x] Logo maior no footer

## Ajustes de Logo
- [x] Remover logo de imagem
- [x] Exibir nome "Affinity Financial Consulting" como texto na navegação
- [x] Exibir nome "Affinity Financial Consulting" como texto no footer

## Área de Afiliados
- [x] Criar tabelas de banco de dados para afiliados e comissões
- [x] Implementar página de login/autenticação para afiliados
- [x] Criar dashboard de afiliados com links de referência
- [x] Adicionar relatórios de desempenho e conversões
- [x] Implementar material de marketing para download (links de cópia disponíveis)
- [x] Testar fluxo completo de login e acesso
- [x] Publicar área de afiliados

## Painel de Administração de Afiliados
- [x] Criar página de admin para gerenciar afiliados
- [x] Implementar formulário para criar novo afiliado
- [x] Adicionar lista de afiliados existentes
- [x] Implementar opção para ativar/desativar afiliados
- [x] Implementar opção para deletar afiliados
- [x] Adicionar proteção de acesso (apenas admin)

## Auto-Registro de Afiliados
- [x] Criar página de auto-registro para novos afiliados
- [x] Adicionar link "Criar Conta" na página de login
- [x] Implementar validação de email e senha
- [x] Alterar status de novo afiliado para "pendente" por padrão
- [x] Adicionar filtro no admin para afiliados pendentes
- [x] Implementar botão de aceitar/rejeitar no admin

## Sistema de Apólices
- [x] Criar tabela de apólices no banco de dados
- [x] Adicionar campos: número, cliente, data, status, pontos
- [x] Criar página para afiliado submeter apólices
- [x] Implementar tabela de apólices no dashboard do afiliado
- [x] Adicionar cálculo de pontos dos últimos 12 meses
- [x] Exibir soma de pontos em destaque no dashboard

## Próximos Passos - Fase 2

### 1. Submissão Real de Apólices
- [x] Criar mutation para submeter apólices
- [x] Validar campos de apólice (número, cliente, email, telefone)
- [x] Salvar apólice no banco de dados
- [x] Retornar confirmação ao afiliado
- [x] Atualizar tabela de apólices em tempo real

### 2. Dashboard de Admin Expandido
- [x] Adicionar gráficos de conversões por mês
- [x] Adicionar gráficos de comissões por afiliado
- [x] Adicionar tabela de apólices pendentes
- [x] Adicionar estatísticas gerais (total de afiliados, apólices, comissões)
- [x] Implementar filtros por período (últimos 7 dias, 30 dias, 90 dias)

### 3. Sistema de Notificações
- [x] Enviar email quando novo afiliado se registra
- [x] Enviar email quando afiliado é aprovado
- [x] Enviar email quando apólice é aprovada
- [x] Enviar email quando comissão é creditada
- [x] Implementar fila de emails com retry


## Sistema de Apólices com Sincronização Bidirecional

### Admin - Adicionar Apólices Manualmente
- [x] Criar formulário no painel admin para adicionar apólices (número, cliente, data, tipo, pontos)
- [x] Validar número de apólice único (não permitir duplicatas)
- [x] Salvar apólice no banco com status "aprovada"
- [x] Atualizar tabela de apólices em tempo real

### Afiliado - Submeter Apólices
- [x] Criar formulário melhorado com campos: número, cliente, data de submissão
- [x] Validar número de apólice único (não permitir duplicatas)
- [x] Salvar apólice com status "pendente"
- [x] Mostrar confirmação de submissão

### Admin - Aba de Verificação
- [x] Criar aba separada para "Apólices Pendentes"
- [x] Listar apólices com status "pendente" de todos os afiliados
- [x] Botão "Aceitar" - muda status para "aprovada"
- [x] Botão "Rejeitar" - muda status para "rejeitada"
- [x] Enviar notificação ao afiliado quando aceita/rejeita

### Sincronização Bidirecional
- [x] Quando admin aceita apólice, aparece no dashboard do afiliado
- [x] Quando afiliado submete, aparece na aba de verificação do admin
- [x] Validação de duplicatas em ambos os lados
- [x] Atualização em tempo real das tabelas


## Filtros e Pesquisa na Tabela de Apólices
- [x] Adicionar barra de pesquisa por número de apólice
- [x] Adicionar barra de pesquisa por nome do cliente
- [x] Adicionar filtro por status (pendente, aprovada, rejeitada)
- [x] Adicionar filtro por data de submissão (intervalo)
- [x] Implementar lógica de filtro combinado
- [x] Exibir contagem de resultados filtrados
- [x] Adicionar botão para limpar todos os filtros


## Melhorias de UX - Filtros, Recuperação de Senha e Links
- [x] Completar barra de pesquisa e filtros na tabela de apólices
- [x] Adicionar link "Esqueceu a senha?" no login de afiliados
- [x] Adicionar link "Esqueceu a senha?" no login de admin
- [x] Adicionar link "Voltar ao Site" nos formulários de login de afiliados
- [x] Adicionar link "Voltar ao Site" nos formulários de login de admin
- [x] Criar aba no admin para gerenciar afiliados pendentes (aceitar/recusar)
- [x] Implementar notificação quando afiliado é aceito/recusado


## Fase Final - Correções e Melhorias
- [x] Corrigir erro de React Hooks no AdminDashboard (Rules of Hooks)
- [x] Implementar aba de gerenciamento de afiliados com tabela completa
- [x] Adicionar funções de notificação para rejeição de afiliados
- [x] Adicionar funções de notificação para rejeição de apólices
- [x] Integrar notificações nos fluxos de aprovação e rejeição
- [x] Implementar modal de recuperação de senha no AdminLogin
- [x] Implementar modal de recuperação de senha no AffiliateLogin
- [x] Testar todas as funcionalidades do sistema
