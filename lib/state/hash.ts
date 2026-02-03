import { Customer } from "@/types/customer";

/**
 * Generate a unique hash for a customer based on name, country, and industry
 * This hash is used to detect duplicate customers across scrapes
 */
export function generateCustomerHash(customer: Customer): string {
  // Normalize fields to handle minor variations
  const normalized = {
    name: normalizeString(customer.name),
    country: normalizeString(customer.country),
    industry: normalizeString(customer.industry)
  };

  return `${normalized.name}|${normalized.country}|${normalized.industry}`;
}

/**
 * Normalize a string for consistent hashing
 * - Convert to lowercase
 * - Trim whitespace
 * - Replace multiple spaces with single space
 * - Remove special characters that might vary
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}

/**
 * Generate hashes for multiple customers at once
 */
export function generateCustomerHashes(customers: Customer[]): Map<string, Customer> {
  const hashMap = new Map<string, Customer>();

  for (const customer of customers) {
    const hash = generateCustomerHash(customer);
    hashMap.set(hash, customer);
  }

  return hashMap;
}

/**
 * Compare two customer hashes to check if they're the same
 */
export function areCustomersSame(customer1: Customer, customer2: Customer): boolean {
  return generateCustomerHash(customer1) === generateCustomerHash(customer2);
}
