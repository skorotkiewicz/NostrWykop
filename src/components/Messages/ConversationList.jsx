import { Link } from "react-router-dom";
import useTranslate from "../../utils/useTranslate";
import { nip19 } from "nostr-tools";
import "../../styles/Messages/ConversationList.css";

function ConversationList({ conversations, selectedPubkey, loading }) {
  const { t } = useTranslate();

  if (loading) {
    return (
      <div className="conversations-loading">
        <p>{t("messages.loadingConversations")}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="conversations-empty">
        <p>{t("messages.noConversations")}</p>
      </div>
    );
  }

  return (
    <div className="conversations-list">
      {conversations.map((conversation) => {
        // Formatujemy klucz publiczny do czytelnej formy
        const formattedPubkey = `${conversation.pubkey.slice(0, 10)}...`;
        const npub = nip19.npubEncode(conversation.pubkey);

        return (
          <Link
            to={`/messages/${conversation.pubkey}`}
            key={conversation.pubkey}
            className={`conversation-item ${
              selectedPubkey === conversation.pubkey ? "selected" : ""
            }`}
          >
            <div className="conversation-avatar">
              {conversation.profile.avatar ? (
                <img
                  src={conversation.profile.avatar}
                  alt={conversation.profile.name || formattedPubkey}
                />
              ) : (
                <div className="default-avatar">
                  {(conversation.profile.name || formattedPubkey || "?").charAt(
                    0,
                  )}
                </div>
              )}
              {conversation.unreadCount > 0 && (
                <span className="unread-badge">{conversation.unreadCount}</span>
              )}
            </div>

            <div className="conversation-details">
              <div className="conversation-name">
                {conversation.profile.name || `${npub.slice(0, 10)}...`}
              </div>

              <div className="conversation-last-message">
                {conversation.lastMessage.length > 30
                  ? `${conversation.lastMessage.slice(0, 30)}...`
                  : conversation.lastMessage}
              </div>

              <div className="conversation-time">
                {formatTimestamp(conversation.lastMessageAt)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // If this year, show date without year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Otherwise show date with year
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default ConversationList;
