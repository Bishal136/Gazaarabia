"use client";

import Script from "next/script";
import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCookieConsent } from "@/lib/cookies";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local")
  );
}

function GoogleAnalyticsEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    
    const url = pathname + searchParams.toString();
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  const [canLoad, setCanLoad] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" || isLocalhost()) {
      return;
    }

    const checkConsent = () => {
      const consent = getCookieConsent();
      if (!consent) return false;
      return consent.analytics === true;
    };

    if (checkConsent()) {
      setCanLoad(true);
    }

    const handleConsentResolved = () => {
      if (checkConsent()) {
        setCanLoad(true);
      }
    };

    window.addEventListener("cookieConsentResolved", handleConsentResolved);
    return () => {
      window.removeEventListener("cookieConsentResolved", handleConsentResolved);
    };
  }, []);

  if (!GA_MEASUREMENT_ID || !canLoad) return null;

  return (
    <>
      <Suspense fallback={null}>
        <GoogleAnalyticsEvents />
      </Suspense>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

// Helper for custom GA4 events
export const gaEvent = (action: string, category: string, label: string, value?: number) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
