import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import Post from "./Post";

function Search({ nostrClient, currentUser }) {
  const { t } = useTranslate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery || !nostrClient) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const searchResults = await nostrClient.searchPosts(searchQuery, {
          limit: 50,
          sort: "newest"
        });
        
        setResults(searchResults);
      } catch (err) {
        console.error("Search error:", err);
        setError(t('search.searchError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, nostrClient]);

  const handleVote = async (postId, isUpvote) => {
    if (!currentUser) {
      alert(t('search.loginToVote'));
      return;
    }

    try {
      await nostrClient.voteOnPost(postId, isUpvote);
      // Odśwież wyniki po głosowaniu
      setResults(
        results.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              votes: isUpvote ? post.votes + 1 : post.votes - 1,
              userVoted: isUpvote ? "up" : "down",
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  return (
    <div className="search-results">
      <h2>{t('search.searchResultsFor').replace('{query}', `"${searchQuery}"`)}</h2>
      
      {isLoading && <div className="loading">{t('search.searching')}</div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!isLoading && results.length === 0 && !error && (
        <div className="no-results">
          {t('search.noResultsFound').replace('{query}', `"${searchQuery}"`)}
        </div>
      )}
      
      <div className="posts-list">
        {results.map((post) => (
          <Post 
            key={post.id} 
            post={post} 
            currentUser={currentUser} 
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}

export default Search;