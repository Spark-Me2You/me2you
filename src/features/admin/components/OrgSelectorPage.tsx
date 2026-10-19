import { useState, useEffect } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase';
import { GlassCard } from '@/shared/components/GlassCard';
import pinkBackArrow from '@/assets/pink_back_arrow.svg';

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

  const handleOrgSelect = async (orgId: string) => {
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
        <div className="flex h-[400px] items-center justify-center">
          <span className="font-averia text-[28px] tracking-[4px] text-white">loading...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>

      {/* "choose your organization" title — centered, absolute */}
      <div className="absolute top-10 left-1/2 flex h-[84px] w-[680px] -translate-x-1/2 items-center justify-center bg-magenta whitespace-nowrap">
        <span className="font-averia text-[37px] font-light tracking-[6px] text-white lowercase">choose your organization</span>
      </div>

      {/* Org buttons */}
      <div className="flex flex-col items-center gap-4 pt-[260px]">

        {error && <div className="bg-[rgba(255,255,255,0.6)] px-5 py-2.5 font-averia text-[18px] tracking-[2px] text-error">{error}</div>}

        {orgs.length === 0 && !error && (
          <span className="font-averia text-[24px] tracking-[4px] text-white">no organizations found</span>
        )}

        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => handleOrgSelect(org.id)}
            disabled={isMinting}
            className={`h-[97px] w-[400px] rounded-[10px] border-0 font-averia text-[37px] font-light tracking-[6px] text-white lowercase shadow-[0px_4px_4px_rgba(0,0,0,0.25),inset_0px_0px_4px_rgba(0,0,0,0.25),inset_1px_1px_49.9px_14px_rgba(255,255,255,0.2)] ${
              isMinting ? 'cursor-not-allowed bg-[rgba(211,228,5,0.4)]' : 'cursor-pointer bg-btn-yellow-green'
            }`}
          >
            {org.name}
          </button>
        ))}

        {isMinting && <span className="mt-2 font-averia text-[20px] tracking-[3px] text-white">starting kiosk mode...</span>}

      </div>

      {/* Back to admin sign-in — absolute */}
      <div
        className="absolute top-[360px] left-[60px] flex cursor-pointer flex-col items-start select-none"
        onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
      >
        <img src={pinkBackArrow} alt="" className="pointer-events-none w-[186px] rotate-[4.71deg]" />
        <span className="mt-1 w-[200px] font-handwritten text-[18px] leading-[1.3] font-bold tracking-[3px] text-black">back to admin<br />sign-in</span>
      </div>

    </GlassCard>
  );
};
