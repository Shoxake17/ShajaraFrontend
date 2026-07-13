package uz.ajdo.shajara;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Qo'lda yozilgan (npm paketi EMAS) plagin — avtomatik ro'yxatga
    // olinmaydi, shu bois bu yerda qo'lda registerPlugin() qilinadi.
    registerPlugin(BillingPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
