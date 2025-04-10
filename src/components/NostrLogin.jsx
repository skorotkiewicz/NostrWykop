import { useState } from "react";

function NostrLogin({ onLogin, onClose }) {
  const [pubkey, setPubkey] = useState("");
  const [loginMethod, setLoginMethod] = useState("extension"); // 'extension' lub 'manual'
  const [isLoading, setIsLoading] = useState(false);

  const handleNip07Login = async () => {
    setIsLoading(true);
    try {
      // Sprawdź czy rozszerzenie NIP-07 jest dostępne
      if (!window.nostr) {
        alert(
          "Nie znaleziono rozszerzenia Nostr! Zainstaluj rozszerzenie NIP-07 lub wprowadź klucz ręcznie.",
        );
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
      alert("Wystąpił błąd podczas logowania przez rozszerzenie.");
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
        alert("Nieprawidłowy format klucza publicznego Nostr.");
      }
    } catch (error) {
      console.error("Failed to login manually:", error);
      alert("Wystąpił błąd podczas logowania.");
    }
  };

  return (
    <div className="login-modal">
      <div className="login-modal-content">
        <button type="button" onClick={onClose} className="close-btn">
          &times;
        </button>
        <h2>Zaloguj się przez Nostr</h2>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${loginMethod === "extension" ? "active" : ""}`}
            onClick={() => setLoginMethod("extension")}
          >
            Logowanie przez rozszerzenie
          </button>
          <button
            type="button"
            className={`login-tab ${loginMethod === "manual" ? "active" : ""}`}
            onClick={() => setLoginMethod("manual")}
          >
            Logowanie ręczne
          </button>
        </div>

        {loginMethod === "extension" ? (
          <div className="extension-login">
            <p>
              Kliknij poniżej, aby zalogować się przy użyciu rozszerzenia Nostr
              (NIP-07):
            </p>
            <button
              type="button"
              onClick={handleNip07Login}
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? "Logowanie..." : "Zaloguj przez rozszerzenie"}
            </button>
          </div>
        ) : (
          <div className="manual-login">
            <p>Wprowadź swój klucz publiczny Nostr (npub lub hex):</p>
            <form onSubmit={handleManualLogin}>
              <input
                type="text"
                value={pubkey}
                onChange={(e) => setPubkey(e.target.value)}
                placeholder="npub1... lub klucz hex"
                required
              />
              <button type="submit" className="login-btn">
                Zaloguj
              </button>
            </form>
          </div>
        )}

        <div className="login-info">
          <p>
            Nie masz jeszcze konta Nostr? Możesz utworzyć klucze przy użyciu
            różnych narzędzi, np.:
          </p>
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
                nos2x for Firefox
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NostrLogin;
