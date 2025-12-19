import { Search, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AuditFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  filterAction: string | null;
  onFilterChange: (action: string | null) => void;
  onExport: () => void;
}

export const AuditFilters = ({ 
  search, onSearchChange, filterAction, onFilterChange, onExport 
}: AuditFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50">
      <div className="relative flex-1 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher par action, utilisateur ou cible..." 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary/50 border-border h-11"
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="w-4 h-4" />
              {filterAction || 'Toutes les actions'}
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onFilterChange(null)}>Toutes les actions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('login')}>Connexion</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('create')}>Création</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('delete')}>Suppression</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('revoke')}>Révocation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" className="gap-2 h-11" onClick={onExport}>
          Exporter
        </Button>
      </div>
    </div>
  );
};
