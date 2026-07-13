// features/billing/lib/native-billing.ts
// Google Play Billing — @codetrix-studio/capacitor-google-auth kabi tayyor
// paket EMAS (bu sohada ishonchli Capacitor 7 plagini yo'q — shu bois
// android/app/.../BillingPlugin.java'da O'ZIMIZ yozgan kichik plagin
// ishlatiladi, Google'ning rasmiy com.android.billingclient:billing
// kutubxonasi ustida). Bu yerda faqat JS ko'prigi.
import { registerPlugin } from '@capacitor/core';

export interface BillingPurchaseResult {
  purchaseToken: string;
  orderId: string;
  productId: string;
}

export interface BillingProductDetails {
  productId: string;
  title: string;
  formattedPrice: string;
}

interface BillingPluginApi {
  /** BillingClient ulanishi + ilova o'rtada yopilgan holatlarda tugallanmagan xaridlarni qaytaradi */
  initialize(): Promise<{ pendingPurchases: BillingPurchaseResult[] }>;
  /** Play Store'dan HAQIQIY (mahalliy valyutadagi) narxlarni oladi — hardcoded emas */
  queryProducts(options: { productIds: string[]; type: 'subs' | 'inapp' }): Promise<{ products: BillingProductDetails[] }>;
  /** Xarid oynasini ochadi. PENDING holat (masalan kechiktirilgan to'lov usuli)
   * darhol natija bermaydi — foydalanuvchi bekor qilsa yoki xato bo'lsa rad etadi. */
  purchase(options: { productId: string; type: 'subs' | 'inapp' }): Promise<BillingPurchaseResult>;
}

const Billing = registerPlugin<BillingPluginApi>('Billing');

let initialized = false;
let pendingPurchases: BillingPurchaseResult[] = [];

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  const res = await Billing.initialize();
  pendingPurchases = res.pendingPurchases;
  initialized = true;
}

/** Ilova ochilganda tugallanmagan (backend'ga hali yuborilmagan) xaridlar — qayta yuborish uchun */
export async function getPendingPurchases(): Promise<BillingPurchaseResult[]> {
  await ensureInitialized();
  return pendingPurchases;
}

export async function purchasePlan(productId: string): Promise<BillingPurchaseResult> {
  await ensureInitialized();
  return Billing.purchase({ productId, type: 'subs' });
}

export async function purchaseSlot(productId: string): Promise<BillingPurchaseResult> {
  await ensureInitialized();
  return Billing.purchase({ productId, type: 'inapp' });
}

export async function queryPrices(
  productIds: string[],
  type: 'subs' | 'inapp',
): Promise<BillingProductDetails[]> {
  if (productIds.length === 0) return [];
  await ensureInitialized();
  const res = await Billing.queryProducts({ productIds, type });
  return res.products;
}
