import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { messagesService } from '../services/messagesService';
import type { MessageWithSender } from '../types';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MessagesView() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let active = true;
    messagesService.listInbox(userId)
      .then((rows) => { if (active) setMessages(rows); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const handleDelete = async (messageId: string) => {
    setDeletingIds((prev) => new Set(prev).add(messageId));
    try {
      await messagesService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(messageId); return next; });
    }
  };

  return (
    <div className="mx-auto box-border flex h-dvh w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)] p-4 [-webkit-overflow-scrolling:touch]">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-4 flex items-center gap-3 bg-[#58e7f7] p-4">
        <button className="cursor-pointer rounded-[10px] border-0 bg-[#e44805] px-[18px] py-2 font-jersey text-[18px] tracking-[1px] text-white lowercase [transition:background_0.2s,transform_0.1s] hover:bg-[#c53d04] active:[transform:scale(0.98)]" onClick={() => navigate('/user/profile')}>
          back
        </button>
        <h1 className="m-0 font-jersey text-[28px] tracking-[2px] text-[#333] lowercase">messages</h1>
      </div>

      {isLoading ? (
        <p className="mt-[60px] text-center font-jersey text-[20px] tracking-[1px] text-[#888] lowercase">loading...</p>
      ) : error ? (
        <p className="mt-10 text-center font-jersey text-[15px] tracking-[0.5px] text-[#d32f2f]">{error}</p>
      ) : messages.length === 0 ? (
        <p className="mt-[60px] text-center font-jersey text-[20px] tracking-[1px] text-[#888] lowercase">no messages yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-[6px] rounded-[16px] bg-[rgba(255,255,255,0.9)] px-[18px] py-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 font-jersey text-[18px] tracking-[1px] text-[#e44805] lowercase">{msg.sender?.name ?? 'someone'}</p>
                <button
                  className="shrink-0 cursor-pointer border-0 bg-transparent px-1 py-0 font-jersey text-[22px] leading-none text-[#aaa] transition-[color] duration-150 ease-[ease] hover:enabled:text-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleDelete(msg.id)}
                  disabled={deletingIds.has(msg.id)}
                  aria-label="delete message"
                >
                  ×
                </button>
              </div>
              <p className="m-0 font-averia text-[15px] leading-[1.5] whitespace-pre-wrap text-[#333] [word-break:break-word]">{msg.body}</p>
              <p className="m-0 font-jersey text-[12px] tracking-[0.5px] text-[#aaa]">{formatRelativeTime(msg.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
