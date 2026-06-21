import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    const prevTitle = document.title;
    document.title = "Page Not Found — Talon's Math Hub";

    const setMeta = (selector: string, attr: string, name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", content);
      return () => {
        if (prev === null) el?.remove();
        else el?.setAttribute("content", prev);
      };
    };

    const restoreDesc = setMeta(
      'meta[name="description"]',
      "name",
      "description",
      "The page you're looking for doesn't exist. Return to Talon's Math Hub for free math practice and lessons."
    );
    const restoreOgTitle = setMeta(
      'meta[property="og:title"]',
      "property",
      "og:title",
      "Page Not Found — Talon's Math Hub"
    );
    const restoreOgDesc = setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      "The page you're looking for doesn't exist."
    );
    const restoreOgUrl = setMeta(
      'meta[property="og:url"]',
      "property",
      "og:url",
      `https://talonsmathhub.lovable.app${location.pathname}`
    );

    // noindex this route
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);

    // self-referencing canonical for the 404 path
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (canonical) {
      canonical.setAttribute("href", `https://talonsmathhub.lovable.app${location.pathname}`);
    }

    return () => {
      document.title = prevTitle;
      restoreDesc();
      restoreOgTitle();
      restoreOgDesc();
      restoreOgUrl();
      robots.remove();
      if (canonical && prevCanonical !== null) canonical.setAttribute("href", prevCanonical);
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
