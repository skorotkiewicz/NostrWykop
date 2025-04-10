import { useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../utils/dateUtils";

function Comment({ comment, currentUser, nostrClient }) {
  const [votes, setVotes] = useState(comment.votes || 0);
  const [userVoted, setUserVoted] = useState(comment.userVoted || null);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [childComments, setChildComments] = useState(comment.replies || []);

  const handleVote = async (isUpvote) => {
    if (!currentUser) {
      alert("Musisz być zalogowany, aby głosować!");
      return;
    }

    try {
      await nostrClient.voteOnComment(comment.id, isUpvote);
      setVotes((prev) => (isUpvote ? prev + 1 : prev - 1));
      setUserVoted(isUpvote ? "up" : "down");
    } catch (error) {
      console.error("Failed to vote on comment:", error);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Musisz być zalogowany, aby odpowiedzieć!");
      return;
    }

    if (!replyContent.trim()) return;

    try {
      const reply = await nostrClient.addReply(comment.id, replyContent);
      setChildComments([...childComments, reply]);
      setReplyContent("");
      setReplying(false);
    } catch (error) {
      console.error("Failed to add reply:", error);
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
            to={`/profile/${comment.author.pubkey}`}
            className="comment-author"
          >
            {comment.author.name || comment.author.pubkey.substring(0, 8)}
          </Link>
          <span className="comment-time">{timeAgo(comment.createdAt)}</span>
        </div>

        <div className="comment-text">{comment.content}</div>

        <div className="comment-actions">
          {currentUser && (
            <button
              type="button"
              onClick={() => setReplying(!replying)}
              className="reply-btn"
            >
              {replying ? "Anuluj" : "Odpowiedz"}
            </button>
          )}
        </div>

        {replying && (
          <form className="reply-form" onSubmit={handleReplySubmit}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Napisz odpowiedź..."
              required
            />
            <button type="submit">Wyślij</button>
          </form>
        )}

        {childComments.length > 0 && (
          <div className="child-comments">
            {childComments.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                nostrClient={nostrClient}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Comment;
