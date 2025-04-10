import { useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../utils/dateUtils";
import useTranslate from "../utils/useTranslate";

function Comment({
  comment,
  currentUser,
  nostrClient,
  onVote,
  showReplies = true,
}) {
  const { t } = useTranslate();
  const [votes, setVotes] = useState(comment.votes || 0);
  const [userVoted, setUserVoted] = useState(comment.userVoted || null);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [childComments, setChildComments] = useState(comment.replies || []);

  // Obsługa głosowania na komentarz
  const handleVote = async (isUpvote) => {
    if (!currentUser) {
      alert(t('comment.loginToVote'));
      return;
    }

    try {
      if (nostrClient) {
        await nostrClient.voteOnComment(comment.id, isUpvote);
      }

      // Aktualizuj lokalny stan głosów
      setVotes((prev) => (isUpvote ? prev + 1 : prev - 1));
      setUserVoted(isUpvote ? "up" : "down");

      // Jeśli przekazano funkcję onVote, wywołaj ją
      if (onVote) {
        onVote(comment.id, isUpvote);
      }
    } catch (error) {
      console.error(t('comment.failedToVote'), error);
    }
  };

  // Obsługa wysyłania odpowiedzi
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !nostrClient) {
      alert(t('comment.loginToReply'));
      return;
    }

    if (!replyContent.trim()) return;

    try {
      const reply = await nostrClient.addReply(comment.id, replyContent);
      setChildComments([...childComments, reply]);
      setReplyContent("");
      setReplying(false);
    } catch (error) {
      console.error(t('comment.failedToReply'), error);
    }
  };

  return (
    <div className="comment">
      <div className="comment-votes">
        <button
          type="button"
          className={`vote-btn upvote ${userVoted === "up" ? "voted" : ""}`}
          onClick={() => handleVote(true)}
          disabled={!currentUser || userVoted === "up"}
        >
          ▲
        </button>
        <span className="votes-count">{votes}</span>
        <button
          type="button"
          className={`vote-btn downvote ${userVoted === "down" ? "voted" : ""}`}
          onClick={() => handleVote(false)}
          disabled={!currentUser || userVoted === "down"}
        >
          ▼
        </button>
      </div>

      <div className="comment-content">
        <div className="comment-header">
          <Link
            to={`/profile/${comment?.author?.pubkey}`}
            className="comment-author"
          >
            {comment?.author?.name || comment?.author?.pubkey.substring(0, 8)}
          </Link>
          <span className="comment-time">{timeAgo(comment.createdAt)}</span>
        </div>

        <div className="comment-text">{comment.content}</div>

        <div className="comment-actions">
          {currentUser && nostrClient && (
            <button
              type="button"
              onClick={() => setReplying(!replying)}
              className="reply-btn"
            >
              {replying ? t('comment.cancel') : t('comment.reply')}
            </button>
          )}
        </div>

        {replying && (
          <form className="reply-form" onSubmit={handleReplySubmit}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t('comment.writeReply')}
              required
            />
            <button type="submit">{t('comment.send')}</button>
          </form>
        )}

        {showReplies && childComments.length > 0 && (
          <div className="child-comments">
            {childComments.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                nostrClient={nostrClient}
                onVote={onVote}
                showReplies={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Comment;
