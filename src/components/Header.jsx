import { useState } from "react";
import { Link } from "react-router-dom";
import NostrLogin from "./NostrLogin";

function Header({ currentUser, onLogin, onLogout }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          NostrWykop
        </Link>
        <div className="search-bar">
          <input type="text" placeholder="Szukaj..." />
          <button type="submit">🔍</button>
        </div>
      </div>
      <div className="header-right">
        {currentUser ? (
          <>
            <Link
              to={`/profile/${currentUser.pubkey}`}
              className="user-profile"
            >
              {currentUser.name || currentUser.pubkey.substring(0, 8)}
            </Link>
            <button type="button" className="add-post-btn">
              + Dodaj post
            </button>
            <button type="button" onClick={onLogout} className="logout-btn">
              Wyloguj
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="login-btn"
          >
            Zaloguj się
          </button>
        )}
      </div>
      {showLoginModal && (
        <NostrLogin
          onLogin={onLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </header>
  );
}

export default Header;
