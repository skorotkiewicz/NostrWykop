import { useState } from "react";
import useTranslate from "../utils/useTranslate";
import { nip19 } from "nostr-tools";
import "../styles/NostrLogin.css";

function NostrLogin({ onLogin, onClose }) {
  const { t } = useTranslate();
  const [manualKey, setManualKey] = useState("");
  const [mode, setMode] = useState("login"); // 'login' lub 'register'
  const [loginMethod, setLoginMethod] = useState("extension"); // 'extension' lub 'manual'
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    show: false,
  });

  // Display notification instead of alert
  const showNotification = (message, type = "error") => {
    setNotification({ message, type, show: true });
  };

  const handleNip07Login = async () => {
    setIsLoading(true);
    try {
      // Sprawdź czy rozszerzenie NIP-07 jest dostępne
      if (!window.nostr) {
        showNotification(t("login.noExtensionFound"), "warning");
        setLoginMethod("manual");
        return;
      }

      // Pobierz klucz publiczny z rozszerzenia
      const userPubkey = await window.nostr.getPublicKey();
      if (userPubkey) {
        onLogin({ pk: userPubkey, sk: "nip07" });
        onClose();
      }
    } catch (error) {
      console.error("Failed to login with extension:", error);
      showNotification(t("login.extensionLoginError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!manualKey.trim()) return;

    try {
      const { getPublicKey } = await import("nostr-tools");

      // Sprawdzamy czy to klucz publiczny (npub) czy prywatny (nsec lub hex)
      if (/^[0-9a-f]{64}$/.test(manualKey)) {
        try {
          const derivedPublicKey = getPublicKey(manualKey);
          onLogin({ pk: derivedPublicKey, sk: manualKey });
          onClose();
        } catch (error) {
          console.log(error);
        }
      } else if (manualKey.startsWith("npub")) {
        // Logowanie kluczem publicznym
        onLogin({ pk: derivedPublicKey, sk: null });
        onClose();
      } else if (manualKey.startsWith("nsec")) {
        // Logowanie kluczem prywatnym nsec
        try {
          const { data: privateKey } = nip19.decode(manualKey);
          const derivedPublicKey = getPublicKey(privateKey);

          // Logujemy się za pomocą wygenerowanego klucza publicznego
          onLogin({ pk: derivedPublicKey, sk: manualKey });

          // Ostrzegamy użytkownika, że powinien używać klucza bezpiecznie
          showNotification(t("login.privateKeyWarning"), "warning");
          onClose();
        } catch (decodeError) {
          console.error("Failed to decode nsec key:", decodeError);
          showNotification(t("login.invalidPrivateKeyFormat"), "error");
        }
      } else {
        showNotification(t("login.invalidKeyFormat"), "error");
      }
    } catch (error) {
      console.error("Failed to login manually:", error);
      showNotification(t("login.loginError"), "error");
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // Generujemy nową parę kluczy za pomocą nostr-tools
      const { getPublicKey, generateSecretKey } = await import("nostr-tools");

      // Generujemy nowy klucz prywatny
      const privateKey = generateSecretKey();

      // Obliczamy odpowiadający mu klucz publiczny
      const publicKey = getPublicKey(privateKey);

      // Konwertujemy klucze do formatu npub i nsec
      const npub = nip19.npubEncode(publicKey);
      const nsec = nip19.nsecEncode(privateKey);

      // Zapisujemy nsec do wyświetlenia w komponencie
      setNotification({
        message: t("register.savePrivateKey", { nsec: nsec }),
        type: "success",
        show: true,
        isKeyInfo: true,
      });

      // Logujemy użytkownika używając nowego klucza publicznego
      onLogin({ pk: publicKey, sk: privateKey });
    } catch (error) {
      console.error("Failed to register:", error);
      showNotification(t("register.registrationError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-modal">
      <div className="login-modal-content">
        <button type="button" onClick={onClose} className="close-btn">
          &times;
        </button>
        <h2>
          {mode === "login"
            ? t("login.loginWithNostr")
            : t("register.registerWithNostr")}
        </h2>

        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.isKeyInfo ? (
              <div className="key-info">
                <p>{t("register.privateKeyWarning")}</p>
                <div className="nsec-container">
                  <code>{notification.message}</code>
                  <button
                    type="button"
                    onClick={() => {
                      const nsecMatch =
                        notification.message.match(/nsec1[a-z0-9]+/);
                      if (nsecMatch) {
                        navigator.clipboard.writeText(nsecMatch[0]);
                        showNotification(t("common.copied"), "success");
                      }
                    }}
                    className="copy-btn"
                  >
                    {t("common.copy")}
                  </button>
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={() => {
                      setNotification((prev) => ({ ...prev, show: false }));
                      onClose();
                    }}
                    className="confirm-btn"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span>{notification.message}</span>
                <button
                  type="button"
                  onClick={() =>
                    setNotification((prev) => ({ ...prev, show: false }))
                  }
                  className="close-notification"
                >
                  &times;
                </button>
              </>
            )}
          </div>
        )}

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            {t("login.loginTab")}
          </button>
          <button
            type="button"
            className={`login-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            {t("register.registerTab")}
          </button>
        </div>

        {mode === "login" ? (
          <>
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${loginMethod === "extension" ? "active" : ""}`}
                onClick={() => setLoginMethod("extension")}
              >
                {t("login.loginWithExtensionTab")}
              </button>
              <button
                type="button"
                className={`login-tab ${loginMethod === "manual" ? "active" : ""}`}
                onClick={() => setLoginMethod("manual")}
              >
                {t("login.manualLoginTab")}
              </button>
            </div>

            {loginMethod === "extension" ? (
              <div className="extension-login">
                <p>{t("login.clickToLoginWithExtension")}</p>
                <button
                  type="button"
                  onClick={handleNip07Login}
                  className="login-btn"
                  disabled={isLoading}
                >
                  {isLoading
                    ? t("login.loggingIn")
                    : t("login.loginWithExtensionButton")}
                </button>
              </div>
            ) : (
              <div className="manual-login">
                <p>{t("login.enterYourKey")}</p>
                <form onSubmit={handleManualLogin}>
                  <input
                    type="text"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    placeholder={t("login.keyPlaceholder")}
                    required
                  />
                  <button type="submit" className="login-btn">
                    {t("login.loginButton")}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="register">
            <p>{t("register.createNewAccount")}</p>
            <button
              type="button"
              onClick={handleRegister}
              className="register-btn"
              disabled={isLoading}
            >
              {isLoading
                ? t("register.creating")
                : t("register.createAccountButton")}
            </button>
          </div>
        )}

        <div className="login-info">
          <p>{t("login.noNostrAccount")}</p>
          <ul>
            <li>
              <a
                href="https://getalby.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alby
              </a>
            </li>
            <li>
              <a
                href="https://astral.ninja/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Astral
              </a>
            </li>
            <li>
              <a
                href="https://iris.to/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Iris
              </a>
            </li>
            <li>
              <a
                href="https://github.com/diegogurpegui/nos2x-fox"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("login.nos2xForFirefox")}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NostrLogin;
