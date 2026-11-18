'use client';

import { useRouter } from 'next/navigation';
import { REGIONS } from '@/lib/regions';

export default function RegionSwitcher({ region }) {
  const router = useRouter();
  function change(e) {
    document.cookie = `region=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <label className="region">
      <span className="sr-only">Choose your country</span>
      <select value={region} onChange={change}>
        {Object.entries(REGIONS).map(([code, r]) => (
          <option key={code} value={code}>
            {r.flag} {r.short}
          </option>
        ))}
      </select>
    </label>
  );
}
