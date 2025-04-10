import { useState } from "react";
import useTranslate from "../utils/useTranslate";

function NostrLogin({ onLogin, onClose }) {
  const { t } = useTranslate();
  const [pubkey, setPubkey] = useState("");
  const [loginMethod, setLoginMethod] = useState("extension"); // 'extension' lub 'manual'
  const [isLoading, setIsLoading] = useState(false);

  const handleNip07Login = async () => {
    setIsLoading(true);
    try {
      // Sprawdź czy rozszerzenie NIP-07 jest dostępne
      if (!window.nostr) {
        alert(t("login.noExtensionFound"));
        setLoginMethod("manual");
        return;
      }

      // Pobierz klucz publiczny z rozszerzenia
      const userPubkey = await window.nostr.getPublicKey();
      if (userPubkey) {
        onLogin(userPubkey);
        onClose();
      }
    } catch (error) {
      console.error("Failed to login with extension:", error);
      alert(t("login.extensionLoginError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    if (!pubkey.trim()) return;

    try {
      // Tutaj możemy wykonać walidację klucza publicznego

      if (pubkey.startsWith("npub") || /^[0-9a-f]{64}$/.test(pubkey)) {
        onLogin(pubkey);
        onClose();
      } else {
        alert(t("login.invalidPublicKeyFormat"));
      }
    } catch (error) {
      console.error("Failed to login manually:", error);
      alert(t("login.loginError"));
    }
  };

  return (
    <div className="login-modal">
      <div className="login-modal-content">
        <button type="button" onClick={onClose} className="close-btn">
          &times;
        </button>
        <h2>{t("login.loginWithNostr")}</h2>

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
            <p>{t("login.enterYourPublicKey")}</p>
            <form onSubmit={handleManualLogin}>
              <input
                type="text"
                value={pubkey}
                onChange={(e) => setPubkey(e.target.value)}
                placeholder={t("login.publicKeyPlaceholder")}
                required
              />
              <button type="submit" className="login-btn">
                {t("login.loginButton")}
              </button>
            </form>
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
