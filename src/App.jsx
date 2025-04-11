import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import useTranslate from "./utils/useTranslate";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import MainFeed from "./pages/MainFeed";
import Search from "./pages/Search";
import Messages from "./pages/Messages";
import NostrClient from "./services/NostrClient";
import "./styles/App.css";

function App() {
  const { t } = useTranslate();
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
        const userPubKey =
          (await JSON.parse(localStorage.getItem("keypair"))) || {};
        if (userPubKey.pk) {
          // Pobierz profil użytkownika z Nostr
          const userProfile = await client.getUserProfile(userPubKey.pk);
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

  const handleLogin = async (keypair) => {
    if (!nostrClient) return;

    try {
      const userProfile = await nostrClient.getUserProfile(keypair.pk);
      setCurrentUser(userProfile);

      return keypair.sk === "nip07"
        ? localStorage.setItem(
            "keypair",
            JSON.stringify({ pk: keypair.pk, sk: "nip07" }),
          )
        : localStorage.setItem("keypair", JSON.stringify(keypair));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("keypair");
  };

  if (isLoading) {
    return <div className="loading">{t("common.loading")}</div>;
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
        <Sidebar nostrClient={nostrClient} currentUser={currentUser} />
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
            <Route
              path="/feed/:type"
              element={
                <MainFeed
                  nostrClient={nostrClient}
                  currentUser={currentUser}
                  feedType="user"
                />
              }
            />
            <Route
              path="/tag/:tag"
              element={
                <MainFeed
                  nostrClient={nostrClient}
                  currentUser={currentUser}
                  feedType="tag"
                />
              }
            />
            <Route
              path="/search"
              element={
                <Search nostrClient={nostrClient} currentUser={currentUser} />
              }
            />
            <Route
              path="/messages"
              element={
                <Messages nostrClient={nostrClient} currentUser={currentUser} />
              }
            />
            <Route
              path="/messages/:pubkey"
              element={
                <Messages nostrClient={nostrClient} currentUser={currentUser} />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
