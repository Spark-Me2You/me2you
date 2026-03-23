/**
 * Hub View Component
 * Main entry point for the Community Hub feature
 * Displays all users in the organization in a grid layout
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/core/auth";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { hubService, type HubUserData } from "./services/hubService";
import { ProfileCard } from "./components/ProfileCard";
import { ProfileCardView } from "@/features/discovery/components/ProfileCardView";
import type { RandomImageData } from "@/features/discovery/types/image";

/**
 * Convert HubUserData to RandomImageData format for ProfileCardView
 * ProfileCardView expects RandomImageData, so we adapt our hub data structure
 */
function toRandomImageData(hubUser: HubUserData): RandomImageData {
  return {
    image: {
      id: "",
      owner_id: hubUser.user.id,
      org_id: "",
      storage_path: "",
      category: "profile",
      is_public: true,
      created_at: hubUser.user.created_at,
    },
    owner: {
      id: hubUser.user.id,
      name: hubUser.user.name,
      status: hubUser.user.status,
      pronouns: hubUser.user.pronouns,
      major: hubUser.user.major,
      interests: hubUser.user.interests,
    },
    imageUrl: hubUser.profileImageUrl || "",
  };
}

export const HubView: React.FC = () => {
  const { transitionTo } = useAppState();
  const { kioskOrgId } = useAuth();

  const [users, setUsers] = useState<HubUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<HubUserData | null>(null);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!kioskOrgId) {
        setError("No organization ID available");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const fetchedUsers = await hubService.getAllOrgUsers(kioskOrgId);
        setUsers(fetchedUsers);
        setError(null);
      } catch (err) {
        console.error("[HubView] Failed to fetch users:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading users",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [kioskOrgId]);

  // Handle back button
  const handleBack = () => {
    transitionTo(AppState.IDLE);
  };

  // Loading State
  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.5rem", color: "#666", margin: 0 }}>
            Loading community members...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "500px",
            padding: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "1.5rem",
              color: "#d32f2f",
              marginBottom: "1rem",
            }}
          >
            Failed to load community members
          </p>
          <p
            style={{
              fontSize: "1rem",
              color: "#666",
              marginBottom: "2rem",
            }}
          >
            {error}
          </p>
          <button
            onClick={handleBack}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "#4caf50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (users.length === 0) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 2rem",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Community Hub</h1>
          <button
            onClick={handleBack}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Back to Home
          </button>
        </header>

        {/* Empty message */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "500px",
              padding: "2rem",
            }}
          >
            <p style={{ fontSize: "1.5rem", color: "#666", margin: 0 }}>
              No community members found
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: "#999",
                marginTop: "1rem",
              }}
            >
              Users will appear here once they create public profiles
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success State - Show grid
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          Community Hub ({users.length} members)
        </h1>
        <button
          onClick={handleBack}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: 600,
          }}
        >
          Back to Home
        </button>
      </header>

      {/* User Grid */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1.5rem",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {users.map((userData) => (
            <ProfileCard
              key={userData.user.id}
              userData={userData}
              onClick={() => setSelectedUser(userData)}
            />
          ))}
        </div>
      </div>

      {/* Profile Detail Overlay */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              width: "90vw",
              height: "90vh",
              backgroundColor: "#fff",
              borderRadius: "8px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileCardView
              profileData={toRandomImageData(selectedUser)}
              onBack={() => setSelectedUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
