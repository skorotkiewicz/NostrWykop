import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function UserList({ users, isLoading, title }) {
  if (isLoading) {
    return <div className="loading">Ładowanie użytkowników...</div>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="no-content">
        Brak użytkowników do wyświetlenia
      </div>
    );
  }

  return (
    <div className="user-list">
      <h2>{title}</h2>
      <div className="users-grid">
        {users.map((user) => (
          <Link to={`/profile/${user.pubkey}`} key={user.pubkey} className="user-card">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name || "Avatar"} />
              ) : (
                <div className="default-avatar">
                  {user.name?.[0] || user.pubkey[0]}
                </div>
              )}
            </div>
            <div className="user-info">
              <h3 className="user-name">{user.name || user.pubkey.substring(0, 8)}</h3>
              {user.nip05 && <p className="user-nip05">{user.nip05}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default UserList;