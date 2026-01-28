(() => {
  const totalEl = document.querySelector(".total");
  const cards = Array.from(document.querySelectorAll(".card"));

  if (!cards.length) return;

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

  fetchCounts();
})();
