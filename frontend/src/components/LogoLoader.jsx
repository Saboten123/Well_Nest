import "./LogoLoader.css";

// One continuous pen stroke: weaves the nest, ends in the heart.
// pathLength="1" lets the CSS dash trick work on any path.
const D =
    "M28 100 C50 172 150 172 172 100 C168 106 164 110 156 114 C130 160 70 160 44 114 C50 116 54 122 62 127 C82 149 118 149 138 127 C130 118 116 112 100 108 C62 82 66 44 100 64 C134 44 138 82 100 108";

export default function LogoLoader() {
    return (
        <div className="wn-loader" role="status" aria-label="Loading">
            <svg viewBox="0 0 200 200" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                    <linearGradient id="wnGrad" gradientUnits="userSpaceOnUse" x1="100" y1="160" x2="100" y2="50">
                        <stop offset="0" stopColor="#22B98A" />
                        <stop offset="0.55" stopColor="#5FD3AE" />
                        <stop offset="1" stopColor="#F08A8E" />
                    </linearGradient>
                    <filter id="wnGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="5" />
                    </filter>
                </defs>
                {/* soft glow under the stroke */}
                <path className="wn-glow" pathLength="1" d={D} stroke="url(#wnGrad)" strokeWidth="10" filter="url(#wnGlow)" />
                {/* the pen stroke */}
                <path className="wn-pen" pathLength="1" d={D} stroke="url(#wnGrad)" strokeWidth="6" />
            </svg>
        </div>
    );
}