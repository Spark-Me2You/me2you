import { useState, useEffect } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase';
import { GlassCard } from '@/shared/components/GlassCard';
import backfinger from '@/assets/backfinger.png';

interface Organization {
  id: string;
  name: string;
}

export const OrgSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin, mintKioskSession, signOut } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin?.org_id) {
      setIsLoading(false);
      setError('Admin organization is not available.');
      return;
    }

    const fetchOrgs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('organization')
          .select('id, name')
          .eq('id', admin.org_id);

        if (fetchError) throw new Error('Failed to load organizations');
        setOrgs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgs();
  }, [admin?.org_id, admin?.id]);

  const handleOrgSelect = async (orgId: string, orgName: string) => {
    setIsMinting(true);
    setError(null);
    try {
      await mintKioskSession(orgId);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start kiosk mode');
    } finally {
      setIsMinting(false);
    }
  };

  if (isLoading) {
    return (
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', color: 'white', letterSpacing: '4px' }}>
            loading...
          </span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>

      {/* "choose your organization" title — centered, absolute */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '680px',
        height: '84px',
        backgroundColor: '#e405ac',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 300,
          fontSize: '37px',
          color: 'white',
          letterSpacing: '6px',
          textTransform: 'lowercase',
        }}>
          choose your organization
        </span>
      </div>

      {/* Org buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '260px',
        gap: '16px',
      }}>
        {error && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', color: '#b0003a', backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 20px', letterSpacing: '2px' }}>
            {error}
          </div>
        )}

        {orgs.length === 0 && !error && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '24px', color: 'white', letterSpacing: '4px' }}>
            no organizations found
          </span>
        )}

        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => handleOrgSelect(org.id, org.name)}
            disabled={isMinting}
            style={{
              width: '400px',
              height: '97px',
              backgroundColor: isMinting ? 'rgba(211,228,5,0.4)' : 'rgba(211,228,5,0.93)',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '0px 4px 4px rgba(0,0,0,0.25), inset 0px 0px 4px rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.2)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 300,
              fontSize: '37px',
              color: 'white',
              letterSpacing: '6px',
              textTransform: 'lowercase',
              cursor: isMinting ? 'not-allowed' : 'pointer',
            }}
          >
            {org.name}
          </button>
        ))}

        {isMinting && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', color: 'white', letterSpacing: '3px', marginTop: '8px' }}>
            starting kiosk mode...
          </span>
        )}
      </div>

      {/* Back to admin sign-in — bottom left, absolute */}
      <div
        onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
        style={{
          position: 'absolute',
          top: '360px',
          left: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <img
          src={backfinger}
          alt=""
          style={{
            width: '186px',
            transform: 'rotate(4.71deg)',
            pointerEvents: 'none',
          }}
        />
        <span style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 700,
          fontSize: '18px',
          color: 'black',
          letterSpacing: '3px',
          lineHeight: 1.3,
          marginTop: '4px',
        }}>
          back to admin<br />sign-in
        </span>
      </div>

    </GlassCard>
  );
};
