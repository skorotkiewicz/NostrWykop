import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Sidebar({ nostrClient, currentUser }) {
  const [popularTags, setPopularTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Ustaw aktywną zakładkę na podstawie aktualnej ścieżki
    const path = location.pathname;
    if (path === "/") {
      setActiveTab("home");
    } else if (path === "/hot") {
      setActiveTab("hot");
    } else if (path === "/active") {
      setActiveTab("active");
    } else if (path === "/latest") {
      setActiveTab("latest");
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
              Strona główna
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "hot" ? "active" : ""}`}
              onClick={() => handleTabClick("hot")}
            >
              Gorące
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "active" ? "active" : ""}`}
              onClick={() => handleTabClick("active")}
            >
              Aktywne
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === "latest" ? "active" : ""}`}
              onClick={() => handleTabClick("latest")}
            >
              Najnowsze
            </button>
          </li>
        </ul>
      </nav>

      {currentUser && (
        <div className="user-feeds">
          <h3>Twoje feedy</h3>
          <ul>
            <li>
              <Link to="/feed/followed">Obserwowani użytkownicy</Link>
            </li>
            <li>
              <Link to="/feed/saved">Zapisane posty</Link>
            </li>
            <li>
              <Link to="/feed/upvoted">Wykopane</Link>
            </li>
            <li>
              <Link to="/feed/downvoted">Zakopane</Link>
            </li>
          </ul>
        </div>
      )}

      <div className="popular-tags">
        <h3>Popularne tagi</h3>
        {isLoading ? (
          <div className="loading-tags">Ładowanie tagów...</div>
        ) : (
          <ul>
            {popularTags.map((tag) => (
              <li key={tag.name}>
                <Link to={`/tag/${tag.name}`}>
                  #{tag.name} <span className="tag-count">({tag.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="about-section">
          <h3>O NostrWykop</h3>
          <p>
            NostrWykop to społecznościowy serwis oparty na protokole Nostr,
            umożliwiający wykopywanie i zakopywanie interesujących treści z
            sieci.
          </p>
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
