/**
 * Info Page type definitions
 */

export interface InfoPage {
  id: string;
  aboutContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  policies: string | null;
  faq: FaqItem[] | null;
  storeId: string;
  updatedAt: Date;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface UpdateInfoPageDto {
  aboutContent?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  policies?: string;
  faq?: FaqItem[];
}

export interface InfoPageResponse {
  id: string;
  aboutContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  policies: string | null;
  faq: FaqItem[] | null;
  updatedAt: string;
}
