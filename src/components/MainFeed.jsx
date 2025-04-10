import { useState, useEffect } from "react";
import Post from "./Post";
import TagsFilter from "./TagsFilter";

function MainFeed({ nostrClient, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hot");
  const [selectedTags, setSelectedTags] = useState([]);
  const [page, setPage] = useState(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const fetchedPosts = await nostrClient.getPosts({
          limit: 20,
          since: Date.now() - 86400000 * 7, // ostatnie 7 dni
          tags: selectedTags,
          sort: activeTab,
        });
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (nostrClient) {
      fetchPosts();
    }
  }, [nostrClient, activeTab, selectedTags, page]);

  const handleTagSelect = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    setPage(1); // Reset strony po zmianie tagów
  };

  const handleVote = async (postId, isUpvote) => {
    if (!currentUser) {
      alert("Musisz być zalogowany, aby głosować!");
      return;
    }

    try {
      await nostrClient.voteOnPost(postId, isUpvote);
      // Odśwież posty po głosowaniu
      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              votes: isUpvote ? post.votes + 1 : post.votes - 1,
              userVoted: isUpvote ? "up" : "down",
            };
          }
          return post;
        }),
      );
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  return (
    <div className="main-feed">
      <div className="feed-tabs">
        <button
          type="button"
          className={`tab ${activeTab === "hot" ? "active" : ""}`}
          onClick={() => setActiveTab("hot")}
        >
          Gorące
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "newest" ? "active" : ""}`}
          onClick={() => setActiveTab("newest")}
        >
          Najnowsze
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Aktywne
        </button>
      </div>

      <TagsFilter selectedTags={selectedTags} onTagSelect={handleTagSelect} />

      {isLoading ? (
        <div className="loading">Ładowanie postów...</div>
      ) : (
        <div className="posts-list">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                currentUser={currentUser}
                onVote={handleVote}
              />
            ))
          ) : (
            <div className="no-posts">Brak postów do wyświetlenia</div>
          )}
        </div>
      )}

      <div className="pagination">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Poprzednia
        </button>
        <span>Strona {page}</span>
        <button type="button" onClick={() => setPage(page + 1)}>
          Następna
        </button>
      </div>
    </div>
  );
}

export default MainFeed;
