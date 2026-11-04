import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import {
  candyVoucherService,
  type CandyVoucher,
} from "@/features/games/gumballslice/services/candyVoucherService";
import { ICON_CANDY_IMAGE } from "@/features/games/gumballslice/game/itemImages";

// Same page shell as UserGameScoresPage; candy accents in orange.
const NOTE = "mt-0 mb-3 text-[18px] tracking-[1px] text-[#5a7a99]";
const META = "text-[16px] tracking-[1px] text-[#5a7a99] lowercase";

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
    <div className="mb-3 flex items-center justify-center gap-[10px]">
      <img src={ICON_CANDY_IMAGE} alt="" className="animate-candy-bob size-8" />
      <span className="text-[22px] tracking-[2px] text-[#003366]">
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
    <div className="mx-auto box-border h-dvh w-full max-w-[430px] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#e6f2ff_0%,#c4dff5_100%)] px-4 pt-6 pb-12 font-jersey-arial [-webkit-overflow-scrolling:touch]">
      <div className="sticky -top-6 z-10 -mx-4 -mt-6 mb-5 flex items-center justify-between bg-[#e6f2ff] p-4">
        <h1 className="m-0 text-[36px] tracking-[4px] text-[#003366]">my candy</h1>
        <button className="cursor-pointer rounded-[8px] border-2 border-solid border-[#a7d1f5] bg-white px-[18px] py-2 font-jersey-arial text-[18px] tracking-[2px] text-[#003366]" onClick={() => navigate("/user/profile")}>
          Back
        </button>
      </div>

      {justWon && (
        <div className="animate-candy-banner-in mb-5 flex flex-col gap-1 rounded-[14px] border-2 border-solid border-orange bg-orange/12 px-4 py-[14px]">
          <span className="text-[28px] tracking-[2px] text-orange">you won candy! 🍬</span>
          <span className="text-[18px] tracking-[1px] text-[#003366]">it's saved below, ready whenever you are.</span>
        </div>
      )}

      {error && <p className="mt-0 mb-4 text-center text-[18px] tracking-[2px] text-[#aa0000]">could not load your candy right now. try again in a bit.</p>}

      {isLoading ? (
        <p className="mt-10 text-center text-[18px] tracking-[2px] text-[#003366]">Loading...</p>
      ) : (
        <>
          <h2 className="mt-2 mb-[10px] text-[24px] font-normal tracking-[2px] text-[#003366]">ready to redeem ({ready.length})</h2>
          {ready.length === 0 ? (
            <p className={NOTE}>
              no candy yet. win a round of gumball slice on the me2you screen to earn one!
            </p>
          ) : (
            <>
              <p className={NOTE}>
                show a code at the Spark front desk to get a coin for the candy machine.
              </p>
              <LiveBadge />
              <div className="mb-6 grid grid-cols-1 gap-3">
                {ready.map((v) => (
                  <div key={v.id} className={`flex flex-col items-center gap-1 rounded-[16px] border-[3px] border-solid border-orange bg-white px-3 pt-[18px] pb-[14px] shadow-[0_2px_6px_rgba(0,0,0,0.1)] ${
                      v.code === justWon ? "animate-candy-fresh" : ""
                    }`}>
                    <span className="-mr-3 text-[64px] leading-none tracking-[12px] text-orange">{v.code}</span>
                    <span className={META}>won {formatDay(v.wonOn)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {history.length > 0 && (
            <>
              <h2 className="mt-2 mb-[10px] text-[24px] font-normal tracking-[2px] text-[#003366]">history</h2>
              <div className="mb-6 grid grid-cols-1 gap-3">
                {history.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-[10px] border border-solid border-[#a7d1f5] bg-white p-3 opacity-75">
                    <span className="text-[22px] tracking-[4px] text-[#003366] line-through">{v.code}</span>
                    <span className={META}>
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
