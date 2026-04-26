import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { messagesService } from '../services/messagesService';
import type { MessageWithSender } from '../types';
import styles from './MessagesView.module.css';

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

  useEffect(() => {
    if (!userId) return;
    let active = true;
    messagesService.listInbox(userId)
      .then((rows) => { if (active) setMessages(rows); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/user/profile')}>
          back
        </button>
        <h1 className={styles.title}>messages</h1>
      </div>

      {isLoading ? (
        <p className={styles.loading}>loading...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : messages.length === 0 ? (
        <p className={styles.empty}>no messages yet</p>
      ) : (
        <div className={styles.list}>
          {messages.map((msg) => (
            <div key={msg.id} className={styles.messageCard}>
              <p className={styles.senderName}>{msg.sender?.name ?? 'someone'}</p>
              <p className={styles.body}>{msg.body}</p>
              <p className={styles.timestamp}>{formatRelativeTime(msg.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
