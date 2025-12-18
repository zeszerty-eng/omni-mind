import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileCheck, Sparkles, Loader2 } from "lucide-react";

interface DropZoneProps {
  onFileDrop: (files: File[]) => void;
  isProcessing: boolean;
}

export const DropZone = ({ onFileDrop, isProcessing }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileDrop(files);
      }
    },
    [onFileDrop]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFileDrop(files);
      }
    },
    [onFileDrop]
  );

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isProcessing}
      />
      
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed
          transition-colors duration-300
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${isProcessing ? "pointer-events-none" : ""}
        `}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-radial opacity-30" />
        
        {/* Glow Effect on Drag */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10"
            >
              {/* Particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  initial={{ 
                    x: "50%", 
                    y: "100%",
                    opacity: 0 
                  }}
                  animate={{ 
                    y: "-100%",
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                  style={{ left: `${15 + i * 14}%` }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-8">
          <motion.div
            animate={{ 
              y: isDragging ? -5 : 0,
              scale: isProcessing ? 0.95 : 1
            }}
            className="relative mb-6"
          >
            {/* Outer Glow Ring */}
            <div className="absolute inset-0 -m-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Icon Container */}
            <div className={`
              relative w-20 h-20 rounded-2xl flex items-center justify-center
              ${isDragging ? "bg-gradient-omni" : "bg-secondary"}
              transition-all duration-300
            `}>
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                  >
                    <Loader2 className="w-10 h-10 text-primary" />
                  </motion.div>
                ) : isDragging ? (
                  <motion.div
                    key="dragging"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <FileCheck className="w-10 h-10 text-primary-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Upload className="w-10 h-10 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div 
            className="text-center"
            animate={{ opacity: isProcessing ? 0.5 : 1 }}
          >
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {isProcessing 
                ? "Analyse en cours..." 
                : isDragging 
                  ? "Lâchez pour analyser" 
                  : "Déposez vos fichiers ici"
              }
            </h3>
            <p className="text-muted-foreground max-w-sm">
              {isProcessing 
                ? "L'IA locale analyse le contenu de vos fichiers"
                : "PDF, images, documents... L'IA comprendra le sens de chaque fichier"
              }
            </p>
          </motion.div>

          {!isProcessing && (
            <motion.div 
              className="mt-6 flex items-center gap-2 text-sm text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Traitement 100% local - Aucune donnée envoyée</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
