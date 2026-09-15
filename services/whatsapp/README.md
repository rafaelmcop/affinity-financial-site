# WhatsApp de teste da Affinity

Serviço próprio, sem intermediário pago, usando a biblioteca aberta whatsapp-web.js (Apache-2.0). A biblioteca automatiza o WhatsApp Web; esta conexão não é a API oficial. Versão inicial: QR, mensagens individuais de texto, conversas por agente, histórico SQLite e confirmação de entrega/leitura. Não envia campanhas nem importa automaticamente todo o histórico antigo. Anexos são sinalizados, mas continuam no celular.

## Executar

### Teste local no Mac

Com as dependências instaladas, execute `npm run test:local` nesta pasta. Abra o link de acesso impresso pelo inicializador no navegador e clique em **Conectar número de teste**. No celular, use **Aparelhos conectados → Conectar aparelho** para ler o QR code. O link inicial é de uso único; mantenha a aba aberta. Para novo acesso, reinicie o inicializador.

O inicializador usa somente `127.0.0.1`, cria credenciais temporárias automaticamente e mantém sessões e histórico em `data/`, fora do Git. Não expõe o computador à internet e não ativa a integração do site público. O computador e o processo precisam continuar ligados durante o teste. Encerre com Ctrl+C. Por ser uma integração não oficial, há risco de bloqueio do número; use somente o número separado de teste.

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

### Beta conectado ao portal neste Mac

O túnel `affinity-whatsapp-beta` encaminha somente a API autenticada em `127.0.0.1:3088`. A interface de teste em `60713` não é publicada pelo túnel. A chave privada e a configuração local ficam em `data/`, excluídas do Git; o Worker guarda a mesma chave como secret. Não compartilhe esses arquivos.

Após reiniciar o computador, execute `node services/whatsapp/beta.mjs` a partir do repositório, usando Node 22.13 ou superior, e mantenha o processo aberto. Não execute uma segunda cópia enquanto o Beta estiver rodando. O limite inicial é de três sessões simultâneas; não há garantia de disponibilidade quando o Mac dorme, desliga ou perde internet. O agente conecta seu próprio número em `/agentes/whatsapp`.

O diretório de clientes/leads é lido pelo Worker usando a identidade autenticada do agente. A interface local isolada não recebe dados do CRM de produção. Telefones ambíguos não recebem nome automaticamente.

`npm test` cobre assinatura, expiração, isolamento de identidade e acesso ao proxy. Validar leitura de QR, envio e recebimento reais exige o número de teste do usuário. Credenciais e banco em `data/` estão excluídos do Git; proteja o disco e os backups do servidor.
