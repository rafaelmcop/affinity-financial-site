export function mailboxConnectionMessage(error,config={}){
 const detail=String(error instanceof Error?error.message:error||'');
 const microsoft=/outlook|office365/i.test(String(config.imapHost||'')+' '+String(config.host||''));
 if(microsoft&&/user is authenticated but not connected/i.test(detail))return 'O Outlook autenticou sua conta, mas não abriu a caixa de entrada por IMAP. No Outlook, vá a Configurações → Email → Encaminhamento e IMAP, ative “Permitir que dispositivos e aplicativos usem IMAP” e salve. Depois clique em verificar novamente. Em contas Microsoft 365, o administrador também pode precisar liberar o IMAP.';
 if(microsoft&&/auth|login|invalid_grant|token|credential/i.test(detail))return 'A Microsoft recusou o acesso à caixa de entrada. Reconecte em Entrar com Microsoft e confira se o IMAP está habilitado na conta. Em contas Microsoft 365, o administrador pode precisar liberar o serviço.';
 if(/timeout|timed out|ETIMEDOUT|ECONNRESET|unavailable/i.test(detail))return 'O provedor de e-mail não respondeu a tempo. Aguarde um momento e tente sincronizar novamente.';
 if(/auth|login|password|credential/i.test(detail))return 'O provedor recusou o acesso à caixa de entrada. Confira a conexão em Configurações → E-mail. Se usar senha de aplicativo, não informe a senha normal da conta.';
 return 'Não foi possível sincronizar sua caixa de e-mail. Confira a conexão em Configurações → E-mail e tente novamente.';
}
