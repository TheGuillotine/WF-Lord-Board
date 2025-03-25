import React from 'react';
import type { AppProps } from 'next/app';
import { Analytics } from "@vercel/analytics/react";
import '../styles/globals.css';
import '../styles/enhanced-styles.css';
import '../styles/stakers-map.css';
import '../styles/stakers-map-extras.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}