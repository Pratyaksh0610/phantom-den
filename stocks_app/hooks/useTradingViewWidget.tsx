"use client";

import { useEffect, useRef } from "react";

export default function useTradingViewWidget(
  scriptUrl: string,
  config: Record<string, unknown>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current || containerRef.current.dataset.loaded) return;
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    script.onerror = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML =
          "<p style='color:red'>Failed to load widget.</p>";
      }
      console.error("TradingView widget script failed:", scriptUrl);
    };

    containerRef.current.appendChild(script);
    containerRef.current.dataset.loaded = "true";

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        delete containerRef.current.dataset.loaded;
      }
    };
  }, [scriptUrl, config]);
  return containerRef;
}
