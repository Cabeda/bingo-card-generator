'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Game } from '../../utils/bingo.interface';
import { encodeGameLink } from '../../utils/shareGame';

export function ShareGame({ game }: { game: Game }): React.JSX.Element {
  const t = useTranslations('sharing');
  const locale = useLocale();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const share = async (): Promise<void> => {
    setBusy(true);
    setStatus('');
    setUrl('');
    try {
      const hash = await encodeGameLink(game);
      const next = `${window.location.origin}/${locale}/game${hash}`;
      setUrl(next);
      try { await navigator.clipboard.writeText(next); setStatus('copied'); }
      catch { setStatus('copyHelp'); }
    } catch { setStatus('error'); }
    finally { setBusy(false); }
  };
  return <div>
    <button type="button" onClick={() => { void share(); }} disabled={busy}>{t(busy ? 'preparing' : 'action')}</button>
    <p>{t('help')}</p>
    {url && <label>{t('link')}<input readOnly value={url} onFocus={event => event.target.select()} /></label>}
    {status && <p role="status">{t(status)}</p>}
  </div>;
}
