package uz.ajdo.shajara;

import android.app.Activity;
import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Google Play Billing — Google'ning rasmiy com.android.billingclient:billing
 * kutubxonasini o'raydigan KICHIK, o'ziga xos plagin (tayyor uchinchi-tomon
 * Capacitor billing plagini ISHONCHLI emas — shu bois GoogleAuth plagini
 * bilan bo'lgani kabi qora quti xatolaridan qochish uchun o'zimiz yozdik).
 *
 * Backend HECH QACHON klient aytgan xarid holatiga ishonmaydi — bu yerdan
 * qaytgan purchaseToken faqat backend/billing.controller.ts'ga yuboriladi,
 * u esa Google Play'dan qayta tekshiradi.
 */
@CapacitorPlugin()
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {
  private BillingClient billingClient;
  /** launchBillingFlow() natijasi PurchasesUpdatedListener'ga ALOHIDA keladi —
   * shu bois qaysi JS chaqiruvi kutayotganini shu yerda saqlaymiz. */
  private PluginCall pendingPurchaseCall;

  @Override
  public void load() {
    billingClient = BillingClient.newBuilder(getContext())
      .setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .build();
  }

  @PluginMethod()
  public void initialize(final PluginCall call) {
    billingClient.startConnection(new BillingClientStateListener() {
      @Override
      public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
          call.reject("Billing ulanmadi", "" + billingResult.getResponseCode());
          return;
        }
        collectPendingPurchases(call);
      }

      @Override
      public void onBillingServiceDisconnected() {
        // Keyingi chaqiruvda Capacitor/BillingClient o'zi qayta ulanishga urinadi
      }
    });
  }

  /** Ilova o'rtada yopilgan/tarmoq uzilgan holatlarda hali backend'ga
   * yuborilmagan bo'lishi mumkin bo'lgan xaridlarni qaytaradi. */
  private void collectPendingPurchases(final PluginCall call) {
    QueryPurchasesParams subsParams = QueryPurchasesParams.newBuilder()
      .setProductType(BillingClient.ProductType.SUBS)
      .build();
    billingClient.queryPurchasesAsync(subsParams, (subsResult, subsPurchases) -> {
      QueryPurchasesParams inappParams = QueryPurchasesParams.newBuilder()
        .setProductType(BillingClient.ProductType.INAPP)
        .build();
      billingClient.queryPurchasesAsync(inappParams, (inappResult, inappPurchases) -> {
        JSArray pending = new JSArray();
        for (Purchase p : subsPurchases) addIfPurchased(pending, p);
        for (Purchase p : inappPurchases) addIfPurchased(pending, p);
        JSObject ret = new JSObject();
        ret.put("pendingPurchases", pending);
        call.resolve(ret);
      });
    });
  }

  private void addIfPurchased(JSArray arr, Purchase p) {
    if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
    for (String productId : p.getProducts()) {
      JSObject o = new JSObject();
      o.put("purchaseToken", p.getPurchaseToken());
      o.put("orderId", p.getOrderId());
      o.put("productId", productId);
      arr.put(o);
    }
  }

  @PluginMethod()
  public void queryProducts(final PluginCall call) {
    JSArray idsArr = call.getArray("productIds");
    String type = call.getString("type", BillingClient.ProductType.INAPP);
    List<String> productIds = new ArrayList<>();
    try {
      if (idsArr != null) {
        for (Object id : idsArr.toList()) productIds.add(String.valueOf(id));
      }
    } catch (Exception e) {
      call.reject("productIds noto'g'ri");
      return;
    }

    List<QueryProductDetailsParams.Product> products = new ArrayList<>();
    for (String id : productIds) {
      products.add(
        QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build()
      );
    }
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(products).build();

    billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
      if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
        call.reject("Mahsulotlarni olib bo'lmadi", "" + billingResult.getResponseCode());
        return;
      }
      JSArray arr = new JSArray();
      for (ProductDetails pd : productDetailsList) {
        JSObject o = new JSObject();
        o.put("productId", pd.getProductId());
        o.put("title", pd.getTitle());
        o.put("formattedPrice", formattedPriceOf(pd));
        arr.put(o);
      }
      JSObject ret = new JSObject();
      ret.put("products", arr);
      call.resolve(ret);
    });
  }

  private String formattedPriceOf(ProductDetails pd) {
    if (pd.getOneTimePurchaseOfferDetails() != null) {
      return pd.getOneTimePurchaseOfferDetails().getFormattedPrice();
    }
    List<ProductDetails.SubscriptionOfferDetails> offers = pd.getSubscriptionOfferDetails();
    if (offers != null && !offers.isEmpty()) {
      List<ProductDetails.PricingPhase> phases = offers.get(0).getPricingPhases().getPricingPhaseList();
      if (!phases.isEmpty()) return phases.get(0).getFormattedPrice();
    }
    return "";
  }

  @PluginMethod()
  public void purchase(final PluginCall call) {
    String productId = call.getString("productId");
    String type = call.getString("type", BillingClient.ProductType.INAPP);
    if (productId == null) {
      call.reject("productId shart");
      return;
    }

    List<QueryProductDetailsParams.Product> products = Collections.singletonList(
      QueryProductDetailsParams.Product.newBuilder().setProductId(productId).setProductType(type).build()
    );
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(products).build();

    billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
      if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
          || productDetailsList.isEmpty()) {
        call.reject("Mahsulot topilmadi", "" + billingResult.getResponseCode());
        return;
      }
      ProductDetails productDetails = productDetailsList.get(0);

      BillingFlowParams.ProductDetailsParams.Builder detailsParamsBuilder =
        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(productDetails);

      if (BillingClient.ProductType.SUBS.equals(type)) {
        List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
          call.reject("Obuna taklifi topilmadi");
          return;
        }
        detailsParamsBuilder.setOfferToken(offers.get(0).getOfferToken());
      }

      BillingFlowParams flowParams = BillingFlowParams.newBuilder()
        .setProductDetailsParamsList(Collections.singletonList(detailsParamsBuilder.build()))
        .build();

      Activity activity = getActivity();
      if (activity == null) {
        call.reject("Activity mavjud emas");
        return;
      }

      call.setKeepAlive(true);
      pendingPurchaseCall = call;
      BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
      if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
        pendingPurchaseCall = null;
        call.setKeepAlive(false);
        call.reject("Xarid oynasini ochib bo'lmadi", "" + launchResult.getResponseCode());
      }
    });
  }

  @Override
  public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
    PluginCall call = pendingPurchaseCall;
    pendingPurchaseCall = null;
    if (call == null) return;
    call.setKeepAlive(false);

    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
      call.reject("Foydalanuvchi bekor qildi", "USER_CANCELED");
      return;
    }
    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
      call.reject("Xarid muvaffaqiyatsiz", "" + billingResult.getResponseCode());
      return;
    }

    Purchase purchase = purchases.get(0);
    if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
      // To'lov kutilmoqda (masalan kechiktirilgan usul) — hozircha natija yo'q,
      // keyingi ilova ochilishida initialize() orqali qayta topiladi.
      call.reject("To'lov kutilmoqda", "PENDING");
      return;
    }

    JSObject ret = new JSObject();
    ret.put("purchaseToken", purchase.getPurchaseToken());
    ret.put("orderId", purchase.getOrderId());
    ret.put("productId", purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0));
    call.resolve(ret);
  }
}
