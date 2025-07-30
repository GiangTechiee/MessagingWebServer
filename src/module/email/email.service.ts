import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  SendEmailDto,
  VerificationEmailDto,
  ResetPasswordEmailDto,
} from './dto/email.dto';
import { EmailTemplate, SendEmailResponse } from './interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templates: EmailTemplate;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      throw new Error('SendGrid API key is required');
    }

    const senderEmail = this.configService.get<string>('SENDER_EMAIL');
    if (!senderEmail) {
      throw new Error('Sender email is required');
    }

    const verificationTemplateId = this.configService.get<string>('SENDGRID_VERIFICATION_TEMPLATE_ID');
    const resetPasswordTemplateId = this.configService.get<string>('SENDGRID_RESET_PASSWORD_TEMPLATE_ID');

    if (!verificationTemplateId || !resetPasswordTemplateId) {
      throw new Error('SendGrid template IDs are required');
    }

    sgMail.setApiKey(apiKey);

    // Khởi tạo templates với giá trị đã validate
    this.templates = {
      ACCOUNT_VERIFICATION: verificationTemplateId,
      RESET_PASSWORD: resetPasswordTemplateId,
    };
  }

  /**
   * Gửi email chung với template
   */
  async sendTemplateEmail(emailData: SendEmailDto): Promise<SendEmailResponse> {
    try {
      const senderEmail = this.configService.get<string>('SENDER_EMAIL');
      if (!senderEmail) {
        throw new Error('Sender email is not configured');
      }

      const msg = {
        to: emailData.to,
        from: {
          email: senderEmail,
          name: 'Gialo',
        },
        templateId: emailData.templateId,
        dynamicTemplateData: emailData.dynamicTemplateData || {},
      };

      const [response] = await sgMail.send(msg);
      
      this.logger.log(`Email sent successfully to ${emailData.to}, MessageID: ${response.headers['x-message-id']}`);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gửi email xác nhận đăng ký tài khoản
   */
  async sendVerificationEmail(data: VerificationEmailDto): Promise<SendEmailResponse> {
    const emailData: SendEmailDto = {
      to: data.to,
      templateId: this.templates.ACCOUNT_VERIFICATION,
      dynamicTemplateData: {
        email: data.email, 
        verification_link: data.verificationLink,
        app_name: 'Gialo',
      },
    };

    return this.sendTemplateEmail(emailData);
  }

  /**
   * Gửi email đặt lại mật khẩu với OTP 6 số
   */
  async sendResetPasswordEmail(data: ResetPasswordEmailDto): Promise<SendEmailResponse> {
    const emailData: SendEmailDto = {
      to: data.to,
      templateId: this.templates.RESET_PASSWORD,
      dynamicTemplateData: {
        email: data.email,
        otp: data.otp,
        app_name: 'Gialo',
      },
    };

    return this.sendTemplateEmail(emailData);
  }

  /**
   * Gửi nhiều email cùng lúc
   */
  async sendBulkEmails(emails: SendEmailDto[]): Promise<SendEmailResponse[]> {
    const promises = emails.map(email => this.sendTemplateEmail(email));
    return Promise.all(promises);
  }
}