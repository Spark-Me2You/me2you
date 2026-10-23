import { useLocation, useNavigate } from 'react-router-dom';
import type { ClaimPayload } from '../types';
import logo from '@/assets/me2you.png';

const ICON_MAP: Record<string, string> = {
  trophy: '🏆',
  badge: '🎖️',
  gift: '🎁',
  star: '⭐',
  art: '🎨',
};

export function ClaimSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const payload = (state as { payload?: ClaimPayload } | null)?.payload;

  const display = payload?.display;
  const icon = display?.icon ? (ICON_MAP[display.icon] ?? '✅') : '✅';

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
      <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-20 w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

      <div className="flex flex-1 items-center justify-center px-[30px] pt-[120px] pb-10">
        <div className="flex w-full max-w-[350px] flex-col items-center gap-4 rounded-[24px] bg-[rgba(255,255,255,0.95)] px-[30px] py-10 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
          <div className="text-[64px] leading-none">{icon}</div>
          <h1 className="m-0 text-center font-jersey text-[40px] tracking-[2px] text-[#e44805] lowercase">{display?.title ?? 'claimed!'}</h1>
          {display?.description && (
            <p className="m-0 text-center font-jersey text-[22px] tracking-[1px] text-[#555] lowercase">{display.description}</p>
          )}
          <button
            className="mt-2 cursor-pointer rounded-[16px] border-0 bg-[#e44805] px-6 py-3.5 font-jersey text-[24px] tracking-[2px] text-white lowercase [transition:background_0.2s,transform_0.1s] hover:bg-[#cc4004] active:[transform:scale(0.98)]"
            onClick={() => navigate('/user/profile', { replace: true })}
          >
            view my profile
          </button>
        </div>
      </div>
    </div>
  );
}
