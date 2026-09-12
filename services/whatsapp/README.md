# WhatsApp de teste da Affinity

Serviço próprio, sem intermediário pago, usando a biblioteca aberta whatsapp-web.js (Apache-2.0). A biblioteca automatiza o WhatsApp Web; esta conexão não é a API oficial. Versão inicial: QR, mensagens individuais de texto, conversas por agente, histórico SQLite e confirmação de entrega/leitura. Não envia campanhas nem importa automaticamente todo o histórico antigo. Anexos são sinalizados, mas continuam no celular.

## Executar

Node >=22.13, Chrome/Chromium e armazenamento persistente são necessários. Instale com `npm ci` nesta pasta. Configure `.env` com:

```
WHATSAPP_BRIDGE_SECRET=<segredo aleatório de pelo menos 32 caracteres>
CHROME_PATH=/caminho/para/chrome
WHATSAPP_DATA_DIR=./data
WHATSAPP_MAX_SESSIONS=1
HOST=127.0.0.1
PORT=3088
```

Inicie com `npm start`. Não desative o sandbox do navegador. Para vários agentes, cada sessão usa um processo de navegador; dimensione a memória antes de aumentar o limite. Reiniciar o serviço mantém histórico e credenciais locais; clique em conectar no portal para restaurar a sessão. Desconectar revoga o aparelho, preservando o histórico.

## Ligar ao portal

Disponibilize este serviço em um servidor próprio com HTTPS e disco persistente. O Worker precisa das configurações `WHATSAPP_BRIDGE_URL` e do mesmo segredo `WHATSAPP_BRIDGE_SECRET`, armazenado como secret (nunca no Git). A página é `/agentes/whatsapp`. O segredo e os tickets não são enviados ao navegador. A identidade vem da sessão autenticada do portal, com aprovação e função agente verificadas a cada chamada.

Nenhum servidor foi contratado ou configurado por estes arquivos. Sem essa hospedagem, a tela informa que a conexão ainda precisa ser ativada. O histórico está no serviço, separado por agente; ainda não é copiado para crmActivities nem associado automaticamente à ficha de cada cliente.

## Verificação

`npm test` cobre assinatura, expiração, isolamento de identidade e acesso ao proxy. Validar leitura de QR, envio e recebimento reais exige o número de teste do usuário. Credenciais e banco em `data/` estão excluídos do Git; proteja o disco e os backups do servidor.
