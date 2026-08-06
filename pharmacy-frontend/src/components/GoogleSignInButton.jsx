import { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Renders Google's own Sign In button and forwards the raw ID token
 * credential to `onCredential` -- caller decides whether that's a login,
 * the start of a Google-based signup, or completing one (see
 * AuthContext.loginWithGoogle / completeGoogleSignup). */
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const toast = useToast();
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 340,
          text,
          shape: 'rectangular',
        });
        setReady(true);
      })
      .catch(() => setReady(false));

    return () => {
      cancelled = true;
    };
  }, [onCredential, text]);

  if (!CLIENT_ID) {
    return (
      <button
        type="button"
        className="btn-social"
        onClick={() => toast.showToast("Google sign-in isn't configured for this deployment yet.", 'info')}
      >
        <GoogleGlyph />
        Continue with Google
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
      {!ready && (
        <button type="button" className="btn-social" disabled>
          <GoogleGlyph />
          Loading Google sign-in...
        </button>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
