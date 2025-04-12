import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import NewMessageForm from "../components/Messages/NewMessageForm";
import ConversationList from "../components/Messages/ConversationList";
import ConversationView from "../components/Messages/ConversationView";
import "../styles/Messages/Messages.css";

function Messages({ nostrClient, currentUser }) {
  const { t } = useTranslate();
  const { pubkey } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);

  // Pobieranie listy konwersacji
  useEffect(() => {
    const fetchConversations = async () => {
      if (!nostrClient || !currentUser) return;

      try {
        setLoading(true);
        const conversationsList = await nostrClient.getConversationsList();
        setConversations(conversationsList);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
        setError(t("messages.failedToFetchConversations"));
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [nostrClient, currentUser, t]);

  // Ładowanie wybranej konwersacji
  useEffect(() => {
    const fetchConversation = async () => {
      if (!nostrClient || !currentUser || !pubkey) return;

      try {
        setLoading(true);

        // Pobieramy wiadomości dla wybranej konwersacji
        const conversationMessages = await nostrClient.getConversation(pubkey);
        setMessages(conversationMessages);

        // Pobieramy profil rozmówcy
        const profile = await nostrClient.getUserProfile(pubkey);
        setSelectedConversation({
          pubkey,
          profile,
        });

        // Oznaczamy konwersację jako przeczytaną
        await nostrClient.markConversationAsRead(pubkey);

        setError(null);
      } catch (err) {
        console.error("Failed to fetch conversation:", err);
        setError(t("messages.failedToFetchConversation"));
      } finally {
        setLoading(false);
      }
    };

    if (pubkey) {
      fetchConversation();
    } else {
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [nostrClient, currentUser, pubkey, t]);

  // Obsługa wysyłania nowej wiadomości
  const handleSendMessage = async (content) => {
    if (!nostrClient || !currentUser || !selectedConversation) return;

    try {
      // Wysyłamy wiadomość
      const newMessage = await nostrClient.sendDirectMessage(
        selectedConversation.pubkey,
        content,
      );

      // Dodajemy nową wiadomość do listy
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Odświeżamy listę konwersacji
      const updatedConversations = await nostrClient.getConversationsList();
      setConversations(updatedConversations);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(t("messages.failedToSendMessage"));
    }
  };

  // Obsługa usuwania wiadomości
  const handleDeleteMessage = async (messageId) => {
    if (!nostrClient || !currentUser || !selectedConversation) return;

    try {
      // Usuwamy wiadomość
      await nostrClient.deleteMessage(messageId);

      // Usuwamy wiadomość z listy
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== messageId),
      );

      // Odświeżamy listę konwersacji
      const updatedConversations = await nostrClient.getConversationsList();
      setConversations(updatedConversations);
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError(t("messages.failedToDeleteMessage"));
    }
  };

  // Obsługa rozpoczęcia nowej konwersacji
  const handleStartNewConversation = (recipientPubkey, initialMessage) => {
    if (!nostrClient || !currentUser) return;

    nostrClient
      .sendDirectMessage(recipientPubkey, initialMessage)
      .then(async () => {
        // Odświeżamy listę konwersacji
        const updatedConversations = await nostrClient.getConversationsList();
        setConversations(updatedConversations);

        // Otwieramy nową konwersację
        navigate(`/messages/${recipientPubkey}`);
        setShowNewMessageForm(false);
      })
      .catch((err) => {
        console.error("Failed to start new conversation:", err);
        setError(t("messages.failedToStartConversation"));
      });
  };

  // Sprawdzamy czy użytkownik jest zalogowany
  if (!currentUser) {
    return (
      <div className="messages-container">
        <div className="messages-not-logged-in">
          <p>{t("messages.loginToAccessMessages")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h1>{t("messages.directMessages")}</h1>
        <button
          type="button"
          className="new-message-button"
          onClick={() => setShowNewMessageForm(true)}
        >
          {t("messages.newMessage")}
        </button>
      </div>

      {error && <div className="messages-error">{error}</div>}

      <div className="messages-content">
        <div className="conversations-sidebar">
          <ConversationList
            conversations={conversations}
            selectedPubkey={pubkey}
            loading={loading}
          />
        </div>

        <div className="conversation-main">
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
              messages={messages}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          ) : (
            <div className="no-conversation-selected">
              <p>{t("messages.selectConversation")}</p>
            </div>
          )}
        </div>
      </div>

      {showNewMessageForm && (
        <NewMessageForm
          onSubmit={handleStartNewConversation}
          onCancel={() => setShowNewMessageForm(false)}
          nostrClient={nostrClient}
        />
      )}
    </div>
  );
}

export default Messages;
