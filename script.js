(() => {
  const totalEl = document.querySelector(".total");
  const cards = Array.from(document.querySelectorAll(".card"));
  const STORAGE_KEY = "liteindex:favorites";

  const parseCount = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("ul a"))
      .map((a) => (a.getAttribute("href") || "").toLowerCase());
    return links.filter(
      (href) =>
        href &&
        href !== "index.html" &&
        !href.endsWith(".css") &&
        !href.endsWith(".js")
    ).length;
  };

  const updateCount = (card, count) => {
    const countEl = card.querySelector(".count");
    if (countEl) countEl.textContent = `${count} file(s)`;
  };

  const fetchCounts = async () => {
    if (!cards.length) return;
    let total = 0;
    await Promise.all(
      cards.map(async (card) => {
        const href = card.getAttribute("href");
        if (!href) return;
        try {
          const res = await fetch(href, { cache: "no-cache" });
          if (!res.ok) return;
          const html = await res.text();
          const count = parseCount(html);
          updateCount(card, count);
          total += count;
        } catch (err) {
          // no-op
        }
      })
    );

    if (totalEl && total > 0) {
      totalEl.textContent = `Total files: ${total}`;
    }
  };

  const getIndexUrl = () => {
    const path = window.location.pathname;
    const prefix = path.includes("/files/") ? path.split("/files/")[0] : "";
    return `${window.location.origin}${prefix}/index.html`;
  };

  const getAlbumHref = () => {
    const path = window.location.pathname;
    const idx = path.indexOf("/files/");
    if (idx === -1) return null;
    const parts = path.slice(idx + 1).split("/");
    if (parts.length < 4) return null;
    return `${parts[0]}/${parts[1]}/${parts[2]}/index.html`;
  };

  const getAlbumKey = () => {
    const path = window.location.pathname;
    const idx = path.indexOf("/files/");
    if (idx === -1) return null;
    const parts = path.slice(idx + 1).split("/");
    if (parts.length < 3) return null;
    return `${parts[1]}/${parts[2]}`;
  };

  const setMeta = (selector, attrs) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      document.head.appendChild(el);
      return;
    }
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  };

  const fetchAlbums = async () => {
    try {
      const base = getIndexUrl().replace(/index\.html$/i, "");
      const res = await fetch(`${base}albums.json`, { cache: "no-cache" });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  const syncEmbedImage = async () => {
    try {
      const [albums, indexRes] = await Promise.all([
        fetchAlbums(),
        fetch(getIndexUrl(), { cache: "no-cache" })
      ]);
      const html = indexRes.ok ? await indexRes.text() : "";
      const doc = new DOMParser().parseFromString(html, "text/html");
      const albumHref = getAlbumHref();
      const albumKey = getAlbumKey();
      const albumCard = albumHref
        ? doc.querySelector(`a.card[href="${albumHref}"]`)
        : null;
      const albumData = albumKey && albums ? albums[albumKey] : null;
      const image = albumData?.image
        || albumCard?.getAttribute("data-image")
        || doc.querySelector('meta[property="og:image"]')?.getAttribute("content")
        || doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
      if (!image) return;

      if (albumCard) {
        const albumName = albumData?.name
          || albumCard.querySelector(".name")?.textContent?.trim();
        const fileName = window.location.pathname.split("/").pop()?.replace(/\.html$/i, "");
        const isAlbumIndex = window.location.pathname.endsWith("/index.html");
        const title = isAlbumIndex
          ? `LiteIndex - ${albumName || "Album"}`
          : `${albumName || "Album"} - ${fileName || "Media"}`;
        document.title = title;
        setMeta('meta[property="og:title"]', { property: "og:title", content: title });
        setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
        setMeta('meta[property="og:description"]', { property: "og:description", content: "Free media made simple." });
        setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: "Free media made simple." });
        setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
        setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
      }
      setMeta('meta[property="og:image"]', { property: "og:image", content: image });
      setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    } catch (err) {
      // no-op
    }
  };

  fetchCounts();
  syncEmbedImage();

  const getFavorites = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const setFavorites = (items) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // no-op
    }
  };

  const isMediaPage = () => document.body.classList.contains("media-page");

  const getMediaInfo = () => {
    const title = document.title || "";
    const href = window.location.pathname;
    return { title, href };
  };

  const injectFavoritesPill = () => {
    const page = document.body.getAttribute("data-page");
    if (page === "favorites") return;
    if (document.querySelector(".favorites-pill")) return;
    const a = document.createElement("a");
    a.className = "favorites-pill";
    a.href = getIndexUrl().replace(/index\.html$/i, "favorites.html");
    const count = getFavorites().length;
    a.textContent = `★ Favorites (${count})`;
    document.body.appendChild(a);
  };

  const injectClearFavoritesPill = () => {
    const page = document.body.getAttribute("data-page");
    if (page !== "favorites") return;
    if (document.querySelector(".clear-favorites-pill")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "clear-favorites-pill";
    btn.textContent = "Clear Favorites";
    btn.addEventListener("click", () => {
      const ok = window.confirm("Are you sure you want to clear all favorites?");
      if (!ok) return;
      setFavorites([]);
      updateFavoritesPill();
      renderFavoritesPage();
    });
    document.body.appendChild(btn);
  };

  const injectHomePill = () => {
    const page = document.body.getAttribute("data-page");
    if (page !== "favorites") return;
    if (document.querySelector(".home-pill")) return;
    const a = document.createElement("a");
    a.className = "home-pill";
    a.href = getIndexUrl();
    a.textContent = "Home";
    document.body.appendChild(a);
  };

  const renderFavoritesPage = () => {
    const page = document.body.getAttribute("data-page");
    if (page !== "favorites") return;
    const groupsEl = document.getElementById("favorites-groups");
    const meta = document.getElementById("favorites-meta");
    const clearBtn = document.getElementById("clear-favorites");
    if (!groupsEl || !meta) return;

    const items = getFavorites();
    groupsEl.innerHTML = "";
    if (!items.length) {
      meta.textContent = "No favorites yet.";
      return;
    }
    meta.textContent = `${items.length} favorite(s) saved.`;
    const groups = {};
    items.forEach((item) => {
      const parts = (item.title || "").split(" - ");
      const group = parts.length > 1 ? parts[0] : "Favorites";
      groups[group] = groups[group] || [];
      groups[group].push(item);
    });

    Object.keys(groups).sort((a, b) => a.localeCompare(b, "nl", { sensitivity: "base" })).forEach((group) => {
      const wrap = document.createElement("div");
      wrap.className = "favorites-group";
      const h3 = document.createElement("h3");
      h3.textContent = group;
      const list = document.createElement("ul");
      list.className = "favorites-list";

      groups[group].forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.href;
        if (item.title && item.title.includes(" - ")) {
          a.textContent = item.title.split(" - ").slice(1).join(" - ");
        } else {
          a.textContent = item.title || item.href;
        }
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "favorites-remove";
        removeBtn.textContent = "★";
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFavorite(item.href);
          renderFavoritesPage();
        });
        a.appendChild(removeBtn);
        li.appendChild(a);
        list.appendChild(li);
      });

      wrap.appendChild(h3);
      wrap.appendChild(list);
      groupsEl.appendChild(wrap);
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const ok = window.confirm("Are you sure you want to clear all favorites?");
        if (!ok) return;
        setFavorites([]);
        updateFavoritesPill();
        renderFavoritesPage();
      });
    }
  };

  injectFavoritesPill();
  renderFavoritesPage();
  injectClearFavoritesPill();
  injectHomePill();

  const updateFavoritesPill = () => {
    const pill = document.querySelector(".favorites-pill");
    if (!pill) return;
    const count = getFavorites().length;
    pill.textContent = `★ Favorites (${count})`;
  };

  const toggleFavorite = (info) => {
    const items = getFavorites();
    const idx = items.findIndex((item) => item.href === info.href);
    if (idx >= 0) {
      items.splice(idx, 1);
    } else {
      items.push(info);
    }
    setFavorites(items);
    updateFavoritesPill();
    return idx === -1;
  };

  const removeFavorite = (href) => {
    const items = getFavorites().filter((item) => item.href !== href);
    setFavorites(items);
    updateFavoritesPill();
  };

  const injectMediaFavoriteButton = () => {
    if (!isMediaPage()) return;
    const frame = document.querySelector(".frame");
    if (!frame) return;
    let wrap = document.querySelector(".fav-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "fav-wrap";
      frame.insertAdjacentElement("afterend", wrap);
    }
    if (wrap.querySelector(".fav-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-btn fav-toggle";
    const info = getMediaInfo();
    const setState = () => {
      const active = getFavorites().some((item) => item.href === info.href);
      btn.classList.toggle("active", active);
      btn.textContent = active ? "★ Favorited" : "☆ Favorite";
    };
    btn.addEventListener("click", () => {
      toggleFavorite(info);
      setState();
      injectInlineStars();
    });
    wrap.appendChild(btn);
    setState();
  };

  const injectInlineStars = () => {
    const list = document.querySelector("ul");
    if (!list) return;
    const links = Array.from(list.querySelectorAll("li > a"));
    if (!links.length) return;
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.endsWith(".html")) return;
      if (link.querySelector(".fav-star-inline")) return;
      const isFav = getFavorites().some((item) => item.href.endsWith(`/${href}`) || item.href.endsWith(`\\${href}`));
      if (!isFav) return;
      const star = document.createElement("span");
      star.className = "fav-star-inline";
      star.textContent = "★";
      star.classList.add("active");
      link.appendChild(star);
    });
  };

  injectInlineStars();
  injectMediaFavoriteButton();
})();
