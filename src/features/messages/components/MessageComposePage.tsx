import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messagesService } from '../services/messagesService';
import { MESSAGE_BODY_MAX } from '../types';
import styles from './MessageComposePage.module.css';

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
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.to}>
          to: <span className={styles.recipientName}>{recipientName}</span>
        </p>

        <textarea
          className={styles.textarea}
          maxLength={MESSAGE_BODY_MAX}
          placeholder="write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
        />

        <p className={`${styles.charCount} ${isOver ? styles.charCountOver : ''}`}>
          {body.length} / {MESSAGE_BODY_MAX}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.sendButton}
          onClick={onSend}
          disabled={!canSend}
        >
          {isSending ? 'sending...' : 'send'}
        </button>
      </div>
    </div>
  );
}
