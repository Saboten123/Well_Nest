// Use anywhere on the site: <Logo size={32} />
export default function Logo({ size = 32, className = "" }) {
    return (
        <img
            src="/logo.svg"
            alt="Well-Nest"
            width={size}
            height={size}
            className={className}
        />

    );
}