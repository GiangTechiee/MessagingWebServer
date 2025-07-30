export interface TemplateData {
  email?: string;
  verification_link?: string;
  otp?: string;
  app_name?: string;
  [key: string]: string | number | boolean | undefined;
}

export class SendEmailDto {
  to: string;
  templateId: string;
  dynamicTemplateData?: TemplateData;
}

export class VerificationEmailDto {
  to: string;
  email: string;
  verificationLink: string;
}

export class ResetPasswordEmailDto {
  to: string;
  email: string;
  otp: string;
}