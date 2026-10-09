# Contatos WhatsApp dos afiliados

O portal aprovado de afiliados oferece `/afiliados/whatsapp`. Após aceitar o compartilhamento e escanear o QR Code, a página lê contatos disponíveis e participantes dos grupos, copia os números resolvidos para a lista dos administradores e baixa automaticamente um CSV. Nomes disponíveis são preservados; números sem identidade resolvida não são inventados. A página deve permanecer aberta durante a importação.

Os administradores acessam `/admin/contatos-whatsapp-afiliados`, com busca, filtro por afiliado e exportação. Cada registro inclui afiliado, telefone, nome disponível, grupos e origem WhatsApp. A chave `(affiliateId, phone)` elimina duplicatas dentro de cada afiliado. A lista não oferece exclusão; não existem rotas de edição ou exclusão para afiliados ou administradores.

As tabelas D1 `affiliateWhatsappLeads` e `affiliateWhatsappImports` guardam os registros e o progresso resumível. Sessões temporárias do bridge usam uma identidade derivada do ID autenticado do afiliado, isolada das sessões dos agentes. Essas sessões só podem conectar, consultar estado, ler contatos e desconectar: acesso a mensagens, histórico, anexos e envio é bloqueado. O aparelho é desconectado ao concluir; sessões abandonadas expiram após 15 minutos sem atividade e não são restauradas no boot.

O menu dos agentes é definido por `public/agent-unified-menu.js`, injetado nas páginas HTML de agentes pelo Worker principal e pelo portal WhatsApp. O componente React antigo deixa de renderizar quando o menu comum está pronto. O normalizador de rótulos do CRM mantém mutações idempotentes para evitar travar a página.

Verificação: `affiliate-whatsapp.test.mjs` cobre consentimento, atribuição, isolamento, exportação e bloqueio de exclusão. `affiliate-whatsapp-browser.mjs` cobre QR simulado, importação automática, download, lista administrativa e menu responsivo. Os testes do bridge cobrem isolamento e bloqueio de envio. O QR de um afiliado real ainda requer participação do titular; testes simulados não comprovam esse pareamento.
