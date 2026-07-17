package uz.ajdo.shajara;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import uz.ajdo.shajara.calls.IncomingCallActivity;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.Map;

/**
 * @capacitor/push-notifications'ning stock MessagingService'i o'rniga
 * AndroidManifest.xml'da ro'yxatga olingan (kutubxonanikini tools:node="remove"
 * bilan olib tashlab). Sabab: stock plagin faqat status-bar siluetini
 * ko'rsata oladi, katta (large icon) rasm sozlash imkoni yo'q.
 *
 * Telegram uslubi: KATTA ikonka — yuboruvchining haqiqiy profil surati
 * (chat.gateway.ts `data.avatarUrl`dan, R2 presigned havola orqali yuklab
 * olinadi; yo'q/muvaffaqiyatsiz bo'lsa AJDO logotipiga qaytadi), DOIRAVIY
 * qirqilgan (getCircularBitmap) — kvadrat emas. KICHIK badge —
 * shajaratree.png'dan olingan silliq (anti-aliased) daraxt siluet.
 *
 * MessagingStyle + Person + dinamik SHORTCUT (ShortcutManagerCompat) —
 * Android'ning rasmiy "Conversation notification" naqshi — bularsiz
 * ba'zi qurilmalarda (Samsung A32/S21+ sinovda tasdiqlangan) katta rasm
 * UMUMAN ko'rinmay qoladi.
 *
 * onNewToken qasddan override QILINMAYDI — MessagingService'dan meros orqali
 * push.native.ts'dagi 'registration' oqimi o'zgarishsiz ishlayveradi.
 */
public class AjdoFirebaseMessagingService extends MessagingService {

    private static final String CHANNEL_ID = "chat_messages";
    private static final String CALL_CHANNEL_ID = "calls";
    private static final int NOTIFICATION_COLOR = 0xFF26A69A;
    private static final int AVATAR_TIMEOUT_MS = 4000;
    private static final int AVATAR_MAX_DIMENSION = 256;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // push.service.ts ATAYLAB top-level `notification` bloki YO'Q "faqat
        // data" xabar yuboradi (aks holda Android fon rejimida bu metodni
        // umuman chaqirmay, xabarni o'zi avtomatik ko'rsatib yuborar edi).
        Map<String, String> data = remoteMessage.getData();

        // Qo'ng'iroq (call.store.ts/calls.service.ts) — oddiy chat xabaridan
        // BUTUNLAY boshqa oqim: WebView/MessagingStyle emas, to'liq ekran
        // (qulf ekranida ham) IncomingCallActivity ochiladi.
        if ("call".equals(data.get("type"))) {
            handleIncomingCall(getApplicationContext(), data);
            return;
        }

        String title = data.get("title");
        String body = data.get("body");
        if (title == null && body == null) {
            return;
        }

        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        ensureChannel(notificationManager, CHANNEL_ID);

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        // remoteMessage.toIntent() FCM SDK'ning o'zi "google.message_id" +
        // barcha data maydonlarini standart shaklda joylaydi — Capacitor
        // plaginining handleOnNewIntent() aynan shu kalitni kutadi (bosilganda
        // push.native.ts'dagi pushNotificationActionPerformed orqali suhbatga
        // o'tish ishlashi uchun).
        Bundle extras = remoteMessage.toIntent().getExtras();
        if (extras != null) {
            launchIntent.putExtras(extras);
        }
        int requestCode = remoteMessage.getMessageId() != null ? remoteMessage.getMessageId().hashCode() : (int) System.currentTimeMillis();
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Bitmap largeIconBitmap = resolveLargeIcon(context, data.get("avatarUrl"));
        IconCompat personIcon = IconCompat.createWithBitmap(largeIconBitmap);
        Person sender = new Person.Builder()
            .setName(title != null ? title : "AJDO")
            .setIcon(personIcon)
            .build();

        // Suhbat bo'yicha barqaror ID — bir xil odam bilan har yangi xabarda
        // shortcut qayta yaratilmasdan, mavjudi yangilanadi (Android dinamik
        // shortcut sonini cheklaydi, qayta ishlatish shart).
        String otherUserId = data.get("otherUserId");
        String shortcutId = "chat_" + (otherUserId != null ? otherUserId : (title != null ? title : "default"));

        ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(context, shortcutId)
            .setShortLabel(title != null ? title : "AJDO")
            .setLongLived(true)
            .setIntent(launchIntent)
            .setPerson(sender)
            .setIcon(personIcon)
            .setCategories(Collections.singleton("android.shortcut.conversation"))
            .build();
        ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);

        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(sender)
            .addMessage(body != null ? body : "", System.currentTimeMillis(), sender);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setLargeIcon(largeIconBitmap)
            .setColor(NOTIFICATION_COLOR)
            .setStyle(style)
            .setShortcutId(shortcutId)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        notificationManager.notify(requestCode, builder.build());
    }

    /**
     * Kiruvchi qo'ng'iroq — full-screen-intent bildirishnoma orqali
     * IncomingCallActivity'ni ochadi (qurilma qulflangan bo'lsa ham,
     * android:showWhenLocked/turnScreenOn — AndroidManifest.xml). Android
     * 14+ (API 34) foydalanuvchidan USE_FULL_SCREEN_INTENT ruxsatini
     * Sozlamalardan ANIQ berishni talab qiladi — berilmagan bo'lsa, tizim
     * buning o'rniga oddiy (jim) bildirishnoma ko'rsatadi (heads-up emas),
     * lekin foydalanuvchi bosganda baribir IncomingCallActivity ochiladi.
     */
    private void handleIncomingCall(Context context, Map<String, String> data) {
        String callId = data.get("callId");
        if (callId == null) return;
        String callerName = data.get("callerName");
        String callType = data.get("callType");

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        ensureCallChannel(notificationManager);

        Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        fullScreenIntent.putExtra(IncomingCallActivity.EXTRA_CALL_ID, callId);
        fullScreenIntent.putExtra(IncomingCallActivity.EXTRA_CALLER_NAME, callerName);
        fullScreenIntent.putExtra(IncomingCallActivity.EXTRA_CALL_TYPE, callType);

        int requestCode = callId.hashCode();
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CALL_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(callerName != null ? callerName : "AJDO")
            .setContentText("VIDEO".equals(callType) ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setAutoCancel(true)
            .setOngoing(true);

        notificationManager.notify(requestCode, builder.build());
    }

    private void ensureCallChannel(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (notificationManager.getNotificationChannel(CALL_CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CALL_CHANNEL_ID, "Qo'ng'iroqlar", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Kiruvchi ovozli/video qo'ng'iroqlar");
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    /** avatarUrl bo'lsa yuklab olishga urinadi (qisqa muddatli, sinxron —
     * FCM'ning background executor'ida xavfsiz); bo'lmasa yoki muvaffaqiyatsiz
     * bo'lsa AJDO logotipiga (ic_notification_large) qaytadi. Natija Telegram
     * uslubida DOIRAVIY qirqiladi (kvadrat emas). */
    private Bitmap resolveLargeIcon(Context context, String avatarUrl) {
        Bitmap bitmap = null;
        if (avatarUrl != null) {
            bitmap = downloadBitmap(avatarUrl);
        }
        if (bitmap == null) {
            bitmap = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_notification_large);
        }
        return getCircularBitmap(bitmap);
    }

    /** Kvadrat/to'rtburchak bitmapni markazdan doiraviy qirqadi (shaffof
     * burchaklar bilan) — notification largeIcon/Person ikonkasi Telegram/
     * WhatsApp'dagi kabi yumaloq ko'rinishi uchun. */
    private Bitmap getCircularBitmap(Bitmap bitmap) {
        int size = Math.min(bitmap.getWidth(), bitmap.getHeight());
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        int left = (bitmap.getWidth() - size) / 2;
        int top = (bitmap.getHeight() - size) / 2;
        Rect srcRect = new Rect(left, top, left + size, top + size);
        Rect dstRect = new Rect(0, 0, size, size);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, srcRect, dstRect, paint);
        return output;
    }

    private Bitmap downloadBitmap(String urlStr) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(AVATAR_TIMEOUT_MS);
            connection.setReadTimeout(AVATAR_TIMEOUT_MS);
            connection.setDoInput(true);
            connection.connect();
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                return null;
            }

            byte[] bytes;
            try (InputStream input = connection.getInputStream()) {
                bytes = readAllBytes(input);
            }

            BitmapFactory.Options boundsOptions = new BitmapFactory.Options();
            boundsOptions.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, boundsOptions);
            int sampleSize = 1;
            while (
                (boundsOptions.outWidth / sampleSize) > AVATAR_MAX_DIMENSION
                    || (boundsOptions.outHeight / sampleSize) > AVATAR_MAX_DIMENSION
            ) {
                sampleSize *= 2;
            }

            BitmapFactory.Options decodeOptions = new BitmapFactory.Options();
            decodeOptions.inSampleSize = sampleSize;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, decodeOptions);
        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private byte[] readAllBytes(InputStream input) throws java.io.IOException {
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int bytesRead;
        while ((bytesRead = input.read(chunk)) != -1) {
            buffer.write(chunk, 0, bytesRead);
        }
        return buffer.toByteArray();
    }

    private void ensureChannel(NotificationManager notificationManager, String channelId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (notificationManager.getNotificationChannel(channelId) != null) return;
        NotificationChannel channel = new NotificationChannel(channelId, "Xabarlar", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Yangi xabar bildirishnomalari");
        channel.enableVibration(true);
        channel.setLightColor(NOTIFICATION_COLOR);
        notificationManager.createNotificationChannel(channel);
    }
}
