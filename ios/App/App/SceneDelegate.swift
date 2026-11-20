import UIKit
import Capacitor

@objc(TripVerseNativeUIPlugin)
public class TripVerseNativeUIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSystemUI"
    public let jsName = "NativeSystemUI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise)
    ]

    @objc func setTheme(_ call: CAPPluginCall) {
        let isDark = call.getBool("dark") ?? false
        DispatchQueue.main.async { [weak self] in
            let bgColor = isDark
                ? UIColor(red: 7.0 / 255.0, green: 12.0 / 255.0, blue: 22.0 / 255.0, alpha: 1.0)
                : UIColor(red: 244.0 / 255.0, green: 246.0 / 255.0, blue: 242.0 / 255.0, alpha: 1.0)
            self?.bridge?.viewController?.view.backgroundColor = bgColor
            self?.bridge?.webView?.isOpaque = false
            self?.bridge?.webView?.backgroundColor = bgColor
            self?.bridge?.webView?.scrollView.backgroundColor = bgColor
            self?.bridge?.viewController?.view.window?.backgroundColor = bgColor
            call.resolve()
        }
    }

    @objc func haptic(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "light"
        DispatchQueue.main.async {
            switch style {
            case "heavy":
                let gen = UIImpactFeedbackGenerator(style: .heavy)
                gen.prepare()
                gen.impactOccurred()
            case "medium":
                let gen = UIImpactFeedbackGenerator(style: .medium)
                gen.prepare()
                gen.impactOccurred()
            case "success":
                let gen = UINotificationFeedbackGenerator()
                gen.prepare()
                gen.notificationOccurred(.success)
            case "warning":
                let gen = UINotificationFeedbackGenerator()
                gen.prepare()
                gen.notificationOccurred(.warning)
            default:
                let gen = UIImpactFeedbackGenerator(style: .light)
                gen.prepare()
                gen.impactOccurred()
            }
            call.resolve()
        }
    }
}

class TripVerseBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TripVerseNativeUIPlugin())
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.webView else { return }
            webView.scrollView.bounces = false
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            webView.allowsBackForwardNavigationGestures = false
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 7.0 / 255.0, green: 12.0 / 255.0, blue: 22.0 / 255.0, alpha: 1.0)
        window?.rootViewController = TripVerseBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
