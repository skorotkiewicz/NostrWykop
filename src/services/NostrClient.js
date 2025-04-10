import { nip19 } from "nostr-tools";

class NostrClient {
  constructor() {
    this.relays = [
      // "wss://relay.damus.io",
      // "wss://relay.nostr.band",
      "wss://nos.lol",
      // "wss://relay.snort.social",
    ];
    this.pool = null;
    this.connected = false;
  }

  async init() {
    try {
      // Dynamiczne importowanie nostr-tools aby uniknąć problemów z SSR
      const { SimplePool } = await import("nostr-tools");

      this.pool = new SimplePool();
      this.connected = true;

      // Łączenie z przekaźnikami
      await Promise.all(
        this.relays.map((relay) => this.pool.ensureRelay(relay)),
      );

      console.log("Connected to Nostr relays");
      return true;
    } catch (error) {
      console.error("Failed to initialize Nostr client:", error);
      this.connected = false;
      throw error;
    }
  }

  async getPosts({ limit = 20, since, until, tags = [], sort = "newest" }) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      // Tworzymy filtr dla zdarzeń typu 1 (krótkie notatki) lub 30023 (długie artykuły)
      // z określonymi tagami jeśli są podane
      const filter = {
        kinds: [1, 30023],
        limit: limit,
      };

      if (since) {
        filter.since = Math.floor(since / 1000);
      }

      if (until) {
        filter.until = Math.floor(until / 1000);
      }

      if (tags.length > 0) {
        filter["#t"] = tags;
      }

      // Pobieramy zdarzenia z przekaźników
      const events = await this.pool.querySync(this.relays, filter);

      // Przekształcamy zdarzenia Nostr w format postów dla naszej aplikacji
      const posts = await Promise.all(
        events.map(async (event) => {
          // Próbujemy wyodrębnić tytuł i treść
          let title = "";
          let content = event.content;
          let summary = "";

          // Sprawdzamy, czy treść zawiera tytuł (np. pierwsza linia zakończona \n\n)
          const titleMatch = event.content.match(/^(.+?)\n\n/);
          if (titleMatch) {
            title = titleMatch[1];
            content = event.content.substring(titleMatch[0].length);
          }

          // Tworzymy krótkie podsumowanie treści
          summary =
            content.substring(0, 150) + (content.length > 150 ? "..." : "");

          // Pobieramy informacje o autorze
          const authorProfile = await this.getUserProfile(event.pubkey);

          // Wyodrębniamy tagi
          const postTags = event.tags
            .filter((tag) => tag[0] === "t")
            .map((tag) => tag[1]);

          // Tworzymy obiekt posta
          return {
            id: event.id,
            title: title || "Bez tytułu",
            content,
            summary,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            tags: postTags,
            votes: Math.floor(Math.random() * 100), // Przykładowe głosy (do zaimplementowania później)
            commentsCount: Math.floor(Math.random() * 20), // Przykładowa liczba komentarzy
            image: this._extractImageUrl(event.content),
          };
        }),
      );

      // Sortujemy posty
      return this._sortPosts(posts, sort);
    } catch (error) {
      console.error("Failed to get posts:", error);
      throw error;
    }
  }

  async getPostById(id) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      const filter = {
        ids: [id],
        kinds: [1, 30023],
      };

      const events = await this.pool.querySync(this.relays, filter);

      if (events.length === 0) {
        return null;
      }

      const event = events[0];

      // Próbujemy wyodrębnić tytuł i treść
      let title = "";
      let content = event.content;

      // Sprawdzamy, czy treść zawiera tytuł (np. pierwsza linia zakończona \n\n)
      const titleMatch = event.content.match(/^(.+?)\n\n/);
      if (titleMatch) {
        title = titleMatch[1];
        content = event.content.substring(titleMatch[0].length);
      }

      // Pobieramy informacje o autorze
      const authorProfile = await this.getUserProfile(event.pubkey);

      // Wyodrębniamy tagi
      const postTags = event.tags
        .filter((tag) => tag[0] === "t")
        .map((tag) => tag[1]);

      // Tworzymy obiekt posta
      return {
        id: event.id,
        title: title || "Bez tytułu",
        content,
        createdAt: event.created_at * 1000,
        author: authorProfile,
        tags: postTags,
        votes: Math.floor(Math.random() * 100), // Przykładowe głosy (do zaimplementowania później)
        image: this._extractImageUrl(event.content),
      };
    } catch (error) {
      console.error("Failed to get post by id:", error);
      throw error;
    }
  }

  async getUserProfile(pubkey) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      // Normalizujemy klucz publiczny (jeśli jest w formacie npub)
      let normalizedPubkey = pubkey;
      if (pubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(pubkey);
          normalizedPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      // Pobieramy metadane użytkownika (kind 0)
      const filter = {
        authors: [normalizedPubkey],
        kinds: [0],
      };

      const events = await this.pool.querySync(this.relays, filter);

      if (events.length === 0) {
        // Jeśli nie ma metadanych, zwracamy podstawowy profil
        return {
          pubkey: normalizedPubkey,
          name: null,
          avatar: null,
          about: null,
        };
      }

      // Sortujemy wydarzenia według czasu utworzenia (od najnowszego)
      events.sort((a, b) => b.created_at - a.created_at);

      // Pobieramy najnowsze metadane
      const metadataEvent = events[0];

      try {
        const metadata = JSON.parse(metadataEvent.content);

        return {
          pubkey: normalizedPubkey,
          name: metadata.name || metadata.display_name || null,
          avatar: metadata.picture || null,
          about: metadata.about || null,
          nip05: metadata.nip05 || null,
        };
      } catch (error) {
        console.error("Failed to parse profile metadata:", error);
        return {
          pubkey: normalizedPubkey,
          name: null,
          avatar: null,
          about: null,
        };
      }
    } catch (error) {
      console.error("Failed to get user profile:", error);
      throw error;
    }
  }

  async getUserPosts(pubkey) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      // Normalizujemy klucz publiczny (jeśli jest w formacie npub)
      let normalizedPubkey = pubkey;
      if (pubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(pubkey);
          normalizedPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      const filter = {
        authors: [normalizedPubkey],
        kinds: [1, 30023],
        limit: 50,
      };

      const events = await this.pool.querySync(this.relays, filter);

      // Pobieramy informacje o autorze
      const authorProfile = await this.getUserProfile(normalizedPubkey);

      // Przekształcamy zdarzenia w posty
      const posts = events.map((event) => {
        // Próbujemy wyodrębnić tytuł i treść
        let title = "";
        let content = event.content;
        let summary = "";

        // Sprawdzamy, czy treść zawiera tytuł (np. pierwsza linia zakończona \n\n)
        const titleMatch = event.content.match(/^(.+?)\n\n/);
        if (titleMatch) {
          title = titleMatch[1];
          content = event.content.substring(titleMatch[0].length);
        }

        // Tworzymy krótkie podsumowanie treści
        summary =
          content.substring(0, 150) + (content.length > 150 ? "..." : "");

        // Wyodrębniamy tagi
        const postTags = event.tags
          .filter((tag) => tag[0] === "t")
          .map((tag) => tag[1]);

        return {
          id: event.id,
          title: title || "Bez tytułu",
          content,
          summary,
          createdAt: event.created_at * 1000,
          author: authorProfile,
          tags: postTags,
          votes: Math.floor(Math.random() * 100), // Przykładowe głosy
          commentsCount: Math.floor(Math.random() * 20), // Przykładowa liczba komentarzy
          image: this._extractImageUrl(event.content),
        };
      });

      // Sortujemy posty według czasu utworzenia (od najnowszego)
      return posts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to get user posts:", error);
      throw error;
    }
  }

  async getComments(postId) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      // Pobieramy wszystkie odpowiedzi na dany post
      const filter = {
        kinds: [1],
        "#e": [postId],
        limit: 100,
      };

      const events = await this.pool.querySync(this.relays, filter);

      // Przekształcamy zdarzenia w komentarze
      const comments = await Promise.all(
        events.map(async (event) => {
          // Pobieramy informacje o autorze
          const authorProfile = await this.getUserProfile(event.pubkey);

          return {
            id: event.id,
            content: event.content,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            votes: Math.floor(Math.random() * 20), // Przykładowe głosy
            replies: [], // Później zaimplementujemy zagnieżdżone odpowiedzi
          };
        }),
      );

      // Sortujemy komentarze według czasu utworzenia (od najnowszego)
      return comments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to get comments:", error);
      throw error;
    }
  }

  async addComment(postId, content) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Tworzymy zdarzenie komentarza
      const event = {
        kind: 1,
        content: content,
        tags: [["e", postId, "", "root"]],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      // Pobieramy informacje o autorze
      const authorProfile = await this.getUserProfile(signedEvent.pubkey);

      // Zwracamy utworzony komentarz
      return {
        id: signedEvent.id,
        content: content,
        createdAt: signedEvent.created_at * 1000,
        author: authorProfile,
        votes: 0,
        replies: [],
      };
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  }

  async addReply(commentId, content) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Tworzymy zdarzenie odpowiedzi
      const event = {
        kind: 1,
        content: content,
        tags: [["e", commentId, "", "reply"]],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      // Pobieramy informacje o autorze
      const authorProfile = await this.getUserProfile(signedEvent.pubkey);

      // Zwracamy utworzoną odpowiedź
      return {
        id: signedEvent.id,
        content: content,
        createdAt: signedEvent.created_at * 1000,
        author: authorProfile,
        votes: 0,
        replies: [],
      };
    } catch (error) {
      console.error("Failed to add reply:", error);
      throw error;
    }
  }

  async voteOnPost(postId, isUpvote) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Tworzymy zdarzenie reakcji (kind 7) dla głosowania
      const content = isUpvote ? "+" : "-";

      const event = {
        kind: 7,
        content: content,
        tags: [["e", postId]],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      return true;
    } catch (error) {
      console.error("Failed to vote on post:", error);
      throw error;
    }
  }

  async voteOnComment(commentId, isUpvote) {
    // Implementacja identyczna jak voteOnPost
    return this.voteOnPost(commentId, isUpvote);
  }

  async followUser(pubkey) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Normalizujemy klucz publiczny (jeśli jest w formacie npub)
      let normalizedPubkey = pubkey;
      if (pubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(pubkey);
          normalizedPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      // Pobieramy bieżącą listę obserwowanych użytkowników
      const userPubkey = await window.nostr.getPublicKey();
      const followListEvents = await this.pool.querySync(this.relays, {
        authors: [userPubkey],
        kinds: [3],
      });

      // Sortujemy wydarzenia według czasu utworzenia (od najnowszego)
      followListEvents.sort((a, b) => b.created_at - a.created_at);

      // Pobieramy najnowszą listę obserwowanych
      let followTags = [];
      if (followListEvents.length > 0) {
        followTags = followListEvents[0].tags.filter((tag) => tag[0] === "p");
      }

      // Sprawdzamy czy użytkownik jest już obserwowany
      const isAlreadyFollowing = followTags.some(
        (tag) => tag[1] === normalizedPubkey,
      );
      if (isAlreadyFollowing) {
        return true; // Użytkownik jest już obserwowany
      }

      // Dodajemy nowego użytkownika do listy obserwowanych
      followTags.push(["p", normalizedPubkey]);

      // Tworzymy nowe zdarzenie (kind 3) z zaktualizowaną listą obserwowanych
      const event = {
        kind: 3,
        content: "",
        tags: followTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      return true;
    } catch (error) {
      console.error("Failed to follow user:", error);
      throw error;
    }
  }

  async unfollowUser(pubkey) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Normalizujemy klucz publiczny (jeśli jest w formacie npub)
      let normalizedPubkey = pubkey;
      if (pubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(pubkey);
          normalizedPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      // Pobieramy bieżącą listę obserwowanych użytkowników
      const userPubkey = await window.nostr.getPublicKey();
      const followListEvents = await this.pool.querySync(this.relays, {
        authors: [userPubkey],
        kinds: [3],
      });

      // Sortujemy wydarzenia według czasu utworzenia (od najnowszego)
      followListEvents.sort((a, b) => b.created_at - a.created_at);

      // Pobieramy najnowszą listę obserwowanych
      if (followListEvents.length === 0) {
        return true; // Brak listy obserwowanych
      }

      const followTags = followListEvents[0].tags.filter(
        (tag) => tag[0] === "p",
      );

      // Filtrujemy listę, usuwając użytkownika do unfollowa
      const updatedTags = followTags.filter(
        (tag) => tag[1] !== normalizedPubkey,
      );

      // Sprawdzamy czy użytkownik był obserwowany
      if (followTags.length === updatedTags.length) {
        return true; // Użytkownik nie był obserwowany
      }

      // Tworzymy nowe zdarzenie (kind 3) z zaktualizowaną listą obserwowanych
      const event = {
        kind: 3,
        content: "",
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      return true;
    } catch (error) {
      console.error("Failed to unfollow user:", error);
      throw error;
    }
  }

  async isFollowing(userPubkey, targetPubkey) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    try {
      // Normalizujemy klucze publiczne (jeśli są w formacie npub)
      let normalizedUserPubkey = userPubkey;
      if (userPubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(userPubkey);
          normalizedUserPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      let normalizedTargetPubkey = targetPubkey;
      if (targetPubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(targetPubkey);
          normalizedTargetPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
        }
      }

      // Pobieramy bieżącą listę obserwowanych użytkowników
      const followListEvents = await this.pool.querySync(this.relays, {
        authors: [normalizedUserPubkey],
        kinds: [3],
      });

      // Sortujemy wydarzenia według czasu utworzenia (od najnowszego)
      followListEvents.sort((a, b) => b.created_at - a.created_at);

      // Sprawdzamy czy użytkownik jest obserwowany
      if (followListEvents.length === 0) {
        return false; // Brak listy obserwowanych
      }

      const followTags = followListEvents[0].tags.filter(
        (tag) => tag[0] === "p",
      );
      return followTags.some((tag) => tag[1] === normalizedTargetPubkey);
    } catch (error) {
      console.error("Failed to check if following:", error);
      throw error;
    }
  }

  // Prywatna metoda do sortowania postów
  _sortPosts(posts, sortType) {
    switch (sortType) {
      case "hot":
        // Sortowanie według popularności (głosy + komentarze) / czas
        return posts.sort((a, b) => {
          const aHotScore =
            (a.votes + a.commentsCount) /
            Math.max(1, (Date.now() - a.createdAt) / 3600000);
          const bHotScore =
            (b.votes + b.commentsCount) /
            Math.max(1, (Date.now() - b.createdAt) / 3600000);
          return bHotScore - aHotScore;
        });

      case "newest":
        // Sortowanie według czasu utworzenia
        return posts.sort((a, b) => b.createdAt - a.createdAt);

      case "active":
        // Sortowanie według aktywności (liczba komentarzy)
        return posts.sort((a, b) => b.commentsCount - a.commentsCount);

      default:
        return posts.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  // Prywatna metoda do wyodrębniania URL obrazu z treści posta
  _extractImageUrl(content) {
    // Szukamy adresów URL obrazów w treści
    const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const match = content.match(imgRegex);

    if (match) {
      return match[1];
    }

    return null;
  }
}

export default NostrClient;
