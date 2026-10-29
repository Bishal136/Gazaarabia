"use client";

import { useEffect, Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCookieConsent } from "@/lib/cookies";

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

const isLocalhost = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  );
};

const ensureStubFbq = () => {
  if (typeof window === "undefined") return;
  if (!(window as any).fbq) {
    const stub: any = function (...args: any[]) {
      if (stub.queue) stub.queue.push(args);
    };
    stub.callMethod = stub;
    stub.queue = [];
    stub.loaded = false;
    stub.version = "2.0";
    stub.push = stub;
    (window as any).fbq = stub;
    (window as any)._fbq = stub;
  }
};

const pageview = () => {
  if (typeof window !== "undefined" && (window as any).fbq) {
    try {
      (window as any).fbq("track", "PageView");
    } catch {
      // Ignored
    }
  }
};

function FacebookPixelEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    pageview();
  }, [pathname, searchParams]);

  return null;
}

export default function FacebookPixel() {
  const [canLoad, setCanLoad] = useState(false);

  useEffect(() => {
    // Always provide safe fbq stub so callers throughout app never crash
    ensureStubFbq();

    if (!FB_PIXEL_ID) return;

    // In local development or localhost, do not inject third-party tracker
    // to prevent ad-blockers from triggering net::ERR_BLOCKED_BY_CLIENT console errors
    if (process.env.NODE_ENV === "development" || isLocalhost()) {
      return;
    }

    const checkConsent = () => {
      const consent = getCookieConsent();
      if (!consent) return false;
      return consent.marketing === true;
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

  useEffect(() => {
    if (!canLoad || !FB_PIXEL_ID) return;

    if (typeof window !== "undefined" && !(window as any)._fb_script_loaded) {
      (window as any)._fb_script_loaded = true;

      try {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.onerror = () => {
          // Suppress error if client has an adblocker enabled
        };
        const firstScript = document.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(script, firstScript);
        } else {
          document.head.appendChild(script);
        }

        if ((window as any).fbq) {
          (window as any).fbq("init", FB_PIXEL_ID);
        }
      } catch {
        // Suppress injection errors
      }
    }
  }, [canLoad]);

  if (!canLoad || !FB_PIXEL_ID) return null;

  return (
    <>
      <Suspense fallback={null}>
        <FacebookPixelEvents />
      </Suspense>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Helper to track custom events safely
export const fbEvent = (name: string, options = {}) => {
  if (typeof window !== "undefined" && (window as any).fbq) {
    try {
      (window as any).fbq("track", name, options);
    } catch {
      // Ignored if blocked by client
    }
  }
};
