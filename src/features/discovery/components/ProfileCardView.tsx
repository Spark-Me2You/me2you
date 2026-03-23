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
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Profile Details</h1>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          Back to Discovery
        </button>
      </header>

      {/* Content Grid - Two Columns */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          padding: '2rem',
          overflow: 'auto',
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
              fontSize: '3rem',
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
                  fontSize: '1.5rem',
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
                  fontSize: '1.5rem',
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
                fontSize: '2rem',
                fontWeight: 600,
                margin: '0 0 1rem 0',
                color: '#333',
              }}
            >
              Status
            </h3>
            <p
              style={{
                fontSize: '1.5rem',
                color: '#555',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {owner.status || 'No status set'}
            </p>
          </div>

          {/* Interests Section */}
          <div>
            <h3
              style={{
                fontSize: '2rem',
                fontWeight: 600,
                margin: '0 0 1rem 0',
                color: '#333',
              }}
            >
              Interests
            </h3>
            {owner.interests && owner.interests.length > 0 ? (
              <ul
                style={{
                  fontSize: '1.5rem',
                  color: '#555',
                  margin: 0,
                  paddingLeft: '2rem',
                  lineHeight: 2,
                }}
              >
                {owner.interests.map((interest, index) => (
                  <li key={index}>{interest}</li>
                ))}
              </ul>
            ) : (
              <p
                style={{
                  fontSize: '1.5rem',
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
    </div>
  );
};
