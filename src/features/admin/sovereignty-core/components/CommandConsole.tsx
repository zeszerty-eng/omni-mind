import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, History, List, Play, Search, 
  Trash2, Copy, Check, Info, Command
} from 'lucide-react';
import { useSovereignty } from '../hooks/useSovereignty';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface CommandConsoleProps {
  organizationId: string;
}

export const CommandConsole = ({ organizationId }: CommandConsoleProps) => {
  const { 
    commandHistory, fetchCommandHistory, executeCommand, getCommandSuggestions 
  } = useSovereignty(organizationId);
  
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<Array<{ type: 'cmd' | 'res' | 'err'; text: string; time: Date }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.length > 2) {
      const res = await getCommandSuggestions(val);
      setSuggestions(res.suggestions || []);
    } else {
      setSuggestions([]);
    }
  };

  const handleExecute = async (cmd?: string) => {
    const finalCmd = cmd || inputValue;
    if (!finalCmd.trim()) return;

    setIsExecuting(true);
    setOutput(prev => [...prev, { type: 'cmd', text: `> ${finalCmd}`, time: new Date() }]);
    
    try {
      const result = await executeCommand(finalCmd);
      setOutput(prev => [...prev, { type: 'res', text: result, time: new Date() }]);
      setInputValue('');
      setSuggestions([]);
      fetchCommandHistory(20);
    } catch (err: any) {
      setOutput(prev => [...prev, { type: 'err', text: err.message || 'Execution error', time: new Date() }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const selectSuggestion = (template: string) => {
    setInputValue(template);
    setSuggestions([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
      {/* Console Shell */}
      <Card className="lg:col-span-2 glass border-border flex flex-col overflow-hidden bg-black/40">
        <div className="p-4 border-b border-border bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">omni-admin-shell v1.0.0</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">Connecté</Badge>
        </div>

        {/* Output Area */}
        <ScrollArea className="flex-1 p-4 font-mono text-sm">
          <div ref={scrollRef} className="space-y-3">
            {output.length === 0 && (
              <p className="text-muted-foreground italic text-xs">Prêt pour l'exécution des commandes de souveraineté...</p>
            )}
            {output.map((line, idx) => (
              <div key={idx} className={`break-all ${
                line.type === 'cmd' ? 'text-primary font-bold' : 
                line.type === 'err' ? 'text-red-400' : 'text-green-300'
              }`}>
                <span className="text-[10px] opacity-30 mr-2">{line.time.toLocaleTimeString()}</span>
                {line.text}
              </div>
            ))}
            {isExecuting && (
              <div className="flex items-center gap-2 text-primary animate-pulse">
                <span>_</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-black/20 relative">
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-4 right-4 mb-2 glass-elevated border-border rounded-xl p-2 z-10 shadow-2xl overflow-hidden"
              >
                <div className="text-[10px] text-muted-foreground px-2 pb-1 border-b border-border/50 mb-1 flex items-center gap-1">
                  <Command className="w-3 h-3" /> Suggestions de templates
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(s.template)}
                    className="w-full text-left p-2 hover:bg-primary/20 rounded-lg group transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono text-foreground group-hover:text-primary">{s.template}</p>
                      <p className="text-[10px] text-muted-foreground">{s.description}</p>
                    </div>
                    <Badge variant="ghost" className="text-[8px] opacity-50 capitalize">{s.category}</Badge>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono">{'>'}</span>
              <Input 
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                placeholder="Entrez une commande administrative..."
                className="bg-black/60 border-primary/20 text-green-400 font-mono pl-8 focus-visible:ring-primary/40 focus-visible:border-primary/40"
              />
            </div>
            <Button onClick={() => handleExecute()} disabled={isExecuting || !inputValue.trim()} size="icon" className="bg-primary/80 hover:bg-primary">
              <Play className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* History and Templates Tab */}
      <Tabs defaultValue="history" className="glass border-border rounded-xl flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none bg-secondary/30 h-10">
          <TabsTrigger value="history" className="gap-2 text-xs">
            <History className="w-3 h-3" /> Historique
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs">
            <List className="w-3 h-3" /> Templates
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="flex-1 m-0 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-3">
              {commandHistory.map((h, idx) => (
                <div key={h.id} className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group cursor-pointer" onClick={() => setInputValue(h.command_raw)}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-[8px] ${
                      h.execution_status === 'success' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-500'
                    }`}>
                      {h.execution_status}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground italic">
                      {new Date(h.executed_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-foreground break-all">{h.command_raw}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 m-0 p-0 overflow-hidden text-center justify-center pt-8">
           <Info className="w-12 h-12 text-muted-foreground mx-auto opacity-20 mb-4" />
           <p className="text-xs text-muted-foreground">Chargez des templates <br/>via la saisie interactive</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
