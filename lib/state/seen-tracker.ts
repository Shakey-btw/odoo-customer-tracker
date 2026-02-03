import { Customer } from "@/types/customer";
import { TrackingTarget } from "@/types/target";
import { getRedisClient } from "./redis";
import { generateCustomerHash } from "./hash";
import { REDIS_KEYS } from "@/lib/config/constants";

/**
 * Check if a customer has been seen before for a given target
 */
export async function isCustomerSeen(
  customer: Customer,
  target: TrackingTarget
): Promise<boolean> {
  const hash = generateCustomerHash(customer);
  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;

  const exists = await getRedisClient().sismember(key, hash);
  return exists === 1;
}

/**
 * Mark a customer as seen for a given target
 */
export async function markCustomerAsSeen(
  customer: Customer,
  target: TrackingTarget
): Promise<void> {
  const hash = generateCustomerHash(customer);
  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;

  await getRedisClient().sadd(key, hash);
}

/**
 * Mark multiple customers as seen for a given target
 */
export async function markCustomersAsSeen(
  customers: Customer[],
  target: TrackingTarget
): Promise<void> {
  if (customers.length === 0) return;

  const hashes = customers.map(generateCustomerHash);
  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;

  await getRedisClient().sadd(key, ...hashes);
}

/**
 * Filter customers to only those that haven't been seen before
 * Returns an array of new customers
 */
export async function filterNewCustomers(
  customers: Customer[],
  target: TrackingTarget
): Promise<Customer[]> {
  if (customers.length === 0) return [];

  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;
  const newCustomers: Customer[] = [];

  for (const customer of customers) {
    const hash = generateCustomerHash(customer);
    const exists = await getRedisClient().sismember(key, hash);

    if (exists === 0) {
      newCustomers.push(customer);
      // Mark as seen immediately to prevent duplicates in the same batch
      await getRedisClient().sadd(key, hash);
    }
  }

  return newCustomers;
}

/**
 * Get the count of seen customers for a target
 */
export async function getSeenCustomersCount(target: TrackingTarget): Promise<number> {
  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;
  return await getRedisClient().scard(key);
}

/**
 * Check if we should mark DACH/UK customers in the "all" target as well
 * This prevents duplicate work when scraping
 */
export async function markInParentTargets(
  customer: Customer,
  target: TrackingTarget
): Promise<void> {
  // Mark in current target
  await markCustomerAsSeen(customer, target);

  // If DACH or UK, also mark in "all" target
  if (target === "dach" || target === "uk") {
    await markCustomerAsSeen(customer, "all");
  }
}

/**
 * Reset seen customers for a target (use with caution!)
 * This will cause all customers to be detected as "new" on next scan
 */
export async function resetSeenCustomers(target: TrackingTarget): Promise<void> {
  const key = `${REDIS_KEYS.SEEN_PREFIX}${target}`;
  await getRedisClient().del(key);
}

/**
 * Get last check timestamp for a target
 */
export async function getLastCheckTimestamp(target: TrackingTarget): Promise<number | null> {
  const key = `${REDIS_KEYS.LAST_CHECK_PREFIX}${target}`;
  const timestamp = await getRedisClient().get(key);
  return timestamp ? Number(timestamp) : null;
}

/**
 * Update last check timestamp for a target
 */
export async function updateLastCheckTimestamp(target: TrackingTarget): Promise<void> {
  const key = `${REDIS_KEYS.LAST_CHECK_PREFIX}${target}`;
  await getRedisClient().set(key, Date.now());
}

/**
 * Get last full scan timestamp for a target
 */
export async function getLastFullScanTimestamp(target: TrackingTarget): Promise<number | null> {
  const key = `${REDIS_KEYS.LAST_FULL_SCAN_PREFIX}${target}`;
  const timestamp = await getRedisClient().get(key);
  return timestamp ? Number(timestamp) : null;
}

/**
 * Update last full scan timestamp for a target
 */
export async function updateLastFullScanTimestamp(target: TrackingTarget): Promise<void> {
  const key = `${REDIS_KEYS.LAST_FULL_SCAN_PREFIX}${target}`;
  await getRedisClient().set(key, Date.now());
}

/**
 * Check if a full scan is needed based on the last full scan timestamp
 */
export async function shouldDoFullScan(target: TrackingTarget): Promise<boolean> {
  const lastFullScan = await getLastFullScanTimestamp(target);

  if (!lastFullScan) {
    // Never done a full scan
    return true;
  }

  const daysSinceLastScan = (Date.now() - lastFullScan) / (1000 * 60 * 60 * 24);
  const FULL_SCAN_INTERVAL_DAYS = 7;

  return daysSinceLastScan >= FULL_SCAN_INTERVAL_DAYS;
}
