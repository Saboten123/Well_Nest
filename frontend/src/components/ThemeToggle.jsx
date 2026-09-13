import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../styles/theme-toggle.css";

/**
 * A small pill-shaped switch that flips the whole app between the
 * "dark" and "light" values of the CSS variables defined in main.css.
 * Drop it anywhere (navbar, landing page header, settings page, ...).
 */
export default function ThemeToggle({ className = "", style }) {
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === "light";

    return (
        <button
            type="button"
            className={`theme-toggle ${className}`}
            style={style}
            onClick={toggleTheme}
            role="switch"
            aria-checked={isLight}
            aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
            title={`Switch to ${isLight ? "dark" : "light"} mode`}
        >
            <span className="theme-toggle-icon theme-toggle-icon--sun">
                <Sun size={14} strokeWidth={2.4} />
            </span>
            <span className="theme-toggle-icon theme-toggle-icon--moon">
                <Moon size={14} strokeWidth={2.4} />
            </span>
            <span className="theme-toggle-thumb">
                <Sun
                    size={14}
                    strokeWidth={2.4}
                    className="theme-toggle-thumb-icon theme-toggle-thumb-icon--sun"
                />
                <Moon
                    size={14}
                    strokeWidth={2.4}
                    className="theme-toggle-thumb-icon theme-toggle-thumb-icon--moon"
                />
            </span>
        </button>
    );
}