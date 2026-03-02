import React, { useState, useEffect } from 'react';
import { ProfileCreator } from './ProfileCreator';
import { ProfileDisplay } from './ProfileDisplay';

const PROFILE_STORAGE_KEY = 'me2you_my_profile';

interface Profile {
  name: string;
  photo: string;
  bio: string;
}

interface MyProfileViewProps {
  onBack: () => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {
        // corrupted data — ignore and start fresh
      }
    }
  }, []);

  const handleCreate = (p: Profile) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <ProfileCreator
        onComplete={handleCreate}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  if (profile) {
    return (
      <ProfileDisplay
        profile={profile}
        onEdit={() => setIsCreating(true)}
        onBack={onBack}
      />
    );
  }

  // No profile yet
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.textGroup}>
          <h2 style={styles.title}>My Profile</h2>
          <p style={styles.subtitle}>You don't have a profile yet.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={onBack} style={styles.backBtn}>
            ← Back
          </button>
          <button onClick={() => setIsCreating(true)} style={styles.createBtn}>
            Create Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    padding: '2rem 1.5rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '1600px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2rem',
    border: '1px solid #e8e8e8',
  },
  textGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#111111',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#888',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    flexShrink: 0,
  },
  backBtn: {
    padding: '0.65rem 1.25rem',
    fontSize: '0.95rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  createBtn: {
    padding: '0.75rem 1.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
