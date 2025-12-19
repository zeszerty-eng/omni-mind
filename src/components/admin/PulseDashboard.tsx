import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Users, FileText, Shield, AlertTriangle, 
  TrendingUp, Clock, Zap, Eye, Download, Upload,
  Server, Database, Cpu
} from 'lucide-react';
import { useAudit, useMetrics, useSessions } from '@/hooks/useAudit';

interface PulseDashboardProps {
  organizationId?: string;
}

export const PulseDashboard = ({ organizationId }: PulseDashboardProps) => {
  const { logs, fetchLogs, subscribeToLogs } = useAudit();
  const { metrics, fetchMetrics, subscribeToMetrics } = useMetrics();
  const { sessions, fetchSessions, subscribeToSessions } = useSessions();
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    color: string;
  }>>([]);

  useEffect(() => {
    fetchLogs({ organizationId, limit: 20 });
    fetchMetrics(organizationId);
    fetchSessions(organizationId);

    // Subscribe to real-time audit logs
    const unsubscribeLogs = subscribeToLogs(organizationId, (newLog) => {
      const colors: Record<string, string> = {
        create: 'text-green-400',
        view: 'text-blue-400',
        login: 'text-primary',
        update: 'text-purple-400',
        delete: 'text-red-400',
      };

      setRealtimeEvents(prev => [{
        id: newLog.id,
        type: newLog.action,
        message: `${newLog.profiles?.full_name || 'Un utilisateur'} : ${newLog.action} ${newLog.target_type || ''}`,
        timestamp: new Date(newLog.created_at),
        color: colors[newLog.action] || 'text-muted-foreground',
      }, ...prev].slice(0, 15));
    });

    // Subscribe to metrics
    const unsubscribeMetrics = subscribeToMetrics(organizationId);

    // Subscribe to sessions
    const unsubscribeSessions = subscribeToSessions(organizationId);

    return () => {
      unsubscribeLogs();
      unsubscribeMetrics();
      unsubscribeSessions();
    };
  }, [organizationId, fetchLogs, fetchMetrics, fetchSessions, subscribeToLogs, subscribeToMetrics, subscribeToSessions]);


  const stats = [
    { 
      label: 'Utilisateurs actifs', 
      value: sessions.length.toString(), 
      icon: Users, 
      change: '+12%',
      color: 'text-green-400' 
    },
    { 
      label: 'Fichiers traités', 
      value: '1,247', 
      icon: FileText, 
      change: '+8%',
      color: 'text-blue-400' 
    },
    { 
      label: 'Actions/heure', 
      value: logs.length.toString(), 
      icon: Activity, 
      change: '+23%',
      color: 'text-primary' 
    },
    { 
      label: 'Alertes', 
      value: logs.filter(l => l.is_suspicious).length.toString(), 
      icon: AlertTriangle, 
      change: '-5%',
      color: 'text-orange-400' 
    },
  ];

  const systemHealth = [
    { label: 'CPU', value: 34, max: 100, color: 'bg-green-500' },
    { label: 'Mémoire', value: 67, max: 100, color: 'bg-blue-500' },
    { label: 'Stockage', value: 45, max: 100, color: 'bg-purple-500' },
    { label: 'Réseau', value: 23, max: 100, color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                <div className={`flex items-center gap-1 mt-2 text-sm ${stat.color}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Stream */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Flux d'activité en temps réel
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {realtimeEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${event.color.replace('text-', 'bg-')}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${event.color}`}>{event.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {event.timestamp.toLocaleTimeString('fr-FR')}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-primary" />
            Santé système
          </h3>

          <div className="space-y-4">
            {systemHealth.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Cpu className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">4 Cores</p>
              </div>
              <div>
                <Database className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">256 GB</p>
              </div>
              <div>
                <Zap className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">99.9%</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Audit Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-5"
      >
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          Journal d'audit récent
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b border-border">
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Utilisateur</th>
                <th className="pb-3 font-medium">Cible</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Risque</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      log.action === 'create' ? 'bg-green-500/20 text-green-400' :
                      log.action === 'delete' ? 'bg-red-500/20 text-red-400' :
                      log.action === 'update' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {log.profiles?.email || 'Système'}
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {log.target_name || log.target_type || '-'}
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3">
                    <div className={`w-8 h-2 rounded-full ${
                      log.risk_score > 0.7 ? 'bg-red-500' :
                      log.risk_score > 0.4 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`} style={{ width: `${Math.max(log.risk_score * 100, 10)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
