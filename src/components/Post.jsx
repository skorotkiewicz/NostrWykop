import { Link } from "react-router-dom";
import { timeAgo } from "../utils/dateUtils";

function Post({ post, currentUser, onVote }) {
  const hasVoted = currentUser && post.userVoted;

  return (
    <div className="post">
      <div className="post-votes">
        <button
          type="button"
          className={`vote-btn upvote ${hasVoted === "up" ? "voted" : ""}`}
          onClick={() => onVote(post.id, true)}
          disabled={!currentUser || hasVoted === "up"}
        >
          ▲
        </button>
        <span className="votes-count">{post.votes}</span>
        <button
          type="button"
          className={`vote-btn downvote ${hasVoted === "down" ? "voted" : ""}`}
          onClick={() => onVote(post.id, false)}
          disabled={!currentUser || hasVoted === "down"}
        >
          ▼
        </button>
      </div>

      <div className="post-content">
        <h2 className="post-title">
          <Link to={`/post/${post.id}`}>{post.title}</Link>
        </h2>

        {post.image && (
          <div className="post-image">
            <img src={post.image} alt={post.title} />
          </div>
        )}

        <div className="post-summary">{post.summary}</div>

        <div className="post-meta">
          <span className="post-author">
            <Link to={`/profile/${post.author.pubkey}`}>
              {post.author.name || post.author.pubkey.substring(0, 8)}
            </Link>
          </span>
          <span className="post-time">{timeAgo(post.createdAt)}</span>
          <div className="post-tags">
            {post.tags.map((tag) => (
              <span key={tag} className="post-tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="post-stats">
          <span className="comments-count">
            <Link to={`/post/${post.id}`}>{post.commentsCount} komentarzy</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Post;
