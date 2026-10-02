function hue(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export default function StoreLogo({ name, src, size = 56 }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="store-logo" src={src} alt={`${name} logo`} style={style} loading="lazy" />;
  }
  const initials = String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const h = hue(name);
  return (
    <span
      className="store-logo store-logo--text"
      style={{ ...style, fontSize: size * 0.36, background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 55% 32%)` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
