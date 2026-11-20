package ai.tripverse.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSystemUIPlugin.class);
        super.onCreate(savedInstanceState);
        configureOptimizedWebView();
    }

    private void configureOptimizedWebView() {
        if (this.bridge == null) return;
        WebView webView = this.bridge.getWebView();
        if (webView == null) return;

        // Remove harsh edge overscroll glow for a native edge-to-edge feel
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
    }

    @CapacitorPlugin(name = "NativeSystemUI")
    public static class NativeSystemUIPlugin extends Plugin {
        @PluginMethod
        public void setTheme(PluginCall call) {
            boolean isDark = Boolean.TRUE.equals(call.getBoolean("dark", false));
            getActivity().runOnUiThread(() -> {
                Window window = getActivity().getWindow();
                if (window != null) {
                    int bgColor = Color.parseColor(isDark ? "#070C16" : "#F4F6F2");
                    View decorView = window.getDecorView();
                    decorView.setBackgroundColor(bgColor);
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().setBackgroundColor(bgColor);
                    }
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                    if (controller != null) {
                        controller.setAppearanceLightStatusBars(!isDark);
                        controller.setAppearanceLightNavigationBars(!isDark);
                    }
                }
                call.resolve();
            });
        }
    }
}
