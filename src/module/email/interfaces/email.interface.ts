export interface EmailTemplate {
  ACCOUNT_VERIFICATION: string;
  RESET_PASSWORD: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}