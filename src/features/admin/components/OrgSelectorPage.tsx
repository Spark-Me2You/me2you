/**
 * Organization Selector Page
 *
 * Allows admins to select which organization to activate kiosk mode for.
 * After selection, mints a kiosk session and redirects to /app.
 */

import { useState, useEffect } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase';

interface Organization {
  id: string;
  name: string;
}

/**
 * Organization Selector Page Component
 *
 * Flow:
 * 1. Fetch organizations the admin has access to
 * 2. Display org cards (one button per org)
 * 3. On selection, call mintKioskSession(orgId)
 * 4. Navigate to /app (now in kiosk mode)
 */
export const OrgSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin, mintKioskSession } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations on mount
  useEffect(() => {
    // If the admin does not have an org_id, stop loading and show an error instead of querying
    if (!admin?.org_id) {
      setIsLoading(false);
      setError('Admin organization is not available.');
      return;
    }

    const fetchOrgs = async () => {
      try {
        console.log('[OrgSelector] Fetching organizations for admin:', admin?.id);

        // Query organization table filtered by admin's org_id
        const { data, error: fetchError } = await supabase
          .from('organization')
          .select('id, name')
          .eq('id', admin.org_id); // Admin can only see their own org

        if (fetchError) {
          console.error('[OrgSelector] Failed to fetch organizations:', fetchError);
          throw new Error('Failed to load organizations');
        }

        console.log('[OrgSelector] Fetched', data?.length || 0, 'organizations');
        setOrgs(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        console.error('[OrgSelector] Error:', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgs();
  }, [admin?.org_id, admin?.id]);

  // Handle org selection
  const handleOrgSelect = async (orgId: string, orgName: string) => {
    setIsMinting(true);
    setError(null);

    try {
      console.log('[OrgSelector] Admin selecting org:', orgId, '(' + orgName + ')');

      // Call mintKioskSession from AuthProvider
      await mintKioskSession(orgId);

      console.log('[OrgSelector] Kiosk session minted, redirecting to /app');

      // Navigate to /app (will now render in kiosk mode)
      navigate('/app', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start kiosk mode';
      console.error('[OrgSelector] Failed to mint kiosk session:', message);
      setError(message);
    } finally {
      setIsMinting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
        }}
      >
        <div>Loading organizations...</div>
      </div>
    );
  }

  // Render main UI
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Header */}
        <h1 style={{ marginBottom: '0.5rem' }}>Select Organization</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Choose which organization to activate kiosk mode for
        </p>

        {/* Error display */}
        {error && (
          <div
            style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: '#c33',
            }}
          >
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                backgroundColor: '#fff',
                border: '1px solid #fcc',
                borderRadius: '4px',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Organization cards */}
        {orgs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
            }}
          >
            <p>No organizations found for this admin account.</p>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Please contact your administrator.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrgSelect(org.id, org.name)}
                disabled={isMinting}
                style={{
                  padding: '2rem 1.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  cursor: isMinting ? 'not-allowed' : 'pointer',
                  backgroundColor: isMinting ? '#ccc' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                  textAlign: 'center',
                  opacity: isMinting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isMinting) {
                    e.currentTarget.style.backgroundColor = '#1565c0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMinting) {
                    e.currentTarget.style.backgroundColor = '#1976d2';
                  }
                }}
              >
                {org.name}
              </button>
            ))}
          </div>
        )}

        {/* Minting state indicator */}
        {isMinting && (
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <div>Starting kiosk mode...</div>
          </div>
        )}

        {/* Back button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/app')}
            disabled={isMinting}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              cursor: isMinting ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '4px',
              opacity: isMinting ? 0.5 : 1,
            }}
          >
            Back to Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};
