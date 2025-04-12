import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useTranslate from "../../utils/useTranslate";
import { nip19 } from "nostr-tools";
import "../../styles/Messages/ConversationView.css";

function ConversationView({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onDeleteMessage,
}) {
  const { t } = useTranslate();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    onSendMessage(newMessage);
    setNewMessage("");
  };

  // Format the pubkey for display
  const formatPubkey = (pubkey) => {
    try {
      return `${nip19.npubEncode(pubkey).slice(0, 10)}...`;
    } catch (_error) {
      return `${pubkey.slice(0, 10)}...`;
    }
  };

  return (
    <div className="conversation-view">
      <div className="conversation-header">
        <div className="conversation-profile">
          {conversation.profile.avatar ? (
            <img
              src={conversation.profile.avatar}
              alt={
                conversation.profile.name || formatPubkey(conversation.pubkey)
              }
              className="profile-avatar"
            />
          ) : (
            <div className="default-avatar">
              {(conversation.profile.name || "?").charAt(0)}
            </div>
          )}

          <div className="profile-info">
            <h2 className="profile-name">
              {conversation.profile.name || formatPubkey(conversation.pubkey)}
            </h2>
            <Link
              to={`/profile/${conversation.pubkey}`}
              className="profile-link"
            >
              {t("messages.viewProfile")}
            </Link>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>{t("messages.noMessagesYet")}</p>
            <p>{t("messages.startConversation")}</p>
          </div>
        ) : (
          <>
            <div className="messages-list">
              {messages.map((message, key) => (
                <div
                  key={`${message.id}-${key}`}
                  className={`message ${
                    message.sender === currentUser.pubkey ? "sent" : "received"
                  }`}
                >
                  <div className="message-content">
                    {message.content}
                    {message.sender === currentUser.pubkey && (
                      <button
                        type="button"
                        className="delete-message-button"
                        onClick={() => onDeleteMessage(message.id)}
                        title={t("messages.delete")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="message-time">
                    {formatMessageTime(message.createdAt)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      <div className="message-input-container">
        <form onSubmit={handleSubmit}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("messages.typeMessage")}
            rows={2}
            className="message-input"
          />
          <button
            type="submit"
            className="send-button"
            disabled={newMessage.trim() === ""}
          >
            {t("messages.send")}
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper function to format message time
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // If this year, show date and time without year
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  // Otherwise show full date and time
  return `${date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default ConversationView;
