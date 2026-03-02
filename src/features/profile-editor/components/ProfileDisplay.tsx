import React from 'react';

interface Profile {
  name: string;
  photo: string;
  bio: string;
}

interface ProfileDisplayProps {
  profile: Profile;
  onEdit: () => void;
  onBack: () => void;
}

export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({ profile, onEdit, onBack }) => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Left — photo */}
        <div style={styles.left}>
          <img src={profile.photo} alt="Your profile" style={styles.photo} />
        </div>

        {/* Right — info */}
        <div style={styles.right}>
          <h1 style={styles.name}>{profile.name}</h1>
          <p style={styles.bio}>{profile.bio}</p>
          <div style={styles.actions}>
            <button onClick={onBack} style={styles.backBtn}>
              ← Back
            </button>
            <button onClick={onEdit} style={styles.editBtn}>
              Edit Profile
            </button>
          </div>
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
    padding: '2.5rem',
    width: '100%',
    maxWidth: '1600px',
    display: 'flex',
    flexDirection: 'row',
    gap: '2.5rem',
    alignItems: 'center',
    border: '1px solid #e8e8e8',
  },
  left: {
    flex: '0 0 auto',
  },
  photo: {
    width: '280px',
    height: '280px',
    borderRadius: '10px',
    objectFit: 'cover',
    border: '1px solid #e8e8e8',
    display: 'block',
  },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  name: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111111',
  },
  bio: {
    margin: 0,
    fontSize: '1.05rem',
    color: '#555',
    lineHeight: 1.7,
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  backBtn: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
