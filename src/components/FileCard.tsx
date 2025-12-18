import { motion } from "framer-motion";
import { FileText, Image, Music, Video, File, Sparkles, ExternalLink, Tag } from "lucide-react";

interface FileCardProps {
  file: {
    id: string;
    name: string;
    originalName: string;
    type: string;
    size: number;
    summary?: string;
    tags?: string[];
    extractedData?: Record<string, string>;
  };
  index: number;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("audio/")) return Music;
  if (type.startsWith("video/")) return Video;
  if (type.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getGradientByType = (type: string) => {
  if (type.startsWith("image/")) return "from-pink-500/20 to-orange-500/20";
  if (type.startsWith("audio/")) return "from-green-500/20 to-emerald-500/20";
  if (type.startsWith("video/")) return "from-purple-500/20 to-blue-500/20";
  if (type.includes("pdf")) return "from-red-500/20 to-rose-500/20";
  return "from-primary/20 to-accent/20";
};

export const FileCard = ({ file, index }: FileCardProps) => {
  const Icon = getFileIcon(file.type);
  const gradient = getGradientByType(file.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div className={`
        absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} 
        opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300
      `} />
      
      <div className="relative glass rounded-2xl p-5 hover:border-primary/30 transition-colors">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <div className={`
              w-14 h-14 rounded-xl bg-gradient-to-br ${gradient}
              flex items-center justify-center
            `}>
              <Icon className="w-7 h-7 text-foreground" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
            >
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </motion.div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {file.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {file.originalName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>

          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-secondary">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* AI Summary */}
        {file.summary && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 text-xs text-primary mb-1 font-medium">
              <Sparkles className="w-3 h-3" />
              Résumé IA
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {file.summary}
            </p>
          </div>
        )}

        {/* Extracted Data */}
        {file.extractedData && Object.keys(file.extractedData).length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {Object.entries(file.extractedData).map(([key, value]) => (
              <div key={key} className="p-2 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                <p className="text-sm text-foreground font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {file.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Smart Actions */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Actions intelligentes</span>
            <div className="flex gap-1">
              <button className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors">
                Extraire données
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-gradient-omni text-primary-foreground text-xs font-medium transition-transform hover:scale-105">
                Classifier
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
