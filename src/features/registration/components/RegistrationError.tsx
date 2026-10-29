/**
 * Registration Error Component
 *
 * Displays user-friendly error messages when QR code validation fails.
 * Different messaging for different error scenarios.
 */

import logo from '@/assets/me2you.png';

interface RegistrationErrorProps {
  message: string;
  errorCode?: string;
}

export const RegistrationError: React.FC<RegistrationErrorProps> = ({ message, errorCode }) => {
  // Get specific hint based on error code
  const getHint = () => {
    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        return 'QR codes refresh every 5 minutes for security.';
      case 'NONCE_ALREADY_USED':
        return 'Each QR code can only be used once.';
      case 'INVALID_TOKEN':
        return 'The QR code may be corrupted or invalid.';
      default:
        return null;
    }
  };

  const hint = getHint();

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
      <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-20 w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

      <div className="flex flex-1 items-center justify-center px-[30px] pt-[120px] pb-10">
        <div className="max-w-[350px] rounded-[24px] bg-[rgba(255,255,255,0.95)] px-[30px] py-10 text-center shadow-[0px_4px_12px_rgba(0,0,0,0.15)]">
          <h2 className="m-0 mb-5 font-jersey text-[42px] tracking-[2px] text-[#e44805] lowercase">Unable to Register</h2>

          <p className="m-0 mb-4 font-jersey text-[24px] leading-[1.4] text-[#333]">{message}</p>

          {hint && <p className="m-0 mb-6 font-jersey text-[20px] text-[#666] italic">{hint}</p>}

          <div className="mt-6 border-t border-solid border-t-[rgba(0,0,0,0.1)] pt-6">
            <p className="m-0 font-jersey text-[22px] leading-[1.5] text-[#333]">Please return to the kiosk and scan a fresh QR code to register.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
