import { useState, useEffect } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors } from '@/shared/theme/colors';
import styles from './OrgSelectorPage.module.css';
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
        <div className={styles.loadingWrapper}>
          <span className={styles.loadingText}>loading...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>

      {/* "choose your organization" title — centered, absolute */}
      <div className={styles.titleBox}>
        <span className={styles.titleText}>choose your organization</span>
      </div>

      {/* Org buttons */}
      <div className={styles.orgList}>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {orgs.length === 0 && !error && (
          <span className={styles.noOrgs}>no organizations found</span>
        )}

        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => handleOrgSelect(org.id, org.name)}
            disabled={isMinting}
            className={styles.orgBtn}
            style={{
              backgroundColor: isMinting ? 'rgba(211,228,5,0.4)' : colors.btnYellowGreen,
              cursor: isMinting ? 'not-allowed' : 'pointer',
            }}
          >
            {org.name}
          </button>
        ))}

        {isMinting && <span className={styles.mintingText}>starting kiosk mode...</span>}

      </div>

      {/* Back to admin sign-in — absolute */}
      <div
        className={styles.backContainer}
        onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
      >
        <img src={backfinger} alt="" className={styles.backImage} />
        <span className={styles.backText}>back to admin<br />sign-in</span>
      </div>

    </GlassCard>
  );
};
