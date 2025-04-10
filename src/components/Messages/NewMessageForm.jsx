import { useState } from "react";
import useTranslate from "../../utils/useTranslate";
import "../../styles/Messages/NewMessageForm.css";

function NewMessageForm({ onSubmit, onCancel, nostrClient }) {
  const { t } = useTranslate();
  const [recipientPubkey, setRecipientPubkey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipientProfile, setRecipientProfile] = useState(null);

  // Sprawdzanie czy podany klucz publiczny istnieje
  const handleCheckPubkey = async () => {
    if (!recipientPubkey.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Sprawdzamy czy klucz jest w poprawnym formacie
      if (
        !(
          recipientPubkey.startsWith("npub") ||
          /^[0-9a-f]{64}$/.test(recipientPubkey)
        )
      ) {
        setError(t("messages.invalidPubkeyFormat"));
        setRecipientProfile(null);
        return;
      }

      // Pobieramy profil użytkownika
      const profile = await nostrClient.getUserProfile(recipientPubkey);
      setRecipientProfile(profile);
    } catch (err) {
      console.error("Failed to check pubkey:", err);
      setError(t("messages.failedToCheckPubkey"));
      setRecipientProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recipientPubkey.trim() || !message.trim()) return;

    onSubmit(recipientPubkey, message);
  };

  return (
    <div className="new-message-modal">
      <div className="new-message-content">
        <button type="button" onClick={onCancel} className="close-btn">
          &times;
        </button>

        <h2>{t("messages.newMessage")}</h2>

        <form onSubmit={handleSubmit}>
          <div className="recipient-input-group">
            <label htmlFor="recipient">{t("messages.recipient")}</label>
            <div className="recipient-input-with-button">
              <input
                type="text"
                id="recipient"
                value={recipientPubkey}
                onChange={(e) => setRecipientPubkey(e.target.value)}
                placeholder={t("messages.enterPubkeyOrNpub")}
                required
              />
              <button
                type="button"
                onClick={handleCheckPubkey}
                disabled={loading || !recipientPubkey.trim()}
              >
                {loading ? t("common.checking") : t("messages.check")}
              </button>
            </div>

            {error && <div className="input-error">{error}</div>}

            {recipientProfile && (
              <div className="recipient-preview">
                <div className="recipient-avatar">
                  {recipientProfile.avatar ? (
                    <img
                      src={recipientProfile.avatar}
                      alt={recipientProfile.name || "User"}
                    />
                  ) : (
                    <div className="default-avatar">
                      {(recipientProfile.name || "?").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="recipient-details">
                  <div className="recipient-name">
                    {recipientProfile.name ||
                      `${recipientProfile.pubkey.slice(0, 10)}...`}
                  </div>
                  {recipientProfile.nip05 && (
                    <div className="recipient-nip05">
                      {recipientProfile.nip05}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="message-input-group">
            <label htmlFor="message">{t("messages.message")}</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messages.writeYourMessage")}
              rows={4}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="send-button"
              disabled={
                loading ||
                !recipientPubkey.trim() ||
                !message.trim() ||
                !recipientProfile
              }
            >
              {t("messages.send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewMessageForm;
