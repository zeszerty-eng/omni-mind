import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { OmniBar } from "@/components/OmniBar";
import { DropZone } from "@/components/DropZone";
import { FileCard } from "@/components/FileCard";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { SpatialCanvas } from "@/components/SpatialCanvas";
import { useLocalNodes } from "@/hooks/useLocalNodes";
import { useRelations } from "@/hooks/useRelations";
import { aiPipeline } from "@/services/local-ai/pipeline.service";
import { Grid, List, Sparkles, Map, WifiOff } from "lucide-react";

const Index = () => {
  const [isOmniBarOpen, setIsOmniBarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "canvas">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  
  const { nodes, isProcessing, processFiles, searchNodes } = useLocalNodes();
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Monitor offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global drag handling for "Gravity" effect
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingGlobal(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Simple debounce to avoid flickering when entering/leaving child elements
      if (e.relatedTarget === null) {
        setIsDraggingGlobal(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingGlobal(false);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Detect similarities between nodes using AI Embeddings
  const detectedRelations = aiPipeline.calculateSimilarities(nodes);

  // Keyboard shortcut for OmniBar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOmniBarOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Semantic search handling
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    const results = await searchNodes(query);
    setSearchResults(results);
  }, [searchNodes]);

  const handleFileDrop = async (files: File[]) => {
    await processFiles(files);
  };

  const displayedFiles = searchQuery ? searchResults : nodes;

  // Convert LocalDocument to FileCard format
  const filesToDisplay = displayedFiles.map(doc => ({
    id: doc.id?.toString() || Math.random().toString(),
    name: doc.name,
    originalName: doc.name,
    type: doc.type,
    size: doc.size,
    summary: doc.content.substring(0, 150) + "...",
    tags: doc.tags,
    extractedData: doc.metadata as Record<string, string>,
    score: (doc as any).score // Semantic match score
  }));

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundEffects isDragging={isDraggingGlobal} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header 
          onOpenOmniBar={() => setIsOmniBarOpen(true)} 
          fileCount={nodes.length}
        />

        <main className="py-8">
          {/* Offline Indicator */}
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mb-6 text-orange-400 bg-orange-400/10 py-2 rounded-lg border border-orange-400/20"
            >
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Mode Hors-ligne • Intelligence locale active</span>
            </motion.div>
          )}

          {/* Hero Section when no files */}
          <AnimatePresence>
            {nodes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-12"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Zéro Serveur • WebGPU • Confidentialité Totale</span>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold text-foreground mb-4"
                >
                  L'IA qui reste <span className="text-gradient">chez vous</span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground max-w-2xl mx-auto"
                >
                  Prototype OMNI : vos documents sont analysés localement via WASM. 
                  Coupez votre connexion, tout continue de fonctionner.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop Zone */}
          <div className="mb-12">
            <DropZone onFileDrop={handleFileDrop} isProcessing={isProcessing} />
          </div>

          {/* Files Section */}
          <AnimatePresence>
            {nodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {searchQuery ? "Résultats sémantiques" : "Documents indexés"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {nodes.length} document{nodes.length > 1 ? "s" : ""} stocké{nodes.length > 1 ? "s" : ""} localement
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "grid" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "list" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("canvas")}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "canvas" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Map className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Files Grid/List */}
                {viewMode !== "canvas" ? (
                  <div className={`
                    grid gap-6
                    ${viewMode === "grid" 
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                      : "grid-cols-1"
                    }
                  `}>
                    {filesToDisplay.map((file, index) => (
                      <FileCard key={file.id} file={file} index={index} />
                    ))}
                  </div>
                ) : (
                  <SpatialCanvas
                    nodes={filesToDisplay.map(f => ({
                      id: f.id,
                      name: f.name,
                      type: f.type,
                      x: 0,
                      y: 0,
                      tags: f.tags,
                    }))}
                    relations={detectedRelations.map(r => ({
                      sourceId: r.sourceId,
                      targetId: r.targetId,
                      type: 'similar_to',
                      strength: r.strength,
                    }))}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features Preview */}
          {nodes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              {[
                {
                  title: "Analyse WASM",
                  description: "L'IA tourne directement dans votre navigateur. Aucune donnée ne quitte votre PC.",
                  icon: "🔒",
                },
                {
                  title: "Recherche par le Sens",
                  description: "Les documents sont transformés en vecteurs (embeddings) pour une recherche sémantique.",
                  icon: "🧠",
                },
                {
                  title: "Persistence IndexedDB",
                  description: "Vos fichiers sont sauvegardés localement. Retrouvez-les même après un rafraîchissement.",
                  icon: "💾",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="glass rounded-2xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-border/50 mt-12">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>OMNI • Prototype IA Locale</span>
          </div>
        </footer>
      </div>

      {/* OmniBar Modal */}
      <OmniBar
        isOpen={isOmniBarOpen}
        onClose={() => setIsOmniBarOpen(false)}
        onSearch={handleSearch}
        files={filesToDisplay.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          summary: f.summary,
        }))}
      />
    </div>
  );
};

export default Index;

