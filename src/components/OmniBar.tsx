import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, Sparkles, FileText, Image, Music, Video, File } from "lucide-react";

interface OmniBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  files: Array<{ id: string; name: string; type: string; summary?: string }>;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("audio/")) return Music;
  if (type.startsWith("video/")) return Video;
  if (type.includes("pdf")) return FileText;
  return File;
};

export const OmniBar = ({ isOpen, onClose, onSearch, files }: OmniBarProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredFiles = files; // Trust the semantic search results from parent

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="glass-elevated rounded-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder="Demandez n'importe quoi... « factures du mois dernier »"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-lg"
                />
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-mono">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {query && (
                  <div className="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Recherche sémantique
                  </div>
                )}
                
                {filteredFiles.length > 0 ? (
                  <div className="px-2 pb-3">
                    {filteredFiles.map((file, index) => {
                      const Icon = getFileIcon(file.type);
                      return (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary/50 cursor-pointer group transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-omni flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
                              {file.name}
                            </p>
                            {file.summary && (
                              <p className="text-sm text-muted-foreground truncate">
                                {file.summary}
                              </p>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-secondary">
                              Ouvrir
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : query ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun résultat pour « {query} »</p>
                    <p className="text-sm mt-1">L'IA recherche dans le sens, pas juste les mots</p>
                  </div>
                ) : (
                  <div className="px-4 py-6">
                    <p className="text-sm text-muted-foreground mb-4">Actions rapides</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Mes factures récentes", icon: FileText },
                        { label: "Photos de voyage", icon: Image },
                        { label: "Documents importants", icon: File },
                        { label: "Notes vocales", icon: Music },
                      ].map((action) => (
                        <button
                          key={action.label}
                          onClick={() => setQuery(action.label)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-left transition-colors"
                        >
                          <action.icon className="w-4 h-4 text-primary" />
                          <span className="text-sm text-foreground">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary font-mono">↑↓</kbd>
                    naviguer
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary font-mono">↵</kbd>
                    ouvrir
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Propulsé par IA locale
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
