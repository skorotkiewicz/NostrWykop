import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Comment from "../components/Comment";
import { timeAgo } from "../utils/dateUtils";
import useTranslate from "../utils/useTranslate";

function PostDetail({ nostrClient, currentUser }) {
  const { t } = useTranslate();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const fetchPostDetails = async () => {
      setIsLoading(true);
      try {
        // Pobierz szczegóły posta
        const postData = await nostrClient.getPostById(id);
        setPost(postData);

        // Pobierz komentarze do posta
        const postComments = await nostrClient.getComments(id);
        setComments(postComments);
      } catch (error) {
        console.error("Failed to fetch post details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (nostrClient && id) {
      fetchPostDetails();
    }
  }, [nostrClient, id]);

  const handleVote = async (isUpvote) => {
    if (!currentUser) {
      alert(t("post.loginToVote"));
      return;
    }

    try {
      await nostrClient.voteOnPost(id, isUpvote);
      // Aktualizuj stan posta po głosowaniu
      setPost((prev) => ({
        ...prev,
        votes: isUpvote ? prev.votes + 1 : prev.votes - 1,
        userVoted: isUpvote ? "up" : "down",
      }));
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert(t("post.loginToComment"));
      return;
    }

    if (!newComment.trim()) return;

    try {
      const comment = await nostrClient.addComment(id, newComment);
      setComments([comment, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  if (isLoading) {
    return <div className="loading">{t("post.loadingPostDetails")}</div>;
  }

  if (!post) {
    return <div className="not-found">{t("post.postNotFound")}</div>;
  }

  return (
    <div className="post-detail">
      <div className="post-detail-header">
        <div className="post-votes">
          <button
            type="button"
            className={`vote-btn upvote ${post.userVoted === "up" ? "voted" : ""}`}
            onClick={() => handleVote(true)}
            disabled={!currentUser || post.userVoted === "up"}
          >
            ▲
          </button>
          <span className="votes-count">{post.votes}</span>
          <button
            type="button"
            className={`vote-btn downvote ${post.userVoted === "down" ? "voted" : ""}`}
            onClick={() => handleVote(false)}
            disabled={!currentUser || post.userVoted === "down"}
          >
            ▼
          </button>
        </div>

        <h1 className="post-title">{post.title}</h1>
      </div>

      {post.image && (
        <div className="post-image">
          <img src={post.image} alt={post.title} />
        </div>
      )}

      <div className="post-content">{post.content}</div>

      <div className="post-author-container">
        <div className="comment">
          <div className="comment-content">
            <div
              className="comment-header"
              style={{ display: "flex", alignItems: "center" }}
            >
              <Link
                to={`/profile/${post.author.pubkey}`}
                className="comment-author"
                style={{
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={" "}
                    className="author-avatar"
                  />
                ) : (
                  <span className="author-avatar default-avatar">
                    {post.author.name?.[0] || post.author.pubkey[0]}
                  </span>
                )}
                <span className="author-name" style={{ marginRight: "5px" }}>
                  {post.author.name || post.author.pubkey.substring(0, 8)}
                </span>
              </Link>
              <span
                className="post-time"
                style={{ fontSize: "12px", color: "#666" }}
              >
                {timeAgo(post.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="post-tags">
        {post.tags.map((tag) => (
          <Link key={tag} to={`/tag/${tag}`} className="post-tag post-Tager">
            #{tag}
          </Link>
        ))}
      </div>

      <div className="comments-section">
        <h2>
          {t("post.comments")} ({comments.length})
        </h2>

        {currentUser && (
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("post.writeComment")}
              required
            />
            <button type="submit">{t("post.addComment")}</button>
          </form>
        )}

        <div className="comments-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                nostrClient={nostrClient}
              />
            ))
          ) : (
            <div className="no-comments">{t("post.noComments")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostDetail;
