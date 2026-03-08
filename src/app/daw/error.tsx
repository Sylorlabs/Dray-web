'use client';

export default function DAWError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#050508',
      color: '#e2e2e9',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem',
    }}>
      <h1 style={{ color: '#ed4245', marginBottom: '0.5rem' }}>DAW Error</h1>
      <p style={{ color: '#9494a5', marginBottom: '1rem', textAlign: 'center', maxWidth: '480px' }}>
        The Drey DAW encountered an error. Your project data is saved locally and should be recoverable.
      </p>
      <p style={{ color: '#6a6a7a', fontSize: '0.8rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '480px' }}>
        {error?.message || 'An unexpected error occurred in the DAW.'}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{
            background: '#5865f2',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Reload DAW
        </button>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            background: 'transparent',
            color: '#9494a5',
            border: '1px solid #2a2a3a',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
