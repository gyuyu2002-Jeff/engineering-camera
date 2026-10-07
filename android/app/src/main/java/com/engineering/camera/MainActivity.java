package com.engineering.camera;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
            androidx.core.graphics.Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            float density = getResources().getDisplayMetrics().density;
            int bottomDp = (int) (insets.bottom / density);
            int topDp = (int) (insets.top / density);

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.post(() -> {
                    String js = String.format(
                        "document.documentElement.style.setProperty('--android-bottom-inset', '%dpx');" +
                        "document.documentElement.style.setProperty('--android-top-inset', '%dpx');",
                        bottomDp, topDp
                    );
                    webView.evaluateJavascript(js, null);
                });
            }
            return windowInsets;
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        // 核心關鍵：將 WebView 內的 getUserMedia 權限直接允許（已在 App 啟動時向 Android 系統取得相機權限）
        // 解決 Android WebView 預設拒絕 webView.getUserMedia，造成「相機無法啟動」的問題
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        request.grant(request.getResources());
                    });
                }
            });
        }
    }
}
