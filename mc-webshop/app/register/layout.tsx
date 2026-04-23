'use client';

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <style jsx global>{`
        footer {
          display: none !important;
        }
        html, body {
          overflow: hidden !important;
          height: 100vh !important;
        }
      `}</style>
        </>
    );
}
