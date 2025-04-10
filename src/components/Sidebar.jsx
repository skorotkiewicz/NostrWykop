import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import LanguageSwitcher from "./LanguageSwitcher";

function Sidebar({ nostrClient, currentUser }) {
  const { t } = useTranslate();
  const [popularTags, setPopularTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [activeFeed, setActiveFeed] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Ustaw aktywną zakładkę i feed na podstawie aktualnej ścieżki i parametrów
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const sortParam = searchParams.get("sort");

    // Obsługa głównych ścieżek i sortowania
    if (path === "/") {
      if (sortParam === "hot") {
        setActiveTab("hot");
      } else if (sortParam === "active") {
        setActiveTab("active");
      } else if (sortParam === "newest") {
        setActiveTab("latest");
      } else {
        setActiveTab("home");
      }
      setActiveFeed(null);
    }
    // Obsługa ścieżek /feed/*
    else if (path.startsWith("/feed/")) {
      setActiveTab(null);
      const feedType = path.split("/feed/")[1];
      setActiveFeed(feedType);
    }
    // Obsługa ścieżek /tag/*
    else if (path.startsWith("/tag/")) {
      setActiveTab(null);
      setActiveFeed(null);
    }
  }, [location]);

  useEffect(() => {
    const fetchPopularTags = async () => {
      if (!nostrClient?.connected) {
        return;
      }

      setIsLoading(true);
      try {
        // Pobierz wszystkie posty (limit maksymalny, aby zbierać więcej tagów)
        const filter = {
          kinds: [1, 30023],
          limit: 500,
        };

        const events = await nostrClient.pool.querySync(
          nostrClient.relays,
          filter,
        );

        // Zbierz wszystkie tagi z postów
        const tagsMap = new Map();

        for (const event of events) {
          const postTags = event.tags
            .filter((tag) => tag[0] === "t")
            .map((tag) => tag[1]);

          for (const tag of postTags) {
            if (tagsMap.has(tag)) {
              tagsMap.set(tag, tagsMap.get(tag) + 1);
            } else {
              tagsMap.set(tag, 1);
            }
          }
        }

        // Konwertuj mapę na tablicę obiektów
        const tagsArray = Array.from(tagsMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Ogranicz do 10 najpopularniejszych

        setPopularTags(tagsArray);
      } catch (error) {
        console.error("Failed to fetch popular tags:", error);
        // Jeśli nie udało się pobrać tagów, użyj przykładowych
        const fallbackTags = [
          { name: "technologia", count: 42 },
          { name: "polityka", count: 36 },
          { name: "humor", count: 28 },
          { name: "nauka", count: 25 },
          { name: "sport", count: 19 },
          { name: "nostr", count: 17 },
          { name: "krypto", count: 15 },
          { name: "film", count: 12 },
        ];
        setPopularTags(fallbackTags);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularTags();
  }, [nostrClient]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);

    switch (tab) {
      case "home":
        navigate("/");
        break;
      case "hot":
        navigate("/?sort=hot");
        break;
      case "active":
        navigate("/?sort=active");
        break;
      case "latest":
        navigate("/?sort=newest");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "home" ? "active" : ""}`}
              onClick={() => handleTabClick("home")}
            >
              {t("header.home")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "hot" ? "active" : ""}`}
              onClick={() => handleTabClick("hot")}
            >
              {t("feeds.hot")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "active" ? "active" : ""}`}
              onClick={() => handleTabClick("active")}
            >
              {t("feeds.active")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "latest" ? "active" : ""}`}
              onClick={() => handleTabClick("latest")}
            >
              {t("feeds.latest")}
            </button>
          </li>
          <li>
            <Link
              to="/messages"
              className={`nav-link ${location.pathname.startsWith("/messages") ? "active" : ""}`}
            >
              {t("feeds.messages")}
            </Link>
          </li>
        </ul>
      </nav>

      {currentUser && (
        <div className="user-feeds">
          <h3>{t("feeds.yourFeeds")}</h3>
          <ul>
            <li>
              <Link
                to="/feed/followed"
                className={activeFeed === "followed" ? "active" : ""}
                onClick={() => setActiveFeed("followed")}
              >
                {t("feeds.followedUsers")}
              </Link>
            </li>
            <li>
              <Link
                to="/feed/saved"
                className={activeFeed === "saved" ? "active" : ""}
                onClick={() => setActiveFeed("saved")}
              >
                {t("feeds.savedPosts")}
              </Link>
            </li>
            <li>
              <Link
                to="/feed/upvoted"
                className={activeFeed === "upvoted" ? "active" : ""}
                onClick={() => setActiveFeed("upvoted")}
              >
                {t("feeds.upvoted")}
              </Link>
            </li>
            <li>
              <Link
                to="/feed/downvoted"
                className={activeFeed === "downvoted" ? "active" : ""}
                onClick={() => setActiveFeed("downvoted")}
              >
                {t("feeds.downvoted")}
              </Link>
            </li>
          </ul>

          {activeFeed && (
            <div className="feed-sort">
              <span>{t("feeds.sort")}</span>
              <div className="sort-options">
                <button
                  type="button"
                  onClick={() => navigate(`/feed/${activeFeed}?sort=newest`)}
                  className={
                    location.search.includes("sort=newest") || !location.search
                      ? "active"
                      : ""
                  }
                >
                  {t("feeds.newest")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/feed/${activeFeed}?sort=hot`)}
                  className={
                    location.search.includes("sort=hot") ? "active" : ""
                  }
                >
                  {t("feeds.hot")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="popular-tags">
        <h3>{t("sidebar.popularTags")}</h3>
        {isLoading ? (
          <div className="loading-tags">{t("common.loadingTags")}</div>
        ) : (
          <ul>
            {popularTags.map((tag) => {
              const isActive = location.pathname === `/tag/${tag.name}`;
              return (
                <li key={tag.name}>
                  <Link
                    to={`/tag/${tag.name}`}
                    className={isActive ? "active" : ""}
                  >
                    #{tag.name} <span className="tag-count">({tag.count})</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {location.pathname.startsWith("/tag/") && (
          <div className="tag-sort">
            <span>{t("feeds.sortTag")}</span>
            <div className="sort-options">
              <button
                type="button"
                onClick={() => {
                  const tagName = location.pathname.split("/tag/")[1];
                  navigate(`/tag/${tagName}?sort=newest`);
                }}
                className={
                  location.search.includes("sort=newest") || !location.search
                    ? "active"
                    : ""
                }
              >
                {t("feeds.newest")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const tagName = location.pathname.split("/tag/")[1];
                  navigate(`/tag/${tagName}?sort=hot`);
                }}
                className={location.search.includes("sort=hot") ? "active" : ""}
              >
                {t("feeds.hot")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const tagName = location.pathname.split("/tag/")[1];
                  navigate(`/tag/${tagName}?sort=active`);
                }}
                className={
                  location.search.includes("sort=active") ? "active" : ""
                }
              >
                {t("feeds.active")}
              </button>
            </div>
          </div>
        )}
      </div>

      <LanguageSwitcher />

      <div className="sidebar-footer">
        <div className="about-section">
          <h3>{t("sidebar.about")}</h3>
          <p>{t("sidebar.aboutText")}</p>
        </div>
        <div className="social-links">
          <a
            href="https://github.com/twój-username/nostrwykop"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://nostr.com/twój-npub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nostr
          </a>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
