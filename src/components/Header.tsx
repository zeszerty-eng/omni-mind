import { motion } from "framer-motion";
import { Command, Sparkles, Shield, Cpu } from "lucide-react";

interface HeaderProps {
  onOpenOmniBar: () => void;
  fileCount: number;
}

export const Header = ({ onOpenOmniBar, fileCount }: HeaderProps) => {
  return (
    <header className="relative z-20">
      <div className="flex items-center justify-between py-6">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-omni flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient tracking-tight">OMNI</h1>
            <p className="text-xs text-muted-foreground">Archivage Intelligent</p>
          </div>
        </motion.div>

        {/* Center - OmniBar Trigger */}
        <motion.button
          onClick={onOpenOmniBar}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="hidden md:flex items-center gap-3 px-5 py-3 rounded-xl glass hover:border-primary/50 transition-all group"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            Recherche sémantique...
          </span>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-mono">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </motion.button>

        {/* Right - Stats */}
        <motion.div 
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Chiffré</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Local</span>
          </div>

          {fileCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-xl font-bold text-primary">{fileCount}</span>
              <span className="text-sm text-muted-foreground">fichier{fileCount > 1 ? "s" : ""}</span>
            </div>
          )}
        </motion.div>
      </div>
    </header>
  );
};
