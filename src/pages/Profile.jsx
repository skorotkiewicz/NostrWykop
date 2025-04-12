import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import Post from "../components/Post";
import Comment from "../components/Comment";
import UserList from "../components/UserList";

function Profile({ nostrClient, currentUser }) {
  const { t } = useTranslate();
  const { pubkey } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    avatar: "",
    about: "",
    nip05: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [profileStats, setProfileStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Pobierz profil użytkownika
        const profileData = await nostrClient.getUserProfile(pubkey);
        setProfile(profileData);

        // Ustaw dane formularza na podstawie pobranego profilu
        setProfileForm({
          name: profileData.name || "",
          avatar: profileData.avatar || "",
          about: profileData.about || "",
          nip05: profileData.nip05 || "",
        });

        // Pobierz posty użytkownika
        const posts = await nostrClient.getUserPosts(pubkey);
        setUserPosts(posts);

        // Pobierz komentarze użytkownika
        const comments = await fetchUserComments(pubkey);
        setUserComments(comments);

        // Pobierz głosy użytkownika
        const votes = await fetchUserVotes(pubkey);
        setUserVotes(votes);

        // Pobierz statystyki użytkownika
        const stats = await fetchProfileStats(pubkey);
        setProfileStats(stats);

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

  // Pobieranie komentarzy użytkownika
  const fetchUserComments = async (userPubkey) => {
    try {
      // Pobieramy komentarze (kind 1) z tagiem 'e' (odpowiedzi na posty/komentarze)
      // które zostały stworzone przez danego użytkownika
      const filter = {
        kinds: [1],
        authors: [userPubkey],
        limit: 50,
      };

      const events = await nostrClient.pool.querySync(
        nostrClient.relays,
        filter,
      );

      // Filtrujemy tylko te wydarzenia, które mają tag 'e' (są komentarzami)
      const commentEvents = events.filter((event) =>
        event.tags.some((tag) => tag[0] === "e"),
      );

      // Przekształcamy wydarzenia w komentarze
      const comments = await Promise.all(
        commentEvents.map(async (event) => {
          // Znajdź ID posta/komentarza, na który to jest odpowiedź
          const replyTo = event.tags.find((tag) => tag[0] === "e")?.[1];

          // Pobieramy informacje o poście, na który to jest odpowiedź
          let parentPost = null;
          try {
            parentPost = await nostrClient.getPostById(replyTo);
          } catch (error) {
            // Jeśli nie udało się pobrać posta, to prawdopodobnie to jest odpowiedź na komentarz
          }

          // Pobieramy liczbę głosów dla komentarza
          const votes = await nostrClient._getVotesCount(event.id);

          return {
            id: event.id,
            content: event.content,
            createdAt: event.created_at * 1000,
            author: profile,
            votes,
            parentId: replyTo,
            parentPost,
          };
        }),
      );

      // Sortujemy komentarze według czasu utworzenia (od najnowszego)
      return comments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to fetch user comments:", error);
      return [];
    }
  };

  // Pobieranie głosów użytkownika
  const fetchUserVotes = async (userPubkey) => {
    try {
      // Pobieramy reakcje (kind 7) stworzone przez danego użytkownika
      const filter = {
        kinds: [7],
        authors: [userPubkey],
        limit: 100,
      };

      const events = await nostrClient.pool.querySync(
        nostrClient.relays,
        filter,
      );

      // Mapujemy wydarzenia do informacji o głosach
      const votesInfo = await Promise.all(
        events.map(async (event) => {
          // Znajdź ID posta, na który został oddany głos
          const postId = event.tags.find((tag) => tag[0] === "e")?.[1];
          if (!postId) return null;

          // Pobieramy informacje o poście
          let post = null;
          try {
            post = await nostrClient.getPostById(postId);
          } catch (error) {
            return null; // Pomijamy, jeśli nie można pobrać posta
          }

          return {
            id: event.id,
            postId,
            isUpvote: event.content === "+",
            createdAt: event.created_at * 1000,
            post,
          };
        }),
      );

      // Filtrujemy null i sortujemy według czasu głosowania (od najnowszego)
      return votesInfo
        .filter((vote) => vote !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to fetch user votes:", error);
      return [];
    }
  };

  // Pobieranie statystyk profilu
  const fetchProfileStats = async (userPubkey) => {
    try {
      // Pobieramy listę obserwujących
      let followersCount = 0;

      // Pobieramy listę obserwowanych
      let followingCount = 0;

      // Pobieramy listy obserwowanych (kind 3) innych użytkowników, aby policzyć obserwujących
      const followerFilter = {
        kinds: [3],
        "#p": [userPubkey],
        limit: 1000,
      };

      const followerEvents = await nostrClient.pool.querySync(
        nostrClient.relays,
        followerFilter,
      );
      followersCount = followerEvents.length;

      // Pobieramy listę obserwowanych przez użytkownika
      const followingFilter = {
        kinds: [3],
        authors: [userPubkey],
        limit: 1,
      };

      const followingEvents = await nostrClient.pool.querySync(
        nostrClient.relays,
        followingFilter,
      );

      if (followingEvents.length > 0) {
        // Zliczamy tagi 'p' w najnowszym zdarzeniu kind 3
        followingCount = followingEvents[0].tags.filter(
          (tag) => tag[0] === "p",
        ).length;
      }

      // Pobieramy posty, aby uzyskać ich liczbę
      const postsFilter = {
        authors: [userPubkey],
        kinds: [1, 30023],
      };

      const postEvents = await nostrClient.pool.querySync(
        nostrClient.relays,
        postsFilter,
      );
      const postsCount = postEvents.length;

      return {
        postsCount,
        followersCount,
        followingCount,
      };
    } catch (error) {
      console.error("Failed to fetch profile stats:", error);
      return {
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      };
    }
  };

  const handleShowFollowers = async () => {
    setIsLoadingUsers(true);
    setActiveTab("followers");
    try {
      if (followers.length === 0) {
        const followersProfiles =
          await nostrClient.getFollowersProfiles(pubkey);
        setFollowers(followersProfiles);
      }
    } catch (error) {
      console.error("Failed to fetch followers:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleShowFollowing = async () => {
    setIsLoadingUsers(true);
    setActiveTab("following");
    try {
      if (following.length === 0) {
        const followingProfiles =
          await nostrClient.getFollowingProfiles(pubkey);
        setFollowing(followingProfiles);
      }
    } catch (error) {
      console.error("Failed to fetch following:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      alert(t("profile.loginToFollow"));
      return;
    }

    try {
      if (isFollowing) {
        await nostrClient.unfollowUser(pubkey);
      } else {
        await nostrClient.followUser(pubkey);
      }
      setIsFollowing(!isFollowing);

      // Aktualizuj licznik obserwujących
      setProfileStats((prev) => ({
        ...prev,
        followersCount: isFollowing
          ? prev.followersCount - 1
          : prev.followersCount + 1,
      }));
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      alert(t("profile.loginToMessage"));
      return;
    }

    // Nawigacja do strony wiadomości z wybranym użytkownikiem
    navigate(`/messages/${pubkey}`);
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setActiveTab("edit");
  };

  const handleCancelEdit = () => {
    // Przywróć dane formularza do stanu początkowego
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        avatar: profile.avatar || "",
        about: profile.about || "",
        nip05: profile.nip05 || "",
      });
    }
    setIsEditingProfile(false);
    setActiveTab("posts");
    setError(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert(t("profile.loginToEdit"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedProfile = await nostrClient.updateProfile({
        name: profileForm.name,
        avatar: profileForm.avatar,
        about: profileForm.about,
        nip05: profileForm.nip05,
      });

      setProfile(updatedProfile);
      setIsEditingProfile(false);
      setActiveTab("posts");
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError(t("profile.updateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (postId, isUpvote) => {
    if (!currentUser) {
      alert(t("profile.loginToVote"));
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

  const handleCommentVote = async (commentId, isUpvote) => {
    if (!currentUser) {
      alert(t("profile.loginToVote"));
      return;
    }

    try {
      await nostrClient.voteOnComment(commentId, isUpvote);
      // Aktualizuj komentarze po głosowaniu
      setUserComments(
        userComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              votes: isUpvote ? comment.votes + 1 : comment.votes - 1,
              userVoted: isUpvote ? "up" : "down",
            };
          }
          return comment;
        }),
      );
    } catch (error) {
      console.error("Failed to vote on comment:", error);
    }
  };

  if (isLoading) {
    return <div className="loading">{t("profile.loadingProfile")}</div>;
  }

  if (!profile) {
    return <div className="not-found">{t("profile.profileNotFound")}</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name || t("profile.avatar")}
            />
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
          {profile.nip05 && <p className="profile-nip05">{profile.nip05}</p>}
          {profile.about && <p className="profile-about">{profile.about}</p>}

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{profileStats.postsCount}</span>
              <span className="stat-label">{t("profile.posts")}</span>
            </div>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <div
              className="stat clickable"
              onClick={() => handleShowFollowers()}
            >
              <span className="stat-value">{profileStats.followersCount}</span>
              <span className="stat-label">{t("profile.followers")}</span>
            </div>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <div
              className="stat clickable"
              onClick={() => handleShowFollowing()}
            >
              <span className="stat-value">{profileStats.followingCount}</span>
              <span className="stat-label">{t("profile.following")}</span>
            </div>
          </div>

          {currentUser && currentUser.pubkey !== pubkey ? (
            <div className="profile-actions">
              <button
                type="button"
                onClick={handleFollow}
                className={`follow-btn ${isFollowing ? "following" : ""}`}
              >
                {isFollowing ? t("profile.youFollow") : t("profile.follow")}
              </button>
              <button
                type="button"
                onClick={handleMessage}
                className="message-btn"
              >
                {t("profile.sendMessage")}
              </button>
            </div>
          ) : (
            currentUser &&
            currentUser.pubkey === pubkey && (
              <div className="profile-actions">
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="edit-profile-btn"
                >
                  {t("profile.editProfile")}
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          type="button"
          className={`tab ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          {t("profile.posts")} ({userPosts.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => setActiveTab("comments")}
        >
          {t("profile.comments")} ({userComments.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "votes" ? "active" : ""}`}
          onClick={() => setActiveTab("votes")}
        >
          {t("profile.votedPosts")} ({userVotes.length})
        </button>
        {activeTab === "followers" && (
          <button type="button" className="tab active">
            {t("profile.followers")} ({followers.length})
          </button>
        )}
        {activeTab === "following" && (
          <button type="button" className="tab active">
            {t("profile.following")} ({following.length})
          </button>
        )}
        {activeTab === "edit" && (
          <button type="button" className="tab active">
            {t("profile.editProfile")}
          </button>
        )}
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
              <div className="no-content">{t("profile.noPosts")}</div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="user-comments">
            {userComments.length > 0 ? (
              userComments.map((comment) => (
                <div key={comment.id} className="comment-with-context">
                  {comment.parentPost && (
                    <div className="parent-context">
                      <Link to={`/post/${comment.parentPost.id}`}>
                        <h4>{comment.parentPost.title}</h4>
                        <p className="post-author">
                          {t("profile.by")}{" "}
                          {comment.parentPost.author.name ||
                            comment.parentPost.author.pubkey.substring(0, 8)}
                        </p>
                      </Link>
                    </div>
                  )}
                  <Comment
                    comment={comment}
                    currentUser={currentUser}
                    onVote={handleCommentVote}
                    showReplies={false}
                  />
                </div>
              ))
            ) : (
              <div className="no-content">{t("profile.noComments")}</div>
            )}
          </div>
        )}

        {activeTab === "votes" && (
          <div className="user-votes">
            {userVotes.length > 0 ? (
              userVotes.map((vote) => (
                <div key={vote.id} className="voted-post">
                  <div
                    className={`vote-indicator ${vote.isUpvote ? "upvote" : "downvote"}`}
                  >
                    {vote.isUpvote
                      ? t("profile.upvoted")
                      : t("profile.downvoted")}
                  </div>
                  {vote.post && (
                    <Post
                      key={vote.post.id}
                      post={vote.post}
                      currentUser={currentUser}
                      onVote={handleVote}
                      compact={true}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="no-content">{t("profile.noVotes")}</div>
            )}
          </div>
        )}

        {activeTab === "followers" && (
          <UserList
            users={followers}
            isLoading={isLoadingUsers}
            title={t("profile.followersTab")}
          />
        )}

        {activeTab === "following" && (
          <UserList
            users={following}
            isLoading={isLoadingUsers}
            title={t("profile.followingTab")}
          />
        )}

        {activeTab === "edit" && (
          <div className="edit-profile-form">
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label htmlFor="name">{t("profile.name")}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileForm.name}
                  onChange={handleFormChange}
                  placeholder={t("profile.namePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="avatar">{t("profile.avatar")}</label>
                <input
                  type="url"
                  id="avatar"
                  name="avatar"
                  value={profileForm.avatar}
                  onChange={handleFormChange}
                  placeholder={t("profile.avatarPlaceholder")}
                />
                {profileForm.avatar && (
                  <div className="avatar-preview">
                    <img
                      src={profileForm.avatar}
                      alt={t("profile.avatarPreview")}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="about">{t("profile.about")}</label>
                <textarea
                  id="about"
                  name="about"
                  value={profileForm.about}
                  onChange={handleFormChange}
                  placeholder={t("profile.aboutPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="nip05">{t("profile.nip05")}</label>
                <input
                  type="text"
                  id="nip05"
                  name="nip05"
                  value={profileForm.nip05}
                  onChange={handleFormChange}
                  placeholder={t("profile.nip05Placeholder")}
                />
                <small className="nip05-info">{t("profile.nip05Info")}</small>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("profile.saving")
                    : t("profile.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
