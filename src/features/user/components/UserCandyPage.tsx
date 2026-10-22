import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import {
  candyVoucherService,
  type CandyVoucher,
} from "@/features/games/gumballslice/services/candyVoucherService";
import { ICON_CANDY_IMAGE } from "@/features/games/gumballslice/game/itemImages";
import styles from "./UserCandyPage.module.css";

/** "Wed, Oct 22" for a YYYY-MM-DD local date (no timezone shift). */
function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Ticking clock + bobbing candy, so staff can see the screen is live, not a screenshot. */
const LiveBadge: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.live}>
      <img src={ICON_CANDY_IMAGE} alt="" className={styles.liveCandy} />
      <span className={styles.liveClock}>
        {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
};

export const UserCandyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const justWon = (location.state as { justWonCode?: string } | null)?.justWonCode;

  const [vouchers, setVouchers] = useState<CandyVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVouchers = useCallback(
    () =>
      candyVoucherService
        .listMine()
        .then(
          (list) => {
            setVouchers(list);
            setError(null);
          },
          (e: unknown) => setError(e instanceof Error ? e.message : "failed to load candy"),
        )
        .finally(() => setIsLoading(false)),
    [],
  );

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Live updates: a voucher flips to "redeemed" the moment the front desk marks it.
  useEffect(() => {
    const userId = userProfile?.id;
    if (!userId) return;
    return candyVoucherService.subscribeToMine(userId, loadVouchers);
  }, [userProfile?.id, loadVouchers]);

  const ready = vouchers.filter((v) => v.status === "issued");
  const history = vouchers.filter((v) => v.status !== "issued");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>my candy</h1>
        <button className={styles.back} onClick={() => navigate("/user/profile")}>
          Back
        </button>
      </div>

      {justWon && (
        <div className={styles.banner}>
          <span className={styles.bannerTitle}>you won candy! 🍬</span>
          <span className={styles.bannerText}>it's saved below, ready whenever you are.</span>
        </div>
      )}

      {error && <p className={styles.error}>could not load your candy right now. try again in a bit.</p>}

      {isLoading ? (
        <p className={styles.status}>Loading...</p>
      ) : (
        <>
          <h2 className={styles.sectionTitle}>ready to redeem ({ready.length})</h2>
          {ready.length === 0 ? (
            <p className={styles.empty}>
              no candy yet. win a round of gumball slice on the me2you screen to earn one!
            </p>
          ) : (
            <>
              <p className={styles.howTo}>
                show a code at the Spark front desk to get a coin for the candy machine.
              </p>
              <LiveBadge />
              <div className={styles.list}>
                {ready.map((v) => (
                  <div key={v.id} className={`${styles.voucher} ${v.code === justWon ? styles.fresh : ""}`}>
                    <span className={styles.code}>{v.code}</span>
                    <span className={styles.meta}>won {formatDay(v.wonOn)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {history.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>history</h2>
              <div className={styles.list}>
                {history.map((v) => (
                  <div key={v.id} className={styles.historyRow}>
                    <span className={styles.historyCode}>{v.code}</span>
                    <span className={styles.meta}>
                      {v.status === "redeemed" && v.redeemedAt
                        ? `redeemed ${formatDateTime(v.redeemedAt)}`
                        : "cancelled"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
