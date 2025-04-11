import { nip19 } from "nostr-tools";

const NO_TITLE = "-🌎-"; // "No title";

class NostrClient {
  constructor() {
    this.relays = [
      // "wss://relay.damus.io",
      // "wss://relay.nostr.band",
      "wss://nos.lol",
      // "wss://relay.snort.social",
    ];
    this.pool = null;
    this.nip04 = null;
    this.sign = null;
    this.connected = false;
  }

  async init() {
    try {
      // Dynamiczne importowanie nostr-tools aby uniknąć problemów z SSR
      const { SimplePool, nip04, finalizeEvent } = await import("nostr-tools");

      this.pool = new SimplePool();
      this.nip04 = nip04;
      this.sign = finalizeEvent;
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

          // Pobieramy liczbę głosów
          const votes = await this._getVotesCount(event.id);

          // Pobieramy liczbę komentarzy
          const commentsCount = await this._getCommentsCount(event.id);

          // Tworzymy obiekt posta
          return {
            id: event.id,
            title: title || NO_TITLE,
            content,
            summary,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            tags: postTags,
            votes,
            commentsCount,
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

      // Pobieramy liczbę głosów
      const votes = await this._getVotesCount(id);

      // Pobieramy liczbę komentarzy
      const commentsCount = await this._getCommentsCount(id);

      // Tworzymy obiekt posta
      return {
        id: event.id,
        title: title || NO_TITLE,
        content,
        createdAt: event.created_at * 1000,
        author: authorProfile,
        tags: postTags,
        votes,
        commentsCount,
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

          // Wyodrębniamy tagi
          const postTags = event.tags
            .filter((tag) => tag[0] === "t")
            .map((tag) => tag[1]);

          // Pobieramy liczbę głosów
          const votes = await this._getVotesCount(event.id);

          // Pobieramy liczbę komentarzy
          const commentsCount = await this._getCommentsCount(event.id);

          return {
            id: event.id,
            title: title || NO_TITLE,
            content,
            summary,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            tags: postTags,
            votes,
            commentsCount,
            image: this._extractImageUrl(event.content),
          };
        }),
      );

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

          // Pobieramy liczbę głosów dla komentarza
          const votes = await this._getVotesCount(event.id);

          // Pobieramy odpowiedzi na ten komentarz
          const replies = await this._getReplies(event.id);

          return {
            id: event.id,
            content: event.content,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            votes,
            replies,
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

  // Prywatna metoda do pobierania liczby głosów dla danego posta/komentarza
  async _getVotesCount(eventId) {
    try {
      // Szukamy reakcji (kind 7) dla danego eventu
      const filter = {
        kinds: [7],
        "#e": [eventId],
      };

      const events = await this.pool.querySync(this.relays, filter);

      // Zliczamy głosy dodatnie (+) i ujemne (-)
      let upvotes = 0;
      let downvotes = 0;

      for (const event of events) {
        if (event.content === "+") {
          upvotes++;
        } else if (event.content === "-") {
          downvotes++;
        }
      }

      // Zwracamy różnicę (całkowitą ocenę)
      return upvotes - downvotes;
    } catch (error) {
      console.error("Failed to get votes count:", error);
      return 0;
    }
  }

  // Prywatna metoda do pobierania liczby komentarzy dla danego posta
  async _getCommentsCount(eventId) {
    try {
      // Szukamy komentarzy (kind 1) dla danego eventu
      const filter = {
        kinds: [1],
        "#e": [eventId],
      };

      const events = await this.pool.querySync(this.relays, filter);
      return events.length;
    } catch (error) {
      console.error("Failed to get comments count:", error);
      return 0;
    }
  }

  // Pobieranie listy użytkowników, których obserwuje podany użytkownik
  async getFollowingList(pubkey) {
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

      // Pobieramy listę obserwowanych przez użytkownika
      const followingFilter = {
        kinds: [3],
        authors: [normalizedPubkey],
        limit: 1,
      };

      const followingEvents = await this.pool.querySync(
        this.relays,
        followingFilter,
      );

      if (followingEvents.length === 0) {
        return [];
      }

      // Pobierz listę pubkey'ów z tagów 'p'
      const followingList = followingEvents[0].tags
        .filter((tag) => tag[0] === "p")
        .map((tag) => tag[1]);

      return followingList;
    } catch (error) {
      console.error("Failed to get following list:", error);
      return [];
    }
  }

  // Pobieranie szczegółowych profili użytkowników, których obserwuje podany użytkownik
  async getFollowingProfiles(pubkey) {
    try {
      // Pobierz listę pubkey'ów obserwowanych
      const followingList = await this.getFollowingList(pubkey);

      if (followingList.length === 0) {
        return [];
      }

      // Pobierz szczegóły profili dla każdego obserwowanego użytkownika
      const profiles = await Promise.all(
        followingList.map(async (followedPubkey) => {
          return await this.getUserProfile(followedPubkey);
        }),
      );

      return profiles;
    } catch (error) {
      console.error("Failed to get following profiles:", error);
      return [];
    }
  }

  // Pobieranie listy użytkowników obserwujących podanego użytkownika
  async getFollowersList(pubkey) {
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

      // Pobieramy listy obserwowanych (kind 3) innych użytkowników, aby znaleźć obserwujących
      const followerFilter = {
        kinds: [3],
        "#p": [normalizedPubkey],
        limit: 1000,
      };

      const followerEvents = await this.pool.querySync(
        this.relays,
        followerFilter,
      );

      // Wyodrębnij pubkey'e autorów tych list (to są obserwujący)
      const followersList = followerEvents.map((event) => event.pubkey);

      return followersList;
    } catch (error) {
      console.error("Failed to get followers list:", error);
      return [];
    }
  }

  // Pobieranie szczegółowych profili użytkowników obserwujących podanego użytkownika
  async getFollowersProfiles(pubkey) {
    try {
      // Pobierz listę pubkey'ów obserwujących
      const followersList = await this.getFollowersList(pubkey);

      if (followersList.length === 0) {
        return [];
      }

      // Pobierz szczegóły profili dla każdego obserwującego użytkownika
      const profiles = await Promise.all(
        followersList.map(async (followerPubkey) => {
          return await this.getUserProfile(followerPubkey);
        }),
      );

      return profiles;
    } catch (error) {
      console.error("Failed to get followers profiles:", error);
      return [];
    }
  }

  // Pobieranie postów autorstwa określonych użytkowników
  async getPostsByAuthors(pubkeys, options = {}) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    const { limit = 20, sort = "newest" } = options;

    try {
      // Tworzymy filtr dla zdarzeń typu 1 (krótkie notatki) lub 30023 (długie artykuły)
      // autorstwa określonych użytkowników
      const filter = {
        kinds: [1, 30023],
        authors: pubkeys,
        limit: limit,
      };

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

          // Pobieramy liczbę głosów
          const votes = await this._getVotesCount(event.id);

          // Pobieramy liczbę komentarzy
          const commentsCount = await this._getCommentsCount(event.id);

          // Tworzymy obiekt posta
          return {
            id: event.id,
            title: title || NO_TITLE,
            content,
            summary,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            tags: postTags,
            votes,
            commentsCount,
            image: this._extractImageUrl(content),
          };
        }),
      );

      // Sortujemy posty
      return this._sortPosts(posts, sort);
    } catch (error) {
      console.error("Failed to get posts by authors:", error);
      throw error;
    }
  }

  // Pobieranie postów, na które głosował użytkownik
  async getUserVotedPosts(pubkey, isUpvote = true) {
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

      // Pobieramy reakcje (kind 7) stworzone przez danego użytkownika
      const filter = {
        kinds: [7],
        authors: [normalizedPubkey],
        limit: 100,
      };

      const events = await this.pool.querySync(this.relays, filter);

      // Filtrujemy tylko głosy o określonym typie (+ lub -)
      const voteContent = isUpvote ? "+" : "-";
      const votedEvents = events.filter(
        (event) => event.content === voteContent,
      );

      // Wyodrębnij ID postów, na które zagłosowano
      const postIds = votedEvents
        .map((event) => {
          const eTag = event.tags.find((tag) => tag[0] === "e");
          return eTag ? eTag[1] : null;
        })
        .filter((id) => id !== null);

      // Jeśli nie ma głosów, zwróć pustą tablicę
      if (postIds.length === 0) {
        return [];
      }

      // Pobierz szczegóły postów
      const postsPromises = postIds.map(async (postId) => {
        try {
          return await this.getPostById(postId);
        } catch (error) {
          return null;
        }
      });

      const posts = (await Promise.all(postsPromises)).filter(
        (post) => post !== null,
      );

      // Sortuj posty według czasu utworzenia (od najnowszego)
      return posts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error(
        `Failed to get ${isUpvote ? "upvoted" : "downvoted"} posts:`,
        error,
      );
      return [];
    }
  }

  // Pobieranie zapisanych postów TODO
  async getSavedPosts(pubkey) {
    // W prawdziwej implementacji zostałoby to zintegrowane z zapisywaniem postów w Nostr
    // Na razie zwracamy pustą tablicę jako zaślepkę
    console.warn("getSavedPosts method is not fully implemented yet");
    return [];
  }

  // Metody do obsługi bezpośrednich wiadomości (NIP-04)

  // Usuwanie wiadomości (poprzez jej zastąpienie)
  async deleteMessage(messageId) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Pobieramy klucz publiczny użytkownika
      const userPubkey = await window.nostr.getPublicKey();

      // Tworzymy zdarzenie kind 5 (usunięcie zdarzenia)
      const event = {
        kind: 5,
        pubkey: userPubkey,
        tags: [["e", messageId]],
        content: "This message has been deleted",
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      return true;
    } catch (error) {
      console.error("Failed to delete message:", error);
      throw error;
    }
  }

  // Wysyłanie zaszyfrowanej wiadomości do użytkownika
  async sendDirectMessage(recipientPubkey, content) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Normalizujemy klucz publiczny odbiorcy (jeśli jest w formacie npub)
      let normalizedRecipientPubkey = recipientPubkey;
      if (recipientPubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(recipientPubkey);
          normalizedRecipientPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
          throw new Error("Invalid recipient public key");
        }
      }

      // Pobieramy klucz publiczny nadawcy
      const senderPubkey = await window.nostr.getPublicKey();

      // Szyfrujemy treść wiadomości używając NIP-04
      const encryptedContent = await window.nostr.nip04.encrypt(
        normalizedRecipientPubkey,
        content,
      );

      // Tworzymy zdarzenie kind 4 (zaszyfrowana wiadomość bezpośrednia)
      const event = {
        kind: 4,
        pubkey: senderPubkey,
        tags: [["p", normalizedRecipientPubkey]],
        content: encryptedContent,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Podpisujemy zdarzenie przy użyciu rozszerzenia NIP-07
      const signedEvent = await window.nostr.signEvent(event);

      // Publikujemy zdarzenie do przekaźników
      const pubs = this.pool.publish(this.relays, signedEvent);
      await Promise.all(pubs);

      // Zwracamy utworzoną wiadomość w formacie do wyświetlenia
      return {
        id: signedEvent.id,
        content,
        sender: senderPubkey,
        receiver: normalizedRecipientPubkey,
        createdAt: signedEvent.created_at * 1000,
        read: true, // Własne wiadomości są od razu oznaczone jako przeczytane
      };
    } catch (error) {
      console.error("Failed to send direct message:", error);
      throw error;
    }
  }

  // Pobieranie historii wiadomości z określonym użytkownikiem
  async getConversation(otherUserPubkey, limit = 50) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      // Normalizujemy klucz publiczny rozmówcy (jeśli jest w formacie npub)
      let normalizedOtherPubkey = otherUserPubkey;
      if (otherUserPubkey.startsWith("npub")) {
        try {
          const { data } = nip19.decode(otherUserPubkey);
          normalizedOtherPubkey = data;
        } catch (e) {
          console.error("Invalid npub format:", e);
          throw new Error("Invalid user public key");
        }
      }

      // Pobieramy klucz publiczny zalogowanego użytkownika
      const userPubkey = await window.nostr.getPublicKey();

      // Pobieramy wiadomości wysłane przez użytkownika do rozmówcy
      const sentFilter = {
        kinds: [4],
        authors: [userPubkey],
        "#p": [normalizedOtherPubkey],
        limit,
      };

      // Pobieramy wiadomości otrzymane od rozmówcy
      const receivedFilter = {
        kinds: [4],
        authors: [normalizedOtherPubkey],
        "#p": [userPubkey],
        limit,
      };

      // Wykonujemy równolegle zapytania do przekaźników
      const [sentEvents, receivedEvents] = await Promise.all([
        this.pool.querySync(this.relays, sentFilter),
        this.pool.querySync(this.relays, receivedFilter),
      ]);

      // Łączymy i sortujemy wszystkie wiadomości według czasu utworzenia
      const allEvents = [...sentEvents, ...receivedEvents].sort(
        (a, b) => a.created_at - b.created_at,
      );

      // Przekształcamy zdarzenia w wiadomości z odszyfrowaną treścią
      const messages = await Promise.all(
        allEvents.map(async (event) => {
          let decryptedContent;
          try {
            // Deszyfrujemy treść w zależności od tego, czy jesteśmy nadawcą czy odbiorcą
            if (event.pubkey === userPubkey) {
              // Nadawca - deszyfrujemy używając klucza odbiorcy
              decryptedContent = await window.nostr.nip04.decrypt(
                normalizedOtherPubkey,
                event.content,
              );
            } else {
              // Odbiorca - deszyfrujemy używając klucza nadawcy
              decryptedContent = await window.nostr.nip04.decrypt(
                event.pubkey,
                event.content,
              );
            }
          } catch (error) {
            console.error("Failed to decrypt message:", error);
            decryptedContent = "[Failed to decrypt message]";
          }

          return {
            id: event.id,
            content: decryptedContent,
            sender: event.pubkey,
            receiver: event.tags.find((tag) => tag[0] === "p")?.[1] || null,
            createdAt: event.created_at * 1000,
            read: event.pubkey !== userPubkey, // Wiadomości od nas są zawsze przeczytane
          };
        }),
      );

      return messages;
    } catch (error) {
      console.error("Failed to get conversation:", error);
      throw error;
    }
  }

  // Pobieranie listy wszystkich rozmów (unikalnych użytkowników, z którymi mamy wiadomości)
  async getConversationsList(limit = 20) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }

    try {
      const userPubkey = await window.nostr.getPublicKey();

      // Pobieramy wiadomości wysłane przez użytkownika
      const sentFilter = {
        kinds: [4],
        authors: [userPubkey],
        limit: 200, // Pobieramy więcej żeby mieć szersze spojrzenie na historię
      };

      // Pobieramy wiadomości otrzymane przez użytkownika
      const receivedFilter = {
        kinds: [4],
        "#p": [userPubkey],
        limit: 200,
      };

      // Wykonujemy równolegle zapytania do przekaźników
      const [sentEvents, receivedEvents] = await Promise.all([
        this.pool.querySync(this.relays, sentFilter),
        this.pool.querySync(this.relays, receivedFilter),
      ]);

      // Wyodrębnij unikalnych użytkowników z wiadomości
      const conversationsMap = new Map();

      // Przetwarzamy wiadomości wysłane
      for (const event of sentEvents) {
        const recipientTag = event.tags.find((tag) => tag[0] === "p");
        if (recipientTag) {
          const recipientPubkey = recipientTag[1];

          // Aktualizujemy dane rozmowy tylko jeśli jest to nowsza wiadomość
          if (
            !conversationsMap.has(recipientPubkey) ||
            conversationsMap.get(recipientPubkey).lastMessageAt <
              event.created_at * 1000
          ) {
            let decryptedContent;
            try {
              decryptedContent = await window.nostr.nip04.decrypt(
                recipientPubkey,
                event.content,
              );
            } catch (error) {
              decryptedContent = "[Failed to decrypt message]";
            }

            conversationsMap.set(recipientPubkey, {
              pubkey: recipientPubkey,
              lastMessage: decryptedContent,
              lastMessageAt: event.created_at * 1000,
              unreadCount: 0, // Nasze wiadomości są przeczytane
            });
          }
        }
      }

      // Przetwarzamy wiadomości otrzymane
      for (const event of receivedEvents) {
        const senderPubkey = event.pubkey;

        // Aktualizujemy dane rozmowy tylko jeśli jest to nowsza wiadomość
        if (
          !conversationsMap.has(senderPubkey) ||
          conversationsMap.get(senderPubkey).lastMessageAt <
            event.created_at * 1000
        ) {
          let decryptedContent;
          try {
            decryptedContent = await window.nostr.nip04.decrypt(
              senderPubkey,
              event.content,
            );
          } catch (error) {
            decryptedContent = "[Failed to decrypt message]";
          }

          // Sprawdzamy czy to wiadomość nieprzeczytana (tutaj można by dodać logic do śledzenia)
          // W rzeczywistej aplikacji trzeba by przechowywać stan przeczytanych wiadomości

          conversationsMap.set(senderPubkey, {
            pubkey: senderPubkey,
            lastMessage: decryptedContent,
            lastMessageAt: event.created_at * 1000,
            unreadCount: 1, // Zakładamy, że nowa wiadomość jest nieprzeczytana
          });
        }
      }

      // Pobieramy profile dla każdego użytkownika
      const conversations = await Promise.all(
        Array.from(conversationsMap.entries()).map(async ([pubkey, convo]) => {
          const profile = await this.getUserProfile(pubkey);
          return {
            ...convo,
            profile,
          };
        }),
      );

      // Sortujemy rozmowy od najnowszej wiadomości i ograniczamy do limitu
      return conversations
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get conversations list:", error);
      throw error;
    }
  }

  // Oznaczenie wiadomości jako przeczytanych (nie zaimplementowane)
  async markConversationAsRead(otherUserPubkey) {
    // W rzeczywistej implementacji, można by tu przechowywać stan przeczytanych wiadomości
    // np. w lokalStorage lub poprzez specjalne zdarzenia w Nostr
    console.log(`Marking conversation with ${otherUserPubkey} as read`);
    return true;
  }

  // /NIP-04

  // Prywatna metoda do pobierania odpowiedzi na komentarz
  async _getReplies(commentId) {
    try {
      // Szukamy odpowiedzi (kind 1) dla danego komentarza
      const filter = {
        kinds: [1],
        "#e": [commentId],
      };

      const events = await this.pool.querySync(this.relays, filter);

      // Przekształcamy zdarzenia w odpowiedzi
      const replies = await Promise.all(
        events.map(async (event) => {
          // Pobieramy informacje o autorze
          const authorProfile = await this.getUserProfile(event.pubkey);

          // Pobieramy liczbę głosów dla odpowiedzi
          const votes = await this._getVotesCount(event.id);

          return {
            id: event.id,
            content: event.content,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            votes,
          };
        }),
      );

      // Sortujemy odpowiedzi według czasu utworzenia (od najnowszego)
      return replies.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to get replies:", error);
      return [];
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

  // Metoda do wyszukiwania postów zawierających określoną frazę
  async searchPosts(query, options = {}) {
    if (!this.connected) {
      throw new Error("Nostr client not connected");
    }

    const { limit = 30, since, until, sort = "newest" } = options;

    try {
      // Pobieramy większą liczbę postów, aby mieć co przeszukiwać
      const filter = {
        kinds: [1, 30023],
        limit: 500, // Większy limit, aby zwiększyć szansę znalezienia wyników
      };

      if (since) {
        filter.since = Math.floor(since / 1000);
      }

      if (until) {
        filter.until = Math.floor(until / 1000);
      }

      // Pobieramy zdarzenia z przekaźników
      const events = await this.pool.querySync(this.relays, filter);

      // Tworzymy regex do wyszukiwania (ignorujący wielkość liter)
      const searchRegex = new RegExp(query, "i");

      // Filtrujemy zdarzenia, które zawierają szukaną frazę
      const matchingEvents = events.filter(
        (event) =>
          searchRegex.test(event.content) ||
          event.tags.some((tag) => tag[0] === "t" && searchRegex.test(tag[1])),
      );

      // Ograniczamy liczbę wyników
      const limitedEvents = matchingEvents.slice(0, limit);

      // Przekształcamy zdarzenia w posty
      const posts = await Promise.all(
        limitedEvents.map(async (event) => {
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

          // Pobieramy liczbę głosów
          const votes = await this._getVotesCount(event.id);

          // Pobieramy liczbę komentarzy
          const commentsCount = await this._getCommentsCount(event.id);

          // Tworzymy obiekt posta
          return {
            id: event.id,
            title: title || NO_TITLE,
            content,
            summary,
            createdAt: event.created_at * 1000,
            author: authorProfile,
            tags: postTags,
            votes,
            commentsCount,
            image: this._extractImageUrl(content),
            // Podświetlamy, dlaczego post został znaleziony
            matchReason: searchRegex.test(title)
              ? "title"
              : searchRegex.test(content)
                ? "content"
                : "tags",
          };
        }),
      );

      // Sortujemy posty
      return this._sortPosts(posts, sort);
    } catch (error) {
      console.error("Failed to search posts:", error);
      throw error;
    }
  }
}

export default NostrClient;
