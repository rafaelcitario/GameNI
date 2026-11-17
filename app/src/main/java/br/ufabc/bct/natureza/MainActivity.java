package br.ufabc.bct.natureza;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Natureza da Informação — casca Android do jogo HTML5.
 *
 * Zero dependências: uma Activity com WebView em tela cheia (retrato). Os arquivos do jogo (pasta game/) são
 * empacotados como assets e servidos para o WebView por interceptação de requisições em um endereço https
 * "virtual" (appassets.androidplatform.net). Assim o jogo roda como uma página https normal (localStorage persistente,
 * contexto seguro) sem nunca usar a rede: qualquer outro endereço recebe 403.
 *
 * Ponte JS -> Java:  AndroidBridge.vibrate(ms), AndroidBridge.exit().
 * Ganchos Java -> JS: NI.back() (botão voltar), NI.onAppPause(), NI.onAppResume().
 */
public class MainActivity extends Activity {
    private static final String TAG = "NaturezaInfo";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";

    private static final Map<String, String> MIME = new HashMap<String, String>();
    static {
        MIME.put("html", "text/html");
        MIME.put("htm", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("txt", "text/plain");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("gif", "image/gif");
        MIME.put("webp", "image/webp");
        MIME.put("svg", "image/svg+xml");
        MIME.put("ico", "image/x-icon");
        MIME.put("ogg", "audio/ogg");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("wav", "audio/wav");
        MIME.put("woff", "font/woff");
        MIME.put("woff2", "font/woff2");
        MIME.put("ttf", "font/ttf");
    }

    private WebView web;
    private volatile boolean pageReady = false;

    @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        web.setLongClickable(false);
        web.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true; // sem menu de seleção/copiar ao segurar o dedo
            }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage: salva o progresso, estrelas e configurações
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new AppClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d(TAG, m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });

        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        goImmersive();
        web.loadUrl(START_URL);
    }

    // ---------------------------------------------------------------- ciclo de vida

    @Override
    protected void onResume() {
        super.onResume();
        goImmersive();
        if (web != null) {
            web.resumeTimers();
            web.onResume();
            runJs("if(window.NI&&NI.onAppResume)NI.onAppResume();");
        }
    }

    @Override
    protected void onPause() {
        if (web != null) {
            runJs("if(window.NI&&NI.onAppPause)NI.onAppPause();"); // o jogo pausa sozinho e silencia o áudio
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ViewGroup parent = (ViewGroup) web.getParent();
            if (parent != null) parent.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    /** Botão voltar: o jogo decide (fecha painel, volta ao mapa, "toque de novo para sair"); se ele não tratar, o app fecha. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web == null || !pageReady) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript("(function(){try{return !!NI.back();}catch(e){return false;}})()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) finish();
            }
        });
    }

    // ---------------------------------------------------------------- utilidades

    private void runJs(String code) {
        if (web != null && pageReady) web.evaluateJavascript("try{" + code + "}catch(e){}", null);
    }

    @SuppressWarnings("deprecation")
    private void goImmersive() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    private static String extension(String path) {
        int dot = path.lastIndexOf('.');
        return dot < 0 ? "" : path.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static WebResourceResponse status(int code, String reason) {
        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Cache-Control", "no-store");
        return new WebResourceResponse("text/plain", "utf-8", code, reason, headers, new ByteArrayInputStream(new byte[0]));
    }

    /** Serve um arquivo de assets/ (chamado em thread de fundo pelo WebView). */
    private WebResourceResponse serve(Uri uri) {
        if (!HOST.equals(uri.getHost())) return status(403, "Forbidden"); // sem acesso à rede
        String path = uri.getPath();
        if (path == null || path.length() == 0 || "/".equals(path)) path = "/index.html";
        path = path.substring(1);
        if (path.contains("..")) return status(403, "Forbidden");
        try {
            InputStream in = getAssets().open(path);
            String mime = MIME.get(extension(path));
            if (mime == null) mime = "application/octet-stream";
            boolean text = mime.startsWith("text/") || mime.equals("application/json") || mime.equals("image/svg+xml");
            Map<String, String> headers = new HashMap<String, String>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", headers, in);
        } catch (IOException e) {
            return status(404, "Not Found"); // ex.: sprites opcionais que não foram adicionados
        }
    }

    // ---------------------------------------------------------------- WebView

    private final class AppClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try { // links externos abrem no navegador do sistema; o jogo continua onde está
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (Exception ignored) {
                // nenhum app para abrir o link
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            pageReady = true;
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // O processo de renderização morreu (memória): recria a tela em vez de derrubar o app.
            pageReady = false;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    recreate();
                }
            });
            return true;
        }
    }

    /** Métodos expostos ao JavaScript como window.AndroidBridge. */
    private final class Bridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                long d = Math.max(1, Math.min(ms, 250));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(d);
            } catch (Exception ignored) {
                // sem vibração disponível
            }
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }
}
