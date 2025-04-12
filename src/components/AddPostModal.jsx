import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";

function AddPostModal({ nostrClient, onClose }) {
  const { t } = useTranslate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError(t("post.titleAndContentRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Przygotuj treść posta z tytułem
      const fullContent = `${title}\n\n${content}`;

      // Przygotuj tagi
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Utwórz zdarzenie w formacie Nostr
      const event = {
        kind: 1, // Standardowy post tekstowy
        content: fullContent,
        tags: tagList.map((tag) => ["t", tag]),
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisz zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikuj zdarzenie do przekaźników
      const pubs = nostrClient.pool.publish(nostrClient.relays, signedEvent);
      await Promise.all(pubs);

      // Zamknij modal i przekieruj na stronę główną
      onClose();
      navigate("/");
    } catch (error) {
      console.error("Failed to add post:", error);
      setError(t("post.addPostFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal add-post-modal">
        <div className="modal-header">
          <h2>{t("post.addNewPost")}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-post-form">
          <div className="form-group">
            <label htmlFor="post-title">{t("post.title")}</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("post.titlePlaceholder")}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-content">{t("post.content")}</label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("post.contentPlaceholder")}
              rows={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-tags">{t("post.tags")}</label>
            <input
              id="post-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("post.tagsPlaceholder")}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("post.publishing") : t("post.publish")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPostModal;
