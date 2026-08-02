import nodemailer from 'nodemailer';

// Configure your email service here
// For production, use environment variables for credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'your-app-password',
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'info@affinityfc.org',
      ...options,
    });
    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${options.to}:`, error);
    return false;
  }
}

// Email Templates
export async function sendAffiliateRegistrationEmail(email: string, name: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Bem-vindo à Affinity Financial!</h2>
      <p>Olá ${name},</p>
      <p>Obrigado por se registrar como afiliado. Sua conta foi criada com sucesso!</p>
      <p><strong>Status:</strong> Pendente de aprovação</p>
      <p>Você receberá um email de confirmação assim que sua conta for aprovada pelo nosso time de administração.</p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Bem-vindo à Affinity Financial - Registro de Afiliado',
    html,
  });
}

export async function sendAffiliateApprovalEmail(email: string, name: string, affiliateCode: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Sua Conta foi Aprovada! 🎉</h2>
      <p>Olá ${name},</p>
      <p>Parabéns! Sua conta de afiliado foi aprovada e está pronta para uso.</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
        <p><strong>Seu Código de Afiliado:</strong></p>
        <p style="font-size: 18px; font-weight: bold; color: #d4af37;">${affiliateCode}</p>
        <p style="font-size: 12px; color: #666;">Use este código para rastrear suas referências e comissões.</p>
      </div>
      <p><a href="https://affinityfin-rgyosgch.manus.space/afiliados" style="background-color: #d4af37; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Dashboard</a></p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Conta Aprovada - Bem-vindo ao Programa de Afiliados!',
    html,
  });
}

export async function sendPolicyApprovalEmail(email: string, clientName: string, policyNumber: string, points: number): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Apólice Aprovada! ✓</h2>
      <p>Olá,</p>
      <p>A apólice foi aprovada com sucesso!</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
        <p><strong>Número da Apólice:</strong> ${policyNumber}</p>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Pontos Ganhos:</strong> <span style="color: #d4af37; font-weight: bold;">${points}</span></p>
      </div>
      <p>Você pode acompanhar todas as suas apólices no seu dashboard.</p>
      <p><a href="https://affinityfin-rgyosgch.manus.space/afiliados/dashboard" style="background-color: #d4af37; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Dashboard</a></p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Apólice Aprovada - Parabéns!',
    html,
  });
}

export async function sendCommissionCreditEmail(email: string, name: string, amount: number, policyNumber: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Comissão Creditada! 💰</h2>
      <p>Olá ${name},</p>
      <p>Uma comissão foi creditada em sua conta!</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
        <p><strong>Valor da Comissão:</strong> <span style="font-size: 18px; font-weight: bold; color: #d4af37;">$${amount.toFixed(2)}</span></p>
        <p><strong>Apólice:</strong> ${policyNumber}</p>
      </div>
      <p>Acesse seu dashboard para ver o histórico completo de comissões.</p>
      <p><a href="https://affinityfin-rgyosgch.manus.space/afiliados/dashboard" style="background-color: #d4af37; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Dashboard</a></p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Comissão Creditada - Parabéns!',
    html,
  });
}

export async function sendAdminNotificationEmail(policyNumber: string, clientName: string, affiliateName: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('[Email] ADMIN_EMAIL is not configured');
    return false;
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Nova Apólice Pendente de Aprovação</h2>
      <p>Uma nova apólice foi submetida e aguarda sua revisão.</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
        <p><strong>Número da Apólice:</strong> ${policyNumber}</p>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Afiliado:</strong> ${affiliateName}</p>
      </div>
      <p><a href="https://affinityfin-rgyosgch.manus.space/admin/dashboard" style="background-color: #d4af37; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Revisar no Admin</a></p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.
      </p>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `Nova Apólice Pendente: ${policyNumber}`,
    html,
  });
}

export async function sendAffiliateRejectionEmail(email: string, name: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Atualização sobre sua Solicitação</h2>
      <p>Olá ${name},</p>
      <p>Infelizmente, sua solicitação para se tornar afiliado foi rejeitada neste momento.</p>
      <p>Se você tiver dúvidas ou gostaria de mais informações, entre em contato conosco:</p>
      <p>
        <strong>Email:</strong> info@affinityfc.org<br>
        <strong>Telefone:</strong> (857) 421-8325
      </p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Atualização sobre sua Solicitação de Afiliado',
    html,
  });
}

export async function sendPolicyRejectionEmail(email: string, clientName: string, policyNumber: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Apólice Rejeitada</h2>
      <p>Olá,</p>
      <p>A apólice foi rejeitada e não será processada neste momento.</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
        <p><strong>Número da Apólice:</strong> ${policyNumber}</p>
        <p><strong>Cliente:</strong> ${clientName}</p>
      </div>
      <p>Entre em contato com nosso suporte para mais informações:</p>
      <p>
        <strong>Email:</strong> info@affinityfc.org<br>
        <strong>Telefone:</strong> (857) 421-8325
      </p>
      <p><a href="https://affinityfin-rgyosgch.manus.space/afiliados/dashboard" style="background-color: #d4af37; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Dashboard</a></p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Apólice Rejeitada',
    html,
  });
}


export async function sendPasswordResetEmail(email: string, name: string, resetLink: string, userType: 'admin' | 'affiliate'): Promise<boolean> {
  const userTypeLabel = userType === 'admin' ? 'Administrador' : 'Afiliado';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37;">Recuperação de Senha - ${userTypeLabel}</h2>
      <p>Olá ${name},</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Se você não fez essa solicitação, ignore este email.</p>
      <p>Para redefinir sua senha, clique no link abaixo:</p>
      <p style="margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #d4af37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Redefinir Senha
        </a>
      </p>
      <p style="color: #666; font-size: 12px;">
        Este link expira em 1 hora. Se o link expirou, solicite um novo reset de senha.
      </p>
      <p style="color: #666; font-size: 12px;">
        Se você tiver problemas, entre em contato conosco:<br>
        <strong>Email:</strong> info@affinityfc.org<br>
        <strong>Telefone:</strong> (857) 421-8325
      </p>
      <hr style="border: none; border-top: 1px solid #d4af37; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Affinity Financial Consulting Inc.<br>
        247 Washington St, Stoughton, MA<br>
        (857) 421-8325
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Recuperação de Senha - ${userTypeLabel}`,
    html,
  });
}
