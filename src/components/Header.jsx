import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useTranslate from "../utils/useTranslate";
import ThemeToggle from "./ThemeToggle";
import NostrLogin from "./NostrLogin";
import AddPostModal from "./AddPostModal";

function Header({ currentUser, onLogin, onLogout, nostrClient }) {
  const { t } = useTranslate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          NostrWykop
        </Link>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder={t("search.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">🔍</button>
        </form>
      </div>
      <div className="header-right">
        <ThemeToggle />
        {currentUser ? (
          <>
            <Link
              to={`/profile/${currentUser.pubkey}`}
              className="user-profile"
            >
              {currentUser.name || currentUser.pubkey.substring(0, 8)}
            </Link>
            <button
              type="button"
              className="add-post-btn"
              onClick={() => setShowAddPostModal(true)}
            >
              + {t("post.addPost")}
            </button>
            <button type="button" onClick={onLogout} className="logout-btn">
              {t("header.logout")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="login-btn"
          >
            {t("header.login")}
          </button>
        )}
      </div>
      {showLoginModal && (
        <NostrLogin
          onLogin={onLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}
      {showAddPostModal && (
        <AddPostModal
          currentUser={currentUser}
          nostrClient={nostrClient}
          onClose={() => setShowAddPostModal(false)}
        />
      )}
    </header>
  );
}

export default Header;
