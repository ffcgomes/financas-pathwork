import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Trash2, RefreshCw, Eye, GitMerge, Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExtractRecord, ExtractMetadata, parseExtractRecords } from "@/utils/extractUtils";

interface ExtractFile {
  name: string;
  created_at: string;
}

interface ExtractListProps {
  refreshTrigger?: number;
  onMetadataChange?: () => void;
}

export const ExtractList = ({ refreshTrigger = 0, onMetadataChange }: ExtractListProps) => {
  const [extracts, setExtracts] = useState<ExtractFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [viewingExtract, setViewingExtract] = useState<{ name: string; records: ExtractRecord[] } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [metadata, setMetadata] = useState<ExtractMetadata>({ options: [], mappings: {} });

  const loadMetadata = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('extratos')
        .download('metadata.json');

      if (error) {
        // Check if file not found based on message or error object structure
        // Supabase storage often returns a 404-like error object but types might vary
        const err = error as any;
        if (err.statusCode === '404' || err.message?.includes('not found') || err.message?.includes('The resource was not found')) {
          // File doesn't exist yet, that's fine
          console.log('Metadata file not found, starting fresh.');
          return;
        }
        throw error;
      }

      const text = await data.text();
      const json = JSON.parse(text);
      if (json && Array.isArray(json.options) && typeof json.mappings === 'object') {
        setMetadata(json);
      }
    } catch (error: any) {
      console.error('Error loading metadata:', error);
      // Don't toast for this, as it might just be missing
    }
  };

  const syncMetadataToStorage = async (newMetadata: ExtractMetadata) => {
    try {
      const blob = new Blob([JSON.stringify(newMetadata, null, 2)], { type: 'application/json' });
      const { error } = await supabase.storage
        .from('extratos')
        .upload('metadata.json', blob, { upsert: true });

      if (error) throw error;

      // Notify Listeners (for auto-refresh)
      if (onMetadataChange) {
        onMetadataChange();
      }
    } catch (error: any) {
      console.error('Error saving metadata:', error);
      toast.error('Erro ao salvar categorias no servidor');
    }
  };

  const handleCategorySelect = (record: ExtractRecord, category: string) => {
    const descriptionKey = record.historico.trim();

    // Optimistic Update: Update state immediately using functional setter to ensure we always have latest state
    setMetadata(prev => {
      const uniqueOptions = Array.from(new Set([...prev.options, category])).sort();
      const newMappings = { ...prev.mappings, [descriptionKey]: category };
      const newMetadata = { options: uniqueOptions, mappings: newMappings };

      // Fire and forget sync (background save)
      syncMetadataToStorage(newMetadata);

      return newMetadata;
    });
  };

  const handleCategoryDelete = (categoryToDelete: string) => {
    setMetadata(prev => {
      const uniqueOptions = prev.options.filter(opt => opt !== categoryToDelete);
      const newMetadata = { ...prev, options: uniqueOptions };
      syncMetadataToStorage(newMetadata);
      return newMetadata;
    });
  };

  const loadExtracts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('extratos')
        .list();

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        const parseFileName = (name: string) => {
          const match = name.match(/(\d{2})_(\d{2})_(\d{4})/);
          if (!match) return new Date(0);
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };

        const dateA = parseFileName(a.name);
        const dateB = parseFileName(b.name);
        return dateA.getTime() - dateB.getTime();
      });

      setExtracts(sortedData);
    } catch (error: any) {
      console.error('Error loading extracts:', error);
      toast.error(`Erro ao carregar extratos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (keeping parseExtractRecords and other logic same, omitted for brevity, will re-include in final replacement) ...
  // Actually, I need to include the full file content or use proper chunk replacement.
  // Since I'm replacing the whole file content to be safe and clean, I will include everything.


  const mergeExtracts = async () => {
    if (extracts.length === 0) {
      toast.error("Nenhum extrato para mesclar");
      return;
    }

    setIsMerging(true);

    try {
      const allRecords: ExtractRecord[] = [];
      const recordKeys = new Set<string>();

      const normalizeField = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      const extractsToMerge = extracts.filter(e => e.name !== 'Extratos.txt');

      const sortedExtracts = extractsToMerge.sort((a, b) => {
        const parseFileName = (name: string) => {
          const match = name.match(/(\d{2})_(\d{2})_(\d{4})/);
          if (!match) return new Date(0);
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };

        const dateA = parseFileName(a.name);
        const dateB = parseFileName(b.name);
        return dateA.getTime() - dateB.getTime();
      });

      for (let index = 0; index < sortedExtracts.length; index++) {
        const extract = sortedExtracts[index];
        const { data, error } = await supabase.storage
          .from('extratos')
          .download(extract.name);

        if (error) throw error;

        const text = await data.text();
        const records = parseExtractRecords(text);

        for (const record of records) {
          const key = [
            record.dt_movimento,
            record.historico,
            record.documento,
            record.valor,
          ]
            .map((field) => normalizeField(field || ""))
            .join("|");

          if (!recordKeys.has(key)) {
            recordKeys.add(key);
            allRecords.push(record);
          }
        }
      }

      if (allRecords.length === 0) {
        toast.error("Nenhum registro encontrado nos extratos");
        setIsMerging(false);
        return;
      }

      const header = `Extrato Consolidado
Gerado em: ${new Date().toLocaleString('pt-BR')}

Dt. movimento    Ag. origem        Lote     Histórico                                    Documento         Valor R$

`;

      const recordLines = allRecords.map(record => {
        const parts = [
          record.dt_movimento,
          record.ag_origem,
          record.lote,
          record.historico,
          record.documento,
          // Append Type to Valor for persistence
          record.valor + (record.type === 'D' ? ' D' : ' C')
        ];
        return parts.join('  ');
      });

      const mergedContent = header + recordLines.join('\n');
      const blob = new Blob([mergedContent], { type: 'text/plain' });
      const fileName = 'Extratos.txt';

      const { error: uploadError } = await supabase.storage
        .from('extratos')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      toast.success(`Extratos mesclados com sucesso! ${allRecords.length} registros únicos salvos em ${fileName}`);
      await loadExtracts();

      // Refresh Financial Summary
      if (onMetadataChange) {
        onMetadataChange();
      }

    } catch (error: any) {
      console.error('Error merging extracts:', error);
      toast.error(`Erro ao mesclar extratos: ${error.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const viewExtract = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('extratos')
        .download(fileName);

      if (error) throw error;

      const text = await data.text();
      const records = parseExtractRecords(text);
      setViewingExtract({ name: fileName, records });
    } catch (error: any) {
      console.error('Error viewing extract:', error);
      toast.error(`Erro ao visualizar extrato: ${error.message}`);
    }
  };

  const deleteExtract = async (fileName: string) => {
    setDeletingFile(fileName);
    try {
      const { error } = await supabase.storage
        .from('extratos')
        .remove([fileName]);

      if (error) throw error;

      toast.success(`Extrato ${fileName} deletado com sucesso`);
      await loadExtracts();
    } catch (error: any) {
      console.error('Error deleting extract:', error);
      toast.error(`Erro ao deletar extrato: ${error.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  useEffect(() => {
    loadExtracts();
    loadMetadata();
  }, [refreshTrigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OriginDestinationSelector = ({ record }: { record: ExtractRecord }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("")

    // Determine current value: check mapping first
    const descriptionKey = record.historico.trim();
    const currentValue = metadata.mappings[descriptionKey] || "";

    const filteredOptions = metadata.options.filter(opt =>
      opt.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between text-xs h-8"
          >
            {currentValue || "Selecionar..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandGroup>
                {filteredOptions.length === 0 && searchValue && (
                  <CommandItem
                    onSelect={() => {
                      handleCategorySelect(record, searchValue);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar "{searchValue}"
                  </CommandItem>
                )}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={(currentValue) => {
                      handleCategorySelect(record, option);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentValue === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryDelete(option);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Extratos Salvos
            </CardTitle>
            <CardDescription>
              {extracts.length} extrato(s) no sistema
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={mergeExtracts}
              disabled={isMerging || extracts.length === 0}
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {isMerging ? "Mesclando..." : "Mesclar Extratos"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadExtracts();
                loadMetadata();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando extratos...
          </div>
        ) : extracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum extrato salvo ainda
          </div>
        ) : (
          <div className="space-y-2">
            {extracts.map((extract) => (
              <div
                key={extract.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => viewExtract(extract.name)}
                >
                  <p className="font-mono text-sm font-medium flex items-center gap-2 hover:text-primary">
                    <Eye className="w-4 h-4" />
                    {extract.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Salvo em: {formatDate(extract.created_at)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteExtract(extract.name)}
                  disabled={deletingFile === extract.name}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!viewingExtract} onOpenChange={() => setViewingExtract(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono">{viewingExtract?.name}</DialogTitle>
            <DialogDescription>
              {viewingExtract?.records.length} registro(s) encontrado(s)
            </DialogDescription>
          </DialogHeader>

          {viewingExtract && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-4">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Entradas (C)</p>
                <p className="text-lg font-bold text-blue-600">
                  {viewingExtract.records
                    .filter(r => r.type === 'C')
                    .reduce((acc, curr) => {
                      const val = parseFloat(curr.valor.replace(/\./g, '').replace(',', '.'));
                      return acc + (isNaN(val) ? 0 : val);
                    }, 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Saídas (D)</p>
                <p className="text-lg font-bold text-red-600">
                  {viewingExtract.records
                    .filter(r => r.type === 'D')
                    .reduce((acc, curr) => {
                      const val = parseFloat(curr.valor.replace(/\./g, '').replace(',', '.'));
                      return acc + (isNaN(val) ? 0 : val);
                    }, 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Dt. Movimento</TableHead>
                  <TableHead>Origem/Destino</TableHead>
                  <TableHead className="min-w-[300px]">Histórico</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingExtract?.records.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{record.dt_movimento}</TableCell>
                    <TableCell className="w-[220px]">
                      <OriginDestinationSelector record={record} />
                    </TableCell>
                    <TableCell className="text-xs">{record.historico}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{record.cpf || record.cnpj || '-'}</TableCell>
                    <TableCell className={`font-mono text-xs text-right whitespace-nowrap ${record.type === 'D' ? 'text-red-600' : 'text-blue-600'}`}>
                      {/* Format: 1.234,56 C/D */}
                      {parseFloat(record.valor.replace(/\./g, '').replace(',', '.'))
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {record.type}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
