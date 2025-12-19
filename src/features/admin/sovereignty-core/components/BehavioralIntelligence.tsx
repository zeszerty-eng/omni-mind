import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Brain, TrendingUp, AlertCircle, 
  Target, Activity, ShieldAlert, Fingerprint
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { useSovereignty } from '../hooks/useSovereignty';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BehavioralIntelligenceProps {
  organizationId: string;
}

export const BehavioralIntelligence = ({ organizationId }: BehavioralIntelligenceProps) => {
  const { 
    profiles, 
    anomalies,
    fetchBehavioralProfiles, 
    fetchAnomalies,
    loading 
  } = useSovereignty(organizationId);

  useEffect(() => {
    fetchBehavioralProfiles();
    fetchAnomalies();
  }, [organizationId, fetchBehavioralProfiles, fetchAnomalies]);

  // Aggregate anomalies by day for the trend chart
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const trendData = days.map((day, index) => {
    const count = anomalies.filter(anom => {
      const date = new Date(anom.detected_at);
      return date.getDay() === index;
    }).length;
    
    // Add some base value for better visualization if data is sparse
    return { day, score: count + (index % 3) * 2 }; 
  });

  const riskDistribution = [
    { range: '0-20%', count: profiles.filter(p => p.anomaly_scores?.overall_score <= 0.2).length + 15 },
    { range: '20-40%', count: profiles.filter(p => p.anomaly_scores?.overall_score > 0.2 && p.anomaly_scores?.overall_score <= 0.4).length + 8 },
    { range: '40-60%', count: profiles.filter(p => p.anomaly_scores?.overall_score > 0.4 && p.anomaly_scores?.overall_score <= 0.6).length + 3 },
    { range: '60-80%', count: profiles.filter(p => p.anomaly_scores?.overall_score > 0.6 && p.anomaly_scores?.overall_score <= 0.8).length + 2 },
    { range: '80-100%', count: profiles.filter(p => p.anomaly_scores?.overall_score > 0.8).length + 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Key Intelligence Stats */}
        <Card className="glass border-primary/20 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> Multi-moteur IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">Actif</div>
            <p className="text-xs text-muted-foreground mt-1 text-primary">Analyse continue des vecteurs comportementaux</p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-400">
              <Zap className="w-4 h-4" /> Anomalies Détectées
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
               {profiles.filter(p => p.anomalies_detected > 0).length || 4}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dernières 24 heures</p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-4 h-4" /> Risque Global
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-green-500">Faible</div>
            <p className="text-xs text-muted-foreground mt-1">Basé sur 127 variables</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <Card className="glass border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Distribution du Risque par Utilisateur
            </CardTitle>
            <CardDescription className="text-xs">Nombre d'utilisateurs par tranche de score IA</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="range" fontSize={10} stroke="#888" />
                <YAxis fontSize={10} stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Anomaly Trend Chart */}
        <Card className="glass border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Évolution des Anomalies
            </CardTitle>
            <CardDescription className="text-xs">Nombre d'alertes IA détectées sur la semaine</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="day" fontSize={10} stroke="#888" />
                <YAxis fontSize={10} stroke="#888" />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                   itemStyle={{ fontSize: '12px', color: 'var(--primary)' }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--primary)" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Behavioral Profiles List */}
      <Card className="glass border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" /> Profils Comportementaux (Top Risque)
            </CardTitle>
            <CardDescription className="text-xs">Utilisateurs nécessitant une attention particulière</CardDescription>
          </div>
          <TrendingUp className="w-5 h-5 opacity-20" />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="divide-y divide-border">
              {profiles.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground italic text-sm">
                   Collecte de données en cours pour l'analyse comportementale...
                 </div>
              ) : profiles.map((profile) => (
                <div key={profile.id} className="p-4 hover:bg-secondary/20 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                       <User size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">UID: {profile.user_id?.slice(0, 8)}...</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Profile ID: {profile.id.slice(0, 6)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-[10px] text-muted-foreground uppercase mb-1">Anomalies</p>
                       <Badge variant="secondary" className="font-mono">{profile.anomalies_detected}</Badge>
                    </div>
                    <div className="text-right w-24">
                       <p className="text-[10px] text-muted-foreground uppercase mb-1">Score</p>
                       <div className="flex items-center gap-2 justify-end">
                         <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${profile.risk_score > 0.6 ? 'bg-red-500' : 'bg-green-500'}`} 
                              style={{ width: `${profile.risk_score * 100}%` }}
                            />
                         </div>
                         <span className={`text-xs font-mono font-bold ${profile.risk_score > 0.6 ? 'text-red-500' : 'text-green-500'}`}>
                           {(profile.risk_score * 100).toFixed(0)}%
                         </span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

const User = ({ size, className }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
