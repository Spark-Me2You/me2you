/**
 * Profile Card Component
 * Displays user card in the Community Hub grid
 */

import React from "react";
import type { HubUserData } from "../services/hubService";

interface ProfileCardProps {
  userData: HubUserData;
  onClick: () => void;
}

/**
 * Generate text initials from user name
 * - Single name: First 2 letters
 * - Multiple names: First letter of first two words
 * @example "John Doe" -> "JD"
 * @example "Alice" -> "AL"
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate consistent background color from user ID
 * Uses hash of ID to generate hue value for pastel colors
 */
function getInitialsColor(userId: string): string {
  // Simple hash to generate hue (0-360)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  // Use HSL for consistent saturation/lightness (pastel colors)
  return `hsl(${hue}, 60%, 70%)`;
}

/**
 * Profile Card Component
 * Displays user info with image or text initials
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  userData,
  onClick,
}) => {
  const { user, profileImageUrl } = userData;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Image or Initials - 60% of card height */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          overflow: "hidden",
          backgroundColor: "#f5f5f5",
          position: "relative",
        }}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={`${user.name}'s profile`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              // Hide image on error and let parent show initials
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: getInitialsColor(user.id),
              color: "#fff",
              fontSize: "3rem",
              fontWeight: 700,
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            {getInitials(user.name)}
          </div>
        )}
      </div>

      {/* User Info - 40% of card */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {/* Name */}
        <h3
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#333",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.name}
        </h3>

        {/* Pronouns */}
        {user.pronouns && (
          <p
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "#666",
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.pronouns}
          </p>
        )}

        {/* Status - Truncate to 2 lines */}
        {user.status && (
          <p
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "#666",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: "1.4",
              minHeight: "2.8rem", // 2 lines worth of height
            }}
          >
            {user.status}
          </p>
        )}
      </div>
    </div>
  );
};
