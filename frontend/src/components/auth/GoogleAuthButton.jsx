import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loginWithGoogle } from '../../services/authService';

export const GoogleAuthButton = ({
  onSuccess,
  onError,
  requestedRole,
  buttonText = 'Sign in with Google',
  disabled = false,
  className = '',
}) => {
  const containerRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isClientIdConfigured = 
    Boolean(clientId) && 
    !clientId.includes('your-google-client-id') && 
    clientId.includes('.apps.googleusercontent.com');

  const handleCredentialResponse = async (response) => {
    if (isSubmitting) return;

    if (!response || !response.credential) {
      if (onError) {
        onError('No authentication credential received from Google.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        credential: response.credential,
        ...(requestedRole ? { requestedRole } : {}),
      };

      const result = await loginWithGoogle(payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (onError) {
        onError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let checkInterval = null;

    const initializeGis = () => {
      if (window.google?.accounts?.id && isClientIdConfigured && containerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Clear previous child buttons if any
          containerRef.current.innerHTML = '';

          window.google.accounts.id.renderButton(containerRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: buttonText.includes('up') ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });

          setIsGisReady(true);
          if (checkInterval) clearInterval(checkInterval);
        } catch (e) {
          console.warn('Google Identity Services initialization notice:', e.message);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGis();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGis();
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clientId, isClientIdConfigured, requestedRole, buttonText]);

  const handleManualClick = () => {
    if (disabled || isSubmitting) return;

    if (!isClientIdConfigured) {
      if (onError) {
        onError(
          'Google Sign-In is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID in frontend/.env with your Google Cloud OAuth Client ID.'
        );
      }
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('GIS prompt dismissed or skipped');
          }
        });
      } catch (e) {
        console.warn('GIS prompt trigger:', e.message);
      }
    } else {
      if (onError) {
        onError('Google Identity Services is loading. Please check your internet connection and try again.');
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Official Google Identity Services Rendered Container */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center ${isGisReady && !isSubmitting ? 'block' : 'hidden'}`}
        style={{ minHeight: '40px' }}
      />

      {/* Fallback & Loading Button */}
      {(!isGisReady || isSubmitting) && (
        <button
          type="button"
          onClick={handleManualClick}
          disabled={disabled || isSubmitting}
          className="w-full h-10 px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-600" />
              <span>Verifying with Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default GoogleAuthButton;
