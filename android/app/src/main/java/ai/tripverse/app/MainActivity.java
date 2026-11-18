package ai.tripverse.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
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
    }

    @CapacitorPlugin(name = "NativeSystemUI")
    public static class NativeSystemUIPlugin extends Plugin {
        @PluginMethod
        public void setTheme(PluginCall call) {
            boolean isDark = Boolean.TRUE.equals(call.getBoolean("dark", false));
            getActivity().runOnUiThread(() -> {
                Window window = getActivity().getWindow();
                if (window != null) {
                    View decorView = window.getDecorView();
                    decorView.setBackgroundColor(Color.parseColor(isDark ? "#070C16" : "#FFFFFF"));
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
