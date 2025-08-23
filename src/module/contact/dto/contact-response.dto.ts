export interface ContactResponse {
  contactId: string;
  userId: string;
  friendId: string;
  isBlocked: boolean;
  isFriend: boolean;
  createdAt: Date;
  contact: {
    userId: string;
    username: string;
    email: string;
    fullName: string;
    avatar: string | null;
    background: string | null;
  };
}