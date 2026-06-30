import "./globals.css";

export const metadata = {
  title: "Our Wedding",
  description: "Wedding invitations, RSVP, and planning",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
