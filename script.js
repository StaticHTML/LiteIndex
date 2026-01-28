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

  const syncEmbedImage = async () => {
    try {
      const res = await fetch(getIndexUrl(), { cache: "no-cache" });
      if (!res.ok) return;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
      const twImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
      const image = ogImage || twImage;
      if (!image) return;
      setMeta('meta[property="og:image"]', { property: "og:image", content: image });
      setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    } catch (err) {
      // no-op
    }
  };

  fetchCounts();
  syncEmbedImage();
})();
