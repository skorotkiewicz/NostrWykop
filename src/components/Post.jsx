import { Link } from "react-router-dom";
import { timeAgo } from "../utils/dateUtils";
import useTranslate from "../utils/useTranslate";

function Post({ post, currentUser, onVote, compact = false }) {
  const { t } = useTranslate();
  const hasVoted = currentUser && post.userVoted;

  return (
    <div className={`post ${compact ? "post-compact" : ""}`}>
      <div className="post-votes">
        <button
          type="button"
          className={`vote-btn upvote ${hasVoted === "up" ? "voted" : ""}`}
          onClick={() => onVote?.(post.id, true)}
          disabled={!currentUser || hasVoted === "up"}
        >
          ▲
        </button>
        <span className="votes-count">{post.votes}</span>
        <button
          type="button"
          className={`vote-btn downvote ${hasVoted === "down" ? "voted" : ""}`}
          onClick={() => onVote?.(post.id, false)}
          disabled={!currentUser || hasVoted === "down"}
        >
          ▼
        </button>
      </div>

      <div className="post-content">
        <h2 className={`post-title ${compact ? "title-compact" : ""}`}>
          <Link to={`/post/${post.id}`}>{post.title}</Link>
        </h2>

        {!compact && post.image && (
          <div className="post-image">
            <img src={post.image} alt={post.title} />
          </div>
        )}

        {!compact && <div className="post-summary">{post.summary}</div>}

        <div className="post-meta">
          <span className="post-author">
            <Link to={`/profile/${post.author.pubkey}`}>
              {post.author.name || post.author.pubkey.substring(0, 8)}
            </Link>
          </span>
          <span className="post-time">{timeAgo(post.createdAt)}</span>
          {!compact && (
            <div className="post-tags">
              {post.tags?.map((tag) => (
                <span key={tag} className="post-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {!compact && (
          <div className="post-stats">
            <span className="comments-count">
              <Link to={`/post/${post.id}`}>
                {post.commentsCount}{" "}
                {post.commentsCount === 1
                  ? t("common.oneComment")
                  : post.commentsCount > 1 && post.commentsCount < 5
                    ? t("common.twoComments")
                    : t("common.comments")}
              </Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Post;
