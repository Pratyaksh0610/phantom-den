"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { Star, Trash2 } from "lucide-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  // Synchronize internal state with prop (important if search results change)
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const router: AppRouterInstance = useRouter();
  const pathName = usePathname();

  useEffect(() => {
    setAdded(!!isInWatchlist);
  }, [isInWatchlist]);

  const label = useMemo(() => {
    if (type === "icon") return "";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type]);

  // Handle adding/removing stocks via the API Route Bridge
  const toggleWatchlist = async () => {
    const action = added ? "remove" : "add";

    try {
      const res = await fetch("/api/mutateWatchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, company, action }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(added ? "Removed from Watchlist" : "Added to Watchlist", {
          description: `${company} ${
            added ? "removed from" : "added to"
          } your watchlist`,
        });

        // Notify parent component for state synchronization
        onWatchlistChange?.(symbol, added);
        {
          pathName === "/watchlist" && router.refresh();
        } // Only refresh if we're on the watchlist page to update the list
      } else {
        // Rollback UI if the server fails
        setAdded(!added);
        toast.error("Failed to update watchlist", {
          description: result.error || "Please try again later.",
        });
      }
    } catch (error) {
      setAdded(!added); // Rollback
      console.error("Watchlist toggle error:", error);
    }
  };

  const debouncedToggle = useDebounce(toggleWatchlist, 300);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Optimistic Update: Change the UI immediately
    const nextState = !added;
    setAdded(nextState);
    debouncedToggle();
  };

  if (type === "icon") {
    return (
      <button
        title={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        aria-label={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""}`}
        onClick={handleClick}
      >
        <Star fill={added ? "currentColor" : "none"} className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      className={`watchlist-btn ${added ? "watchlist-remove" : ""}`}
      onClick={handleClick}
    >
      {showTrashIcon && added ? <Trash2 className="h-4 w-4" /> : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
