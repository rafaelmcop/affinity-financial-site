# Affinity Mobile — primeira versão de teste

Aplicativo Expo/React Native para iPhone e Android. O protótipo usa o portal autenticado em uma WebView com navegação nativa, mantendo as permissões e o banco do CRM. Não é um novo backend nem uma cópia dos leads no aparelho.

## Perfis

- Agente: fila, resultado obrigatório antes de avançar, contatos e configurações.
- Admin: central de leads e portal administrativo, com distribuição existente.
- Afiliado: portal, prioridades e integração com WhatsApp. Não recebe autorização de agente apenas por selecionar outro perfil.

O usuário faz login com sua conta existente no portal. Senhas e cookies não são lidos pelo código nativo nem registrados em logs. A seleção de perfil é apenas navegação; o servidor valida cada acesso.

## Chamadas e mensagens

A fila apresenta Ligar e Abrir WhatsApp. A ligação exige uma ação do usuário. O WhatsApp abre uma conversa ou um rascunho editável; não há envio automático. Os modelos após a chamada ficam no portal da fila: não atendeu, agradecimento, disponibilidade futura, follow-up e confirmação de horário. O horário é escolhido no formulário e precisa ser revisto antes de abrir o WhatsApp.

## Desenvolvimento e teste

```sh
npm ci
npm start
npm run typecheck
npm run lint
npm test
npm run export:native
```

Para testar em um aparelho, usar Expo Go compatível com SDK 57 e o QR do servidor de desenvolvimento, na mesma rede do Mac. No iPhone físico, SDK 57 exige login na mesma conta Expo no CLI do Mac e no Expo Go: executar `npx expo login --browser` no Mac e entrar nessa mesma conta pelo ícone de perfil do Expo Go. Sem isso o QR pode mostrar “There was a problem running the requested project”. Se a versão do Expo Go instalada não suportar SDK 57, usar um development build compatível. Abrir o app e autenticar os três perfis autorizados, ligar para um número de teste, revisar rascunhos e registrar o resultado. Não executar chamadas ou mensagens reais sem autorização.

A exportação Metro comprova empacotamento JavaScript para as duas plataformas; não é um IPA/APK assinado nem validação em aparelho físico.

## Distribuição futura

Os perfis EAS estão preparados em eas.json. A conta Expo precisa ser vinculada antes de builds em nuvem. Bundle/package provisórios: org.affinityfc.mobile. Confirmar disponibilidade antes da primeira publicação. TestFlight e App Store exigem conta Apple Developer; Google Play exige Play Console. Nenhuma conta foi criada, compra efetuada ou submissão realizada nesta etapa.

## Próximas funções

A base separa navegação, perfis e tratamento de links para facilitar a evolução. Futuras telas nativas e notificações podem reaproveitar as regras do CRM mediante APIs autenticadas específicas. A primeira versão depende de internet e ainda precisa de validação de cookies, retorno após chamada, QR e anexos em aparelhos físicos.

## Validação desta etapa

TypeScript, ESLint, testes de navegação/links e 21 verificações do Expo Doctor passaram. Metro exportou os pacotes iOS e Android. O teste isolado do portal validou rascunhos, horário obrigatório, invalidação após mudar o horário e registro do resultado sem mensagens reais.

A auditoria npm da base Expo reporta dependências transitivas com avisos (incluindo ferramentas Metro, certificados e análise de padrões). Não aplicar `npm audit fix --force`, que sugere trocar a versão do SDK por versões incompatíveis. Reavaliar os avisos e atualizações compatíveis antes da distribuição de builds assinados. Esta entrega é um protótipo de desenvolvimento.
