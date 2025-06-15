import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  title: string;
  subtitle: string;
  message: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const secure = this.configService.get<boolean>('EMAIL_SECURE');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');

    // Log de configuración (sin mostrar la contraseña)
    this.logger.log(`Configurando email con host: ${host}, port: ${port}, secure: ${secure}, user: ${user}`);

    if (!host || !port || !user || !pass) {
      this.logger.error('Faltan variables de entorno para la configuración del email');
      throw new Error('Configuración de email incompleta');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Usar el servicio predefinido de Gmail
      auth: {
        user,
        pass,
      },
      debug: true, // Habilitar logs de debug
      logger: true // Habilitar logs del transporter
    });

    // Verificar la conexión
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Error al verificar la conexión del email:', error);
      } else {
        this.logger.log('Servidor de email listo para enviar mensajes');
      }
    });
  }

  private generateHtmlEmail(message: EmailMessage): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4a90e2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 0 0 5px 5px;
            }
            .title {
              font-size: 24px;
              margin: 0;
              padding-bottom: 10px;
            }
            .subtitle {
              font-size: 18px;
              color: #666;
              margin: 0;
              padding-bottom: 20px;
            }
            .message {
              font-size: 16px;
              line-height: 1.8;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${message.title}</h1>
          </div>
          <div class="content">
            <h2 class="subtitle">${message.subtitle}</h2>
            <div class="message">
              ${message.message}
            </div>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </body>
      </html>
    `;
  }

  async sendEmail(to: string, message: EmailMessage): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: message.title,
      html: this.generateHtmlEmail(message),
    };

    try {
      this.logger.log(`Intentando enviar email a: ${to}`);
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email enviado exitosamente: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Error detallado al enviar email:', error);
      throw new Error(`Error al enviar el correo: ${error.message}`);
    }
  }
} 