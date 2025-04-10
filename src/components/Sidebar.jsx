import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Sidebar() {
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    // Tutaj możemy pobrać popularne tagi z API lub ustawić przykładowe
    const mockPopularTags = [
      { name: "technologia", count: 342 },
      { name: "polityka", count: 256 },
      { name: "humor", count: 198 },
      { name: "nauka", count: 167 },
      { name: "sport", count: 145 },
      { name: "gry", count: 121 },
      { name: "filmy", count: 89 },
      { name: "muzyka", count: 76 },
    ];

    setPopularTags(mockPopularTags);
  }, []);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/">Strona główna</Link>
          </li>
          <li>
            <Link to="/mikroblog">Mikroblog</Link>
          </li>
          <li>
            <Link to="/hity">Hity</Link>
          </li>
          <li>
            <Link to="/wykopalisko">Wykopalisko</Link>
          </li>
        </ul>
      </nav>

      <div className="popular-tags">
        <h3>Popularne tagi</h3>
        <ul>
          {popularTags.map((tag) => (
            <li key={tag.name}>
              <Link to={`/tag/${tag.name}`}>
                #{tag.name} <span className="tag-count">({tag.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
