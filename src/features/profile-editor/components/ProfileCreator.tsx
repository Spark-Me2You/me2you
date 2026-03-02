import React, { useRef, useState, useEffect } from 'react';

interface ProfileCreatorProps {
  onComplete: (profile: { name: string; photo: string; bio: string }) => void;
  onCancel: () => void;
}

export const ProfileCreator: React.FC<ProfileCreatorProps> = ({ onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setCameraError('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera();
  };

  const canSubmit = !!photo && !!name.trim() && !!bio.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({ name: name.trim(), photo: photo!, bio: bio.trim() });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Left — camera */}
        <div style={styles.left}>
          <h2 style={styles.title}>Create Your Profile</h2>

          {cameraError && <div style={styles.cameraError}>{cameraError}</div>}

          {/* Video always stays mounted so the stream stays connected */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ ...styles.video, display: photo ? 'none' : 'block' }}
          />

          {photo && <img src={photo} alt="Your photo" style={styles.photoPreview} />}

          {!photo ? (
            <button onClick={capturePhoto} disabled={!!cameraError} style={styles.captureBtn}>
              Take Photo
            </button>
          ) : (
            <button onClick={handleRetake} style={styles.retakeBtn}>
              Retake
            </button>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Right — form */}
        <div style={styles.right}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Your name"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>About me:</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              placeholder="What brings you here today?"
              style={styles.textarea}
            />
            <span style={styles.charCount}>{bio.length} / 150</span>
          </div>

          <div style={styles.actions}>
            <button onClick={onCancel} style={styles.cancelBtn}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ ...styles.submitBtn, opacity: canSubmit ? 1 : 0.4 }}
            >
              Create Profile
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
    border: '1px solid #e8e8e8',
  },
  left: {
    flex: '0 0 50%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111111',
  },
  video: {
    width: '100%',
    borderRadius: '10px',
    background: '#f0f0f0',
    aspectRatio: '4/3',
    objectFit: 'cover',
  },
  captureBtn: {
    padding: '0.65rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  cameraError: {
    color: '#cc0000',
    fontSize: '0.9rem',
    padding: '1rem 0',
  },
  photoPreview: {
    width: '100%',
    borderRadius: '10px',
    objectFit: 'cover',
    aspectRatio: '1/1',
  },
  retakeBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    color: '#444',
    fontWeight: 500,
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    background: '#ffffff',
    color: '#111',
    border: '1px solid #d1d1d1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    padding: '0.75rem',
    fontSize: '1rem',
    background: '#ffffff',
    color: '#111',
    border: '1px solid #d1d1d1',
    borderRadius: '8px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#aaa',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  cancelBtn: {
    padding: '0.65rem 1.25rem',
    fontSize: '0.95rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.65rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
