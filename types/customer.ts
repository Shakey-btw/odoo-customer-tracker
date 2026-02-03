export interface Customer {
  name: string;
  industry: string;
  country: string;
  description: string;
  detailUrl: string;
  detectedDate: string; // ISO 8601
}

export interface CustomerHash {
  hash: string;
  customer: Customer;
}
