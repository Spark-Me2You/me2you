import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messagesService } from '../services/messagesService';
import { MESSAGE_BODY_MAX } from '../types';

interface MessageComposePageProps {
  tokenId: string;
  recipientName: string;
}

export function MessageComposePage({ tokenId, recipientName }: MessageComposePageProps) {
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MESSAGE_BODY_MAX && !isSending;
  const isOver = trimmed.length > MESSAGE_BODY_MAX;

  const onSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    setError(null);
    try {
      await messagesService.sendMessage(tokenId, trimmed);
      navigate('/claim/success', {
        state: {
          payload: {
            version: '1.0',
            type: 'message',
            display: {
              title: 'message sent!',
              description: `delivered to ${recipientName}`,
              icon: 'badge',
            },
            data: {},
          },
        },
        replace: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to send message');
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto box-border flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)] px-4 py-6">
      <div className="flex w-full flex-col gap-4 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <p className="m-0 font-jersey text-[20px] tracking-[1px] text-[#555] lowercase">
          to: <span className="text-[#e44805]">{recipientName}</span>
        </p>

        <textarea
          className="box-border min-h-[120px] w-full resize-y rounded-[12px] border-2 border-solid border-[#ccc] bg-[rgba(255,255,255,0.8)] px-[14px] py-3 font-averia text-[16px] leading-[1.5] text-[#222] outline-none transition-[border-color] duration-200 ease-[ease] focus:border-[#e44805]"
          maxLength={MESSAGE_BODY_MAX}
          placeholder="write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
        />

        <p className={`m-0 text-right font-jersey text-[13px] tracking-[0.5px] ${isOver ? 'text-[#d32f2f]' : 'text-[#888]'}`}>
          {body.length} / {MESSAGE_BODY_MAX}
        </p>

        {error && <p className="m-0 text-center font-jersey text-[15px] tracking-[0.5px] text-[#d32f2f]">{error}</p>}

        <button
          className="w-full cursor-pointer rounded-[14px] border-0 bg-[#e44805] p-[18px] font-jersey text-[24px] tracking-[2px] text-white lowercase [transition:background_0.2s,transform_0.1s] hover:enabled:bg-[#c53d04] active:enabled:[transform:scale(0.98)] disabled:cursor-not-allowed disabled:bg-[#ccc]"
          onClick={onSend}
          disabled={!canSend}
        >
          {isSending ? 'sending...' : 'send'}
        </button>
      </div>
    </div>
  );
}
