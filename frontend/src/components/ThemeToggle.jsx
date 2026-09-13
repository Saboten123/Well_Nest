import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../styles/theme-toggle.css";

/**
 * A small pill-shaped switch that flips the whole app between the
 * "dark" and "light" values of the CSS variables defined in main.css.
 * Drop it anywhere (navbar, landing page header, settings page, ...).
 */
export default function ThemeToggle({ className = "" }) {
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === "light";

    return (
        <button
            type="button"
            className={`theme-toggle ${className}`}
            data-mode={theme}
            onClick={toggleTheme}
            role="switch"
            aria-checked={isLight}
            aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
            title={`Switch to ${isLight ? "dark" : "light"} mode`}
        >
            <span className="theme-toggle-thumb">
                <Sun
                    className="theme-toggle-icon theme-toggle-icon--sun"
                    size={13}
                    strokeWidth={2.4}
                />
                <Moon
                    className="theme-toggle-icon theme-toggle-icon--moon"
                    size={13}
                    strokeWidth={2.4}
                />
            </span>
            <span className="theme-toggle-label">
                <span className="theme-toggle-label-line">
                    {isLight ? "Light" : "Dark"}
                </span>
                <span className="theme-toggle-label-line">Mode</span>
            </span>
        </button>
    );
}