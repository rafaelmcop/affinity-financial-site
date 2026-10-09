# Conversas arquivadas, grupos e leads do WhatsApp

No portal WhatsApp, o seletor Tipo de conversa oferece Conversas, Arquivadas, Grupos e Todas. A listagem consulta o WhatsApp conectado, incluindo conversas sem mensagens previamente salvas no Mac. Abrir uma conversa reconcilia seu histórico recente e anexos.

A aba CRM → Leads do WhatsApp está em `/agentes/crm/whatsapp`. O agente escolhe um grupo e importa seus participantes. A origem é WhatsApp, com identificação dos grupos. Os registros ficam isolados por agente; o mesmo telefone não é duplicado em novas importações ou em grupos diferentes. Telefones indisponíveis são contabilizados, sem inventar números a partir de identificadores LID. A operação não envia mensagens.

Etapas iniciais solicitadas: Importados, 1ª chamada, 2ª chamada, Interesse, Reunião agendada, Follow-up, Aplicação, Aplicado, Emitida, Recusada, Sem interesse e Já tem seguro. Etapas configuráveis por agente. A tela filtra etapa, grupo e nome/telefone, permite atualizar cada lead e exportar a lista filtrada em CSV.

As tabelas D1 `whatsappLeads`, `whatsappLeadGroups` e `whatsappLeadStages` são criadas de forma aditiva. Os clientes existentes permanecem nas tabelas originais. A importação insere em lotes de 20 contatos, mantendo as consultas abaixo de 100 parâmetros. Grupos grandes são preparados em segundo plano no bridge; a tela acompanha o resultado. Após recarregar a página, o agente pode repetir a importação sem duplicar leads.

Validação: testes de isolamento, rejeição de ações inválidas, preservação das etapas em uso, deduplicação e importação pendente; navegador Chrome com CRM em memória e contatos fictícios para importação, filtros, etapas e CSV. Verificação do portal autenticado: 31 conversas arquivadas, 31 grupos, histórico de uma arquivada; leitura de 751 participantes de um grupo real com todos os telefones disponíveis, sem inserir dados reais no CRM. Downloads reais de áudio e imagem pelo portal; testes de mídia em ambiente isolado incluem vídeo, PDF, emojis e gravação com microfone fictício. Envios reais permanecem bloqueados.
