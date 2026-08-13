UPDATE scheduledMessages
SET message='Olá {nome}, sua apólice completa mais um ano. Este é um ótimo momento para analisarmos se sua proteção ainda acompanha suas necessidades. Entre em contato conosco ou agende uma reunião diretamente aqui: {agenda}. Estamos à sua disposição para revisar sua apólice.'
WHERE occasion='policy_anniversary'
  AND message='Olá {nome}, sua apólice completa mais um ano. É um ótimo momento para revisarmos sua proteção. Escolha o melhor horário em nossa agenda: {agenda}';
