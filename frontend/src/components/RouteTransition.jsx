import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import LogoLoader from "./LogoLoader";

const DELAY_MS = 2800; // keep in sync with LogoLoader.css (2.8s)

export default function RouteTransition() {
    const { pathname, hash } = useLocation();
    const prevPath = useRef(pathname);
    const [loading, setLoading] = useState(false);

    // always open a page from the top (router keeps old scroll otherwise)
    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
    }, []);
    useEffect(() => {
        if (!hash) window.scrollTo(0, 0);
    }, [pathname, hash]);

    // run the loader only when the page really changes (safe in StrictMode)
    useEffect(() => {
        if (prevPath.current === pathname) return;
        prevPath.current = pathname;
        setLoading(true);
        const t = setTimeout(() => setLoading(false), DELAY_MS);
        return () => clearTimeout(t);
    }, [pathname]);

    return (
        loading ? <LogoLoader key={pathname} /> : null
    );
}