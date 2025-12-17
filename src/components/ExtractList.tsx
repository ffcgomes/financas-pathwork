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

interface ExtractFile {
  name: string;
  created_at: string;
}

interface ExtractRecord {
  dt_movimento: string;
  ag_origem: string;
  lote: string;
  historico: string;
  documento: string;
  valor: string;
  cpf?: string;
  cnpj?: string;
  nome?: string;
  type?: 'C' | 'D'; // Add type field
}

interface ExtractMetadata {
  options: string[];
  mappings: { [key: string]: string };
}

interface ExtractListProps {
  refreshTrigger?: number;
}

export const ExtractList = ({ refreshTrigger = 0 }: ExtractListProps) => {
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

  const saveMetadata = async (newMetadata: ExtractMetadata) => {
    try {
      const blob = new Blob([JSON.stringify(newMetadata, null, 2)], { type: 'application/json' });
      const { error } = await supabase.storage
        .from('extratos')
        .upload('metadata.json', blob, { upsert: true });

      if (error) throw error;
      setMetadata(newMetadata);
    } catch (error: any) {
      console.error('Error saving metadata:', error);
      toast.error('Erro ao salvar categorias');
    }
  };

  const handleCategorySelect = (record: ExtractRecord, category: string) => {
    // 1. Normalize description key
    const descriptionKey = record.historico.trim();

    // 2. Update options if new
    const uniqueOptions = Array.from(new Set([...metadata.options, category])).sort();

    // 3. Update mapping
    const newMappings = { ...metadata.mappings, [descriptionKey]: category };

    // 4. Save
    saveMetadata({
      options: uniqueOptions,
      mappings: newMappings
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

  const parseExtractRecords = (text: string): ExtractRecord[] => {
    const lines = text.split('\n');
    const records: ExtractRecord[] = [];

    const extractCpfCnpjNome = (historico: string): { cpf?: string; cnpj?: string; nome?: string } => {
      const withoutDateTime = historico
        .replace(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?\s+/, '')
        .replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, '');

      const cpfCnpjMatch = withoutDateTime.match(/^(\d{11,14})\s+(.+)$/);

      if (cpfCnpjMatch) {
        const digits = cpfCnpjMatch[1];
        let cpf = '', cnpj = '';
        if (digits.length === 14 && digits.substring(8, 11) === '000') {
          cnpj = digits;
        } else {
          cpf = digits.length > 11 ? digits.substring(digits.length - 11) : digits;
        }
        return { cpf, cnpj, nome: cpfCnpjMatch[2].trim() };
      }

      const formattedNumberMatch = withoutDateTime.match(/^([\d.\/\-]+)\s+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ].+)$/);

      if (formattedNumberMatch) {
        const rawDigits = formattedNumberMatch[1].replace(/\D/g, '');
        let cpf = '', cnpj = '';

        if (rawDigits.length === 14 && rawDigits.substring(8, 11) === '000') {
          cnpj = formattedNumberMatch[1];
        } else {
          if (rawDigits.length === 11 || (rawDigits.length === 14 && rawDigits.substring(8, 11) !== '000')) {
            if (rawDigits.length > 11) {
              cpf = rawDigits.substring(rawDigits.length - 11);
            } else {
              cpf = formattedNumberMatch[1];
            }
          }
        }

        if (cpf || cnpj) {
          return { cpf, cnpj, nome: formattedNumberMatch[2].trim() }
        }

        return { nome: formattedNumberMatch[2].trim() };
      }

      const trimmedText = withoutDateTime.trim();
      const looksLikeName = /^[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý]+(\s+[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý.]*)+$/.test(trimmedText);
      const isDescriptive = /^(tar\.|rende|tarifa|pagamento|transferencia|saldo|lancamento)/i.test(trimmedText);

      if (looksLikeName && !isDescriptive) {
        return { nome: trimmedText };
      }

      return {};
    };

    let headerIndex = -1;
    let isMergedFormat = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Dt. movimento')) {
        headerIndex = i;
        isMergedFormat = !line.includes('Dt. balancete');
        break;
      }
    }

    if (headerIndex === -1) return records;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      if (lineLower.includes('lançamentos futuros') || lineLower.includes('lancamentos futuros')) break;
      if (lineLower.includes('saldo anterior') || lineLower.replace(/\s/g, '').includes('saldo')) continue;
      if (!line) continue;
      if (line.includes('===') || line.includes('---') || lineLower.includes('total')) continue;

      const parts = line.split(/\s{2,}/);

      // Check if this line starts with a date
      if (parts.length >= 4 && parts[0].match(/\d{2}\/\d{2}\/\d{4}/)) {
        if (isMergedFormat) {
          // Merged format: all data in one line
          // Format: dt_movimento  ag_origem  lote  historico  documento  valor [Type]
          const rawHistorico = parts[3]?.trim() || '';
          const { cpf, cnpj, nome } = extractCpfCnpjNome(rawHistorico);

          let valor = parts[5]?.trim() || '';
          let type: 'D' | 'C' = 'C';

          // Check for D/C suffix in value or separate part if space separated
          // First check parts[5] itself
          if (valor.toUpperCase().endsWith('D') || valor.startsWith('-')) {
            type = 'D';
          } else if (parts[6]?.trim().toUpperCase() === 'D') {
            // Check if next part is D (if split by space happened)
            type = 'D';
          }

          // Always clean the value of the suffix
          valor = valor.replace(/\s*[DC]$/i, '').trim();

          records.push({
            dt_movimento: parts[0]?.trim() || '',
            ag_origem: parts[1]?.trim() || '',
            lote: parts[2]?.trim() || '',
            historico: rawHistorico,
            documento: parts[4]?.trim() || '',
            valor,
            type,
            cpf,
            cnpj,
            nome,
          });
        } else {
          // Original format parsing (already updated in previous steps, just keeping structure)
          // ...
          let historico = '';
          let nextLineIndex = i + 1;
          while (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            if (nextLine && !nextLine.includes('===') && !nextLine.includes('---')) {
              historico = nextLine;
              break;
            }
            nextLineIndex++;
          }

          // Extract valor (Valor R$) from the line using Brazilian currency pattern
          // This avoids mixing it up with the Documento column
          let valor = '';
          let type: 'D' | 'C' = 'C'; // Default to Credit
          // Updated regex to capture optional 'D' or 'C' suffix (with or without space)
          const moneyMatches = line.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[DC])?/gi);
          if (moneyMatches && moneyMatches.length > 0) {
            const lastMatch = moneyMatches[moneyMatches.length - 1];
            valor = lastMatch;

            // Determine type based on 'D' suffix or negative sign
            if (lastMatch.toUpperCase().endsWith('D') || lastMatch.startsWith('-')) {
              type = 'D';
            }
            // Remove 'D' or 'C' suffix and trim
            valor = valor.replace(/\s*[DC]$/i, '').trim();
          } else {
            // Fallback to positional parsing if pattern is not found
            valor = parts[5]?.trim() || '';
            type = valor.toUpperCase().endsWith('D') || valor.startsWith('-') ? 'D' : 'C';
            valor = valor.replace(/\s*[DC]$/i, '').trim();
          }

          const { cpf, cnpj, nome } = extractCpfCnpjNome(historico);

          records.push({
            dt_movimento: parts[0]?.trim() || '',
            ag_origem: parts[2]?.trim() || '',
            lote: parts[3]?.trim() || '',
            documento: parts[4]?.trim() || '',
            valor,
            type, // Add type to record
            historico: historico,
            cpf,
            cnpj,
            nome,
          });

          i = nextLineIndex;
        }
      }
    }

    return records;
  };

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
                      handleCategorySelect(record, option); // Use exact option casing
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentValue === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
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
                      {record.valor.replace('-', '')} {record.type}
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
