import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "zownload",
    description: "Extract, convert, and download media from hundreds of platforms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-neutral-950 text-neutral-100 min-h-screen">
                <nav className="border-b border-neutral-800 px-6 py-4">
                    <span className="text-lg font-semibold tracking-tight">zownload</span>
                </nav>
                <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
            </body>
        </html>
    );
}