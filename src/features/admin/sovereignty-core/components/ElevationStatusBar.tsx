import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Ghost, Clock, AlertOctagon, 
  ShieldCheck, Lock, Unlock, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { rbacService } from '../services/rbac.service';
import type { TemporalAccessGrant, LockdownStatus } from '../types';

interface ElevationStatusBarProps {
  activeGrants: TemporalAccessGrant[];
  lockdownStatus: LockdownStatus | null;
  onRefresh: () => void;
}

export const ElevationStatusBar = ({ 
  activeGrants, 
  lockdownStatus,
  onRefresh 
}: ElevationStatusBarProps) => {
  const isElevated = activeGrants.length > 0;
  const isLocked = lockdownStatus?.is_locked;

  const handleRevoke = async (grantId: string) => {
    try {
      await rbacService.revokeTemporalGrant(grantId);
      onRefresh();
    } catch (err) {
      console.error('Failed to revoke grant:', err);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <AnimatePresence>
        {/* Ghost Mode Bar */}
        {isElevated && !isLocked && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="w-full bg-primary py-2 px-6 flex items-center justify-between shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-primary-foreground font-bold">
                <Ghost className="w-5 h-5 animate-pulse" />
                <span className="text-xs uppercase tracking-[0.2em]">Accès Élevé Actif (GHOST MODE)</span>
              </div>
              
              <div className="h-4 w-px bg-primary-foreground/20 hidden md:block" />
              
              <div className="hidden md:flex items-center gap-4">
                {activeGrants.map((grant) => (
                  <div key={grant.id} className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-primary-foreground/70 uppercase font-bold">Privilège</span>
                      <span className="text-xs text-white font-mono">{grant.reason}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] text-primary-foreground/70 uppercase font-bold">Expiration</span>
                       <span className="text-xs text-white font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(grant.expires_at).toLocaleTimeString()}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-[10px] uppercase gap-2"
              onClick={() => handleRevoke(activeGrants[0].id)}
            >
              Rallier les droits
            </Button>
          </motion.div>
        )}

        {/* Lockdown Banner (Extreme Severity) */}
        {isLocked && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="w-full bg-red-600 py-3 px-6 flex items-center justify-center shadow-2xl pointer-events-auto border-b border-white/20"
          >
            <div className="flex items-center gap-4 text-white">
               <AlertOctagon className="w-6 h-6 animate-bounce" />
               <div className="text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest leading-none">Alerte Intégrité : Système Verrouillé</h3>
                  <p className="text-[10px] font-bold opacity-80 mt-1">
                    Verrouillage global activé par {lockdownStatus?.activated_by?.slice(0, 8)} | Raison : {lockdownStatus?.reason}
                  </p>
               </div>
               <AlertOctagon className="w-6 h-6 animate-bounce" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
