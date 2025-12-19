import { motion } from 'framer-motion';
import { Printer, ScanLine, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useScanner } from '@/hooks/useScanner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScannerPanelProps {
  onScanComplete: (file: File) => void;
}

export const ScannerPanel = ({ onScanComplete }: ScannerPanelProps) => {
  const { 
    devices, 
    isConnected, 
    isScanning, 
    scan, 
    refreshDevices,
    getScanners,
    getPrinters,
  } = useScanner();

  const scanners = getScanners();
  const printers = getPrinters();

  const handleScan = async (deviceId?: string) => {
    const file = await scan({ deviceId });
    if (file) {
      onScanComplete(file);
    }
  };

  return (
    <motion.div 
      className="glass rounded-xl p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Périphériques</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <button 
            onClick={refreshDevices}
            className="p-1 hover:bg-secondary rounded transition-colors"
            disabled={!isConnected}
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center py-6">
          <WifiOff className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            App compagnon non connectée
          </p>
          <p className="text-xs text-muted-foreground/60">
            Lancez l'application OMNI Companion sur votre ordinateur
          </p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-6">
          <ScanLine className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun périphérique détecté
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Scanners */}
          {scanners.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Scanners</p>
              <div className="space-y-2">
                {scanners.map(device => (
                  <div 
                    key={device.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-foreground">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.status === 'online' ? 'Disponible' : device.status}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          disabled={device.status !== 'online' || isScanning}
                        >
                          {isScanning ? 'Scan...' : 'Scanner'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Options de scan</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleScan(device.id)}>
                          Standard (300 DPI)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScan(device.id)}>
                          Haute qualité (600 DPI)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScan(device.id)}>
                          Noir & Blanc
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Printers */}
          {printers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Imprimantes</p>
              <div className="space-y-2">
                {printers.map(device => (
                  <div 
                    key={device.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-foreground">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.status === 'online' ? 'Disponible' : device.status}
                        </p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      device.status === 'online' ? 'bg-green-500' : 'bg-muted'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
