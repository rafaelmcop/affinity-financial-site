-- Preserve Rafael's writing while making the signature reusable by every agent.
UPDATE scheduledMessages
SET message=replace(replace(message, '857-421-8325', '{agente_telefone}'), 'Rafael Moreno Cunha', '{agente_nome}')
WHERE lower(agentEmail)='rafael.cunha@affinityfc.org' AND title IS NOT NULL;

UPDATE scheduledMessages SET message='Olá, {nome}! 💙 Seja bem-vindo(a) a fevereiro!

Fevereiro chega lembrando que, mesmo sendo o mês mais curto do ano, pode ser cheio de grandes oportunidades. Que seja um período leve, próspero e repleto de bons momentos para você e sua família.

E sempre que precisar de alguma orientação, revisar seus planos ou simplesmente conversar sobre seus objetivos, conte conosco.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente fevereiro para nós! ✨

{agente_nome}
Affinity Financial Consulting' WHERE lower(agentEmail)='rafael.cunha@affinityfc.org' AND occasion='monthly' AND monthNumber=2;

UPDATE scheduledMessages SET message=CASE monthNumber
WHEN 4 THEN 'Olá, {nome}! 🌷 Seja bem-vindo(a) a abril!

Abril chega trazendo renovação e a lembrança de que todo bom resultado começa com cuidado e planejamento. É um ótimo momento para rever prioridades e fortalecer a segurança de quem você ama.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de abril! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 5 THEN 'Olá, {nome}! 💐 Seja bem-vindo(a) a maio!

Maio é um mês que nos convida a valorizar a família, o cuidado e tudo aquilo que construímos juntos. Que seja um período acolhedor, produtivo e cheio de motivos para celebrar.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de maio! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 6 THEN 'Olá, {nome}! ☀️ Seja bem-vindo(a) a junho!

Chegamos à metade do ano. Junho é uma boa oportunidade para reconhecer as conquistas até aqui, ajustar os planos e seguir com confiança em direção aos seus objetivos.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de junho! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 7 THEN 'Olá, {nome}! 🌞 Seja bem-vindo(a) a julho!

Julho traz a energia do verão, momentos em família e uma pausa importante para respirar. Que este mês seja leve, tranquilo e cheio de boas experiências, sem deixar de lado os planos para o futuro.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de julho! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 8 THEN 'Olá, {nome}! 🚀 Seja bem-vindo(a) a agosto!

Agosto chega como um convite para retomar o ritmo com coragem e determinação. Que seja um mês de progresso, boas decisões e novas possibilidades para você e sua família.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de agosto! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 9 THEN 'Olá, {nome}! 🍂 Seja bem-vindo(a) a setembro!

Setembro marca uma mudança de estação e nos lembra que renovar também faz parte de crescer. Que este mês traga equilíbrio, prosperidade e boas oportunidades para seus projetos.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de setembro! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 10 THEN 'Olá, {nome}! 🎃 Seja bem-vindo(a) a outubro!

Outubro chega com novas cores e a reta final do ano se aproximando. É um bom momento para revisar objetivos e garantir que seus planos continuam protegendo o que realmente importa.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de outubro! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 11 THEN 'Olá, {nome}! 🍁 Seja bem-vindo(a) a novembro!

Novembro é um mês de gratidão e reflexão. Que possamos reconhecer as conquistas, valorizar quem caminha ao nosso lado e preparar com tranquilidade os próximos passos.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de novembro! 💙

{agente_nome}
Affinity Financial Consulting'
WHEN 12 THEN 'Olá, {nome}! ✨ Seja bem-vindo(a) a dezembro!

Dezembro chega com celebrações, reencontros e a oportunidade de olhar com carinho para tudo que vivemos. Que seja um mês de paz, união e momentos especiais ao lado de quem você ama.

Se quiser revisar seus planos, esclarecer alguma dúvida ou simplesmente conversar sobre seus objetivos financeiros, estamos à disposição.

📞 {agente_telefone}
🌐 www.affinityfc.org

Um excelente mês de dezembro! 💙

{agente_nome}
Affinity Financial Consulting'
ELSE message END
WHERE lower(agentEmail)='rafael.cunha@affinityfc.org' AND occasion='monthly' AND monthNumber BETWEEN 4 AND 12;
