import { Printer, Download, ExternalLink, Tag, Sparkles } from "lucide-react";

interface FileTableProps {
  files: any[];
  onPrint: (file: any) => void;
  onDownload: (file: any) => void;
}

export const FileTable = ({ files, onPrint, onDownload }: FileTableProps) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/50 glass">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <th className="px-6 py-4">Document</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Taille</th>
            <th className="px-6 py-4">Résumé / Tags</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {files.map((file) => (
            <tr key={file.id} className="group hover:bg-primary/5 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {file.originalName}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground uppercase">
                  {file.type.split('/')[1] || 'DOC'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  {file.summary && (
                    <div className="flex items-center gap-1 text-[11px] text-foreground/70 truncate max-w-[300px]">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {file.summary}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {file.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onPrint(file)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Imprimer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDownload(file)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <a 
                    href={file.storageUrl ? `http://${window.location.hostname}:3001${file.storageUrl}` : '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
