import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Post from "./Post";

function Profile({ nostrClient, currentUser }) {
  const { pubkey } = useParams();
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Pobierz profil użytkownika
        const profileData = await nostrClient.getUserProfile(pubkey);
        setProfile(profileData);

        // Pobierz posty użytkownika
        const posts = await nostrClient.getUserPosts(pubkey);
        setUserPosts(posts);

        // Sprawdź czy zalogowany użytkownik obserwuje profil
        if (currentUser) {
          const following = await nostrClient.isFollowing(
            currentUser.pubkey,
            pubkey,
          );
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (nostrClient && pubkey) {
      fetchProfileData();
    }
  }, [nostrClient, pubkey, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      alert("Musisz być zalogowany, aby obserwować użytkowników!");
      return;
    }

    try {
      if (isFollowing) {
        await nostrClient.unfollowUser(pubkey);
      } else {
        await nostrClient.followUser(pubkey);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error);
    }
  };

  const handleVote = async (postId, isUpvote) => {
    if (!currentUser) {
      alert("Musisz być zalogowany, aby głosować!");
      return;
    }

    try {
      await nostrClient.voteOnPost(postId, isUpvote);
      // Aktualizuj posty po głosowaniu
      setUserPosts(
        userPosts.map((post) => {
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

  if (isLoading) {
    return <div className="loading">Ładowanie profilu użytkownika...</div>;
  }

  if (!profile) {
    return <div className="not-found">Profil nie został znaleziony</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name || "Avatar"} />
          ) : (
            <div className="default-avatar">
              {profile.name?.[0] || pubkey[0]}
            </div>
          )}
        </div>

        <div className="profile-info">
          <h1 className="profile-name">
            {profile.name || pubkey.substring(0, 8)}
          </h1>
          {profile.about && <p className="profile-about">{profile.about}</p>}

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{profile.postsCount || 0}</span>
              <span className="stat-label">Posty</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followersCount || 0}</span>
              <span className="stat-label">Obserwujący</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followingCount || 0}</span>
              <span className="stat-label">Obserwuje</span>
            </div>
          </div>

          {currentUser && currentUser.pubkey !== pubkey && (
            <button
              type="button"
              onClick={handleFollow}
              className={`follow-btn ${isFollowing ? "following" : ""}`}
            >
              {isFollowing ? "Obserwujesz" : "Obserwuj"}
            </button>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          type="button"
          className={`tab ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          Posty
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => setActiveTab("comments")}
        >
          Komentarze
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "votes" ? "active" : ""}`}
          onClick={() => setActiveTab("votes")}
        >
          Zakopane/Wykopane
        </button>
      </div>

      <div className="profile-content">
        {activeTab === "posts" && (
          <div className="user-posts">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onVote={handleVote}
                />
              ))
            ) : (
              <div className="no-posts">
                Ten użytkownik nie dodał jeszcze żadnych postów
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="user-comments">
            <p>Tutaj będą wyświetlane komentarze użytkownika</p>
            {/* Implementacja listy komentarzy */}
          </div>
        )}

        {activeTab === "votes" && (
          <div className="user-votes">
            <p>
              Tutaj będą wyświetlane posty wykopane/zakopane przez użytkownika
            </p>
            {/* Implementacja listy głosowanych postów */}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
