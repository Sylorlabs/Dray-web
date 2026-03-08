'use client';

export default function Error({
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
      <h1 style={{ color: '#ed4245', marginBottom: '1rem' }}>Something went wrong</h1>
      <p style={{ color: '#9494a5', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
        Drey encountered an unexpected error. Your project data is safe in your browser.
      </p>
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
        Try Again
      </button>
    </div>
  );
}
