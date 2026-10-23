/**
 * User Landing Page
 * Mobile sign-in + create account entry point
 */

import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/auth";
import { CreateAccountPrompt } from "./CreateAccountPrompt";
import logo from "@/assets/me2you.png";

const PRIMARY_BTN =
  "cursor-pointer rounded-[16px] border-0 bg-[#e44805] font-jersey tracking-[2px] text-white lowercase [transition:background_0.2s,transform_0.1s] hover:enabled:bg-[#cc4004] active:enabled:[transform:scale(0.98)] disabled:cursor-not-allowed disabled:opacity-60";
const INPUT =
  "rounded-[12px] border-2 border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.9)] px-4 py-3 font-jersey text-[20px] text-[#333] transition-[border-color] duration-200 ease-[ease] focus:border-[#e44805] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const UserLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInUser, authMode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);

  // Redirect if already signed in as user, honoring any ?next= destination
  const next = searchParams.get("next");
  if (authMode === "user") {
    const destination = next && next.startsWith("/claim/") ? next : "/user/profile";
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signInUser(email, password);
      const destination = next && next.startsWith("/claim/") ? next : "/user/profile";
      navigate(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
      <img src={logo} alt="me2you" className="pointer-events-none absolute top-[30px] left-1/2 z-20 w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

      {/* Admin button - top right */}
      <button
        onClick={() => navigate("/login")}
        className="absolute top-[-10px] right-4 z-10 cursor-pointer rounded-[12px] border border-solid border-[rgba(0,0,0,0.15)] bg-[rgba(255,255,255,0.7)] px-4 py-2 font-jersey text-[20px] tracking-[1px] text-[#666] lowercase transition-all duration-200 ease-[ease] hover:border-[rgba(0,0,0,0.25)] hover:bg-[rgba(255,255,255,0.9)] hover:text-[#333] active:scale-[0.85]"
        type="button"
      >
        admin?
      </button>

      <div className="flex flex-1 items-center justify-center px-[30px] pt-[120px] pb-10">
        <div className="w-full max-w-[350px] rounded-[24px] px-[30px] py-10 bg-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105 shadow-glass">
          <h1 className="m-0 mb-[30px] text-center font-jersey text-[48px] tracking-[3px] text-[#e44805] lowercase">sign in</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-jersey text-[22px] tracking-[1px] text-[#333] lowercase">
                email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-jersey text-[22px] tracking-[1px] text-[#333] lowercase">
                password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>

            {error && <div className="rounded-[8px] bg-[rgba(211,47,47,0.1)] p-3 text-center font-jersey text-[18px] text-[#d32f2f]">{error}</div>}

            <button
              type="submit"
              className={`${PRIMARY_BTN} mt-[10px] p-4 text-[28px]`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "signing in..." : "sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center before:h-px before:flex-1 before:bg-[rgba(0,0,0,0.15)] before:content-[''] after:h-px after:flex-1 after:bg-[rgba(0,0,0,0.15)] after:content-['']">
            <span className="px-4 font-jersey text-[20px] text-[#666] lowercase">or</span>
          </div>

          <button
            type="button"
            className="cursor-pointer rounded-[16px] border-2 border-solid border-[#e44805] bg-[rgba(228,72,5,0.1)] p-[14px] font-jersey text-[24px] tracking-[2px] text-[#e44805] lowercase [transition:background_0.2s,transform_0.1s] hover:bg-[rgba(228,72,5,0.2)] active:[transform:scale(0.98)]"
            onClick={() => setShowCreatePrompt(true)}
          >
            create account
          </button>
        </div>
      </div>

      {showCreatePrompt && (
        <CreateAccountPrompt onClose={() => setShowCreatePrompt(false)} />
      )}
    </div>
  );
};
