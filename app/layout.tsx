import type { Metadata, Viewport } from "next";
import {
    JetBrains_Mono,
    Space_Grotesk,
    Instrument_Serif,
} from "next/font/google";
import "./globals.css";

// Distinctive type pairing — display serif + grotesk + mono for data readouts.
// Avoids the default Inter/Roboto/space-grotesk-everywhere look.
const display = Instrument_Serif({
    subsets: ["latin"],
    weight: ["400"],
    style: ["normal", "italic"],
    variable: "--font-display",
    display: "swap",
});

const sans = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const mono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Pulse — Uptime Monitor",
    description:
        "Premium dashboard for real-time website uptime monitoring. Cyberpunk neon, glassmorphism, instant status.",
    applicationName: "Pulse",
};

export const viewport: Viewport = {
    themeColor: "#05060a",
    colorScheme: "dark",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${display.variable} ${sans.variable} ${mono.variable}`}
        >
            <body className="bg-grid min-h-screen font-sans antialiased text-white/90 selection:bg-neon-cyan/30 selection:text-white">
                {children}
            </body>
        </html>
    );
}
