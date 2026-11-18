import { coverSrc } from '@/lib/art';

/** An uploaded image when there is one, otherwise a generated colourful cover (stable per seed). */
export default function Cover({ src, seed, emoji, alt = '', className = '', loading = 'lazy' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`cover ${className}`} src={src || coverSrc(seed, emoji)} alt={alt} loading={loading} />;
}
