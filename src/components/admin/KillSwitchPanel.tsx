import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, ShieldOff, Lock, Key, 
  AlertOctagon, CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import { useEmergencyActions, EmergencyActionType } from '@/hooks/useEmergencyActions';
import { toast } from '@/hooks/use-toast';

interface KillSwitchPanelProps {
  organizationId?: string;
}

export const KillSwitchPanel = ({ organizationId }: KillSwitchPanelProps) => {
  const { pendingActions, executing, initiateEmergencyAction, confirmEmergencyAction, fetchPendingActions } = useEmergencyActions();
  const [confirmingAction, setConfirmingAction] = useState<EmergencyActionType | null>(null);
  const [confirmCode, setConfirmCode] = useState('');

  const emergencyActions = [
    {
      type: 'freeze_all' as EmergencyActionType,
      title: 'Gel Total',
      description: 'Gèle tous les accès et empêche toute modification',
      icon: Lock,
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      requiresConfirmation: true,
    },
    {
      type: 'revoke_all_sessions' as EmergencyActionType,
      title: 'Déconnexion Massive',
      description: 'Révoque toutes les sessions actives immédiatement',
      icon: ShieldOff,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      requiresConfirmation: true,
    },
    {
      type: 'lockdown' as EmergencyActionType,
      title: 'Lockdown Complet',
      description: 'Gel + Déconnexion + Blocage des nouvelles connexions',
      icon: AlertOctagon,
      color: 'bg-red-500',
      textColor: 'text-red-400',
      requiresConfirmation: true,
    },
    {
      type: 'destroy_keys' as EmergencyActionType,
      title: 'Destruction des Clés',
      description: 'Détruit les clés de chiffrement (IRRÉVERSIBLE)',
      icon: Key,
      color: 'bg-red-600',
      textColor: 'text-red-500',
      requiresConfirmation: true,
    },
  ];

  const handleInitiate = async (action: typeof emergencyActions[0]) => {
    if (action.requiresConfirmation) {
      setConfirmingAction(action.type);
      setConfirmCode('');
    } else {
      try {
        await initiateEmergencyAction(action.type, organizationId, false);
        toast({
          title: 'Action exécutée',
          description: `${action.title} a été activé`,
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'exécuter l\'action',
          variant: 'destructive',
        });
      }
    }
  };

  const handleConfirm = async () => {
    if (confirmCode !== 'CONFIRM' || !confirmingAction) return;

    try {
      await initiateEmergencyAction(confirmingAction, organizationId, true);
      toast({
        title: 'Action initiée',
        description: 'En attente de confirmation par un autre administrateur',
      });
      setConfirmingAction(null);
      setConfirmCode('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'initier l\'action',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-4 border-2 border-orange-500/30 bg-orange-500/5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-400">Zone d'Actions d'Urgence</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ces actions sont irréversibles ou ont un impact majeur sur le système. 
              Certaines nécessitent une double validation par un autre administrateur.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Emergency Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emergencyActions.map((action, index) => (
          <motion.div
            key={action.type}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-5 hover:border-border transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${action.color}/20`}>
                <action.icon className={`w-6 h-6 ${action.textColor}`} />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${action.textColor}`}>{action.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                
                <button
                  onClick={() => handleInitiate(action)}
                  disabled={executing}
                  className={`mt-4 px-4 py-2 rounded-lg ${action.color} text-white font-medium text-sm 
                    hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-2`}
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4" />
                  )}
                  Activer
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pending Confirmations */}
      {pendingActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-5 border-2 border-yellow-500/30"
        >
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Actions en attente de confirmation
          </h3>

          <div className="space-y-3">
            {pendingActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">{action.action_type}</p>
                  <p className="text-sm text-muted-foreground">
                    Initié le {new Date(action.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => confirmEmergencyAction(action.id)}
                    disabled={executing}
                    className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </button>
                  <button className="p-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">
                    <XCircle className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmingAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-elevated rounded-2xl p-6 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertOctagon className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Confirmation Requise</h3>
                <p className="text-muted-foreground mt-2">
                  Tapez <span className="font-mono text-red-400">CONFIRM</span> pour initier cette action
                </p>
              </div>

              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                placeholder="Tapez CONFIRM"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-center font-mono text-lg tracking-widest"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmingAction(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmCode !== 'CONFIRM' || executing}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {executing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <AlertOctagon className="w-5 h-5" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
