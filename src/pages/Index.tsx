import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { OmniBar } from "@/components/OmniBar";
import { DropZone } from "@/components/DropZone";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { SyncStatusIndicator } from "@/components/SyncStatus";
import { FolderTree } from "@/components/FolderTree";
import { DocumentCard } from "@/components/DocumentCard";
import { WorkflowStatusBar } from "@/components/WorkflowStatusBar";
import { ScannerPanel } from "@/components/ScannerPanel";
import { useOfflineDocuments } from "@/hooks/useOfflineDocuments";
import { OfflineDocument } from "@/lib/offlineDB";
import { Grid, List, Sparkles, ScanLine, FolderTree as FolderIcon } from "lucide-react";

const Index = () => {
  const [isOmniBarOpen, setIsOmniBarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfflineDocument['status'] | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    documents,
    allDocuments,
    folders,
    loading,
    syncStatus,
    currentFolderId,
    processFiles,
    deleteDocument,
    createFolder,
    deleteFolder,
    setCurrentFolderId,
    updateWorkflowStatus,
    forceSync,
  } = useOfflineDocuments();

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

  const handleScanComplete = async (file: File) => {
    await processFiles([file]);
  };

  // Filter by status
  const filteredDocs = statusFilter 
    ? documents.filter(d => d.status === statusFilter)
    : documents;

  // Search filter
  const displayedDocs = searchQuery 
    ? filteredDocs.filter(d => 
        d.original_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.smart_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filteredDocs;

  // Document counts per folder
  const docCounts = new Map<string, number>();
  allDocuments.forEach(d => {
    if (d.folder_id) {
      docCounts.set(d.folder_id, (docCounts.get(d.folder_id) || 0) + 1);
    }
  });

  const pendingCount = allDocuments.filter(d => !d.synced).length;

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundEffects />
      
      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full border-r border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-omni flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-foreground">OMNI</span>
                </div>
                <SyncStatusIndicator 
                  status={syncStatus} 
                  onSync={forceSync}
                  pendingCount={pendingCount}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <FolderTree
                  folders={folders}
                  currentFolderId={currentFolderId}
                  onFolderSelect={setCurrentFolderId}
                  onCreateFolder={createFolder}
                  onDeleteFolder={deleteFolder}
                  documentCounts={docCounts}
                />
              </div>

              <div className="p-4 border-t border-border/50">
                <ScannerPanel onScanComplete={handleScanComplete} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="p-4 border-b border-border/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <FolderIcon className="w-5 h-5 text-muted-foreground" />
              </button>
              <h1 className="text-lg font-semibold text-foreground">
                {currentFolderId 
                  ? folders.find(f => f.id === currentFolderId)?.name 
                  : "Tous les documents"}
              </h1>
              <span className="text-sm text-muted-foreground">
                ({displayedDocs.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Workflow bar */}
          <div className="px-4 py-2">
            <WorkflowStatusBar
              documents={allDocuments}
              onFilterByStatus={setStatusFilter}
              activeFilter={statusFilter}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : displayedDocs.length === 0 ? (
              <div className="max-w-xl mx-auto">
                <DropZone onFileDrop={handleFileDrop} isProcessing={false} />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <DropZone onFileDrop={handleFileDrop} isProcessing={false} />
                </div>
                <div className={viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                  : "space-y-2"
                }>
                  {displayedDocs.map((doc, index) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      index={index}
                      compact={viewMode === "list"}
                      onDelete={deleteDocument}
                      onStatusChange={updateWorkflowStatus}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <OmniBar
        isOpen={isOmniBarOpen}
        onClose={() => setIsOmniBarOpen(false)}
        onSearch={setSearchQuery}
        files={displayedDocs.map(d => ({
          id: d.id,
          name: d.smart_name || d.original_name,
          type: d.mime_type || '',
          summary: d.summary || undefined,
        }))}
      />
    </div>
  );
};

export default Index;
