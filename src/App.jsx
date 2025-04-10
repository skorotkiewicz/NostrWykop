import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MainFeed from "./components/MainFeed";
import PostDetail from "./components/PostDetail";
import Profile from "./components/Profile";
import NostrClient from "./services/NostrClient";
import "./App.css";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nostrClient, setNostrClient] = useState(null);

  useEffect(() => {
    // Inicjalizacja klienta Nostr
    const initNostr = async () => {
      try {
        const client = new NostrClient();
        await client.init();
        setNostrClient(client);

        // Sprawdź, czy użytkownik jest zalogowany
        const userPubKey = localStorage.getItem("nostrPubKey");
        if (userPubKey) {
          // Pobierz profil użytkownika z Nostr
          const userProfile = await client.getUserProfile(userPubKey);
          setCurrentUser(userProfile);
        }
      } catch (error) {
        console.error("Failed to initialize Nostr client:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initNostr();
  }, []);

  const handleLogin = async (pubkey) => {
    if (!nostrClient) return;
    try {
      const userProfile = await nostrClient.getUserProfile(pubkey);
      setCurrentUser(userProfile);
      localStorage.setItem("nostrPubKey", pubkey);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("nostrPubKey");
  };

  if (isLoading) {
    return <div className="loading">Ładowanie...</div>;
  }

  return (
    <div className="app">
      <Header
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        nostrClient={nostrClient}
      />
      <div className="main-container">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route
              path="/"
              element={
                <MainFeed nostrClient={nostrClient} currentUser={currentUser} />
              }
            />
            <Route
              path="/post/:id"
              element={
                <PostDetail
                  nostrClient={nostrClient}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/profile/:pubkey"
              element={
                <Profile nostrClient={nostrClient} currentUser={currentUser} />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
