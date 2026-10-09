# Backend persistente no Mac

Base instalada: `~/Library/Application Support/AffinityWhatsApp/`.
O checkout usa `agent/personalizar-mensagens-agentes`, a partir de
`22708b8efa16834a1ea21c245dd389ea5af72159`. O site atual continua no Cloudflare;
nenhum build histórico nem banco D1 é substituído.

## Processos e dados

Node 22, Chrome instalado e cloudflared executam o bridge apenas em
`127.0.0.1:3088`. `private/bridge.env` contém a configuração e a chave HMAC,
com permissão 0600. `private/data/history.sqlite` usa WAL; anexos ficam em
`private/data/media`, e credenciais do WhatsApp em `private/data/sessions`.
Não incluir esses arquivos em Git. A instalação começa vazia e não importa
dados do computador anterior. Conversas selecionadas podem reconciliar
mensagens disponíveis no próprio WhatsApp, conforme comportamento existente.

O túnel exclusivo `affinity-whatsapp-mac` publica
`https://whatsapp-bridge.affinityfc.org`. A rota DNS deixa de apontar para o
túnel antigo. Tickets HMAC de curta duração isolam cada agente; o segredo
correspondente é guardado no Worker `affinity-financial-staging`.
Somente a chave do Worker é atualizada; código, assets, D1, demais secrets,
rotas e agendamentos do site são preservados.

Os serviços launchd são `org.affinityfc.whatsapp.bridge`,
`org.affinityfc.whatsapp.tunnel` e `org.affinityfc.whatsapp.awake`.
LaunchAgents iniciam no login; para iniciar antes do login, instalar as
mesmas configurações como LaunchDaemons com `UserName` do usuário do Mac.
Não manter os dois tipos ativos simultaneamente. O serviço awake executa
`caffeinate -is`; o monitor pode apagar sem suspender o backend.
As sessões registradas em SQLite se reconectam após reiniciar o processo.
Uma falha de autenticação ainda pode exigir novo QR.

## Pareamento e envio

`node --env-file=/caminho/privado/bridge.env mac-pair.mjs` abre um painel
temporário em `127.0.0.1:60713`. Use o link de acesso único emitido pelo
processo. Informe o mesmo e-mail de agente usado no portal e leia o QR no
celular. A chave permanece no servidor; o painel não oferece envio.
Encerre o painel depois do pareamento. Ele não é publicado no túnel.

O bridge recusa `/send` por padrão. `WHATSAPP_SEND_ENABLED=true` exige
aprovação explícita do responsável antes de ser configurado. Reiniciar
o bridge após alterar essa configuração. Um teste real requer também
destinatário e conteúdo autorizados. Os testes automatizados usam dados
sintéticos e não comprovam entrega de mensagens reais.

## Verificação e operação

Executar `npm ci` e `npm test` nesta pasta. O teste de runtime verifica banco
vazio, bloqueio de envio, isolamento de anexos, ranges de áudio e persistência
após reiniciar o processo, sem abrir WhatsApp Web.

`GET /health` retorna o estado do processo; demais endpoints exigem ticket.
Logs ficam em `logs/`. Para reiniciar, use `launchctl kickstart -k` com
`gui/UID/LABEL` para LaunchAgent ou `system/LABEL` para LaunchDaemon.
Não reiniciar com outro processo manual simultâneo na mesma porta/banco.
Backups futuros devem incluir o banco de forma consistente (SQLite backup
ou bridge parado), anexos e credenciais, em destino protegido. A instalação
local não garante disponibilidade durante falhas de internet ou energia.
