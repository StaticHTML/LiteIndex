(() => {
  const totalEl = document.querySelector(".total");
  const cards = Array.from(document.querySelectorAll(".card"));

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
})();
