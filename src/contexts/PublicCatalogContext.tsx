import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getPublicCatalog, type PublicCatalog } from "../lib/graphqlClient";

type CatalogStatus = "loading" | "ready" | "error";
type PublicCatalogContextValue = {
  catalog: PublicCatalog | null;
  status: CatalogStatus;
  error: string | null;
  refresh: () => void;
};

const PublicCatalogContext = createContext<PublicCatalogContextValue | null>(null);
const CATALOG_REFRESH_MS = 30_000;
const CATALOG_UPDATED_KEY = "funbike-public-catalog-updated";

export function PublicCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const catalogRef = useRef<PublicCatalog | null>(null);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/admin") {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      if (!catalogRef.current) setStatus("loading");
      try {
        const nextCatalog = await getPublicCatalog();
        if (cancelled) return;
        catalogRef.current = nextCatalog;
        setCatalog(nextCatalog);
        setStatus("ready");
        setError(null);
      } catch (reason) {
        if (cancelled) return;
        if (!catalogRef.current) {
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "Impossible de charger le catalogue public.");
        }
      } finally {
        inFlight = false;
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), CATALOG_REFRESH_MS);
    const onFocus = () => void load();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_UPDATED_KEY) void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshKey]);

  return (
    <PublicCatalogContext.Provider value={{ catalog, status, error, refresh }}>
      {children}
    </PublicCatalogContext.Provider>
  );
}

export function usePublicCatalog(): PublicCatalogContextValue {
  const value = useContext(PublicCatalogContext);
  if (!value) throw new Error("usePublicCatalog must be used inside PublicCatalogProvider.");
  return value;
}
