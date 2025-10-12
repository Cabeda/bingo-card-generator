// app/layout.tsx
import Navbar from "./components/Navbar";
import ViewTransition from "./components/ViewTransition";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <ViewTransition />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
