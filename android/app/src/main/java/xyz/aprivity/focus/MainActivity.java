package xyz.aprivity.focus;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Hosts the bundled static export; only /api/ requests go to the existing HTTPS backend. */
public final class MainActivity extends ComponentActivity {
    private static final String HOST = "focus.aprivity.xyz";
    private static final String ORIGIN = "https://" + HOST;
    private static final int MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
    private ActivityResultLauncher<Intent> fileLauncher;
    private ActivityResultLauncher<Intent> saveLauncher;
    private WebView webView;
    private FrameLayout root;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] downloadBytes;
    private JavaScriptReplyProxy downloadReply;
    private String downloadId;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private final ExecutorService fileWriter = Executors.newSingleThreadExecutor();

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        root.requestApplyInsets();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { navigateBack(); }
        });
        fileLauncher = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData()));
                fileCallback = null;
            }
        });
        saveLauncher = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result ->
            handleSavedDocument(result.getResultCode(), result.getData()));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // SAF file chooser returns content:// URIs.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder().setDomain(HOST)
            .addPathHandler("/", this::loadAsset).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri) && ("/api".equals(uri.getPath()) || uri.getPath().startsWith("/api/"))) return null;
                return loader.shouldInterceptRequest(uri);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri) && !uri.getPath().startsWith("/api")) return false;
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) { toast("没有可用的浏览器"); }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    fileLauncher.launch(intent);
                } catch (ActivityNotFoundException ignored) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    toast("没有可用的文件选择器");
                }
                return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) { callback.onCustomViewHidden(); return; }
                fullscreenView = view;
                fullscreenCallback = callback;
                webView.setVisibility(View.GONE);
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
            }
            @Override public void onHideCustomView() { hideFullscreen(); }
        });
        // The message bridge is exposed only to the trusted origin and accepts main-frame downloads.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "AprivityDownloads", Collections.singleton(ORIGIN),
                (view, message, origin, mainFrame, reply) -> {
                    if (mainFrame && isLocal(origin)) saveDownload(message.getData(), reply);
                });
        }
        webView.loadUrl(ORIGIN + "/");
    }

    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    /** Resolves exported routes locally. Missing assets return 404 instead of remote website HTML. */
    private WebResourceResponse loadAsset(String rawPath) {
        String path = AssetPath.resolve(rawPath);
        if (path != null) {
            try {
                InputStream stream = getAssets().open(path, AssetManager.ACCESS_STREAMING);
                String extension = MimeTypeMap.getFileExtensionFromUrl(path);
                String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                if ("js".equals(extension)) mime = "application/javascript";
                if (mime == null) mime = "application/octet-stream";
                return new WebResourceResponse(mime, "UTF-8", stream);
            } catch (IOException ignored) { /* Return a deterministic local 404 below. */ }
        }
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    /** Uses Android's document picker, so saving JSON/PNG requires no storage permission. */
    private void saveDownload(String data, JavaScriptReplyProxy reply) {
        if (downloadReply != null) return;
        String id = "";
        try {
            if (data == null || data.length() > MAX_DOWNLOAD_BYTES * 4 / 3 + 4096) throw new IOException("文件过大");
            JSONObject request = new JSONObject(data);
            id = request.getString("id");
            if (id.length() > 64) throw new IOException("无效请求");
            String mime = request.getString("mime");
            if (!mime.equals("application/json") && !mime.equals("image/png")) throw new IOException("不支持的文件格式");
            byte[] bytes = Base64.decode(request.getString("base64"), Base64.DEFAULT);
            if (bytes.length > MAX_DOWNLOAD_BYTES) throw new IOException("文件过大");
            String name = request.getString("name").replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
            if (name.isEmpty() || name.length() > 180) throw new IOException("无效文件名");
            downloadBytes = bytes;
            downloadReply = reply;
            downloadId = id;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mime).putExtra(Intent.EXTRA_TITLE, name);
            saveLauncher.launch(intent);
        } catch (Exception error) {
            downloadBytes = null;
            downloadReply = null;
            downloadId = null;
            reply(reply, id, false, "无法保存文件：" + error.getMessage());
        }
    }

    private void reply(JavaScriptReplyProxy proxy, String id, boolean ok, String error) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        try {
            JSONObject result = new JSONObject().put("id", id).put("ok", ok).put("error", error);
            proxy.postMessage(result.toString());
        } catch (Exception ignored) { /* Page can be closed while the system picker is open. */ }
    }

    private void handleSavedDocument(int result, Intent data) {
        if (downloadReply != null) {
            JavaScriptReplyProxy proxy = downloadReply;
            String id = downloadId;
            byte[] bytes = downloadBytes;
            downloadReply = null;
            downloadId = null;
            downloadBytes = null;
            Uri target = data == null ? null : data.getData();
            if (result != RESULT_OK || target == null) { reply(proxy, id, false, "已取消保存"); return; }
            fileWriter.execute(() -> {
                try {
                    try (OutputStream stream = getContentResolver().openOutputStream(target, "wt")) {
                        if (stream == null) throw new IOException("无法写入文件");
                        stream.write(bytes);
                    }
                    runOnUiThread(() -> reply(proxy, id, true, ""));
                } catch (IOException error) {
                    runOnUiThread(() -> reply(proxy, id, false, "文件保存失败"));
                }
            });
        }
    }

    private void hideFullscreen() {
        if (fullscreenView == null) return;
        root.removeView(fullscreenView);
        fullscreenView = null;
        webView.setVisibility(View.VISIBLE);
        fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
    }

    private void navigateBack() {
        if (fullscreenView != null) hideFullscreen();
        else if (webView.canGoBack()) webView.goBack();
        else moveTaskToBack(true);
    }

    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileWriter.shutdown();
        root.removeAllViews();
        webView.destroy();
        super.onDestroy();
    }
}
