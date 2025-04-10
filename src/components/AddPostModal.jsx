import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddPostModal({ currentUser, nostrClient, onClose }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Tytuł i treść są wymagane");
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
      setError("Nie udało się dodać posta. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal add-post-modal">
        <div className="modal-header">
          <h2>Dodaj nowy post</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-post-form">
          <div className="form-group">
            <label htmlFor="post-title">Tytuł</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wpisz tytuł posta..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-content">Treść</label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Wpisz treść posta..."
              rows={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-tags">Tagi (oddzielone przecinkami)</label>
            <input
              id="post-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="np. nostr, technologia, wykop"
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
              Anuluj
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publikowanie..." : "Opublikuj post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPostModal;
