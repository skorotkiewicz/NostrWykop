import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import Post from "../components/Post";
import TagsFilter from "../components/TagsFilter";

function MainFeed({ nostrClient, currentUser, feedType }) {
  const { t } = useTranslate();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hot");
  const [selectedTags, setSelectedTags] = useState([]);
  const [page, setPage] = useState(1);
  const [feedTitle, setFeedTitle] = useState("");

  const { type, tag } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Określ parametry sortowania na podstawie URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sortParam = searchParams.get("sort");

    if (sortParam === "hot") {
      setActiveTab("hot");
    } else if (sortParam === "active") {
      setActiveTab("active");
    } else if (sortParam === "newest") {
      setActiveTab("newest");
    } else if (!sortParam && location.pathname === "/") {
      setActiveTab("hot"); // domyślnie "hot" dla strony głównej
    } else if (!sortParam) {
      setActiveTab("newest"); // domyślnie "newest" dla innych stron
    }
  }, [location]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        let fetchedPosts = [];

        // Główny feed
        if (!feedType) {
          fetchedPosts = await nostrClient.getPosts({
            limit: 20,
            since: Date.now() - 86400000 * 7, // ostatnie 7 dni
            tags: selectedTags,
            sort: activeTab,
          });
          setFeedTitle("");
        }
        // Feed tagów
        else if (feedType === "tag" && tag) {
          fetchedPosts = await nostrClient.getPosts({
            limit: 20,
            since: Date.now() - 86400000 * 30, // ostatnie 30 dni dla tagów
            tags: [tag],
            sort: activeTab,
          });
          setFeedTitle(t("feeds.tagHeading").replace("{tag}", tag));
        }
        // Feedy użytkownika
        else if (feedType === "user" && type) {
          switch (type) {
            case "followed":
              // Pobieranie postów od obserwowanych użytkowników
              if (currentUser) {
                // Pobieramy listę obserwowanych użytkowników
                const followingList = await nostrClient.getFollowingList(
                  currentUser.pubkey,
                );
                if (followingList.length > 0) {
                  fetchedPosts = await nostrClient.getPostsByAuthors(
                    followingList,
                    {
                      limit: 20,
                      sort: activeTab,
                    },
                  );
                }
              }
              setFeedTitle(t("feeds.followedUsersHeading"));
              break;

            case "upvoted":
              // Pobieranie postów, które użytkownik wykopał
              if (currentUser) {
                fetchedPosts = await nostrClient.getUserVotedPosts(
                  currentUser.pubkey,
                  true,
                );
              }
              setFeedTitle(t("feeds.upvotedHeading"));
              break;

            case "downvoted":
              // Pobieranie postów, które użytkownik zakopał
              if (currentUser) {
                fetchedPosts = await nostrClient.getUserVotedPosts(
                  currentUser.pubkey,
                  false,
                );
              }
              setFeedTitle(t("feeds.downvotedHeading"));
              break;

            case "saved":
              // Pobieranie zapisanych postów (implementacja zależy od tego jak zapiszesz posty)
              if (currentUser) {
                fetchedPosts = await nostrClient.getSavedPosts(
                  currentUser.pubkey,
                );
              }
              setFeedTitle(t("feeds.savedHeading"));
              break;

            default:
              fetchedPosts = await nostrClient.getPosts({
                limit: 20,
                sort: activeTab,
              });
          }
        }

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
  }, [
    nostrClient,
    activeTab,
    selectedTags,
    page,
    feedType,
    type,
    tag,
    currentUser,
  ]);

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
      alert(t("feeds.loginToVote"));
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

  // Obsługa kliknięcia w tab sortowania - aktualizuje URL
  const handleTabClick = (tab) => {
    let url = "";

    if (feedType === "tag" && tag) {
      url = `/tag/${tag}?sort=${tab}`;
    } else if (feedType === "user" && type) {
      url = `/feed/${type}?sort=${tab}`;
    } else {
      url = `/?sort=${tab}`;
    }

    navigate(url);
  };

  return (
    <div className="main-feed">
      {feedTitle && <h2 className="feed-title">{feedTitle}</h2>}

      <div className="feed-tabs">
        <button
          type="button"
          className={`tab ${activeTab === "hot" ? "active" : ""}`}
          onClick={() => handleTabClick("hot")}
        >
          {t("feeds.hot")}
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "newest" ? "active" : ""}`}
          onClick={() => handleTabClick("newest")}
        >
          {t("feeds.newest")}
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => handleTabClick("active")}
        >
          {t("feeds.active")}
        </button>
      </div>

      {!feedType && (
        <TagsFilter selectedTags={selectedTags} onTagSelect={handleTagSelect} />
      )}

      {isLoading ? (
        <div className="loading">{t("feeds.loadingPosts")}</div>
      ) : (
        <div className="posts-list">
          {posts.length > 0 ? (
            posts.map((post, key) => (
              <Post
                key={`${post.id}-${key}`}
                post={post}
                currentUser={currentUser}
                onVote={handleVote}
              />
            ))
          ) : (
            <div className="no-posts">
              {feedType === "user"
                ? t("feeds.noPosts")
                : t("feeds.noPostsToShow")}
            </div>
          )}
        </div>
      )}

      <div className="pagination">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          {t("feeds.previous")}
        </button>
        <span>{t("feeds.page").replace("{page}", page)}</span>
        <button type="button" onClick={() => setPage(page + 1)}>
          {t("feeds.next")}
        </button>
      </div>
    </div>
  );
}

export default MainFeed;
