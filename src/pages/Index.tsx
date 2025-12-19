import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { OmniBar } from "@/components/OmniBar";
import { DropZone } from "@/components/DropZone";
import { FileCard } from "@/components/FileCard";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { SpatialCanvas } from "@/components/SpatialCanvas";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useRelations } from "@/hooks/useRelations";
import { Grid, List, Sparkles, Map } from "lucide-react";
import { FileTable } from "@/components/FileTable";

const Index = () => {
  const [isOmniBarOpen, setIsOmniBarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table" | "canvas">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { isProcessing, processedFiles, processFiles, searchFiles } = useFileProcessor();
  const { relations, detectSimilarities } = useRelations();

  // Detect similarities between nodes
  const detectedRelations = detectSimilarities(processedFiles.map(n => ({ id: n.id, tags: n.tags || [] })));

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

  const handleFileDrop = async (files: File[]) => {
    await processFiles(files);
  };

  const displayedFiles = searchQuery ? searchFiles(searchQuery) : processedFiles;

  // Convert NodeData to FileCard format
  const filesToDisplay = displayedFiles.map(node => ({
    id: node.id,
    name: node.smart_name || node.original_name,
    originalName: node.original_name,
    type: node.mime_type || 'application/octet-stream',
    size: node.file_size || 0,
    summary: node.summary || undefined,
    tags: node.tags || undefined,
    extractedData: node.metadata as Record<string, string> | undefined,
    storageUrl: node.storage_url || undefined,
  }));

  const handlePrint = (file: any) => {
    if (!file.storageUrl) return;
    const url = `http://${window.location.hostname}:3001${file.storageUrl}`;
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
      if (file.type.startsWith('image/')) win.print();
    }
  };

  const handleDownload = async (file: any) => {
    if (!file.storageUrl) return;
    const url = `http://${window.location.hostname}:3001${file.storageUrl}`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundEffects />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header 
          onOpenOmniBar={() => setIsOmniBarOpen(true)} 
          fileCount={processedFiles.length}
        />

        {/* Local Network & Scanner Status */}
        <div className="flex flex-wrap gap-4 mt-4 px-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Réseau Local Actif (100% Hors-ligne)
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Dossier Scan Surveillé: ./scanned_documents
          </div>
        </div>

        <main className="py-8">
          {/* Hero Section when no files */}
          <AnimatePresence>
            {processedFiles.length === 0 && (
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
                  <span className="text-sm text-primary font-medium">IA Intelligente • Stockage Sécurisé</span>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold text-foreground mb-4"
                >
                  L'archivage qui <span className="text-gradient">comprend</span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground max-w-2xl mx-auto"
                >
                  Déposez n'importe quel fichier. OMNI l'analyse, le renomme intelligemment, 
                  et le rend trouvable par le sens, pas juste par les mots.
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
            {processedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Fichiers analysés</h3>
                    <p className="text-sm text-muted-foreground">
                      {processedFiles.length} fichier{processedFiles.length > 1 ? "s" : ""} traité{processedFiles.length > 1 ? "s" : ""} par l'IA
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
                      title="Grille"
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
                      title="Liste"
                    >
                      <List className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "table" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                      title="Tableau Professionnel"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("canvas")}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === "canvas" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                      title="Espace Spatial"
                    >
                      <Map className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Files Views */}
                {viewMode === "canvas" ? (
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
                ) : viewMode === "table" ? (
                  <FileTable 
                    files={filesToDisplay} 
                    onPrint={handlePrint} 
                    onDownload={handleDownload} 
                  />
                ) : (
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
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features Preview */}
          {processedFiles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              {[
                {
                  title: "Renommage Intelligent",
                  description: "L'IA analyse le contenu et génère des noms descriptifs automatiquement.",
                  icon: "✨",
                },
                {
                  title: "Recherche Sémantique",
                  description: "Trouvez « déjeuner Paris » même si le fichier s'appelle IMG_4532.jpg.",
                  icon: "🔍",
                },
                {
                  title: "Actions Intelligentes",
                  description: "Extraction de données, classification automatique, et bien plus.",
                  icon: "⚡",
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
            <span>OMNI • Archivage Intelligent</span>
          </div>
        </footer>
      </div>

      {/* OmniBar Modal */}
      <OmniBar
        isOpen={isOmniBarOpen}
        onClose={() => setIsOmniBarOpen(false)}
        onSearch={setSearchQuery}
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
