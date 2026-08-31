'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ActivateClientProps {
  edition: string;
}

export default function ActivateClient({ edition }: ActivateClientProps) {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-detect paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.length >= 8) {
      setLicenseKey(pastedText.trim());
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!licenseKey.trim()) {
      setError('Veuillez saisir une clé de licence');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/validate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim(), edition }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'Erreur lors de la validation');
        return;
      }

      // Success - redirect to the edition page
      router.push(result.redirectUrl || `/${edition}`);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'var(--font-family)' }}>
            L&apos;Éclaireur Map
          </h1>
          <p className="text-sm opacity-70">
            Édition : <span className="font-medium">{edition}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="licenseKey"
              className="block text-sm font-medium mb-2 opacity-80"
            >
              Clé de licence
            </label>
            <input
              ref={inputRef}
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onPaste={handlePaste}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 
                         placeholder-white/30 focus:outline-none focus:border-white/40
                         transition-colors font-mono text-center tracking-wider
                         disabled:opacity-50"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center py-2 px-3 rounded-lg bg-red-500/10">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !licenseKey.trim()}
            className="w-full py-3 rounded-xl font-medium transition-all
                       bg-white/20 hover:bg-white/30 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Validation en cours...
              </span>
            ) : (
              'Activer'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs opacity-50">
            Vous avez acheté votre licence sur{' '}
            <a
              href="https://chariow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
            >
              Chariow
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
