/**
 * Profile Card View
 * Displays detailed user profile information in the discovery feature
 */

import type { RandomImageData } from '../types/image';

interface ProfileCardViewProps {
  profileData: RandomImageData;
  onBack: () => void;
}

export const ProfileCardView: React.FC<ProfileCardViewProps> = ({
  profileData,
  onBack,
}) => {
  const { owner, imageUrl } = profileData;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '2px solid #4caf50',
        borderRadius: '8px',
        backgroundColor: '#fff',
        padding: '1.5rem',
        overflow: 'auto',
      }}
    >
      {/* Content Grid - Two Columns */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Left Column - Image and Basic Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Profile Picture */}
          <div
            style={{
              width: '100%',
              aspectRatio: '1',
              overflow: 'hidden',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
            }}
          >
            <img
              src={imageUrl}
              alt={`${owner.name}'s profile`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Name */}
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              margin: 0,
              color: '#333',
              textAlign: 'center',
            }}
          >
            {owner.name}
          </h2>

          {/* Pronouns */}
          {owner.pronouns && (
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '1.2rem',
                  color: '#666',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                {owner.pronouns}
              </p>
            </div>
          )}

          {/* Major/Title */}
          {owner.major && (
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '1.2rem',
                  color: '#666',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {owner.major}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Status and Interests */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Status Section */}
          <div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: '0 0 0.75rem 0',
                color: '#333',
              }}
            >
              Status
            </h3>
            <p
              style={{
                fontSize: '1.2rem',
                color: '#555',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {owner.status || 'No status set'}
            </p>
          </div>

          {/* Interests Section */}
          <div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: '0 0 0.75rem 0',
                color: '#333',
              }}
            >
              Interests
            </h3>
            {owner.interests && owner.interests.length > 0 ? (
              <ul
                style={{
                  fontSize: '1.2rem',
                  color: '#555',
                  margin: 0,
                  paddingLeft: '1.5rem',
                  lineHeight: 1.8,
                }}
              >
                {owner.interests.map((interest, index) => (
                  <li key={index}>{interest}</li>
                ))}
              </ul>
            ) : (
              <p
                style={{
                  fontSize: '1.2rem',
                  color: '#999',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                No interests listed yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          fontSize: '1.2rem',
          fontWeight: 600,
          cursor: 'pointer',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginTop: 'auto',
        }}
      >
        Back to Discovery
      </button>
    </div>
  );
};
