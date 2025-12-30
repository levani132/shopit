import './global.css';

export const metadata = {
  title: 'ShopIt',
  description: 'Create your online store',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Theme detection
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.classList.toggle('dark', prefersDark);
                  }
                  
                  // Accent color detection
                  var accentColors = {
                    indigo: {50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81'},
                    pink: {50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d',800:'#9f1239',900:'#831843'},
                    emerald: {50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b'},
                    amber: {50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f'},
                    blue: {50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a'},
                    purple: {50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87'},
                    red: {50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d'},
                    teal: {50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a'}
                  };
                  var savedAccent = localStorage.getItem('accentColor') || 'indigo';
                  var color = accentColors[savedAccent] || accentColors.indigo;
                  Object.keys(color).forEach(function(shade) {
                    document.documentElement.style.setProperty('--accent-' + shade, color[shade]);
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 transition-colors">
        {children}
      </body>
    </html>
  );
}
