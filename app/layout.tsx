import type { Metadata } from "next";
import { Balsamiq_Sans, Indie_Flower, JetBrains_Mono } from "next/font/google";

import "./globals.css";


const indieFlower = Indie_Flower({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-indie",
});

const iosevka = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-iosevka", 
});


const balsamiq = Balsamiq_Sans({
  weight:"400",
  subsets: ["latin"],
  variable: "--font-balsamiq",
})


export const metadata: Metadata = {
  title: "PomoFlow",
  description: "Your focused study companion",
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      
      <body className={`${balsamiq.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}