'use client';

/**
 * Offline fallback page
 * Shown when user is offline and the requested page isn't cached
 */
export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Offline | ShopIt</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            color: #1f2937;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
          }
          p {
            color: #6b7280;
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
          button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
          }
          button:hover {
            background: #2563eb;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
              color: #f9fafb;
            }
            p { color: #9ca3af; }
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon">📡</div>
          <h1>You&apos;re Offline</h1>
          <p>
            It looks like you&apos;ve lost your internet connection. Please
            check your connection and try again.
          </p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </body>
    </html>
  );
}
